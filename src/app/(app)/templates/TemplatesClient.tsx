'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import UserTemplateCard, { type UserTemplate } from '@/components/UserTemplateCard'
import StarterTemplateCanvas, { STARTER_TEMPLATES } from '@/components/StarterTemplateCanvas'

interface Props {
  initialTemplates: UserTemplate[]
}

export default function TemplatesClient({ initialTemplates }: Props) {
  const [templates, setTemplates] = useState<UserTemplate[]>(initialTemplates)
  const supabase = createClient()

  async function handleDelete(id: string) {
    const { error } = await supabase.from('templates').delete().eq('id', id)
    if (!error) {
      setTemplates((prev) => prev.filter((t) => t.id !== id))
    }
  }

  return (
    <div className="px-6 py-8 md:px-8 md:py-10 max-w-5xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Templates</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {templates.length === 0
              ? 'No templates yet'
              : `${templates.length} template${templates.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Link href="/templates/new">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-[0.99] transition whitespace-nowrap">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1.5v11M1.5 7h11" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            New Template
          </button>
        </Link>
      </div>

      {/* ── Your Templates ── */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Your Templates</h2>

        {templates.length === 0 ? (
          <div className="bg-white border border-[#E8ECF4] rounded-xl shadow-sm p-10 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="2" width="18" height="20" rx="3" stroke="#3B5BDB" strokeWidth="1.8"/>
                <path d="M8 8h8M8 12h8M8 16h5" stroke="#3B5BDB" strokeWidth="1.8" strokeLinecap="round"/>
                <circle cx="18" cy="18" r="4.5" fill="#3B5BDB"/>
                <path d="M16.5 18h3M18 16.5v3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">No templates yet</h3>
            <p className="text-sm text-gray-400 mb-5 max-w-xs">
              Upload a design or build one from scratch. You can also start from one of our starter templates below.
            </p>
            <Link href="/templates/new">
              <button className="px-4 py-2.5 rounded-[10px] bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-[0.99] transition">
                Create a template
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((t) => (
              <UserTemplateCard key={t.id} template={t} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </section>

      {/* ── Starter Templates ── */}
      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Starter Templates</h2>
          <span className="text-xs text-gray-400">Ready to use · free</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {STARTER_TEMPLATES.map((starter) => (
            <div
              key={starter.id}
              className="bg-white border border-[#E8ECF4] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
            >
              {/* Canvas preview */}
              <div className="aspect-[400/280] overflow-hidden relative">
                <StarterTemplateCanvas
                  templateId={starter.id}
                  width={400}
                  height={280}
                  className="w-full h-full object-cover"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-[#E8ECF4] text-xs font-semibold text-primary px-3 py-1.5 rounded-lg shadow-sm">
                    Use this template
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="px-3 py-2.5 border-t border-[#E8ECF4]">
                <p className="text-sm font-semibold text-gray-900 truncate">{starter.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{starter.industry}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}
