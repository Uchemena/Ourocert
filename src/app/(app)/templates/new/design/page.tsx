import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DesignEditor from './DesignEditor'

export default async function DesignTemplatePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_name')
    .eq('id', user.id)
    .single()

  return <DesignEditor initialOrgName={profile?.org_name ?? ''} />
}
