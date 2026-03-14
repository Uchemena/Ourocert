'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'azure' | null>(null)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })

    if (error) {
      setError("Couldn't send the link. Please check the email address and try again.")
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  async function handleOAuth(provider: 'google' | 'azure') {
    setOauthLoading(provider)
    setError(null)

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        ...(provider === 'azure' && {
          scopes: 'email profile',
          queryParams: { prompt: 'select_account' },
        }),
      },
    })

    if (error) {
      setError('Something went wrong. Please try again.')
      setOauthLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F8FC] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2L12.5 7.5H18L13.5 11L15.5 17L10 13.5L4.5 17L6.5 11L2 7.5H7.5L10 2Z" fill="white"/>
              </svg>
            </div>
            <span className="text-2xl font-bold text-primary tracking-tight">OUROCERT</span>
          </div>
          <p className="text-sm text-gray-400">Bulk certificate generator</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-[#E8ECF4] shadow-sm rounded-xl p-8">

          <h1 className="text-xl font-semibold text-gray-900 mb-1">Welcome</h1>
          <p className="text-sm text-gray-400 mb-7">Sign in or create your account to continue.</p>

          {/* Magic link */}
          {sent ? (
            <div className="bg-primary/5 border border-primary/10 rounded-xl p-5 text-center">
              <div className="text-2xl mb-2">✉️</div>
              <p className="font-semibold text-gray-900 text-sm">Check your inbox</p>
              <p className="text-xs text-gray-400 mt-1.5">
                We sent a magic link to{' '}
                <span className="font-medium text-gray-700">{email}</span>
              </p>
              <button
                onClick={() => { setSent(false); setEmail('') }}
                className="mt-4 text-xs text-primary hover:underline"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-3">
              <div>
                <label htmlFor="email" className="block text-xs font-medium text-gray-500 mb-1.5">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-2.5 rounded-[10px] border border-[#E8ECF4] text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-[10px] bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-[0.99] transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading && <Spinner />}
                {loading ? 'Sending…' : 'Send Magic Link'}
              </button>
            </form>
          )}

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E8ECF4]" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-white text-xs text-gray-400">or continue with</span>
            </div>
          </div>

          {/* OAuth */}
          <div className="space-y-3">
            <button
              onClick={() => handleOAuth('google')}
              disabled={oauthLoading !== null}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-[10px] border border-[#E8ECF4] bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 active:scale-[0.99] transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {oauthLoading === 'google' ? <Spinner dark /> : <GoogleIcon />}
              {oauthLoading === 'google' ? 'Redirecting…' : 'Continue with Google'}
            </button>

            <button
              onClick={() => handleOAuth('azure')}
              disabled={oauthLoading !== null}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-[10px] border border-[#E8ECF4] bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 active:scale-[0.99] transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {oauthLoading === 'azure' ? <Spinner dark /> : <MicrosoftIcon />}
              {oauthLoading === 'azure' ? 'Redirecting…' : 'Continue with Microsoft'}
            </button>
          </div>

          {error && (
            <p className="mt-4 text-xs text-red-500 text-center">{error}</p>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-gray-300">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
}

function Spinner({ dark }: { dark?: boolean }) {
  return (
    <svg
      className={`animate-spin h-4 w-4 flex-shrink-0 ${dark ? 'text-gray-400' : 'text-white/80'}`}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#f25022" d="M1 1h10v10H1z"/>
      <path fill="#00a4ef" d="M13 1h10v10H13z"/>
      <path fill="#7fba00" d="M1 13h10v10H1z"/>
      <path fill="#ffb900" d="M13 13h10v10H13z"/>
    </svg>
  )
}
