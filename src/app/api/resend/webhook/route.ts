// src/app/api/resend/webhook/route.ts
// Handles Resend delivery tracking webhooks (delivered, opened, bounced)

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'

// Force dynamic — webhooks are runtime-only, never build-time
export const dynamic = 'force-dynamic'

// Lazy singleton — never instantiated at module load so missing env vars
// during the Next.js build's "Collecting page data" step don't blow up.
let _supabase: any = null
function getSupabase(): any {
  if (_supabase) return _supabase
  _supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  return _supabase
}

// Map Resend event types to certificate statuses
const STATUS_MAP: Record<string, string> = {
  'email.delivered': 'delivered',
  'email.opened':    'opened',
  'email.bounced':   'bounced',
}

// Verify Resend webhook signature (standardwebhooks HMAC-SHA256)
function verifySignature(
  body: string,
  webhookId: string,
  webhookTimestamp: string,
  webhookSignature: string,
  secret: string
): boolean {
  try {
    // Reject stale webhooks (>5 minutes old)
    const ts = parseInt(webhookTimestamp, 10)
    if (isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false

    const signedContent = `${webhookId}.${webhookTimestamp}.${body}`
    const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
    const expected = createHmac('sha256', secretBytes).update(signedContent).digest('base64')

    // Signature header may contain multiple values (v1,<sig>)
    const signatures = webhookSignature.split(' ')
    return signatures.some(sig => {
      const value = sig.startsWith('v1,') ? sig.slice(3) : sig
      try {
        return timingSafeEqual(Buffer.from(expected), Buffer.from(value))
      } catch {
        return false
      }
    })
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const body = await request.text()

    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET ?? ''
    if (webhookSecret) {
      const webhookId        = request.headers.get('webhook-id') ?? ''
      const webhookTimestamp = request.headers.get('webhook-timestamp') ?? ''
      const webhookSignature = request.headers.get('webhook-signature') ?? ''

      if (!verifySignature(body, webhookId, webhookTimestamp, webhookSignature, webhookSecret)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
      }
    }

    let payload: { type: string; data: Record<string, any> }
    try {
      payload = JSON.parse(body)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const { type, data } = payload
    const newStatus = STATUS_MAP[type]

    if (!newStatus) {
      // Unhandled event type — acknowledge and move on
      return NextResponse.json({ received: true })
    }

    // Find the certificate linked to this Resend message
    const { data: emailEvent } = await supabase
      .from('email_events')
      .select('certificate_id')
      .eq('resend_email_id', data.email_id)
      .eq('event_type', 'email.sent')
      .single()

    if (emailEvent?.certificate_id) {
      // Only advance status — never go backwards (opened > delivered > sent)
      const STATUS_RANK: Record<string, number> = {
        sent: 1, delivered: 2, opened: 3, bounced: 2,
      }
      const { data: cert } = await supabase
        .from('certificates')
        .select('status')
        .eq('id', emailEvent.certificate_id)
        .single()

      const currentRank = STATUS_RANK[cert?.status ?? ''] ?? 0
      const newRank = STATUS_RANK[newStatus] ?? 0

      if (newRank > currentRank || newStatus === 'bounced') {
        await supabase
          .from('certificates')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', emailEvent.certificate_id)
      }

      // Log the event
      await supabase
        .from('email_events')
        .insert({
          certificate_id:  emailEvent.certificate_id,
          event_type:      type,
          resend_email_id: data.email_id,
          metadata:        data,
        })
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Resend webhook error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
