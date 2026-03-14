'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { CSSProperties, ChangeEvent, DragEvent } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3

type Position =
  | 'Top Center'
  | 'Upper Middle'
  | 'Center Large'
  | 'Center Medium'
  | 'Lower Middle'
  | 'Bottom Left'
  | 'Bottom Center'
  | 'Bottom Right'

type Size = 'Small' | 'Medium' | 'Large' | 'Extra Large'

interface Field {
  id: string
  name: string
  position: Position
  size: Size
  color: string
  font: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const POSITIONS: Position[] = [
  'Top Center',
  'Upper Middle',
  'Center Large',
  'Center Medium',
  'Lower Middle',
  'Bottom Left',
  'Bottom Center',
  'Bottom Right',
]

const SIZES: Size[] = ['Small', 'Medium', 'Large', 'Extra Large']

const COLOR_PRESETS = [
  { label: 'Navy',   value: '#1B2A4A' },
  { label: 'Blue',   value: '#3B5BDB' },
  { label: 'Green',  value: '#166534' },
  { label: 'Purple', value: '#6B21A8' },
  { label: 'Red',    value: '#DC2626' },
  { label: 'Amber',  value: '#CA8A04' },
  { label: 'Black',  value: '#111827' },
  { label: 'Gray',   value: '#6B7280' },
]

const POSITION_STYLES: Record<Position, CSSProperties> = {
  'Top Center':    { top: '8%',  left: '50%', transform: 'translateX(-50%)' },
  'Upper Middle':  { top: '27%', left: '50%', transform: 'translateX(-50%)' },
  'Center Large':  { top: '44%', left: '50%', transform: 'translate(-50%, -50%)' },
  'Center Medium': { top: '57%', left: '50%', transform: 'translateX(-50%)' },
  'Lower Middle':  { top: '70%', left: '50%', transform: 'translateX(-50%)' },
  'Bottom Left':   { bottom: '10%', left: '8%' },
  'Bottom Center': { bottom: '10%', left: '50%', transform: 'translateX(-50%)' },
  'Bottom Right':  { bottom: '10%', right: '8%' },
}

const DEFAULT_FIELDS: Field[] = [
  { id: '1', name: 'Recipient Name', position: 'Center Large',  size: 'Extra Large', color: '#1B2A4A', font: 'Playfair Display' },
  { id: '2', name: 'Date',           position: 'Bottom Center', size: 'Small',       color: '#6B7280', font: 'Outfit'           },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function UploadEditor() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep]         = useState<Step>(1)

  // Step 1
  const [file, setFile]           = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [fileError, setFileError]   = useState<string | null>(null)

  // Step 2
  const [fields, setFields]           = useState<Field[]>(DEFAULT_FIELDS)
  const [activeFieldId, setActiveFieldId] = useState<string>('1')

  // Step 3
  const [templateName, setTemplateName] = useState('')
  const [saving, setSaving]             = useState(false)
  const [saveError, setSaveError]       = useState<string | null>(null)

  // ── File handling ────────────────────────────────────────────────────────

  function processFile(f: File) {
    const allowed = ['image/png', 'image/jpeg', 'application/pdf']
    if (!allowed.includes(f.type)) {
      setFileError('Please upload a PNG, JPG, or PDF file.')
      return
    }
    if (f.size > 20 * 1024 * 1024) {
      setFileError('File is too large. Please keep it under 20 MB.')
      return
    }
    setFileError(null)
    setFile(f)
    if (f.type !== 'application/pdf') {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(URL.createObjectURL(f))
    } else {
      setPreviewUrl(null)
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) processFile(f)
    e.target.value = '' // allow re-selecting same file
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) processFile(f)
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave() { setIsDragging(false) }

  // ── Fields ───────────────────────────────────────────────────────────────

  function addField() {
    if (fields.length >= 8) return
    const newField: Field = {
      id: Date.now().toString(),
      name: 'New Field',
      position: 'Center Medium',
      size: 'Medium',
      color: '#1B2A4A',
      font: 'Outfit',
    }
    setFields((prev) => [...prev, newField])
    setActiveFieldId(newField.id)
  }

