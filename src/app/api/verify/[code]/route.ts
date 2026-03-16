import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Use anon key — this is a fully public endpoint, no auth required
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const { data: certificate } = await supabase
    .from('certificates')
    .select(`
      recipient_name,
      status,
      sent_at,
      verification_code,
      batch:batches (
        name,
        category,
        template:templates (
          org_name
        )
      )
    `)
    .eq('verification_code', code)
    .in('status', ['sent', 'delivered', 'opened'])
    .single()

  if (!certificate) {
    return NextResponse.json(
      { valid: false, message: 'Certificate not found or not yet issued' },
      { status: 404 }
    )
  }

  const batch = certificate.batch as unknown as {
    name: string
    category: string | null
    template: { org_name: string | null } | null
  } | null

  return NextResponse.json({
    valid: true,
    recipientName: certificate.recipient_name,
    issuedBy: batch?.template?.org_name ?? 'Unknown',
    courseName: batch?.category ?? batch?.name ?? 'Unknown',
    issuedAt: certificate.sent_at,
    verificationCode: certificate.verification_code,
  })
}
