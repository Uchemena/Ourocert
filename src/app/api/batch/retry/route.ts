import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { batchId, certificateId } = await request.json()

    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID required' }, { status: 400 })
    }

    // Verify batch ownership
    const { data: batch } = await supabase
      .from('batches')
      .select('id, user_id')
      .eq('id', batchId)
      .single()

    if (!batch || batch.user_id !== user.id) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    const edgeFunctionUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL! + '/functions/v1/generate-certificates'

    // If certificateId provided, retry single certificate
    if (certificateId) {
      const { data: certificate } = await supabase
        .from('certificates')
        .select('*')
        .eq('id', certificateId)
        .eq('batch_id', batchId)
        .single()

      if (!certificate) {
        return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })
      }

      // Reset certificate status to pending
      await supabase
        .from('certificates')
        .update({
          status: 'pending',
          error_message: null,
          file_url: null
        })
        .eq('id', certificateId)

      // Trigger Edge Function — pass batch_id so it picks up the reset cert
      await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({ batch_id: batchId })
      })

      return NextResponse.json({ success: true })
    }

    // Otherwise, retry all failed certificates in batch
    const { data: failedCerts } = await supabase
      .from('certificates')
      .select('id')
      .eq('batch_id', batchId)
      .eq('status', 'failed')

    if (!failedCerts || failedCerts.length === 0) {
      return NextResponse.json({ error: 'No failed certificates to retry' }, { status: 400 })
    }

    // Reset all failed certificates to pending
    const certIds = failedCerts.map(c => c.id)
    await supabase
      .from('certificates')
      .update({
        status: 'pending',
        error_message: null,
        file_url: null
      })
      .in('id', certIds)

    // Update batch status to generating
    await supabase
      .from('batches')
      .update({ status: 'generating' })
      .eq('id', batchId)

    // Trigger Edge Function once — it processes all pending certs in the batch
    await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ batch_id: batchId })
    })

    return NextResponse.json({
      success: true,
      retriedCount: failedCerts.length
    })

  } catch (error) {
    console.error('Retry failed:', error)
    return NextResponse.json(
      { error: 'Failed to retry certificates' },
      { status: 500 }
    )
  }
}
