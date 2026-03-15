'use client'

import { useState } from 'react'
import Link from 'next/link'

type BillingPeriod = 'monthly' | 'annual'

// ─── Feature list (identical for all plans) ───────────────────────────────────

const FEATURES = [
  'Upload your own certificate design (PDF, PNG, JPG)',
  'Design certificates inside Ourocert',
  'Your branding only — no Ourocert logo on certificates',
  'Course and category labels',
  'Bulk CSV upload with column mapping',
  'Automatic email sending to all recipients',
  'Certificate verification page for each certificate',
  'Download recipient contacts as CSV',
  'Batch scheduling',
  'Email delivery tracking',
  'Certificate expiry dates',
  'Unlimited templates',
  'Full customer support',
]

// ─── Pricing tiers ────────────────────────────────────────────────────────────

type Tier = {
  name: string
  priceMonthly: number
  priceAnnual: number   // monthly-equivalent when billed annually
  certs: string
  cta: string
  highlighted?: boolean
  stripePriceIdMonthly?: string
  stripePriceIdAnnual?: string
}

const TIERS: Tier[] = [
  {
    name: 'Free',
    priceMonthly: 0,
    priceAnnual: 0,
    certs: '25 certificates / month',
    cta: 'Get started free',
  },
  {
    name: 'Starter',
    priceMonthly: 19,
    priceAnnual: 15,
    certs: '300 certificates / month',
    cta: 'Start free trial',
    highlighted: true,
    stripePriceIdMonthly: 'price_starter_monthly',
    stripePriceIdAnnual: 'price_starter_annual',
  },
  {
    name: 'Growth',
    priceMonthly: 49,
    priceAnnual: 39,
    certs: '1,500 certificates / month',
    cta: 'Upgrade to Growth',
    stripePriceIdMonthly: 'price_growth_monthly',
    stripePriceIdAnnual: 'price_growth_annual',
  },
  {
    name: 'Pro',
    priceMonthly: 99,
    priceAnnual: 79,
    certs: 'Unlimited certificates / month',
    cta: 'Upgrade to Pro',
    stripePriceIdMonthly: 'price_pro_monthly',
    stripePriceIdAnnual: 'price_pro_annual',
  },
]

// ─── "Everything included" feature cards ──────────────────────────────────────

