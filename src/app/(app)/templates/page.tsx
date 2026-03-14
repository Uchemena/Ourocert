import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TemplatesClient from './TemplatesClient'
import type { UserTemplate } from '@/components/UserTemplateCard'

export default async function TemplatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  const { data } = await supabase
    .from('templates')
    .select('id, name, type, thumbnail_url, field_count, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const templates: UserTemplate[] = (data as UserTemplate[]) ?? []

  return <TemplatesClient initialTemplates={templates} />
}
