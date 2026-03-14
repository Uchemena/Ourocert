import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { canCreateCertificates, getPlanLimits } from '@/lib/subscription'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { batchSize } = await request.json()

    if (!batchSize || batchSize <= 0) {
      return NextResponse.json({ error: 'Invalid batch size' }, { status: 400 })
    }

    // Get user's current plan and usage
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, certificates_used_this_month')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const plan = profile.plan as 'free' | 'starter' | 'growth' | 'pro'
    const currentUsage = profile.certificates_used_this_month || 0
    const limits = getPlanLimits(plan)
    const canCreate = canCreateCertificates(plan, currentUsage, batchSize)

    return NextResponse.json({
      canCreate,
      plan,
      currentUsage,
      limit: limits.certificates,
      batchSize,
      totalAfterBatch: currentUsage + batchSize,
      remaining: limits.certificates === Infinity 
        ? 'unlimited' 
        : Math.max(0, limits.certificates - currentUsage)
    })

  } catch (error) {
    console.error('Check usage error:', error)
    return NextResponse.json(
      { error: 'Failed to check usage' },
      { status: 500 }
    )
  }
}
