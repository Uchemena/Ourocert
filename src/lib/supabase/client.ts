import { createBrowserClient } from '@supabase/ssr'

// During `next build`, Next.js renders client components once for the static
// HTML shell. If env vars are missing in that environment, createBrowserClient
// throws and the entire build fails. We fall back to harmless placeholder
// values during the build phase — at runtime the real env vars are present.
const BUILD_PHASE = process.env.NEXT_PHASE === 'phase-production-build'
const PLACEHOLDER_URL = 'https://placeholder.supabase.co'
const PLACEHOLDER_KEY = 'placeholder-anon-key'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || (BUILD_PHASE ? PLACEHOLDER_URL : '')
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || (BUILD_PHASE ? PLACEHOLDER_KEY : '')
  return createBrowserClient(url, key)
}
