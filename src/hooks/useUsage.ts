'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getPlanLimits, type PlanType } from '@/lib/subscription'

type UsageData = {
  plan: PlanType
  certificatesUsed: number
  certificatesLimit: number | 'unlimited'
  templatesCount: number
  templatesLimit: number | 'unlimited'
  usagePercent: number
  isNearLimit: boolean
  isAtLimit: boolean
}

export function useUsage() {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUsage()
  }, [])

  async function loadUsage() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      // Get profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan, certificates_used_this_month')
        .eq('id', user.id)
        .single()

      // Get template count
      const { count: templatesCount } = await supabase
        .from('templates')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      if (!profile) return

      const plan = (profile.plan || 'free') as PlanType
      const limits = getPlanLimits(plan)
      const certificatesUsed = profile.certificates_used_this_month || 0

      const certificatesLimit = limits.certificates === Infinity 
        ? 'unlimited' as const
        : limits.certificates

      const usagePercent = certificatesLimit === 'unlimited'
        ? 0
        : Math.min((certificatesUsed / certificatesLimit) * 100, 100)

      const isNearLimit = usagePercent >= 80
      const isAtLimit = certificatesLimit !== 'unlimited' && certificatesUsed >= certificatesLimit

      setUsage({
        plan,
        certificatesUsed,
        certificatesLimit,
        templatesCount: templatesCount || 0,
        templatesLimit: limits.templates === Infinity ? 'unlimited' : limits.templates,
        usagePercent,
        isNearLimit,
        isAtLimit
      })

    } catch (error) {
      console.error('Failed to load usage:', error)
    } finally {
      setLoading(false)
    }
  }

  async function checkCanCreateBatch(batchSize: number): Promise<boolean> {
    if (!usage) return false
    
    if (usage.certificatesLimit === 'unlimited') return true
    
    return usage.certificatesUsed + batchSize <= usage.certificatesLimit
  }

  async function checkCanCreateTemplate(): Promise<boolean> {
    if (!usage) return false
    
    if (usage.templatesLimit === 'unlimited') return true
    
    return usage.templatesCount < usage.templatesLimit
  }

  return {
    usage,
    loading,
    refresh: loadUsage,
    checkCanCreateBatch,
    checkCanCreateTemplate
  }
}
