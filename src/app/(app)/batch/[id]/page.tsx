// src/app/(app)/batch/[id]/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import ErrorMessage from '@/components/ErrorMessage'
import type { RichError } from '@/components/ErrorMessage'
import { useToast } from '@/components/ToastProvider'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Field {
  id: string
  name: string
  position: string
  size: string
  color: string
  font: string
}

interface Batch {
  id: string
  name: string
  status: 'draft' | 'generating' | 'sent' | 'failed'
  recipient_count: number
  template_id: string
  email_subject?: string
  email_message?: string
  category?: string
  expires_at?: string
  scheduled_for?: string
  created_at: string
  updated_at: string
}

interface Certificate {
  id: string
  recipient_name: string
  recipient_email?: string
  recipient_data: Record<string, string>
  file_url?: string
  status: 'pending' | 'generating' | 'completed' | 'failed' | 'sent' | 'delivered' | 'opened' | 'bounced'
  expires_at?: string
  sent_at?: string
  created_at: string
}

interface Template {
  id: string
  name: string
  thumbnail_url?: string
  fields: Field[]
}

// ─── Status Badge Component ───────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; icon: string; className: string }> = {
    pending:   { label: 'Pending',   icon: '●',  className: 'bg-orange-50 text-orange-600 ring-1 ring-orange-200' },
    generating:{ label: 'Generating',icon: '●',  className: 'bg-blue-50 text-blue-600 ring-1 ring-blue-200' },
    completed: { label: 'Ready',     icon: '✓',  className: 'bg-green-50 text-green-600 ring-1 ring-green-200' },
    sent:      { label: 'Sent',      icon: '✓',  className: 'bg-green-50 text-green-600 ring-1 ring-green-200' },
    delivered: { label: 'Delivered', icon: '✓✓', className: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200' },
    opened:    { label: 'Opened',    icon: '👁', className: 'bg-purple-50 text-purple-600 ring-1 ring-purple-200' },
    bounced:   { label: 'Bounced',   icon: '✗',  className: 'bg-red-50 text-red-600 ring-1 ring-red-200' },
    failed:    { label: 'Failed',    icon: '✗',  className: 'bg-red-50 text-red-600 ring-1 ring-red-200' },
  }

  const { label, icon, className } = config[status] || config.pending

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${className}`}>
      <span>{icon}</span>
      {label}
    </span>
  )
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 100

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BatchTrackingPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const batchId = params?.id as string
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [batch, setBatch] = useState<Batch | null>(null)
  const [template, setTemplate] = useState<Template | null>(null)
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [certPage, setCertPage] = useState(0)
  const [hasMoreCerts, setHasMoreCerts] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [retrying, setRetrying] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [savingContacts, setSavingContacts] = useState(false)
  const [failedError, setFailedError] = useState<RichError | null>(null)

  // Load batch data (page 0 only — resets pagination)
  const loadBatchData = useCallback(async () => {
    try {
      setLoading(true)

      // Load batch
      const { data: batchData, error: batchError } = await supabase
        .from('batches')
        .select('*')
        .eq('id', batchId)
        .single()

      if (batchError) throw batchError
      setBatch(batchData as Batch)

      // Load template
      if (batchData.template_id) {
        const { data: templateData } = await supabase
          .from('templates')
          .select('id, name, thumbnail_url, fields')
          .eq('id', batchData.template_id)
          .single()

        if (templateData) setTemplate(templateData as Template)
      }

      // Load first page of certificates
      const { data: certsData, error: certsError } = await supabase
        .from('certificates')
        .select('*')
        .eq('batch_id', batchId)
        .order('created_at', { ascending: true })
        .range(0, PAGE_SIZE - 1)

      if (certsError) throw certsError
      setCertificates((certsData as Certificate[]) || [])
      setHasMoreCerts((certsData?.length ?? 0) === PAGE_SIZE)
      setCertPage(0)

    } catch (error) {
      console.error('Failed to load batch:', error)
    } finally {
      setLoading(false)
    }
  }, [batchId])

  async function loadMoreCerts() {
    const nextPage = certPage + 1
    const from = nextPage * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const { data } = await supabase
      .from('certificates')
      .select('*')
      .eq('batch_id', batchId)
      .order('created_at', { ascending: true })
      .range(from, to)

    if (data) {
      setCertificates(prev => [...prev, ...(data as Certificate[])])
      setHasMoreCerts(data.length === PAGE_SIZE)
      setCertPage(nextPage)
    }
  }

  // Subscribe to Realtime updates and load initial data
  useEffect(() => {
    if (!batchId) return
    loadBatchData()

    // Subscribe to Realtime updates for certificates
    const certificatesChannel = supabase
      .channel(`batch-${batchId}-certificates`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'certificates',
          filter: `batch_id=eq.${batchId}`,
        },
        (payload) => {
          console.log('Certificate updated:', payload)
          if (payload.eventType === 'UPDATE') {
            setCertificates(prev => prev.map(c =>
              c.id === payload.new.id
                ? { ...c, ...payload.new }
                : c
            ))
          } else {
            loadBatchData()
          }
        }
      )
      .subscribe()

    // Subscribe to batch status updates
    const batchChannel = supabase
      .channel(`batch-${batchId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'batches',
          filter: `id=eq.${batchId}`,
        },
        (payload) => {
          console.log('Batch updated:', payload)
          setBatch(payload.new as Batch)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(certificatesChannel)
      supabase.removeChannel(batchChannel)
    }
  }, [batchId, loadBatchData])

  async function handleDownloadCertificate(certificate: Certificate) {
    if (!certificate.file_url) return
    try {
      window.open(certificate.file_url, '_blank')
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  async function handleDownloadAll() {
    setDownloading(true)
    try {
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()

      const completedCerts = certificates.filter(c =>
        (c.status === 'completed' || c.status === 'sent' || c.status === 'delivered' || c.status === 'opened') && c.file_url
      )

      if (completedCerts.length === 0) {
        alert('No certificates to download')
        return
      }

      // Fetch all certificates in parallel
      const results = await Promise.all(
        completedCerts.map(async cert => {
          try {
            const response = await fetch(cert.file_url!)
            const blob = await response.blob()
            return { cert, blob }
          } catch {
            return null
          }
        })
      )

      for (const result of results) {
        if (result) {
          const fileName = `${result.cert.recipient_name.replace(/[^a-z0-9]/gi, '_')}_certificate.pdf`
          zip.file(fileName, result.blob)
        }
      }

      // Generate and download zip
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${batch?.name || 'certificates'}_${new Date().toISOString().split('T')[0]}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download all failed:', error)
      alert('Failed to download certificates')
    } finally {
      setDownloading(false)
    }
  }

  async function handleDownloadContacts() {
    if (!batch || certificates.length === 0) return

    const rows = [
      ['Name', 'Email', 'Course/Category', 'Certificate Status', 'Sent At'],
      ...certificates.map(cert => [
        cert.recipient_name,
        cert.recipient_email || '',
        batch.category || '',
        cert.status,
        cert.sent_at ? new Date(cert.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
      ]),
    ]

    const csvContent = rows.map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${batch.name.replace(/[^a-z0-9]/gi, '_')}_contacts.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  async function handleRetryFailed() {
    if (!batch?.id || failedCount === 0) return

    setRetrying(true)
    setFailedError(null)
    try {
      const response = await fetch('/api/batch/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: batch.id })
      })

      if (!response.ok) throw new Error('Retry failed')

      // Reload data
      await loadBatchData()
    } catch (error) {
      console.error('Retry failed:', error)
      setFailedError({
        tier: 'system',
        title: 'Retry failed',
        message: 'Could not retry failed certificates. Please try again.',
        action: { label: 'Try again', onClick: handleRetryFailed },
        showSupport: true,
      })
    } finally {
      setRetrying(false)
    }
  }

  async function handleRetrySingle(certificateId: string) {
    try {
      const response = await fetch('/api/batch/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: batch?.id, certificateId })
      })

      if (!response.ok) throw new Error('Retry failed')

      // Certificate will update via Realtime subscription
    } catch (error) {
      console.error('Retry failed:', error)
      alert('Failed to retry certificate')
    }
  }

  async function handleSaveToContacts() {
    if (!batch) return
    setSavingContacts(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Create contact list
      const { data: list, error: listError } = await supabase
        .from('contact_lists')
        .insert({
          user_id: user.id,
          name: batch.name,
          description: `Imported from batch sent on ${new Date(batch.created_at).toLocaleDateString()}`,
        })
        .select()
        .single()

      if (listError) throw listError

      // Insert all certificates as contacts
      const contactRecords = certificates
        .filter(cert => cert.recipient_name)
        .map(cert => ({
          user_id: user.id,
          list_id: list.id,
          name: cert.recipient_name,
          email: cert.recipient_email || null,
          extra_data: cert.recipient_data || {},
        }))

      if (contactRecords.length > 0) {
        const { error: contactsError } = await supabase
          .from('contacts')
          .insert(contactRecords)

        if (contactsError) throw contactsError
      }

      showToast(`${contactRecords.length} contacts saved to "${batch.name}"`, 'success')
    } catch (error) {
      console.error('Save to contacts failed:', error)
      showToast('Failed to save contacts', 'error')
    } finally {
      setSavingContacts(false)
    }
  }

  // Filter certificates by search
  const filteredCertificates = certificates.filter(cert =>
    cert.recipient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cert.recipient_email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Calculate stats
  const generatedCount = certificates.filter(c =>
    c.status === 'completed' || c.status === 'sent' || c.status === 'delivered' || c.status === 'opened'
  ).length
  const deliveredCount = certificates.filter(c =>
    c.status === 'delivered' || c.status === 'opened'
  ).length
  const openedCount = certificates.filter(c => c.status === 'opened').length
  const failedCount = certificates.filter(c => c.status === 'failed' || c.status === 'bounced').length
  const progressPercent = certificates.length > 0 ? Math.round((generatedCount / certificates.length) * 100) : 0

  // Expiry helpers
  const isExpired = batch?.expires_at ? new Date(batch.expires_at) < new Date() : false

  if (loading && !batch) {
    return (
      <div className="min-h-screen bg-[#F7F8FC] flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-primary mx-auto mb-3" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <p className="text-sm text-gray-500">Loading batch...</p>
        </div>
      </div>
    )
  }

  if (!batch) {
    return (
      <div className="min-h-screen bg-[#F7F8FC] flex items-center justify-center p-6">
        <div className="bg-white border border-[#E8ECF4] rounded-xl shadow-sm p-12 text-center max-w-md">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9.5" stroke="#DC2626" strokeWidth="1.8"/>
              <path d="M12 7v6M12 16h.01" stroke="#DC2626" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">Batch not found</h1>
          <p className="text-sm text-gray-400 mb-6">This batch doesn't exist or you don't have access to it</p>
          <Link
            href="/dashboard"
            className="inline-block px-4 py-2.5 rounded-[10px] bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F7F8FC] px-6 py-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition mb-3"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to Dashboard
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{batch.name}</h1>
              <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
                <span>Created {new Date(batch.created_at).toLocaleDateString()}</span>
                <span>•</span>
                <span>{batch.recipient_count} recipient{batch.recipient_count === 1 ? '' : 's'}</span>
                {batch.category && (
                  <>
                    <span>•</span>
                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">{batch.category}</span>
                  </>
                )}
                {batch.expires_at && (
                  <>
                    <span>•</span>
                    <span className={`text-xs font-medium ${isExpired ? 'text-red-600' : 'text-gray-500'}`}>
                      {isExpired ? 'Expired' : 'Expires'}: {new Date(batch.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </>
                )}
                {batch.scheduled_for && batch.status === 'draft' && (
                  <>
                    <span>•</span>
                    <span className="text-xs text-blue-600 font-medium">
                      Scheduled: {new Date(batch.scheduled_for).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </>
                )}
              </div>
            </div>
            <StatusBadge status={batch.status} />
          </div>
        </div>

        {/* Save to Contacts Banner */}
        {batch.status === 'sent' && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-6 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="flex-shrink-0 text-blue-600">
                <circle cx="7" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M1 17c0-3.31 2.69-6 6-6s6 2.69 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M15 8v5M17.5 10.5h-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <p className="text-sm font-medium text-blue-900">
                Save these recipients to your contact lists for future batches
              </p>
            </div>
            <button
              onClick={handleSaveToContacts}
              disabled={savingContacts}
              className="px-4 py-2 rounded-[10px] bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0"
            >
              {savingContacts ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Saving...
                </>
              ) : (
                'Save to Contacts'
              )}
            </button>
          </div>
        )}

        {/* Status Banners */}
        {batch.status === 'sent' && failedCount === 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l2.5 2.5L10 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-green-900">All certificates sent successfully!</p>
          </div>
        )}
        {batch.status === 'generating' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center flex-shrink-0">
              <svg className="animate-spin" width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle className="opacity-25" cx="6" cy="6" r="5" stroke="white" strokeWidth="1.5" fill="none"/>
                <path className="opacity-75" fill="white" d="M6 1a5 5 0 015 5h-2a3 3 0 00-3-3V1z"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-yellow-900">Generation in progress...</p>
          </div>
        )}
        {batch.status === 'generating' &&
         new Date().getTime() - new Date(batch.updated_at).getTime() > 20 * 60 * 1000 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-6">
            <p className="text-sm font-medium text-orange-900">
              Generation is taking longer than expected.
              If this persists for more than 30 minutes, please use the
              retry button or contact support.
            </p>
          </div>
        )}

        {/* Failed error banner */}
        {failedCount > 0 && !failedError && (
          <div className="mb-6">
            <ErrorMessage
              tier="system"
              title={`${failedCount} certificate${failedCount === 1 ? '' : 's'} failed`}
              message="Some certificates could not be generated or sent. Use the retry button to try again."
            />
          </div>
        )}
        {failedError && (
          <div className="mb-6">
            <ErrorMessage {...failedError} />
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {/* Generated */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-sm p-5 text-white">
            <div className="flex items-center gap-2 mb-2">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M4 10l4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p className="text-xs font-medium opacity-90">Generated</p>
            </div>
            <p className="text-3xl font-bold">{generatedCount}</p>
          </div>

          {/* Delivered */}
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-sm p-5 text-white">
            <div className="flex items-center gap-2 mb-2">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M2 10l4 4 8-8M7 14l3 3 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p className="text-xs font-medium opacity-90">Delivered</p>
            </div>
            <p className="text-3xl font-bold">{deliveredCount}</p>
          </div>

          {/* Opened */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-sm p-5 text-white">
            <div className="flex items-center gap-2 mb-2">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <ellipse cx="10" cy="10" rx="8" ry="5" stroke="currentColor" strokeWidth="1.8"/>
                <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8"/>
              </svg>
              <p className="text-xs font-medium opacity-90">Opened</p>
            </div>
            <p className="text-3xl font-bold">{openedCount}</p>
          </div>

          {/* Failed/Bounced */}
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-sm p-5 text-white">
            <div className="flex items-center gap-2 mb-2">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M10 6v4M10 13h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2"/>
              </svg>
              <p className="text-xs font-medium opacity-90">Failed/Bounced</p>
            </div>
            <p className="text-3xl font-bold">{failedCount}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <button
            onClick={handleDownloadAll}
            disabled={generatedCount === 0 || downloading}
            className="flex-1 min-w-[140px] py-2.5 rounded-[10px] bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-[0.99] transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 16 16" fill="none">
                  <circle className="opacity-25" cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2"/>
                  <path className="opacity-75" fill="currentColor" d="M8 0a8 8 0 018 8h-2a6 6 0 00-6-6V0z"/>
                </svg>
                Preparing ZIP...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v8M8 10l3-3M8 10L5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12v2h12v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Download All (ZIP)
              </>
            )}
          </button>

          <button
            onClick={handleDownloadContacts}
            disabled={certificates.length === 0}
            className="flex-1 min-w-[140px] py-2.5 rounded-[10px] border border-[#E8ECF4] bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 active:scale-[0.99] transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v8M8 10l3-3M8 10L5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12v2h12v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Download Contacts (CSV)
          </button>

          {failedCount > 0 && (
            <button
              onClick={handleRetryFailed}
              disabled={retrying}
              className="flex-1 min-w-[140px] py-2.5 rounded-[10px] bg-red-500 text-white text-sm font-semibold hover:bg-red-600 active:scale-[0.99] transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {retrying ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 16 16" fill="none">
                    <circle className="opacity-25" cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2"/>
                    <path className="opacity-75" fill="currentColor" d="M8 0a8 8 0 018 8h-2a6 6 0 00-6-6V0z"/>
                  </svg>
                  Retrying...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M2 8a6 6 0 016-6v2M14 8a6 6 0 01-6 6v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M5 3L8 6 5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Retry Failed ({failedCount})
                </>
              )}
            </button>
          )}
        </div>

        {/* Progress Card */}
        <div className="bg-white border border-[#E8ECF4] rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-1">Generation Progress</h2>
              <p className="text-xs text-gray-500">
                {generatedCount} of {certificates.length} certificates ready
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{progressPercent}%</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
              role="progressbar"
              aria-label="Certificate generation progress"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        {/* Template Info */}
        {template && (
          <div className="bg-white border border-[#E8ECF4] rounded-xl shadow-sm p-4 mb-6 flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0">
              {template.thumbnail_url ? (
                <Image
                  src={template.thumbnail_url}
                  alt={template.name}
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
            <div>
              <p className="text-xs text-gray-500">Using template</p>
              <p className="text-sm font-semibold text-gray-900">{template.name}</p>
            </div>
          </div>
        )}

        {/* Certificates Table */}
        <div className="bg-white border border-[#E8ECF4] rounded-xl shadow-sm overflow-hidden">

          {/* Header */}
          <div className="px-6 py-4 border-b border-[#E8ECF4] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">All Certificates</h2>

            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search recipients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-lg border border-[#E8ECF4] text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-64"
              />
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {filteredCertificates.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <p className="text-sm">No certificates found</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-[#E8ECF4]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>

                    {/* Dynamic Field Columns */}
                    {template?.fields?.map((field) => (
                      <th key={field.id} className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        {field.name}
                      </th>
                    ))}

                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Sent At</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8ECF4]">
                  {filteredCertificates.map((cert) => (
                    <tr key={cert.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm font-medium text-gray-900">{cert.recipient_name}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-500">{cert.recipient_email || '-'}</p>
                      </td>

                      {/* Dynamic Field Values */}
                      {template?.fields?.map((field) => (
                        <td key={field.id} className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm text-gray-700">
                            {(cert.recipient_data as Record<string, string>)?.[field.name] || '-'}
                          </p>
                        </td>
                      ))}

                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={cert.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-500">
                          {cert.sent_at
                            ? new Date(cert.sent_at).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : '-'
                          }
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          {(cert.status === 'completed' || cert.status === 'sent' || cert.status === 'delivered' || cert.status === 'opened') && cert.file_url && (
                            <button
                              onClick={() => handleDownloadCertificate(cert)}
                              className="p-2 rounded-lg hover:bg-gray-100 transition-colors group"
                              title="Download certificate"
                            >
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-400 group-hover:text-primary">
                                <path d="M8 2v8M8 10l3-3M8 10L5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M2 12v2h12v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                              </svg>
                            </button>
                          )}

                          {(cert.status === 'failed' || cert.status === 'bounced') && (
                            <button
                              onClick={() => handleRetrySingle(cert.id)}
                              className="p-2 rounded-lg hover:bg-red-50 transition-colors group"
                              title="Retry this certificate"
                            >
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-red-400 group-hover:text-red-600">
                                <path d="M2 8a6 6 0 016-6v2M14 8a6 6 0 01-6 6v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                <path d="M5 3L8 6 5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Load More */}
        {hasMoreCerts && (
          <div className="mt-4 text-center">
            <button
              onClick={loadMoreCerts}
              className="px-5 py-2.5 rounded-[10px] border border-[#E8ECF4] bg-white text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
            >
              Load more certificates
            </button>
          </div>
        )}

        {/* Generation Status Message */}
        {batch.status === 'generating' && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-center">
            <div className="flex items-center justify-center gap-2 text-blue-700">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <span className="text-sm font-medium">Generating certificates... Check back in a few minutes</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
