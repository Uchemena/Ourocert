'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'

export interface UserTemplate {
  id: string
  name: string
  type: 'upload' | 'designed' | 'starter'
  thumbnail_url: string | null
  field_count: number
  created_at: string
}

interface Props {
  template: UserTemplate
  onDelete: (id: string) => void
}

export default function UserTemplateCard({ template, onDelete }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()

  const TYPE_LABEL: Record<UserTemplate['type'], string> = {
    upload: 'Uploaded',
    designed: 'Designed',
    starter: 'Starter',
  }

  function handleDeleteClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setConfirming(true)
  }

  function handleCancel(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setConfirming(false)
  }

  function handleConfirm(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    startTransition(() => {
      onDelete(template.id)
    })
  }

  return (
    <div className="group relative bg-white border border-[#E8ECF4] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Thumbnail */}
      <div className="aspect-[400/280] bg-gray-50 relative overflow-hidden">
        {template.thumbnail_url ? (
          <Image
            src={template.thumbnail_url}
            alt={template.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect x="4" y="3" width="32" height="34" rx="4" stroke="#CBD5E1" strokeWidth="2"/>
              <path d="M11 14h18M11 20h18M11 26h10" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
        )}

        {/* Delete overlay — visible on hover or confirming */}
        {!confirming && (
          <button
            onClick={handleDeleteClick}
            aria-label="Delete template"
            className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-white/90 border border-[#E8ECF4] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:border-red-200"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M11.5 3.5l-.7 7.7a1 1 0 01-1 .8H4.2a1 1 0 01-1-.8L2.5 3.5" stroke="#EF4444" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}

        {/* Delete confirmation — inline, no modal */}
        {confirming && (
          <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center gap-3 p-4">
            <p className="text-xs font-semibold text-gray-900 text-center">Delete this template?</p>
            <p className="text-xs text-gray-400 text-center leading-relaxed">
              This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className="px-3 py-1.5 rounded-lg border border-[#E8ECF4] text-xs font-medium text-gray-500 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isPending}
                className="px-3 py-1.5 rounded-lg bg-red-500 text-xs font-semibold text-white hover:bg-red-600 transition disabled:opacity-60"
              >
                {isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2.5 border-t border-[#E8ECF4]">
        <p className="text-sm font-semibold text-gray-900 truncate">{template.name}</p>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-xs text-gray-400">{TYPE_LABEL[template.type]}</span>
          <span className="text-xs text-gray-400">{template.field_count} field{template.field_count !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  )
}
