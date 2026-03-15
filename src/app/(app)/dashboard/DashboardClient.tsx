'use client'

import Link from 'next/link'
import { useState } from 'react'

type Batch = {
  id: string
  name: string
  status: 'draft' | 'generating' | 'sent' | 'failed'
  recipient_count: number
  category?: string | null
  scheduled_for?: string | null
  created_at: string
}

const STATUS_CONFIG = {
  draft:      { label: 'Draft',      cls: 'bg-orange-50 text-orange-600 ring-1 ring-orange-200/80' },
  generating: { label: 'Generating', cls: 'bg-blue-50   text-blue-600   ring-1 ring-blue-200/80'   },
  sent:       { label: 'Sent',       cls: 'bg-green-50  text-green-600  ring-1 ring-green-200/80'  },
  failed:     { label: 'Failed',     cls: 'bg-red-50    text-red-600    ring-1 ring-red-200/80'    },
} as const

function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
}

function sanitizeText(text: string | null | undefined, maxLength = 200): string {
  if (!text) return ''
  return text.replace(/<[^>]*>/g, '').replace(/[<>"']/g, '').slice(0, maxLength).trim()
}

function formatDate(d: string) {
  try {
    const date = new Date(d)
    if (isNaN(date.getTime())) return 'Invalid date'
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return 'Invalid date'
  }
}

interface Props {
  batches: Batch[]
  uniqueCategories: string[]
  totalBatches: number
}

export default function DashboardClient({ batches, uniqueCategories, totalBatches }: Props) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const filteredBatches = activeCategory
    ? batches.filter(b => b.category === activeCategory)
    : batches

  return (
    <div className="bg-white border border-[#E8ECF4] rounded-xl shadow-sm overflow-hidden">

      {/* Section header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-[#E8ECF4]">
        <h2 className="text-sm font-semibold text-gray-900">Recent Batches</h2>
        {batches.length > 0 && (
          <span className="text-xs text-gray-400">{totalBatches} total</span>
        )}
      </div>

      {/* Category filter pills */}
      {uniqueCategories.length > 0 && (
        <div className="px-5 py-3 flex gap-2 flex-wrap border-b border-[#E8ECF4] bg-gray-50/50">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
              !activeCategory
                ? 'bg-primary text-white'
                : 'bg-white border border-[#E8ECF4] text-gray-600 hover:border-primary/30'
            }`}
          >
            All
          </button>
          {uniqueCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                activeCategory === cat
                  ? 'bg-primary text-white'
                  : 'bg-white border border-[#E8ECF4] text-gray-600 hover:border-primary/30'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {batches.length === 0 && (
        <div className="py-16 flex flex-col items-center justify-center text-center px-4">
          <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="2" width="18" height="20" rx="3" stroke="#3B5BDB" strokeWidth="1.8"/>
              <path d="M8 8h8M8 12h8M8 16h5" stroke="#3B5BDB" strokeWidth="1.8" strokeLinecap="round"/>
              <circle cx="18" cy="18" r="4.5" fill="#3B5BDB"/>
              <path d="M16.5 18h3M18 16.5v3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">No certificates yet</h3>
          <p className="text-sm text-gray-400 mb-5 max-w-xs">
            Create your first batch to get started. It only takes a few minutes.
          </p>
          <Link href="/batch/new">
            <button className="px-4 py-2.5 rounded-[10px] bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-[0.99] transition">
              Create your first batch
            </button>
          </Link>
        </div>
      )}

      {/* Filtered empty state */}
      {batches.length > 0 && filteredBatches.length === 0 && (
        <div className="py-10 text-center text-sm text-gray-400">
          No batches in &ldquo;{activeCategory}&rdquo;
        </div>
      )}

      {/* Batch rows */}
      {filteredBatches.map((batch, i) => {
        const { label, cls } = STATUS_CONFIG[batch.status] ?? STATUS_CONFIG.draft
        const batchHref = isValidUUID(batch.id) ? `/batch/${batch.id}` : '#'
        const sanitizedName = sanitizeText(batch.name, 200)
        const safeRecipientCount = Math.max(0, Math.floor(batch.recipient_count))

        return (
          <Link
            key={batch.id}
            href={batchHref}
            className={[
              'flex items-center gap-4 px-5 py-4 hover:bg-gray-50/80 transition-colors',
              i < filteredBatches.length - 1 ? 'border-b border-[#E8ECF4]' : '',
            ].join(' ')}
          >
            {/* Name + date */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-gray-900 truncate">{sanitizedName}</p>
                {batch.category && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium flex-shrink-0">
                    {batch.category}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-400 flex-wrap">
                <span>{formatDate(batch.created_at)}</span>
                <span>·</span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0">
                  <circle cx="6" cy="3.5" r="2" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M1 10.5c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                <span>{safeRecipientCount} recipient{safeRecipientCount !== 1 ? 's' : ''}</span>
                {batch.status === 'draft' && batch.scheduled_for && (
                  <>
                    <span>·</span>
                    <span className="text-blue-600 font-medium">
                      Scheduled: {new Date(batch.scheduled_for).toLocaleString('en-US', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Status badge */}
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${cls}`}>
              {label}
            </span>

            {/* Chevron */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-300 flex-shrink-0">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        )
      })}
    </div>
  )
}