const FEATURE_CARDS = [
  {
    title: 'Upload or Design',
    desc: 'Upload your own PDF/PNG design or build one inside Ourocert from scratch.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M11 14V4M11 4L7 8M11 4l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M3 16v3h16v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    title: 'Your Brand Only',
    desc: 'Your logo, your colours, your name. Ourocert never appears on your certificates.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M11 2l2.4 6.7H20l-5.4 4 2 6.3L11 15l-5.6 4 2-6.3L2 8.7h6.6L11 2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    title: 'Bulk Sending',
    desc: 'Upload a CSV and we email every recipient their certificate automatically.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="2" y="5" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M2 8l9 6 9-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    title: 'Course Labels',
    desc: 'Add a course or category to each batch. One system, multiple courses.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M3 7h10l3 3.5-3 3.5H3V7z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
        <path d="M7 14v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    title: 'Certificate Verification',
    desc: 'Every certificate gets a public verification URL so recipients can prove it\'s real.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M11 2l7 3v5c0 4.5-3 8-7 9-4-1-7-4.5-7-9V5l7-3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
        <path d="M8 11l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    title: 'Download Contacts',
    desc: 'Export your recipient list as a CSV anytime from the tracking page.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M11 4v10M11 14l-3-3M11 14l3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M4 17v2h14v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    title: 'Batch Scheduling',
    desc: 'Schedule your batch to send at a specific date and time.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="3" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M16 3v4M6 3v4M3 9h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    title: 'Delivery Tracking',
    desc: 'See exactly which emails were delivered, opened, or bounced.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M2 16l5-5 4 4 5-7 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    title: 'Expiry Dates',
    desc: 'Set an expiry date on certificates for compliance and renewal workflows.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M11 7v4.5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
]

// ─── FAQ ──────────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: 'Can I use my own certificate design?',
    a: 'Yes. Upload a PDF, PNG, or JPG — any design from Canva, PowerPoint, or anywhere else. Or use our built-in design editor.',
  },
  {
    q: "Will Ourocert's logo appear on certificates?",
    a: 'Never. Your certificates show only your branding. Ourocert is invisible to your recipients.',
  },
  {
    q: "What happens if I hit my monthly limit?",
    a: 'You can upgrade your plan anytime, or buy a one-time batch pack for $9 (up to 100 certificates). Your limit resets on the 1st of every month.',
  },
  {
    q: 'What is the pay-per-batch option?',
    a: 'A one-time $9 purchase that gives you one batch of up to 100 certificates with every feature included. No subscription needed. Use it whenever you\'re ready — it never expires.',
  },
  {
    q: 'What is the certificate verification page?',
    a: 'Every certificate you send gets a unique public URL that anyone can visit to confirm the certificate is genuine. Useful for recipients who want to share proof of their achievement with employers or institutions.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Cancel anytime from your account settings. You keep access until the end of your billing period.',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="flex-shrink-0 mt-0.5 text-green-500">
      <path d="M2.5 7.5l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly')
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const handleSubscribe = async (tier: Tier) => {
    if (tier.name === 'Free') {
      window.location.href = '/auth'
      return
    }
    const priceId = billingPeriod === 'monthly'
      ? tier.stripePriceIdMonthly
      : tier.stripePriceIdAnnual

    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })
      const { url } = await response.json()
      if (url) window.location.href = url
    } catch {
      alert('Something went wrong. Please try again.')
    }
  }

  const handlePayPerBatch = async () => {
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: 'price_batch_onetime' }),
      })
      const { url } = await response.json()
      if (url) window.location.href = url
    } catch {
      alert('Something went wrong. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F8FC]">

      {/* Nav */}
      <div className="border-b border-[#E8ECF4] bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-bold text-gray-900">OUROCERT</Link>
          <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900 transition">
            Back to Dashboard
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-16">

        {/* ── Hero ── */}
        <div className="text-center mb-14">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Simple pricing. Every feature. Always.
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-10">
            Every plan includes every feature. The only difference is how many
            certificates you send per month. No feature walls. No surprises.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-3 bg-white border border-[#E8ECF4] rounded-[10px] p-1.5 shadow-sm">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition ${
                billingPeriod === 'monthly' ? 'bg-primary text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
                billingPeriod === 'annual' ? 'bg-primary text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Annual
              <span className="px-2 py-0.5 rounded-md bg-green-100 text-green-700 text-xs font-bold">
                Save 2 months
              </span>
            </button>
          </div>
        </div>

        {/* ── Pricing cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-14">
          {TIERS.map((tier) => {
            const price = billingPeriod === 'monthly' ? tier.priceMonthly : tier.priceAnnual
            return (
              <div
                key={tier.name}
                className={`bg-white rounded-xl shadow-sm overflow-hidden flex flex-col transition hover:shadow-md ${
                  tier.highlighted
                    ? 'border-2 border-primary ring-4 ring-primary/10'
                    : 'border border-[#E8ECF4]'
                }`}
              >
                {tier.highlighted ? (
                  <div className="bg-primary text-white text-center py-2 text-xs font-semibold tracking-wide">
                    MOST POPULAR
                  </div>
                ) : (
                  <div className="py-2" />
                )}

                <div className="p-6 flex flex-col flex-1">
                  {/* Name + price */}
                  <h3 className="text-base font-bold text-gray-900 mb-4">{tier.name}</h3>

                  <div className="mb-1">
                    <span className="text-4xl font-bold text-gray-900">${price}</span>
                    {price > 0 && (
                      <span className="text-gray-500 text-sm ml-1">/month</span>
                    )}
                  </div>
                  {billingPeriod === 'annual' && tier.priceMonthly > 0 && (
                    <p className="text-xs text-gray-400 mb-1">
                      ${tier.priceAnnual * 12}/year — billed annually
                    </p>
                  )}

                  {/* Certificate count — the key differentiator */}
                  <div className="mt-3 mb-6 px-3 py-2 bg-primary/5 rounded-lg">
                    <p className="text-sm font-semibold text-primary">{tier.certs}</p>
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => handleSubscribe(tier)}
                    className={`w-full py-2.5 rounded-[10px] text-sm font-semibold transition mb-6 ${
                      tier.highlighted
                        ? 'bg-primary text-white hover:bg-primary/90'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    {tier.cta}
                  </button>

                  {/* Features list */}
                  <ul className="space-y-2.5 flex-1">
                    {FEATURES.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <CheckIcon />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Pay-per-batch ── */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-8 mb-16">
          <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Just need to send once?</h3>
              <p className="text-gray-700 mb-1">
                <span className="font-bold text-gray-900">$9 one-time</span> — send up to 100 certificates
                with every feature included. No subscription. Perfect for a single event or course.
              </p>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-2 flex-shrink-0">
              <button
                onClick={handlePayPerBatch}
                className="px-6 py-3 rounded-[10px] bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition whitespace-nowrap"
              >
                Buy a single batch — $9
              </button>
              <p className="text-xs text-gray-400">
                One-time purchase. Use it whenever you&apos;re ready. Never expires.
              </p>
            </div>
          </div>
        </div>

        {/* ── Everything included ── */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Everything included in every plan
          </h2>
          <p className="text-gray-500 text-center mb-10">
            Not a single feature is gated. Every plan gets everything below.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURE_CARDS.map((card) => (
              <div key={card.title} className="bg-white border border-[#E8ECF4] rounded-xl p-5 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center text-primary mb-3">
                  {card.icon}
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">{card.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── FAQ ── */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Frequently asked questions
          </h2>

          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-white border border-[#E8ECF4] rounded-xl shadow-sm overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between gap-4"
                >
                  <span className="text-sm font-semibold text-gray-900">{faq.q}</span>
                  <svg
                    width="16" height="16" viewBox="0 0 16 16" fill="none"
                    className={`flex-shrink-0 text-gray-400 transition-transform ${openFaq === i ? 'rotate-180' : ''}`}
                  >
                    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5">
                    <p className="text-sm text-gray-600 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
