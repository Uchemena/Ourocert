import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/batch/generate
 * 
 * Triggers the certificate generation process for a batch.
 * This endpoint is called after a batch is created in the wizard.
 * 
 * Request body: { batch_id: string }
 * Response: { success: boolean, batch_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { batch_id } = await request.json()

    if (!batch_id) {
      return NextResponse.json(
        { error: 'batch_id is required' },
        { status: 400 }
      )
    }

    // Verify user is authenticated
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify batch belongs to user
    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .select('id, user_id, status')
      .eq('id', batch_id)
      .eq('user_id', user.id)
      .single()

    if (batchError || !batch) {
      return NextResponse.json(
        { error: 'Batch not found' },
        { status: 404 }
      )
    }

    // Call Supabase Edge Function to start generation
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables')
    }

    // Trigger the generate-certificates Edge Function
    const response = await fetch(
      `${supabaseUrl}/functions/v1/generate-certificates`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ batch_id }),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to trigger generation')
    }

    const result = await response.json()

    return NextResponse.json({
      success: true,
      batch_id,
      message: 'Certificate generation started',
      ...result
    })

  } catch (error) {
    console.error('Error triggering certificate generation:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
