const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'RESEND_API_KEY',
] as const

export function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

/**
 * Validates that required environment variables are present.
 *
 * IMPORTANT: this is a no-op during the Next.js build phase. During
 * `next build`, Next.js loads modules to collect page data — if we throw
 * here, the entire deployment fails. Validation must happen at request
 * time (e.g. inside a route handler) so that missing env vars are caught
 * after the build artifact is up but before serving traffic.
 */
export function validateEnv(): void {
  // Skip during build — page-data collection would otherwise crash the build
  if (process.env.NEXT_PHASE === 'phase-production-build') return

  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key])
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map((k) => `  - ${k}`).join('\n')}`
    )
  }
}
