'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const INDUSTRIES = [
  { id: 'tutor',     icon: '🎓', label: 'Tutor or Online Course Creator', description: 'Online courses, workshops, training' },
  { id: 'business',  icon: '🏢', label: 'Small Business',                  description: 'Employee recognition, partnerships' },
  { id: 'nonprofit', icon: '❤️', label: 'Non-Profit',                      description: 'Volunteer appreciation, programs' },
  { id: 'school',    icon: '🏫', label: 'School or University',             description: 'Academic achievement, graduation' },
  { id: 'events',    icon: '🎪', label: 'Event Organizer',                  description: 'Conferences, hackathons, meetups' },
  { id: 'other',     icon: '✨', label: 'Something Else',                   description: 'Whatever you need certificates for' },
]

interface Props {
  userId: string
  initialName: string
}

function StepDots({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          className={[
            'rounded-full transition-all duration-300',
            s < current   ? 'w-5 h-2 bg-primary'
            : s === current ? 'w-5 h-2 bg-primary/40'
            : 'w-2 h-2 bg-gray-200',
          ].join(' ')}
        />
      ))}
    </div>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-white/80 flex-shrink-0" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  )
}

export default function OnboardingFlow({ userId, initialName }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const [fullName, setFullName] = useState(initialName)
  const [orgName, setOrgName] = useState('')
  const [industry, setIndustry] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleComplete() {
    setSaving(true)
    setError(null)

    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      full_name: fullName,
      org_name: orgName,
      industry,
    })

    if (error) {
      setError('Something went wrong. Please try again.')
      setSaving(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  const firstName = fullName.trim().split(' ')[0] || 'there'

  return (
    <div className="min-h-screen bg-[#F7F8FC] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">

        {/* Brand */}
        <div className="flex items-center gap-2 justify-center mb-6">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <path d="M10 2L12.5 7.5H18L13.5 11L15.5 17L10 13.5L4.5 17L6.5 11L2 7.5H7.5L10 2Z" fill="white"/>
            </svg>
          </div>
          <span className="text-base font-bold text-primary tracking-tight">OUROCERT</span>
        </div>

        <StepDots current={step} />

        {/* Card */}
        <div className="bg-white border border-[#E8ECF4] shadow-sm rounded-xl p-8">

          {/* ── Step 1 ── */}
          {step === 1 && (
            <div className="max-w-sm mx-auto">
              <h1 className="text-xl font-semibold text-gray-900 mb-1">Let&apos;s get you set up</h1>
              <p className="text-sm text-gray-400 mb-7">Tell us a bit about yourself.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Your name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Smith"
                    autoFocus
                    className="w-full px-4 py-2.5 rounded-[10px] border border-[#E8ECF4] text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Organisation name <span className="text-gray-300 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Acme Corp"
                    className="w-full px-4 py-2.5 rounded-[10px] border border-[#E8ECF4] text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                  />
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!fullName.trim()}
                className="mt-7 w-full py-2.5 rounded-[10px] bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-[0.99] transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}

          {/* ── Step 2 ── */}
          {step === 2 && (
            <div>
              <div className="max-w-sm mx-auto mb-6">
                <h1 className="text-xl font-semibold text-gray-900 mb-1">
                  What best describes what you do?
                </h1>
                <p className="text-sm text-gray-400">We&apos;ll tailor your experience around it.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {INDUSTRIES.map((item) => {
                  const selected = industry === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => setIndustry(item.id)}
                      className={[
                        'relative text-left p-4 rounded-xl border-2 transition-all duration-150',
                        selected
                          ? 'border-primary bg-primary/5'
                          : 'border-[#E8ECF4] bg-white hover:border-primary/30 hover:shadow-sm',
                      ].join(' ')}
                    >
                      {selected && (
                        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}
                      <div className="text-2xl mb-2 leading-none">{item.icon}</div>
                      <p className="text-sm font-semibold text-gray-900 leading-snug">{item.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
                    </button>
                  )
                })}
              </div>

              <div className="flex gap-3 mt-7 max-w-sm mx-auto">
                <button
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 rounded-[10px] border border-[#E8ECF4] text-sm font-medium text-gray-500 hover:bg-gray-50 transition"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!industry}
                  className="flex-1 py-2.5 rounded-[10px] bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-[0.99] transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3 ── */}
          {step === 3 && (
            <div className="max-w-sm mx-auto text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center mx-auto mb-6">
                <svg width="28" height="22" viewBox="0 0 28 22" fill="none">
                  <path d="M2 11L10 19L26 2" stroke="#3B5BDB" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                You&apos;re all set, {firstName}!
              </h1>
              <p className="text-sm text-gray-400 mb-8">Let&apos;s create your first certificate.</p>

              {error && <p className="text-xs text-red-500 mb-4">{error}</p>}

              <button
                onClick={handleComplete}
                disabled={saving}
                className="w-full py-3 rounded-[10px] bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-[0.99] transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving && <Spinner />}
                {saving ? 'Setting up your account…' : 'Go to my dashboard →'}
              </button>

              <button
                onClick={() => setStep(2)}
                className="mt-4 text-xs text-gray-400 hover:text-gray-600 transition"
              >
                Go back
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
