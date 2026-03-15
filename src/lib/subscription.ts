// Helper functions for subscription and usage management

export type PlanType = 'free' | 'starter' | 'growth' | 'pro'

export type PlanLimits = {
  certificates: number
  templates: number
  teamMembers: number
  customBranding: boolean
  customEmailDomain: boolean
  whiteLabel: boolean
  apiAccess: boolean
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    certificates: 25,
    templates: Infinity,
    teamMembers: Infinity,
    customBranding: true,
    customEmailDomain: true,
    whiteLabel: true,
    apiAccess: true
  },
  starter: {
    certificates: 300,
    templates: Infinity,
    teamMembers: Infinity,
    customBranding: true,
    customEmailDomain: true,
    whiteLabel: true,
    apiAccess: true
  },
  growth: {
    certificates: 1500,
    templates: Infinity,
    teamMembers: Infinity,
    customBranding: true,
    customEmailDomain: true,
    whiteLabel: true,
    apiAccess: true
  },
  pro: {
    certificates: Infinity,
    templates: Infinity,
    teamMembers: Infinity,
    customBranding: true,
    customEmailDomain: true,
    whiteLabel: true,
    apiAccess: true
  }
}

export function getPlanLimits(plan: PlanType): PlanLimits {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free
}

export function canCreateCertificates(
  plan: PlanType,
  currentUsage: number,
  batchSize: number
): boolean {
  const limits = getPlanLimits(plan)
  
  if (limits.certificates === Infinity) return true
  
  return currentUsage + batchSize <= limits.certificates
}

export function canCreateTemplate(
  plan: PlanType,
  currentTemplateCount: number
): boolean {
  const limits = getPlanLimits(plan)
  
  if (limits.templates === Infinity) return true
  
  return currentTemplateCount < limits.templates
}

export function getRemainingCertificates(
  plan: PlanType,
  currentUsage: number
): number | 'unlimited' {
  const limits = getPlanLimits(plan)
  
  if (limits.certificates === Infinity) return 'unlimited'
  
  return Math.max(0, limits.certificates - currentUsage)
}

export function formatPlanName(plan: PlanType): string {
  return plan.charAt(0).toUpperCase() + plan.slice(1)
}

export function getPlanPrice(plan: PlanType, billingPeriod: 'monthly' | 'annual'): number {
  const prices: Record<PlanType, { monthly: number; annual: number }> = {
    free: { monthly: 0, annual: 0 },
    starter: { monthly: 19, annual: 190 },
    growth: { monthly: 49, annual: 490 },
    pro: { monthly: 99, annual: 990 }
  }

  return prices[plan][billingPeriod]
}
