import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPlanLimits } from '@/lib/subscription'

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
      .select('id, user_id, status, template_id')
      .eq('id', batch_id)
      .eq('user_id', user.id)
      .single()

    if (batchError || !batch) {
      return NextResponse.json(
        { error: 'Batch not found' },
        { status: 404 }
      )
    }

    // ── Enforce quota server-side ──────────────────────────────────────────────
    // Fetch plan, usage, and batch_credits together in one query.
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, certificates_used_this_month, batch_credits')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Count how many certificates this batch will generate
    const { count: batchSize } = await supabase
      .from('certificates')
      .select('*', { count: 'exact', head: true })
      .eq('batch_id', batch_id)

    const limits = getPlanLimits(profile.plan as any)
    const isOverQuota =
      limits.certificates !== Infinity &&
      (profile.certificates_used_this_month + (batchSize ?? 0)) > limits.certificates

    // ── Fix 8C: Also allow generation if the user has a batch credit ──────────
    const hasBatchCredit = (profile.batch_credits ?? 0) > 0

    if (isOverQuota && !hasBatchCredit) {
      return NextResponse.json(
        {
          error: 'Monthly certificate limit reached. Please upgrade your plan.',
          code: 'QUOTA_EXCEEDED'
        },
        { status: 402 }
      )
    }

    // Consume one batch credit if the user is over quota but has credit available
    if (isOverQuota && hasBatchCredit) {
      await supabase
        .from('profiles')
        .update({ batch_credits: profile.batch_credits - 1 })
        .eq('id', user.id)
    }
    // ─────────────────────────────────────────────────────────────────────────

    // ── Verify the batch's template belongs to this user ─────────────────────
    if (batch.template_id) {
      const { data: template } = await supabase
        .from('templates')
        .select('user_id')
        .eq('id', batch.template_id)
        .single()

      if (!template || template.user_id !== user.id) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

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
