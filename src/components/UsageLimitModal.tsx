'use client'

import Link from 'next/link'

type UsageLimitModalProps = {
  isOpen: boolean
  onClose: () => void
  currentUsage: number
  limit: number
  plan: string
}

export default function UsageLimitModal({ 
  isOpen, 
  onClose, 
  currentUsage, 
  limit,
  plan 
}: UsageLimitModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
          title="Close"
          aria-label="Close modal"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M5 5l10 10M15 5l-10 10"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {/* Icon */}
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mx-auto mb-4">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path
              d="M16 10v6M16 20h.01"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Content */}
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
          You've reached your limit! 🎉
        </h2>
        <p className="text-gray-600 text-center mb-6">
          You've sent <span className="font-bold text-gray-900">{currentUsage}</span> certificates this month — nice work!
          <br />
          Upgrade to Starter to send up to <span className="font-bold text-primary">300 certificates</span>.
        </p>

        {/* Current plan badge */}
        <div className="bg-gray-50 border border-[#E8ECF4] rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Current Plan</span>
            <span className="px-3 py-1 rounded-full bg-gray-200 text-gray-700 text-xs font-semibold uppercase">
              {plan}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-red-500 transition-all"
              style={{ width: `${Math.min((currentUsage / limit) * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {currentUsage} of {limit} certificates used
          </p>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <Link
            href="/pricing"
            className="block w-full py-3 rounded-[10px] bg-primary text-white text-center text-sm font-semibold hover:bg-primary/90 transition"
          >
            Upgrade to Starter — $19/month
          </Link>
          <button
            onClick={onClose}
            className="block w-full py-3 rounded-[10px] bg-gray-100 text-gray-700 text-center text-sm font-semibold hover:bg-gray-200 transition"
          >
            Maybe later
          </button>
        </div>

        {/* Pay per batch option */}
        <div className="mt-6 pt-6 border-t border-[#E8ECF4] text-center">
          <p className="text-xs text-gray-500 mb-3">
            Just need one more batch?
          </p>
          <Link
            href="/pricing"
            className="text-sm text-primary font-semibold hover:underline"
          >
            Pay $9 for a single batch (100 certificates) →
          </Link>
        </div>
      </div>
    </div>
  )
}
