import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// During `next build`, page-data collection / static generation may load
// modules that touch the Supabase client. If env vars are missing in the
// build environment, createServerClient throws and the entire build fails.
// We fall back to harmless placeholder values during the build phase —
// at runtime the real env vars are present.
const BUILD_PHASE = process.env.NEXT_PHASE === 'phase-production-build'
const PLACEHOLDER_URL = 'https://placeholder.supabase.co'
const PLACEHOLDER_KEY = 'placeholder-anon-key'

export async function createClient() {
  const cookieStore = await cookies()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || (BUILD_PHASE ? PLACEHOLDER_URL : '')
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || (BUILD_PHASE ? PLACEHOLDER_KEY : '')

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — middleware handles session refresh
          }
        },
      },
    }
  )
}
