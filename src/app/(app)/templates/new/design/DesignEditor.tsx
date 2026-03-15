// src/app/(app)/templates/new/design/DesignEditor.tsx
'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toPng } from 'html-to-image'
import { createClient } from '@/lib/supabase/client'
import CertificatePreview, { STYLE_CONFIGS } from './CertificatePreview'
import type { CertificateConfig } from './CertificatePreview'
import {
  FIELD_POSITIONS, FIELD_SIZES, FIELD_COLOR_PRESETS, DEFAULT_CERTIFICATE_FIELDS,
} from '@/lib/certificate-types'
import type { CertificateField, FieldPosition, FieldSize } from '@/lib/certificate-types'
import ErrorMessage from '@/components/ErrorMessage'
import type { RichError } from '@/components/ErrorMessage'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'style' | 'brand' | 'fields'
type EditorStep = 'design' | 'save'

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  initialOrgName?: string
}

export default function DesignEditor({ initialOrgName = '' }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const previewRef = useRef<HTMLDivElement>(null)

  const [editorStep, setEditorStep] = useState<EditorStep>('design')
  const [activeTab, setActiveTab]   = useState<Tab>('style')

  // Style
  const [selectedStyleId, setSelectedStyleId] = useState(STYLE_CONFIGS[0].id)
  const selectedStyle = STYLE_CONFIGS.find((s) => s.id === selectedStyleId) ?? STYLE_CONFIGS[0]

  // Brand
  const [orgName, setOrgName]   = useState(initialOrgName)
  const [logoText, setLogoText] = useState('')

  // Fields
  const [fields, setFields]               = useState<CertificateField[]>(DEFAULT_CERTIFICATE_FIELDS)
  const [activeFieldId, setActiveFieldId] = useState<string>('1')

  // Save
  const [templateName, setTemplateName] = useState('')
  const [saving, setSaving]             = useState(false)
  const [saveError, setSaveError]       = useState<RichError | null>(null)

  // ── Field operations ──────────────────────────────────────────────────────

  function addField() {
    if (fields.length >= 8) return
    const newField: CertificateField = {
      id: Date.now().toString(),
      name: 'New Field',
      position: 'Center Medium',
      size: 'Medium',
      color: '#1B2A4A',
      font: 'Outfit',
    }
    setFields((prev) => [...prev, newField])
    setActiveFieldId(newField.id)
    setActiveTab('fields')
  }

  function updateField(id: string, update: Partial<CertificateField>) {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...update } : f)))
  }

  function deleteField(id: string) {
    const remaining = fields.filter((f) => f.id !== id)
    setFields(remaining)
    if (activeFieldId === id && remaining.length > 0) setActiveFieldId(remaining[0].id)
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!templateName.trim()) return
    setSaving(true)
    setSaveError(null)

    try {
      const limitRes = await fetch('/api/templates/check-limit')
      const limitData = await limitRes.json()
      if (limitData.atLimit) {
        setSaveError({
          tier: 'user',
          title: 'Template limit reached',
          message: `You've reached the template limit for your plan (${limitData.limit}). Please upgrade to create more templates.`,
          action: { label: 'Upgrade plan', onClick: () => router.push('/settings') },
        })
        setSaving(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Generate thumbnail from the live preview
      let thumbnailUrl: string | null = null
      if (previewRef.current) {
        try {
          const dataUrl = await toPng(previewRef.current, { pixelRatio: 1 })
          const blob = await (await fetch(dataUrl)).blob()
          const thumbPath = `${user.id}/thumb_${crypto.randomUUID()}.png`
          const { error: thumbErr } = await supabase.storage
            .from('certificate-templates')
            .upload(thumbPath, blob, { contentType: 'image/png' })
          if (!thumbErr) {
            const { data: urlData } = supabase.storage
              .from('certificate-templates')
              .getPublicUrl(thumbPath)
            thumbnailUrl = urlData.publicUrl
          }
        } catch {
          // Continue without thumbnail if capture fails
        }
      }

      const { error: insertError } = await supabase.from('templates').insert({
        user_id:       user.id,
        name:          templateName.trim(),
        type:          'designed',
        style:         selectedStyleId,
        fields:        fields,
        org_name:      orgName || null,
        logo_text:     logoText || null,
        thumbnail_url: thumbnailUrl,
        field_count:   fields.length,
        file_url:      null,
      })

      if (insertError) throw insertError

      router.push('/templates')
    } catch {
      setSaveError({
        tier: 'system',
        title: "Couldn't save your template",
        message: "Your template couldn't be saved right now. Please try again — your design has not been lost.",
        action: { label: 'Try again', onClick: handleSave },
        showSupport: true,
      })
      setSaving(false)
    }
  }

  // ── Live preview config ────────────────────────────────────────────────────

  const certConfig: CertificateConfig = {
    style: selectedStyle,
    orgName,
    logoText,
    fields,
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SAVE STEP
  // ─────────────────────────────────────────────────────────────────────────────

  if (editorStep === 'save') {
    return (
      <div className="px-6 py-8 md:px-8 md:py-10 max-w-5xl mx-auto">
        <button
          onClick={() => setEditorStep('design')}
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition mb-6"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to editor
        </button>

        <div className="max-w-md mx-auto">
          <h1 className="text-xl font-bold text-gray-900 mb-1 text-center">Almost there!</h1>
          <p className="text-sm text-gray-400 mb-8 text-center">
            Give your template a name so you can find it later.
          </p>

          <div className="bg-white border border-[#E8ECF4] rounded-xl shadow-sm p-6 space-y-5">
            {/* Name input */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Template name</label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && templateName.trim() && !saving) handleSave() }}
                placeholder="e.g. Spring Workshop Certificate"
                autoFocus
                className="w-full px-4 py-2.5 rounded-[10px] border border-[#E8ECF4] text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
            </div>

            {/* Summary */}
            <div className="bg-[#F7F8FC] rounded-xl p-4 space-y-2.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Summary</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Type</span>
                <span className="text-xs font-semibold text-gray-800">Designed</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Style</span>
                <span className="text-xs font-semibold text-gray-800">{selectedStyle.label}</span>
              </div>
              {orgName && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Organisation</span>
                  <span className="text-xs font-semibold text-gray-800 truncate max-w-[180px] text-right">{orgName}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Fields</span>
                <span className="text-xs font-semibold text-gray-800">{fields.length}</span>
              </div>
              <div className="pt-2 border-t border-[#E8ECF4]">
                <p className="text-xs text-gray-400 mb-2 mt-2">Field names</p>
                <div className="flex flex-wrap gap-1.5">
                  {fields.map((f) => (
                    <span
                      key={f.id}
                      className="inline-flex items-center px-2.5 py-1 rounded-full bg-white border border-[#E8ECF4] text-xs font-medium text-gray-700"
                    >
                      {f.name || 'Unnamed'}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Mini preview */}
            <div className="rounded-xl overflow-hidden border border-[#E8ECF4]">
              <CertificatePreview ref={previewRef} config={certConfig} />
            </div>

            {saveError && (
              <ErrorMessage {...saveError} />
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setEditorStep('design')}
                disabled={saving}
                className="px-4 py-2.5 rounded-[10px] border border-[#E8ECF4] text-sm font-medium text-gray-500 hover:bg-gray-50 transition disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handleSave}
                disabled={!templateName.trim() || saving}
                className="flex-1 py-2.5 rounded-[10px] bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-[0.99] transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving && <Spinner />}
                {saving ? 'Saving…' : 'Save template ✓'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DESIGN STEP — split layout
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="px-6 py-8 md:px-8 md:py-10 max-w-5xl mx-auto">
      <Link
        href="/templates/new"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition mb-6"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Back
      </Link>

      <div className="flex flex-col lg:flex-row gap-5 items-start">

        {/* ── LEFT PANEL ── */}
        <div className="w-full lg:w-[360px] flex-shrink-0 flex flex-col gap-4">
          <div className="bg-white border border-[#E8ECF4] rounded-xl shadow-sm overflow-hidden">

            {/* Tab bar */}
            <div className="flex border-b border-[#E8ECF4]">
              {(['style', 'brand', 'fields'] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={[
                    'flex-1 py-3 text-xs font-semibold capitalize transition-colors',
                    activeTab === tab
                      ? 'text-primary border-b-2 border-primary bg-primary/3'
                      : 'text-gray-400 hover:text-gray-700',
                  ].join(' ')}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* ── STYLE TAB ── */}
            {activeTab === 'style' && (
              <div className="p-4">
                <p className="text-xs font-semibold text-gray-500 mb-3">Choose a style</p>
                <div className="grid grid-cols-3 gap-2">
                  {STYLE_CONFIGS.map((style) => {
                    const selected = selectedStyleId === style.id
                    return (
                      <button
                        key={style.id}
                        onClick={() => setSelectedStyleId(style.id)}
                        className={[
                          'relative rounded-xl border-2 p-1.5 transition-all hover:shadow-sm',
                          selected
                            ? 'border-primary shadow-md'
                            : 'border-transparent hover:border-gray-200',
                        ].join(' ')}
                      >
                        {/* Mini certificate card */}
                        <div
                          className="rounded-lg overflow-hidden"
                          style={{ aspectRatio: '4/3', backgroundColor: style.bg }}
                        >
                          {/* Top bar */}
                          <div style={{ height: '3px', backgroundColor: style.accent }} />
                          {/* Frame border */}
                          <div style={{
                            margin: '3px',
                            border: `1px solid ${style.frame}`,
                            borderRadius: '2px',
                            height: 'calc(100% - 6px)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '2px',
                          }}>
                            <div style={{ width: '40%', height: '1.5px', backgroundColor: style.accent, opacity: 0.6 }} />
                            <div style={{ width: '60%', height: '1.5px', backgroundColor: style.line }} />
                            <div style={{ width: '40%', height: '1.5px', backgroundColor: style.line, opacity: 0.5 }} />
                          </div>
                          {/* Bottom bar */}
                          <div style={{ height: '3px', backgroundColor: style.accent, marginTop: '-3px' }} />
                        </div>

                        <p className="text-center mt-1.5 text-xs font-medium text-gray-700 leading-tight">{style.label}</p>

                        {/* Selected checkmark */}
                        {selected && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                            <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                              <path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── BRAND TAB ── */}
            {activeTab === 'brand' && (
              <div className="p-4 space-y-4">
                <p className="text-xs font-semibold text-gray-500">Your brand</p>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Organisation name
                  </label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Your Organisation"
                    className="w-full px-3 py-2 rounded-[8px] border border-[#E8ECF4] text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                  />
                  <p className="text-xs text-gray-400 mt-1">Shown at the top of the certificate</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Tagline or website <span className="text-gray-300 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={logoText}
                    onChange={(e) => setLogoText(e.target.value)}
                    placeholder="www.yoursite.com"
                    className="w-full px-3 py-2 rounded-[8px] border border-[#E8ECF4] text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                  />
                  <p className="text-xs text-gray-400 mt-1">Shown below the organisation name</p>
                </div>
              </div>
            )}

            {/* ── FIELDS TAB ── */}
            {activeTab === 'fields' && (
              <div>
                <div className="px-4 py-3 border-b border-[#E8ECF4]">
                  <p className="text-xs font-semibold text-gray-500">
                    What information goes on this certificate?
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{fields.length} of 8 fields</p>
                </div>

                <div className="divide-y divide-[#F0F3FB]">
                  {fields.map((field) => (
                    <FieldCard
                      key={field.id}
                      field={field}
                      isActive={activeFieldId === field.id}
                      onActivate={() => setActiveFieldId(field.id)}
                      onChange={(update) => updateField(field.id, update)}
                      onDelete={() => deleteField(field.id)}
                      canDelete={fields.length > 1}
                    />
                  ))}
                </div>

                {fields.length < 8 && (
                  <div className="px-4 py-3 border-t border-[#E8ECF4]">
                    <button
                      onClick={addField}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[10px] border border-dashed border-[#D1D8EF] text-sm font-medium text-primary hover:bg-primary/5 hover:border-primary transition"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M7 1.5v11M1.5 7h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                      </svg>
                      Add another field
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Action buttons ── */}
          <div className="flex gap-3">
            <Link
              href="/templates/new"
              className="px-4 py-2.5 rounded-[10px] border border-[#E8ECF4] text-sm font-medium text-gray-500 hover:bg-gray-50 transition"
            >
              ← Back
            </Link>
            <button
              onClick={() => setEditorStep('save')}
              className="flex-1 py-2.5 rounded-[10px] bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-[0.99] transition"
            >
              Save template →
            </button>
          </div>
        </div>

        {/* ── RIGHT PANEL — live preview ── */}
        <div className="flex-1 min-w-0 w-full">
          <div className="bg-white border border-[#E8ECF4] rounded-xl shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-[#E8ECF4] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Live Preview
                </p>
              </div>
              <p className="text-xs text-gray-400">Updates as you edit</p>
            </div>

            {/* Dotted grid background + certificate */}
            <div
              className="p-5"
              style={{
                backgroundImage: 'radial-gradient(circle, #CBD5E1 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            >
              <div className="rounded-xl overflow-hidden shadow-md">
                <CertificatePreview ref={previewRef} config={certConfig} />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-white/80 flex-shrink-0" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  )
}

// ─── Field Card ───────────────────────────────────────────────────────────────

interface FieldCardProps {
  field: CertificateField
  isActive: boolean
  onActivate: () => void
  onChange: (update: Partial<CertificateField>) => void
  onDelete: () => void
  canDelete: boolean
}

function FieldCard({ field, isActive, onActivate, onChange, onDelete, canDelete }: FieldCardProps) {
  return (
    <div
      onClick={onActivate}
      className={[
        'px-4 py-4 cursor-pointer transition-colors',
        isActive
          ? 'bg-primary/5 border-l-[3px] border-primary'
          : 'hover:bg-gray-50/80 border-l-[3px] border-transparent',
      ].join(' ')}
    >
      {/* Name + delete */}
      <div className="flex items-center gap-2 mb-3">
        <input
          type="text"
          value={field.name}
          onChange={(e) => onChange({ name: e.target.value })}
          onFocus={onActivate}
          onClick={(e) => e.stopPropagation()}
          placeholder="Field name"
          className="flex-1 px-3 py-1.5 rounded-[8px] border border-[#E8ECF4] text-sm font-semibold text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition bg-white"
        />
        {canDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition flex-shrink-0"
            aria-label="Delete field"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M11.5 3.5l-.7 7.7a1 1 0 01-1 .8H4.2a1 1 0 01-1-.8L2.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>

      {/* Position + Size dropdowns */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Position</label>
          <select
            value={field.position}
            onChange={(e) => onChange({ position: e.target.value as FieldPosition })}
            onClick={(e) => e.stopPropagation()}
            className="w-full px-2 py-1.5 rounded-[8px] border border-[#E8ECF4] text-xs text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition cursor-pointer"
          >
            {FIELD_POSITIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Size</label>
          <select
            value={field.size}
            onChange={(e) => onChange({ size: e.target.value as FieldSize })}
            onClick={(e) => e.stopPropagation()}
            className="w-full px-2 py-1.5 rounded-[8px] border border-[#E8ECF4] text-xs text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition cursor-pointer"
          >
            {FIELD_SIZES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Color swatches */}
      <div>
        <label className="block text-xs text-gray-400 mb-1.5">Colour</label>
        <div className="flex gap-2 flex-wrap">
          {FIELD_COLOR_PRESETS.map((preset) => (
            <button
              key={preset.value}
              title={preset.label}
              onClick={(e) => { e.stopPropagation(); onChange({ color: preset.value }) }}
              className={[
                'w-6 h-6 rounded-full transition-all hover:scale-110',
                field.color === preset.value ? 'ring-2 ring-offset-2 ring-gray-700 scale-110' : '',
              ].join(' ')}
              style={{ backgroundColor: preset.value }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