  function updateField(id: string, update: Partial<Field>) {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...update } : f)))
  }

  function deleteField(id: string) {
    const remaining = fields.filter((f) => f.id !== id)
    setFields(remaining)
    if (activeFieldId === id && remaining.length > 0) {
      setActiveFieldId(remaining[0].id)
    }
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!file || !templateName.trim()) return
    setSaving(true)
    setSaveError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
      const storagePath = `${user.id}/${crypto.randomUUID()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('certificate-templates')
        .upload(storagePath, file, { contentType: file.type })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('certificate-templates')
        .getPublicUrl(storagePath)

      const { error: insertError } = await supabase.from('templates').insert({
        user_id:       user.id,
        name:          templateName.trim(),
        type:          'upload',
        file_url:      urlData.publicUrl,
        thumbnail_url: file.type !== 'application/pdf' ? urlData.publicUrl : null,
        field_count:   fields.length,
        fields:        fields,
      })

      if (insertError) throw insertError

      router.push('/templates')
    } catch {
      setSaveError('Something went wrong saving your template. Please try again.')
      setSaving(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="px-6 py-8 md:px-8 md:py-10 max-w-5xl mx-auto">

      {/* Back */}
      <Link
        href="/templates/new"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition mb-6"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Back
      </Link>

      <StepBar current={step} />

      {/* ─────────────────────────── STEP 1: Upload ─────────────────────────── */}
      {step === 1 && (
        <div className="max-w-xl mx-auto">
          <h1 className="text-xl font-bold text-gray-900 mb-1 text-center">Upload your certificate design</h1>
          <p className="text-sm text-gray-400 mb-8 text-center">
            PNG, JPG, or PDF · designed in Canva, PowerPoint, or anywhere
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.pdf"
            className="hidden"
            onChange={handleFileChange}
          />

          {file ? (
            /* ── Success state ── */
            <div className="bg-white border border-[#E8ECF4] rounded-xl shadow-sm p-6">
              {/* Preview */}
              <div
                className="rounded-xl overflow-hidden border border-[#E8ECF4] mb-5 bg-gray-50 relative"
                style={{ aspectRatio: '4/3' }}
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Certificate preview"
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <svg className="mx-auto mb-3 text-gray-300" width="48" height="48" viewBox="0 0 48 48" fill="none">
                        <rect x="8" y="4" width="32" height="40" rx="4" stroke="currentColor" strokeWidth="2"/>
                        <path d="M16 20h16M16 26h16M16 32h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M30 4v10h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <p className="text-sm font-medium text-gray-400">PDF document</p>
                      <p className="text-xs text-gray-300 mt-1">Preview not available for PDFs</p>
                    </div>
                  </div>
                )}
              </div>

              {/* File info */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50 border border-green-200 mb-5">
                <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center flex-shrink-0">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7l3.5 3.5L12 2" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{file.name}</p>
                  <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
                </div>
                <button
                  onClick={() => {
                    setFile(null)
                    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null) }
                  }}
                  className="text-xs text-gray-400 hover:text-gray-700 transition flex-shrink-0"
                >
                  Change
                </button>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full py-3 rounded-[10px] bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-[0.99] transition"
              >
                Looks good, continue →
              </button>
            </div>
          ) : (
            /* ── Drop zone ── */
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={[
                'bg-white border-2 border-dashed rounded-xl px-8 py-16 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200',
                isDragging
                  ? 'border-primary bg-primary/5 scale-[1.01]'
                  : 'border-[#D1D8EF] hover:border-primary/60 hover:bg-gray-50/50',
              ].join(' ')}
            >
              <div className={[
                'w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-colors',
                isDragging ? 'bg-primary/15' : 'bg-primary/8',
              ].join(' ')}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M16 22V10M16 10l-5 5M16 10l5 5" stroke="#3B5BDB" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M5 24h22" stroke="#3B5BDB" strokeWidth="2.2" strokeLinecap="round"/>
                </svg>
              </div>

              <p className="text-base font-bold text-gray-900 mb-2">
                {isDragging ? 'Drop it here!' : 'Drop your certificate design here'}
              </p>
              <p className="text-sm text-gray-400 mb-7">
                PNG, JPG, or PDF — designed in Canva, PowerPoint, or anywhere
              </p>

              <span className="px-5 py-2.5 rounded-[10px] border border-[#E8ECF4] bg-white text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition pointer-events-none">
                Browse files
              </span>

              {fileError && (
                <p className="mt-5 text-xs text-red-500">{fileError}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────── STEP 2: Set Up Fields ─────────────────────── */}
      {step === 2 && (
        <div className="flex flex-col lg:flex-row gap-5 items-start">

          {/* ── Left panel ── */}
          <div className="w-full lg:w-[380px] flex-shrink-0">
            <div className="bg-white border border-[#E8ECF4] rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-4 border-b border-[#E8ECF4]">
                <h2 className="text-sm font-bold text-gray-900">
                  What information goes on this certificate?
                </h2>
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

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-[10px] border border-[#E8ECF4] text-sm font-medium text-gray-500 hover:bg-gray-50 transition"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-2.5 rounded-[10px] bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-[0.99] transition"
              >
                Continue →
              </button>
            </div>
          </div>

          {/* ── Right panel — live preview ── */}
          <div className="flex-1 min-w-0 w-full">
            <div className="bg-white border border-[#E8ECF4] rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-[#E8ECF4] flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Live Preview
                </p>
                <p className="text-xs text-gray-400">Click a badge to select a field</p>
              </div>

              <div className="p-4">
                <div
                  className="relative rounded-xl overflow-hidden border border-[#E8ECF4] bg-gray-50"
                  style={{ aspectRatio: '4/3' }}
                >
                  {/* Background */}
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Certificate template"
                      className="absolute inset-0 w-full h-full object-contain"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <svg className="mx-auto mb-2 text-gray-200" width="56" height="56" viewBox="0 0 56 56" fill="none">
                          <rect x="10" y="6" width="36" height="44" rx="4" stroke="currentColor" strokeWidth="2"/>
                          <path d="M18 24h20M18 30h20M18 36h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          <path d="M36 6v12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <p className="text-xs text-gray-400">PDF · fields will be applied when generating</p>
                      </div>
                    </div>
                  )}

                  {/* Field position badges */}
                  {fields.map((field) => (
                    <button
                      key={field.id}
                      onClick={() => setActiveFieldId(field.id)}
                      style={{ position: 'absolute', zIndex: 10, ...POSITION_STYLES[field.position] }}
                      className={[
                        'px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all',
                        activeFieldId === field.id
                          ? 'bg-primary text-white shadow-lg scale-105 ring-2 ring-primary/30'
                          : 'bg-white/95 text-gray-700 border border-dashed border-gray-300 hover:border-primary hover:text-primary hover:scale-105',
                      ].join(' ')}
                    >
                      {field.name || 'Unnamed field'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────── STEP 3: Save ─────────────────────────── */}
      {step === 3 && (
        <div className="max-w-md mx-auto">
          <h1 className="text-xl font-bold text-gray-900 mb-1 text-center">Almost there!</h1>
          <p className="text-sm text-gray-400 mb-8 text-center">
            Give your template a name so you can find it later.
          </p>

          <div className="bg-white border border-[#E8ECF4] rounded-xl shadow-sm p-6 space-y-5">
            {/* Name input */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Template name
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && templateName.trim() && !saving) handleSave()
                }}
                placeholder="e.g. Course Completion Certificate"
                autoFocus
                className="w-full px-4 py-2.5 rounded-[10px] border border-[#E8ECF4] text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
            </div>

            {/* Summary card */}
            <div className="bg-[#F7F8FC] rounded-xl p-4 space-y-2.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Summary
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Type</span>
                <span className="text-xs font-semibold text-gray-800">Uploaded file</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">File</span>
                <span className="text-xs font-semibold text-gray-800 truncate max-w-[200px] text-right">{file?.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Fields</span>
                <span className="text-xs font-semibold text-gray-800">{fields.length}</span>
              </div>
              <div className="pt-2 border-t border-[#E8ECF4]">
                <p className="text-xs text-gray-400 mb-2">Field names</p>
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

            {saveError && (
              <p className="text-xs text-red-500">{saveError}</p>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setStep(2)}
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
      )}
    </div>
  )
}

// ─── Spinner ─────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-white/80 flex-shrink-0" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  )
}

// ─── Step Progress Bar ────────────────────────────────────────────────────────

const STEP_LABELS = ['Upload', 'Set Up Fields', 'Save']

function StepBar({ current }: { current: Step }) {
  return (
    <div className="flex items-start justify-center mb-10">
      {STEP_LABELS.map((label, i) => {
        const n = (i + 1) as Step
        const done   = n < current
        const active = n === current
        return (
          <div key={n} className="flex items-start">
            <div className="flex flex-col items-center gap-1.5 w-24">
              <div className={[
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                done   ? 'bg-primary text-white'
                : active ? 'bg-primary text-white ring-4 ring-primary/20'
                : 'bg-[#E8ECF4] text-gray-400',
              ].join(' ')}>
                {done ? (
                  <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                    <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : n}
              </div>
              <span className={[
                'text-xs font-medium text-center leading-tight whitespace-nowrap',
                active ? 'text-primary' : done ? 'text-gray-500' : 'text-gray-300',
              ].join(' ')}>
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={[
                'h-0.5 w-16 mt-4 transition-colors flex-shrink-0',
                n < current ? 'bg-primary' : 'bg-[#E8ECF4]',
              ].join(' ')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Field Card ───────────────────────────────────────────────────────────────

interface FieldCardProps {
  field: Field
  isActive: boolean
  onActivate: () => void
  onChange: (update: Partial<Field>) => void
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

      {/* Position + Size */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Position</label>
          <select
            value={field.position}
            onChange={(e) => onChange({ position: e.target.value as Position })}
            onClick={(e) => e.stopPropagation()}
            className="w-full px-2 py-1.5 rounded-[8px] border border-[#E8ECF4] text-xs text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition cursor-pointer"
          >
            {POSITIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Size</label>
          <select
            value={field.size}
            onChange={(e) => onChange({ size: e.target.value as Size })}
            onClick={(e) => e.stopPropagation()}
            className="w-full px-2 py-1.5 rounded-[8px] border border-[#E8ECF4] text-xs text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition cursor-pointer"
          >
            {SIZES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Color swatches */}
      <div>
        <label className="block text-xs text-gray-400 mb-1.5">Colour</label>
        <div className="flex gap-2 flex-wrap">
          {COLOR_PRESETS.map((preset) => (
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
