import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OnboardingFlow from './OnboardingFlow'

export default async function OnboardingPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  // Already completed onboarding → skip to dashboard
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (profile) redirect('/dashboard')

  // Pre-fill name from OAuth provider if available
  const initialName = (user.user_metadata?.full_name as string) ?? ''

  return <OnboardingFlow userId={user.id} initialName={initialName} />
}
