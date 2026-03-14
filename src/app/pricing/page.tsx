'use client'

import { useState } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

type BillingPeriod = 'monthly' | 'annual'

type PricingTier = {
  name: string
  priceMonthly: number
  priceAnnual: number
  description: string
  features: string[]
  cta: string
  highlighted?: boolean
  stripePriceIdMonthly?: string
  stripePriceIdAnnual?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly')

  const tiers: PricingTier[] = [
    {
      name: 'Free',
      priceMonthly: 0,
      priceAnnual: 0,
      description: 'Perfect for getting started',
      features: [
        '25 certificates per month',
        '1 template',
        'Email sending included',
        'Basic support'
      ],
      cta: 'Get started free'
    },
    {
      name: 'Starter',
      priceMonthly: 19,
      priceAnnual: 190, // 10 months price for 12
      description: 'Great for small teams',
      features: [
        '300 certificates per month',
        '5 templates',
        'Custom branding',
        'Email support',
        '14-day trial'
      ],
      cta: 'Start free trial',
      highlighted: true,
      stripePriceIdMonthly: 'price_starter_monthly',
      stripePriceIdAnnual: 'price_starter_annual'
    },
    {
      name: 'Growth',
      priceMonthly: 49,
      priceAnnual: 490,
      description: 'For growing organizations',
      features: [
        '1,500 certificates per month',
        'Unlimited templates',
        'Custom email domain',
        'Priority support',
        'Advanced analytics'
      ],
      cta: 'Upgrade to Growth',
      stripePriceIdMonthly: 'price_growth_monthly',
      stripePriceIdAnnual: 'price_growth_annual'
    },
    {
      name: 'Pro',
      priceMonthly: 99,
      priceAnnual: 990,
      description: 'For large teams and enterprises',
      features: [
        'Unlimited certificates',
        '5 team members',
        'White-label branding',
        'API access',
        'Dedicated support'
      ],
      cta: 'Upgrade to Pro',
      stripePriceIdMonthly: 'price_pro_monthly',
      stripePriceIdAnnual: 'price_pro_annual'
    }
  ]

  const handleSubscribe = async (tier: PricingTier) => {
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
        body: JSON.stringify({ priceId })
      })

      const { url } = await response.json()
      if (url) window.location.href = url
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Something went wrong. Please try again.')
    }
  }

  const handlePayPerBatch = async () => {
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: 'price_batch_onetime' })
      })

      const { url } = await response.json()
      if (url) window.location.href = url
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Something went wrong. Please try again.')
    }
  }

  const getDisplayPrice = (tier: PricingTier) => {
    return billingPeriod === 'monthly' ? tier.priceMonthly : tier.priceAnnual
  }

  const getSavings = (tier: PricingTier) => {
    if (tier.priceMonthly === 0) return null
    const monthlyTotal = tier.priceMonthly * 12
    const annualPrice = tier.priceAnnual
    return monthlyTotal - annualPrice
  }

  return (
    <div className="min-h-screen bg-[#F7F8FC]">
      {/* Header */}
      <div className="border-b border-[#E8ECF4] bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-bold text-gray-900">
            OUROCERT
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-gray-600 hover:text-gray-900 transition"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Choose the perfect plan for your needs. Upgrade or downgrade anytime.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-3 bg-white border border-[#E8ECF4] rounded-[10px] p-1.5 shadow-sm">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition ${
                billingPeriod === 'monthly'
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
                billingPeriod === 'annual'
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Annual
              <span className="px-2 py-0.5 rounded-md bg-green-100 text-green-700 text-xs font-bold">
                Save 2 months
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`bg-white border rounded-xl shadow-sm overflow-hidden transition hover:shadow-md ${
                tier.highlighted
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-[#E8ECF4]'
              }`}
            >
              {tier.highlighted && (
                <div className="bg-primary text-white text-center py-2 text-xs font-semibold">
                  Most Popular
                </div>
              )}
              
              <div className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {tier.name}
                </h3>
                <p className="text-sm text-gray-500 mb-4">{tier.description}</p>
                
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-gray-900">
                      ${getDisplayPrice(tier)}
                    </span>
                    {tier.priceMonthly > 0 && (
                      <span className="text-gray-500 text-sm">
                        /{billingPeriod === 'monthly' ? 'month' : 'year'}
                      </span>
                    )}
                  </div>
                  {billingPeriod === 'annual' && getSavings(tier) && (
                    <p className="text-xs text-green-600 mt-1">
                      Save ${getSavings(tier)} per year
                    </p>
                  )}
                </div>

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

                <ul className="space-y-3">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        className="flex-shrink-0 mt-0.5 text-green-500"
                      >
                        <path
                          d="M3 8l3 3 7-7"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Pay Per Batch Option */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-8 mb-12">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-8">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Just need one batch?
              </h3>
              <p className="text-gray-600 mb-1">
                <span className="font-bold text-gray-900">$9</span> one-time payment for a single batch of up to 100 certificates.
              </p>
              <p className="text-sm text-gray-500">
                No subscription needed. Perfect for occasional use.
              </p>
            </div>
            <button
              onClick={handlePayPerBatch}
              className="px-6 py-3 rounded-[10px] bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition whitespace-nowrap"
            >
              Buy a single batch
            </button>
          </div>
        </div>

        {/* Feature Comparison Table */}
        <div className="bg-white border border-[#E8ECF4] rounded-xl shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-[#E8ECF4]">
            <h2 className="text-xl font-bold text-gray-900">
              Compare all features
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-8 py-4 text-left text-sm font-semibold text-gray-900">
                    Features
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                    Free
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 bg-primary/5">
                    Starter
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                    Growth
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                    Pro
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8ECF4]">
                <tr>
                  <td className="px-8 py-4 text-sm text-gray-700">Certificates per month</td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-center">25</td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-center font-medium bg-primary/5">300</td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-center">1,500</td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-center">Unlimited</td>
                </tr>
                <tr>
                  <td className="px-8 py-4 text-sm text-gray-700">Templates</td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-center">1</td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-center font-medium bg-primary/5">5</td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-center">Unlimited</td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-center">Unlimited</td>
                </tr>
                <tr>
                  <td className="px-8 py-4 text-sm text-gray-700">Email sending</td>
                  <td className="px-6 py-4 text-center">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mx-auto text-green-500">
                      <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </td>
                  <td className="px-6 py-4 text-center bg-primary/5">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mx-auto text-green-500">
                      <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mx-auto text-green-500">
                      <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mx-auto text-green-500">
                      <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </td>
                </tr>
                <tr>
                  <td className="px-8 py-4 text-sm text-gray-700">Custom branding</td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-gray-300">—</span>
                  </td>
                  <td className="px-6 py-4 text-center bg-primary/5">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mx-auto text-green-500">
                      <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mx-auto text-green-500">
                      <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mx-auto text-green-500">
                      <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </td>
                </tr>
                <tr>
                  <td className="px-8 py-4 text-sm text-gray-700">Custom email domain</td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-gray-300">—</span>
                  </td>
                  <td className="px-6 py-4 text-center bg-primary/5">
                    <span className="text-gray-300">—</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mx-auto text-green-500">
                      <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mx-auto text-green-500">
                      <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </td>
                </tr>
                <tr>
                  <td className="px-8 py-4 text-sm text-gray-700">Team members</td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-center">1</td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-center font-medium bg-primary/5">1</td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-center">1</td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-center">5</td>
                </tr>
                <tr>
                  <td className="px-8 py-4 text-sm text-gray-700">White-label branding</td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-gray-300">—</span>
                  </td>
                  <td className="px-6 py-4 text-center bg-primary/5">
                    <span className="text-gray-300">—</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-gray-300">—</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mx-auto text-green-500">
                      <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </td>
                </tr>
                <tr>
                  <td className="px-8 py-4 text-sm text-gray-700">API access</td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-gray-300">—</span>
                  </td>
                  <td className="px-6 py-4 text-center bg-primary/5">
                    <span className="text-gray-300">—</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-gray-300">—</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mx-auto text-green-500">
                      <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </td>
                </tr>
                <tr>
                  <td className="px-8 py-4 text-sm text-gray-700">Support</td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-center">Basic</td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-center font-medium bg-primary/5">Email</td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-center">Priority</td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-center">Dedicated</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
