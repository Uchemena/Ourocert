// src/app/(app)/batch/new/BatchWizard.tsx
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import ErrorMessage from '@/components/ErrorMessage'
import type { RichError } from '@/components/ErrorMessage'

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4

interface Field {
  id: string
  name: string
  position: string
  size: string
  color: string
  font: string
}

interface Template {
  id: string
  name: string
  type: 'upload' | 'designed' | 'starter'
  fields: Field[]
  thumbnail_url?: string
  file_url?: string
  style?: string
  org_name?: string
  logo_text?: string
}

interface RecipientRow {
  [key: string]: string
}

interface ColumnMapping {
  [fieldName: string]: string
}

interface ContactList {
  id: string
  name: string
  description?: string
}

interface Contact {
  id: string
  name: string
  email?: string
  extra_data: Record<string, string>
}

// ─── ContactListPicker Modal ──────────────────────────────────────────────────

function ContactListPicker({
  onClose,
  onSelect,
}: {
  onClose: () => void
  onSelect: (recipients: RecipientRow[]) => void
}) {
  const supabase = createClient()
  const [lists, setLists] = useState<ContactList[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [selectedListId, setSelectedListId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('contact_lists')
        .select('id, name, description')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setLists((data as ContactList[]) || [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleSelectList(listId: string) {
    setSelectedListId(listId)
    setLoadingContacts(true)
    try {
      const { data } = await supabase
        .from('contacts')
        .select('*')
        .eq('list_id', listId)
      const contacts = (data as Contact[]) || []
      const rows: RecipientRow[] = contacts.map(contact => ({
        Name: contact.name,
        Email: contact.email || '',
        ...((contact.extra_data as Record<string, string>) || {}),
      }))
      onSelect(rows)
    } finally {
      setLoadingContacts(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">Use a saved contact list</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="py-8 flex items-center justify-center">
            <svg className="animate-spin h-6 w-6 text-primary" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>
        ) : lists.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-gray-500 mb-2">No contact lists yet</p>
            <p className="text-xs text-gray-400">
              Go to Contacts to create your first list
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {lists.map(list => (
              <button
                key={list.id}
                onClick={() => handleSelectList(list.id)}
                disabled={loadingContacts}
                className={`w-full text-left p-3 rounded-xl border transition ${
                  selectedListId === list.id
                    ? 'border-primary bg-primary/5'
                    : 'border-[#E8ECF4] hover:border-primary/40 hover:bg-gray-50'
                } disabled:opacity-60`}
              >
                <p className="text-sm font-semibold text-gray-900">{list.name}</p>
                {list.description && (
                  <p className="text-xs text-gray-400 mt-0.5">{list.description}</p>
                )}
                {loadingContacts && selectedListId === list.id && (
                  <p className="text-xs text-primary mt-1">Loading contacts...</p>
                )}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full py-2 rounded-[10px] border border-[#E8ECF4] text-sm font-medium text-gray-500 hover:bg-gray-50 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BatchWizard() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const mounted = useRef(true)

  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [richError, setRichError] = useState<RichError | null>(null)

  // Step 1: Template selection
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)

  // Step 2: CSV upload
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [recipients, setRecipients] = useState<RecipientRow[]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({})
  const [needsMapping, setNeedsMapping] = useState(false)
  const [batchName, setBatchName] = useState<string>('')
  const [category, setCategory] = useState('')
  const [validationErrors, setValidationErrors] = useState<number[]>([])
  const [duplicateWarning, setDuplicateWarning] = useState<{
    batchName: string; sentAt: string; overlap: number
  } | null>(null)
  const [showContactPicker, setShowContactPicker] = useState(false)

  // Step 3: Preview
  const [previewRecipients, setPreviewRecipients] = useState<RecipientRow[]>([])

  // Step 4: Send
  const [emailSubject, setEmailSubject] = useState<string>('')
  const [emailMessage, setEmailMessage] = useState<string>('')
  const [orgName, setOrgName] = useState<string>('')
  const [expiryDate, setExpiryDate] = useState('')
  const [sendOption, setSendOption] = useState<'now' | 'scheduled'>('now')
  const [scheduledFor, setScheduledFor] = useState('')

  // ─── Load templates ───────────────────────────────────────────────────────

  useEffect(() => {
    mounted.current = true
    loadTemplates()
    loadProfile()
    return () => { mounted.current = false }
  }, [])

  async function loadTemplates() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setTemplates((data as Template[]) || [])
    } catch (err) {
      console.error('Failed to load templates:', err)
    }
  }

  async function loadProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('profiles')
        .select('org_name')
        .eq('id', user.id)
        .single()

      if (error) throw error

      const org = data?.org_name || 'Your Organization'
      setOrgName(org)
      setEmailSubject(`Your certificate from ${org}`)
      setEmailMessage(`Hi [Recipient Name], please find your certificate attached. Congratulations on your achievement!`)
    } catch (err) {
      console.error('Failed to load profile:', err)
    }
  }

  // ─── Check for duplicate sends ───────────────────────────────────────────

  async function checkForDuplicates(emails: string[]) {
    if (!emails.length) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Find recent batches (last 30 days) with sent status
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const { data: recentBatches } = await supabase
        .from('batches')
        .select('id, name, created_at')
        .eq('user_id', user.id)
        .eq('status', 'sent')
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false })
        .limit(20)

      if (!recentBatches?.length) return

      for (const batch of recentBatches) {
        const { data: certs } = await supabase
          .from('certificates')
          .select('recipient_email')
          .eq('batch_id', batch.id)
          .in('recipient_email', emails)

        const overlap = certs?.length || 0
        if (overlap > 0) {
          setDuplicateWarning({
            batchName: batch.name,
            sentAt: new Date(batch.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            overlap,
          })
          return
        }
      }
    } catch (err) {
      console.error('Duplicate check failed:', err)
    }
  }

  // ─── Step 1: Select template ─────────────────────────────────────────────

  function handleSelectTemplate(template: Template) {
    setSelectedTemplate(template)
    setRichError(null)
  }

  function handleStep1Continue() {
    if (!selectedTemplate) {
      setRichError({
        tier: 'user',
        title: 'No template selected',
        message: 'Please select a template to continue.',
      })
      return
    }
    setRichError(null)
    setBatchName(`Batch — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`)
    setStep(2)
  }

  // ─── Step 2: Upload CSV ───────────────────────────────────────────────────

  function generateSampleCSV() {
    if (!selectedTemplate) return

    const headers = selectedTemplate.fields.map(f => f.name)
    const sampleRow = headers.map(h => `Sample ${h}`)

    const csvContent = [
      headers.join(','),
      sampleRow.join(','),
      sampleRow.join(','),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedTemplate.name.replace(/\s+/g, '_')}_sample.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.match(/\.(csv|xlsx|xls)$/i)) {
      setRichError({
        tier: 'user',
        title: 'Unsupported file type',
        message: 'Please upload a CSV or Excel file (.csv, .xlsx, .xls).',
      })
      return
    }

    setCsvFile(file)
    parseCSV(file)
  }

  async function parseCSV(file: File) {
    try {
      const text = await file.text()
      const lines = text.trim().split('\n')

      if (lines.length < 2) {
        setRichError({
          tier: 'user',
          title: 'Empty file',
          message: 'CSV file is empty or has no data rows. Please add at least one recipient.',
        })
        return
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''))
      setCsvHeaders(headers)

      const rows: RecipientRow[] = []
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''))
        const row: RecipientRow = {}
        headers.forEach((header, index) => {
          row[header] = values[index] || ''
        })
        rows.push(row)
      }

      setRecipients(rows)

      // Check if we need column mapping
      if (selectedTemplate) {
        const templateFieldNames = selectedTemplate.fields.map(f => f.name)
        const allMatch = templateFieldNames.every(fieldName =>
          headers.some(h => h.toLowerCase() === fieldName.toLowerCase())
        )

        if (allMatch) {
          // Auto-map with case-insensitive matching
          const mapping: ColumnMapping = {}
          templateFieldNames.forEach(fieldName => {
            const matchingHeader = headers.find(h => h.toLowerCase() === fieldName.toLowerCase())
            if (matchingHeader) {
              mapping[fieldName] = matchingHeader
            }
          })
          setColumnMapping(mapping)
          setNeedsMapping(false)
          validateRecipients(rows, mapping)
        } else {
          setNeedsMapping(true)
          // Initialize empty mapping
          const mapping: ColumnMapping = {}
          templateFieldNames.forEach(fieldName => {
            mapping[fieldName] = ''
          })
          setColumnMapping(mapping)
        }
      }

      setRichError(null)
    } catch (err) {
      setRichError({
        tier: 'system',
        title: 'Failed to parse file',
        message: 'Could not read your CSV file. Please check the format and try again.',
        showSupport: true,
      })
      console.error(err)
    }
  }

  function handleMappingChange(fieldName: string, columnName: string) {
    const newMapping = { ...columnMapping, [fieldName]: columnName }
    setColumnMapping(newMapping)

    // Check if all fields are mapped
    const allMapped = Object.values(newMapping).every(v => v !== '')
    if (allMapped) {
      validateRecipients(recipients, newMapping)
    }
  }

  function validateRecipients(rows: RecipientRow[], mapping: ColumnMapping) {
    const errors: number[] = []

    rows.forEach((row, index) => {
      const hasError = Object.entries(mapping).some(([, columnName]) => {
        const value = row[columnName]
        return !value || value.trim() === ''
      })
      if (hasError) {
        errors.push(index)
      }
    })

    setValidationErrors(errors)
  }

  async function handleStep2Continue() {
    if (!csvFile && recipients.length === 0) {
      setRichError({
        tier: 'user',
        title: 'No recipients uploaded',
        message: 'Please upload a CSV file or select a contact list before continuing.',
      })
      return
    }

    if (needsMapping) {
      const allMapped = Object.values(columnMapping).every(v => v !== '')
      if (!allMapped) {
        setRichError({
          tier: 'user',
          title: 'Column mapping incomplete',
          message: 'Please map all template fields to CSV columns before continuing.',
        })
        return
      }
    }

    if (validationErrors.length > 0) {
      setRichError({
        tier: 'user',
        title: `${validationErrors.length} row${validationErrors.length === 1 ? ' has' : 's have'} missing data`,
        message: 'Some rows are missing required field values. Please fix your CSV and upload again.',
      })
      return
    }

    if (!batchName.trim()) {
      setRichError({
        tier: 'user',
        title: 'Batch name required',
        message: 'Please enter a name for this batch.',
      })
      return
    }

    // Check for duplicate emails
    const emails = recipients
      .map(r => r['Email'] || r['email'] || '')
      .filter(Boolean)
    await checkForDuplicates(emails)

    // Prepare preview recipients (first 3)
    const mapped = recipients.map(row => {
      const mappedRow: RecipientRow = {}
      if (Object.keys(columnMapping).length > 0) {
        Object.entries(columnMapping).forEach(([fieldName, columnName]) => {
          mappedRow[fieldName] = row[columnName]
        })
      } else {
        // If no mapping needed (from contact picker), use row directly
        return row
      }
      return mappedRow
    })
    setPreviewRecipients(mapped.slice(0, 3))
    setRichError(null)
    setStep(3)
  }

  // ─── Contact picker handler ──────────────────────────────────────────────

  function handleContactsSelected(rows: RecipientRow[]) {
    setRecipients(rows)
    // Auto-build column mapping from the first row keys
    if (rows.length > 0 && selectedTemplate) {
      const rowKeys = Object.keys(rows[0])
      const mapping: ColumnMapping = {}
      const templateFieldNames = selectedTemplate.fields.map(f => f.name)
      templateFieldNames.forEach(fieldName => {
        const match = rowKeys.find(k => k.toLowerCase() === fieldName.toLowerCase())
        mapping[fieldName] = match || rowKeys[0] || ''
      })
      setColumnMapping(mapping)
      setNeedsMapping(false)
      validateRecipients(rows, mapping)
    }
    // Create a dummy file indicator
    setCsvFile(new File([''], 'contacts.csv', { type: 'text/csv' }))
    setShowContactPicker(false)
    setRichError(null)
  }

  // ─── Step 3: Preview ──────────────────────────────────────────────────────

  function handleStep3Continue() {
    setStep(4)
  }

  // ─── Step 4: Send ─────────────────────────────────────────────────────────

  async function handleGenerateAndSend() {
    if (!selectedTemplate) return

    setLoading(true)
    setRichError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Map all recipients using column mapping
      const mappedRecipients = recipients.map(row => {
        if (Object.keys(columnMapping).length === 0) return row
        const mappedRow: RecipientRow = {}
        Object.entries(columnMapping).forEach(([fieldName, columnName]) => {
          mappedRow[fieldName] = row[columnName]
        })
        return mappedRow
      })

      const isScheduled = sendOption === 'scheduled'
      const batchStatus = isScheduled ? 'draft' : 'generating'

      // Build batch payload
      const batchPayload: Record<string, unknown> = {
        user_id: user.id,
        template_id: selectedTemplate.id,
        name: batchName.trim(),
        status: batchStatus,
        recipient_count: mappedRecipients.length,
        email_subject: emailSubject.trim(),
        email_message: emailMessage.trim(),
      }
      if (category.trim()) batchPayload.category = category.trim()
      if (expiryDate) batchPayload.expires_at = new Date(expiryDate).toISOString()
      if (isScheduled && scheduledFor) batchPayload.scheduled_for = new Date(scheduledFor).toISOString()

      // Create batch
      const { data: batch, error: batchError } = await supabase
        .from('batches')
        .insert(batchPayload)
        .select()
        .single()

      if (batchError) throw batchError

      // Create certificate records for each recipient
      const certificateRecords = mappedRecipients.map(recipient => ({
        batch_id: batch.id,
        user_id: user.id,
        recipient_name: recipient[selectedTemplate.fields[0].name] || recipient['Name'] || 'Unknown',
        recipient_email: recipient['Email'] || recipient['email'] || null,
        recipient_data: recipient,
        status: 'pending',
      }))

      const { error: certsError } = await supabase
        .from('certificates')
        .insert(certificateRecords)

      if (certsError) throw certsError

      // If scheduled, just redirect to dashboard
      if (isScheduled) {
        router.push('/dashboard')
        return
      }

      // Trigger certificate generation via API route
      const generateResponse = await fetch('/api/batch/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch_id: batch.id }),
      })

      if (!generateResponse.ok) {
        const status = generateResponse.status

        if (status === 402) {
          // Revert batch to draft
          await supabase.from('batches').update({ status: 'draft' }).eq('id', batch.id)
          if (mounted.current) {
            setRichError({
              tier: 'user',
              title: 'Quota exceeded',
              message: "You've used all your certificate credits for this month. Upgrade your plan to send more.",
              action: { label: 'Upgrade plan', onClick: () => router.push('/settings') },
            })
            setLoading(false)
          }
          return
        }

        // Revert batch to draft so the user can retry
        await supabase.from('batches').update({ status: 'draft' }).eq('id', batch.id)
        if (mounted.current) {
          setRichError({
            tier: 'system',
            title: 'Generation failed to start',
            message: 'Your batch was saved as a draft. Please try again.',
            action: { label: 'Try again', onClick: handleGenerateAndSend },
            showSupport: true,
          })
          setLoading(false)
        }
        return
      }

      // Redirect to tracking page
      router.push(`/batch/${batch.id}`)

    } catch (err: unknown) {
      console.error('Failed to create batch:', err)
      if (mounted.current) {
        setRichError({
          tier: 'system',
          title: 'Something went wrong',
          message: 'Your batch could not be created. Please try again.',
          action: { label: 'Try again', onClick: handleGenerateAndSend },
          showSupport: true,
        })
        setLoading(false)
      }
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F7F8FC] px-6 py-8">
      {showContactPicker && (
        <ContactListPicker
          onClose={() => setShowContactPicker(false)}
          onSelect={handleContactsSelected}
        />
      )}

      <div className="max-w-4xl mx-auto">

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[
            { num: 1, label: 'Choose Template' },
            { num: 2, label: 'Upload Recipients' },
            { num: 3, label: 'Preview' },
            { num: 4, label: 'Send' },
          ].map(({ num, label }, index) => (
            <div key={num} className="flex items-center">
              <div className="flex items-center gap-2">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors
                    ${step >= num ? 'bg-primary text-white' : 'bg-gray-200 text-gray-400'}
                  `}
                >
                  {num}
                </div>
                <span className={`text-sm font-medium hidden sm:inline ${step >= num ? 'text-gray-900' : 'text-gray-400'}`}>
                  {label}
                </span>
              </div>
              {index < 3 && (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="mx-2">
                  <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300"/>
                </svg>
              )}
            </div>
          ))}
        </div>

        {/* Error Message */}
        {richError && (
          <div className="mb-6">
            <ErrorMessage {...richError} />
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white border border-[#E8ECF4] rounded-xl shadow-sm p-8">

          {/* ═══════════════════ STEP 1: CHOOSE TEMPLATE ═══════════════════ */}
          {step === 1 && (
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Choose a template</h1>
              <p className="text-sm text-gray-400 mb-6">Select which certificate design to use for this batch</p>

              {templates.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center mx-auto mb-4">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="2" width="18" height="20" rx="3" stroke="#3B5BDB" strokeWidth="1.8"/>
                      <path d="M8 8h8M8 12h8M8 16h5" stroke="#3B5BDB" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">No templates yet</h3>
                  <p className="text-sm text-gray-400 mb-4">Create a template first before making a batch</p>
                  <button
                    onClick={() => router.push('/templates/new')}
                    className="px-4 py-2.5 rounded-[10px] bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition"
                  >
                    Create Template
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    {templates.map(template => (
                      <button
                        key={template.id}
                        onClick={() => handleSelectTemplate(template)}
                        className={`
                          relative p-4 rounded-xl border-2 text-left transition-all hover:-translate-y-0.5
                          ${selectedTemplate?.id === template.id
                            ? 'border-primary bg-primary/5'
                            : 'border-[#E8ECF4] bg-white hover:border-primary/30'
                          }
                        `}
                      >
                        {selectedTemplate?.id === template.id && (
                          <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <path d="M11 4L5.5 9.5L3 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                        )}

                        <div className="aspect-[16/11] bg-gray-50 rounded-lg mb-3 overflow-hidden">
                          {template.thumbnail_url ? (
                            <Image
                              src={template.thumbnail_url}
                              alt={template.name}
                              width={400}
                              height={275}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                                <rect x="4" y="4" width="24" height="24" rx="2" stroke="currentColor" strokeWidth="2"/>
                                <path d="M10 14h12M10 18h12M10 22h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                              </svg>
                            </div>
                          )}
                        </div>

                        <h3 className="font-semibold text-sm text-gray-900 mb-1">{template.name}</h3>
                        <p className="text-xs text-gray-400">{template.fields.length} field{template.fields.length === 1 ? '' : 's'}</p>
                      </button>
                    ))}
                  </div>

                  {selectedTemplate && (
                    <div className="p-4 bg-gray-50 rounded-xl mb-6">
                      <p className="text-xs font-medium text-gray-500 mb-2">This template includes:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedTemplate.fields.map(field => (
                          <span key={field.id} className="px-2.5 py-1 bg-white border border-[#E8ECF4] rounded-lg text-xs text-gray-700">
                            {field.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-[#E8ECF4]">
                    <button
                      onClick={() => router.push('/dashboard')}
                      className="text-sm text-gray-400 hover:text-gray-600 transition"
                    >
                      ← Cancel
                    </button>
                    <button
                      onClick={handleStep1Continue}
                      disabled={!selectedTemplate}
                      className="px-4 py-2.5 rounded-[10px] bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-[0.99] transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Continue →
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ═══════════════════ STEP 2: UPLOAD RECIPIENTS ═══════════════════ */}
          {step === 2 && selectedTemplate && (
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Upload recipients</h1>
              <p className="text-sm text-gray-400 mb-6">Import a list of people who'll receive certificates</p>

              {/* Required Fields Banner */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl mb-6">
                <div className="flex items-start gap-3">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="flex-shrink-0 mt-0.5">
                    <circle cx="10" cy="10" r="8" stroke="#3B5BDB" strokeWidth="1.5"/>
                    <path d="M10 6v5M10 14h.01" stroke="#3B5BDB" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-1">This template needs:</p>
                    <p className="text-sm text-blue-700">
                      {selectedTemplate.fields.map(f => f.name).join(', ')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Use a saved contact list button */}
              <button
                onClick={() => setShowContactPicker(true)}
                className="flex items-center gap-2 w-full p-4 mb-4 border-2 border-dashed border-primary/30 rounded-xl hover:border-primary hover:bg-primary/5 transition text-left group"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="6" cy="5" r="2.5" stroke="#3B5BDB" strokeWidth="1.5"/>
                    <path d="M1 13c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="#3B5BDB" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M12 7v4M14 9h-4" stroke="#3B5BDB" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary">Use a saved contact list</p>
                  <p className="text-xs text-gray-400">Import from your contacts</p>
                </div>
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium">or upload a file</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Download Sample */}
              <button
                onClick={generateSampleCSV}
                className="flex items-center gap-2 text-sm text-primary hover:underline mb-6"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v8M8 10l3-3M8 10L5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12v2h12v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Download sample spreadsheet
              </button>

              {/* Upload Zone */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleFileSelect}
                aria-label="Upload CSV or Excel file"
              />

              {!csvFile ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-12 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary hover:bg-primary/5 transition text-center group"
                >
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="mx-auto mb-3 text-gray-300 group-hover:text-primary transition">
                    <path d="M20 10v20M20 10L14 16M20 10l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M6 26v8h28v-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <p className="text-sm font-semibold text-gray-900 mb-1">Click to upload CSV or Excel</p>
                  <p className="text-xs text-gray-400">or drag and drop your file here</p>
                </button>
              ) : (
                <div className="space-y-4">
                  {/* File Info */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                          <path d="M16 6L8.5 14L5 10.5" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{csvFile.name}</p>
                        <p className="text-xs text-gray-400">{recipients.length} recipient{recipients.length === 1 ? '' : 's'} found</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setCsvFile(null)
                        setRecipients([])
                        setCsvHeaders([])
                        setColumnMapping({})
                        setNeedsMapping(false)
                        setValidationErrors([])
                        setDuplicateWarning(null)
                      }}
                      className="text-sm text-gray-400 hover:text-gray-600 transition"
                    >
                      Remove
                    </button>
                  </div>

                  {/* Column Mapping */}
                  {needsMapping && (
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                      <p className="text-sm font-medium text-orange-900 mb-4">Map your columns to template fields:</p>
                      <div className="space-y-3">
                        {selectedTemplate.fields.map(field => (
                          <div key={field.id} className="flex items-center gap-3">
                            <span className="text-sm text-gray-700 w-32 flex-shrink-0">{field.name}</span>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-300 flex-shrink-0">
                              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <select
                              value={columnMapping[field.name] || ''}
                              onChange={(e) => handleMappingChange(field.name, e.target.value)}
                              className="flex-1 px-3 py-2 rounded-lg border border-[#E8ECF4] text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                              aria-label={`Map column for ${field.name}`}
                            >
                              <option value="">Select a column...</option>
                              {csvHeaders.map(header => (
                                <option key={header} value={header}>{header}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Preview Table */}
                  {recipients.length > 0 && !needsMapping && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">Preview (first 5 rows):</p>
                      <div className="overflow-x-auto border border-[#E8ECF4] rounded-lg">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 border-b border-[#E8ECF4]">
                            <tr>
                              {selectedTemplate.fields.map(field => (
                                <th key={field.id} className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                  {field.name}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {recipients.slice(0, 5).map((row, rowIndex) => (
                              <tr
                                key={rowIndex}
                                className={`border-b border-[#E8ECF4] last:border-b-0 ${validationErrors.includes(rowIndex) ? 'bg-red-50' : ''}`}
                              >
                                {selectedTemplate.fields.map(field => (
                                  <td key={field.id} className="px-3 py-2 text-gray-700">
                                    {(columnMapping[field.name] ? row[columnMapping[field.name]] : row[field.name]) || <span className="text-red-500">Missing</span>}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Validation Status */}
                  {recipients.length > 0 && !needsMapping && (
                    <div className={`p-4 rounded-xl ${validationErrors.length === 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                      {validationErrors.length === 0 ? (
                        <div className="flex items-center gap-2 text-green-700">
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5"/>
                            <path d="M7 10l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span className="text-sm font-medium">{recipients.length} recipient{recipients.length === 1 ? '' : 's'} found — all look good!</span>
                        </div>
                      ) : (
                        <div className="text-red-700">
                          <div className="flex items-center gap-2 mb-1">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                              <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5"/>
                              <path d="M10 6v5M10 14h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                            <span className="text-sm font-medium">{validationErrors.length} row{validationErrors.length === 1 ? ' has' : 's have'} missing data</span>
                          </div>
                          <p className="text-xs ml-7">Please fix your spreadsheet and upload again</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Duplicate Warning */}
                  {duplicateWarning && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                      <p className="text-sm font-medium text-yellow-900 mb-1">Possible duplicate send</p>
                      <p className="text-sm text-yellow-800">
                        {duplicateWarning.overlap} recipient{duplicateWarning.overlap === 1 ? '' : 's'} may have already received a certificate
                        from batch &quot;{duplicateWarning.batchName}&quot; on {duplicateWarning.sentAt}.
                        You can continue anyway if this is intentional.
                      </p>
                    </div>
                  )}

                  {/* Batch Name */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Batch name</label>
                    <input
                      type="text"
                      value={batchName}
                      onChange={(e) => setBatchName(e.target.value)}
                      placeholder="e.g. Q1 2024 Graduates"
                      className="w-full px-4 py-2.5 rounded-[10px] border border-[#E8ECF4] text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                      Category / Course <span className="text-gray-300 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="e.g. Web Development, Safety Training"
                      className="w-full px-4 py-2.5 rounded-[10px] border border-[#E8ECF4] text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Auto-fills &quot;Course&quot; or &quot;Category&quot; fields in your template
                    </p>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between pt-6 border-t border-[#E8ECF4] mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="text-sm text-gray-400 hover:text-gray-600 transition"
                >
                  ← Back
                </button>
                <button
                  onClick={handleStep2Continue}
                  disabled={(!csvFile && recipients.length === 0) || (needsMapping && Object.values(columnMapping).some(v => !v)) || validationErrors.length > 0}
                  className="px-4 py-2.5 rounded-[10px] bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-[0.99] transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════ STEP 3: PREVIEW ═══════════════════ */}
          {step === 3 && selectedTemplate && (
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Preview certificates</h1>
              <p className="text-sm text-gray-400 mb-6">Here's what the first few will look like</p>

              <div className="space-y-6 mb-6">
                {previewRecipients.map((recipient, index) => (
                  <div key={index} className="p-6 bg-gray-50 rounded-xl">
                    <p className="text-xs font-medium text-gray-500 mb-4">Certificate {index + 1} of {recipients.length}</p>
                    <div className="aspect-[16/11] bg-white rounded-lg border border-[#E8ECF4] flex items-center justify-center relative overflow-hidden">
                      {selectedTemplate.file_url ? (
                        <div className="relative w-full h-full">
                          <Image
                            src={selectedTemplate.file_url}
                            alt="Certificate"
                            fill
                            className="object-contain"
                          />
                          {/* Overlay field values - simplified for preview */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                            {selectedTemplate.fields.map(field => (
                              <p
                                key={field.id}
                                className="text-center px-4"
                                style={{
                                  color: field.color,
                                  fontFamily: field.font === 'Playfair Display' ? '"Playfair Display", serif' : '"Outfit", sans-serif',
                                  fontSize: field.size === 'Extra Large' ? '24px' : field.size === 'Large' ? '18px' : field.size === 'Medium' ? '14px' : '12px',
                                  fontWeight: field.size === 'Extra Large' || field.size === 'Large' ? 600 : 400,
                                }}
                              >
                                {recipient[field.name]}
                              </p>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center p-8">
                          <p className="font-serif text-2xl font-bold text-gray-900 mb-4">Certificate of Achievement</p>
                          {selectedTemplate.fields.map(field => (
                            <p
                              key={field.id}
                              className="mb-2"
                              style={{
                                color: field.color,
                                fontFamily: field.font === 'Playfair Display' ? 'serif' : 'sans-serif',
                                fontSize: field.size === 'Extra Large' ? '24px' : field.size === 'Large' ? '18px' : field.size === 'Medium' ? '14px' : '12px',
                                fontWeight: field.size === 'Extra Large' || field.size === 'Large' ? 600 : 400,
                              }}
                            >
                              {recipient[field.name]}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl mb-6 text-center">
                <p className="text-sm text-blue-900">
                  Previewing {Math.min(3, recipients.length)} of {recipients.length} certificate{recipients.length === 1 ? '' : 's'}. Happy with how they look?
                </p>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between pt-6 border-t border-[#E8ECF4]">
                <button
                  onClick={() => setStep(2)}
                  className="text-sm text-gray-400 hover:text-gray-600 transition"
                >
                  ← Go back and fix something
                </button>
                <button
                  onClick={handleStep3Continue}
                  className="px-4 py-2.5 rounded-[10px] bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-[0.99] transition"
                >
                  Looks perfect — continue →
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════ STEP 4: SEND ═══════════════════ */}
          {step === 4 && selectedTemplate && (
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Review & send</h1>
              <p className="text-sm text-gray-400 mb-6">Double-check everything looks good, then hit send!</p>

              {/* Summary Card */}
              <div className="p-6 bg-gray-50 rounded-xl mb-6">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-white rounded-lg border border-[#E8ECF4] flex-shrink-0 overflow-hidden">
                    {selectedTemplate.thumbnail_url ? (
                      <Image
                        src={selectedTemplate.thumbnail_url}
                        alt={selectedTemplate.name}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{batchName}</h3>
                    <p className="text-sm text-gray-500 mb-2">Using template: {selectedTemplate.name}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                      <span>{recipients.length} recipient{recipients.length === 1 ? '' : 's'}</span>
                      {category && (
                        <>
                          <span>•</span>
                          <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium">{category}</span>
                        </>
                      )}
                      <span>•</span>
                      <span className="text-green-600 font-medium">Ready to send</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Email Customization */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Email subject</label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="e.g. Your certificate from Acme Corp"
                    className="w-full px-4 py-2.5 rounded-[10px] border border-[#E8ECF4] text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Email message</label>
                  <textarea
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    rows={4}
                    placeholder="Hi [Recipient Name], please find your certificate attached..."
                    className="w-full px-4 py-2.5 rounded-[10px] border border-[#E8ECF4] text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1.5">
                    <span className="font-medium">[Recipient Name]</span> will be replaced with each person's actual name
                  </p>
                </div>

                {/* Expiry Date */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Certificate expiry date <span className="text-gray-300 font-normal">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-[10px] border border-[#E8ECF4] text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <p className="text-xs text-gray-400 mt-1.5">
                    Auto-fills &quot;Expiry&quot; or &quot;Valid Until&quot; fields in your template
                  </p>
                </div>
              </div>

              {/* Scheduling Options */}
              <div className="p-4 bg-gray-50 rounded-xl mb-6">
                <p className="text-xs font-semibold text-gray-700 mb-3">When to send</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="sendOption"
                      value="now"
                      checked={sendOption === 'now'}
                      onChange={() => setSendOption('now')}
                      className="w-4 h-4 text-primary"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Send now</p>
                      <p className="text-xs text-gray-400">Certificates will be generated and sent immediately</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="sendOption"
                      value="scheduled"
                      checked={sendOption === 'scheduled'}
                      onChange={() => setSendOption('scheduled')}
                      className="w-4 h-4 text-primary"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Schedule for later</p>
                      <p className="text-xs text-gray-400">Save as draft and send at a specific time</p>
                    </div>
                  </label>
                </div>

                {sendOption === 'scheduled' && (
                  <div className="mt-3 pt-3 border-t border-[#E8ECF4]">
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Scheduled date & time</label>
                    <input
                      type="datetime-local"
                      value={scheduledFor}
                      onChange={(e) => setScheduledFor(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                      className="w-full px-4 py-2.5 rounded-[10px] border border-[#E8ECF4] text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                )}
              </div>

              {/* Send Button */}
              <button
                onClick={handleGenerateAndSend}
                disabled={loading || (sendOption === 'scheduled' && !scheduledFor)}
                className={`w-full py-3.5 rounded-[10px] text-white text-sm font-semibold active:scale-[0.99] transition disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                  sendOption === 'scheduled' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    {sendOption === 'scheduled' ? 'Scheduling...' : 'Creating certificates...'}
                  </>
                ) : (
                  <>
                    {sendOption === 'scheduled'
                      ? 'Schedule Batch'
                      : 'Generate & Send All Certificates'}
                  </>
                )}
              </button>

              {loading && sendOption === 'now' && (
                <p className="text-center text-sm text-gray-500 mt-4">
                  Creating {recipients.length} certificate{recipients.length === 1 ? '' : 's'}... this usually takes 1–2 minutes.
                  <br />
                  You can close this tab and we'll notify you when it's done.
                </p>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-center pt-6 border-t border-[#E8ECF4] mt-6">
                <button
                  onClick={() => setStep(3)}
                  disabled={loading}
                  className="text-sm text-gray-400 hover:text-gray-600 transition disabled:opacity-50"
                >
                  ← Back to preview
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
