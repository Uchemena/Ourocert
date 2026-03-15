import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Greeting from '@/components/Greeting'
import DashboardClient from './DashboardClient'

type Batch = {
  id: string
  name: string
  status: 'draft' | 'generating' | 'sent' | 'failed'
  recipient_count: number
  category?: string | null
  scheduled_for?: string | null
  created_at: string
}

// UUID validation (v4 format)
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

// Sanitize text input to prevent XSS (additional layer beyond React's escaping)
function sanitizeText(text: string | null | undefined, maxLength = 200): string {
  if (!text) return ''
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/[<>"']/g, '')
    .slice(0, maxLength)
    .trim()
}

// Validate batch data structure
function isValidBatch(data: any): data is Batch {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.id === 'string' &&
    isValidUUID(data.id) &&
    typeof data.name === 'string' &&
    data.name.length > 0 &&
    ['draft', 'generating', 'sent', 'failed'].includes(data.status) &&
    typeof data.recipient_count === 'number' &&
    data.recipient_count >= 0 &&
    typeof data.created_at === 'string'
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  // Validate user ID
  if (!isValidUUID(user.id)) {
    console.error('Invalid user ID format')
    redirect('/auth')
  }

  let profile: { full_name?: string; org_name?: string } | null = null
  let recentBatches: Batch[] = []
  let uniqueCategories: string[] = []
  let totalBatches = 0
  let sentCount = 0
  let thisMonthCount = 0

  try {
    // First day of current month for stats
    const now = new Date()
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    // Run all queries in parallel with error handling
    const [profileRes, recentRes, totalRes, sentRes, monthRes, categoriesRes] = await Promise.all([
      supabase.from('profiles').select('full_name, org_name').eq('id', user.id).single(),
      supabase.from('batches').select('id, name, status, recipient_count, category, scheduled_for, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('batches').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('batches').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'sent'),
      supabase.from('batches').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', firstOfMonth),
      supabase.from('batches').select('category').eq('user_id', user.id).not('category', 'is', null).order('category'),
    ])

    if (profileRes.error)    console.error('Profile fetch error:',    profileRes.error.message)
    if (recentRes.error)     console.error('Batches fetch error:',    recentRes.error.message)
    if (totalRes.error)      console.error('Total count error:',      totalRes.error.message)
    if (sentRes.error)       console.error('Sent count error:',       sentRes.error.message)
    if (monthRes.error)      console.error('Month count error:',      monthRes.error.message)
    if (categoriesRes.error) console.error('Categories fetch error:', categoriesRes.error.message)

    profile = profileRes.data

    if (recentRes.data && Array.isArray(recentRes.data)) {
      recentBatches = recentRes.data.filter(isValidBatch)
    }

    totalBatches    = totalRes.count ?? 0
    sentCount       = sentRes.count  ?? 0
    thisMonthCount  = monthRes.count ?? 0

    uniqueCategories = [
      ...new Set(
        (categoriesRes.data ?? []).map((c: any) => c.category).filter(Boolean)
      )
    ] as string[]

  } catch (error) {
    console.error('Dashboard data fetch error:', error)
  }

  // Sanitize user-controlled data
  const firstName = sanitizeText(profile?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'there', 50)
  const orgName = profile?.org_name ? sanitizeText(profile.org_name, 100) : null

  const stats = [
    {
      label: 'Total Sent',
      value: sentCount,
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M17.5 3.5l-9 9M17.5 3.5H12M17.5 3.5V9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8.5 5H4a1.5 1.5 0 00-1.5 1.5v9.5A1.5 1.5 0 004 17.5h9.5A1.5 1.5 0 0015 16v-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      label: 'This Month',
      value: thisMonthCount,
      iconBg: 'bg-sky-100',
      iconColor: 'text-sky-600',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="2.5" y="3.5" width="15" height="14" rx="2" stroke="currentColor" strokeWidth="1.6"/>
          <path d="M2.5 8h15M7 2v3M13 2v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      label: 'Templates',
      value: 0,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="3" y="2" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.6"/>
          <path d="M6 7h8M6 10h8M6 13h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
      ),
    },
  ]

  return (
    <div className="px-6 py-8 md:px-8 md:py-10 max-w-5xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div>
          <Greeting name={firstName} />
          <p className="text-sm text-gray-400 mt-1">
            {orgName && <>{orgName} · </>}
            {totalBatches === 0
              ? 'No batches yet'
              : `${totalBatches} batch${totalBatches === 1 ? '' : 'es'} created`}
          </p>
        </div>
        <Link href="/batch/new">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-[0.99] transition whitespace-nowrap">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1.5v11M1.5 7h11" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            New Batch
          </button>
        </Link>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white border border-[#E8ECF4] rounded-xl shadow-sm p-5 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${stat.iconBg} ${stat.iconColor}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 leading-none">{stat.value}</p>
              <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Recent Batches (client component for filtering) ── */}
      <DashboardClient
        batches={recentBatches}
        uniqueCategories={uniqueCategories}
        totalBatches={totalBatches}
      />

    </div>
  )
}
