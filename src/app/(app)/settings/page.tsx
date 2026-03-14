'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useToast } from '@/components/ToastProvider'
import { useRouter } from 'next/navigation'

type Profile = {
  full_name: string
  org_name: string
  industry: string
  plan: string
  certificates_used_this_month: number
  usage_reset_date: string
  subscription_status?: string
  logo_url?: string
  default_email_subject?: string
  default_email_message?: string
  default_email_signature?: string
}

type TabType = 'profile' | 'email' | 'account'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('profile')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()
  const router = useRouter()

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (data) setProfile(data as Profile)
    } catch (error) {
      console.error('Failed to load profile:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="px-6 py-10 max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <svg className="animate-spin h-8 w-8 text-[#3B5BDB]" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="px-6 py-10 max-w-4xl mx-auto">
        <div className="bg-white border border-[#E8ECF4] rounded-xl shadow-sm p-12 text-center">
          <p className="text-sm text-gray-400">Failed to load profile</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-10 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 sm:mb-8">Settings</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 sm:mb-8 border-b border-[#E8ECF4] overflow-x-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 sm:px-6 py-3 text-sm font-semibold transition whitespace-nowrap ${
            activeTab === 'profile'
              ? 'text-[#3B5BDB] border-b-2 border-[#3B5BDB]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Profile
        </button>
        <button
          onClick={() => setActiveTab('email')}
          className={`px-4 sm:px-6 py-3 text-sm font-semibold transition whitespace-nowrap ${
            activeTab === 'email'
              ? 'text-[#3B5BDB] border-b-2 border-[#3B5BDB]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Email Defaults
        </button>
        <button
          onClick={() => setActiveTab('account')}
          className={`px-4 sm:px-6 py-3 text-sm font-semibold transition whitespace-nowrap ${
            activeTab === 'account'
              ? 'text-[#3B5BDB] border-b-2 border-[#3B5BDB]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Account
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && (
        <ProfileTab profile={profile} onUpdate={loadProfile} showToast={showToast} />
      )}
      {activeTab === 'email' && (
        <EmailDefaultsTab profile={profile} onUpdate={loadProfile} showToast={showToast} />
      )}
      {activeTab === 'account' && (
        <AccountTab profile={profile} showToast={showToast} router={router} />
      )}
    </div>
  )
}

// Profile Tab Component
function ProfileTab({ 
  profile, 
  onUpdate, 
  showToast 
}: { 
  profile: Profile
  onUpdate: () => void
  showToast: (message: string, type: 'success' | 'error') => void
}) {
  const [fullName, setFullName] = useState(profile.full_name)
  const [orgName, setOrgName] = useState(profile.org_name)
  const [industry, setIndustry] = useState(profile.industry)
  const [logoUrl, setLogoUrl] = useState(profile.logo_url || '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const industries = [
    'Education',
    'Healthcare',
    'Technology',
    'Finance',
    'Nonprofit',
    'Other'
  ]

  async function handleSave() {
    if (!fullName || !orgName || !industry) {
      showToast('Please fill in all fields', 'error')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          org_name: orgName,
          industry,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update profile')
      }

      showToast('Profile updated successfully', 'success')
      onUpdate()
    } catch (error) {
      console.error('Error updating profile:', error)
      showToast('Failed to update profile', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      showToast('File size must be less than 2MB', 'error')
      return
    }

    if (!file.type.startsWith('image/')) {
      showToast('File must be an image', 'error')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/profile/upload-logo', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload logo')
      }

      const { logo_url } = await response.json()
      setLogoUrl(logo_url)
      showToast('Logo uploaded successfully', 'success')
      onUpdate()
    } catch (error) {
      console.error('Error uploading logo:', error)
      showToast('Failed to upload logo', 'error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Organization Logo */}
      <div className="bg-white border border-[#E8ECF4] rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Organization Logo</h3>
        
        <div className="flex items-start gap-6 flex-col sm:flex-row">
          <div className="flex-shrink-0">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Organization logo"
                className="w-24 h-24 rounded-lg object-cover border-2 border-[#E8ECF4]"
              />
            ) : (
              <div className="w-24 h-24 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
              aria-label="Upload organization logo"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2.5 rounded-[10px] border border-[#E8ECF4] text-gray-700 text-sm font-semibold hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Uploading...
                </span>
              ) : (
                'Upload Logo'
              )}
            </button>
            <p className="text-xs text-gray-500 mt-2">
              PNG, JPG up to 2MB. Your logo appears on certificates and emails.
            </p>
          </div>
        </div>
      </div>

      {/* Profile Information */}
      <div className="bg-white border border-[#E8ECF4] rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Profile Information</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-2.5 border border-[#E8ECF4] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB] focus:border-transparent"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Organization Name
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full px-4 py-2.5 border border-[#E8ECF4] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB] focus:border-transparent"
              placeholder="Enter your organization name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Industry
            </label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full px-4 py-2.5 border border-[#E8ECF4] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB] focus:border-transparent"
              aria-label="Select industry"
            >
              {industries.map((ind) => (
                <option key={ind} value={ind.toLowerCase()}>
                  {ind}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-6 px-6 py-2.5 rounded-[10px] bg-[#3B5BDB] text-white text-sm font-semibold hover:bg-[#3B5BDB]/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Saving...
            </span>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </div>
  )
}

// Email Defaults Tab Component
function EmailDefaultsTab({ 
  profile, 
  onUpdate, 
  showToast 
}: { 
  profile: Profile
  onUpdate: () => void
  showToast: (message: string, type: 'success' | 'error') => void
}) {
  const [subject, setSubject] = useState(
    profile.default_email_subject || 'Your certificate from {org_name}'
  )
  const [message, setMessage] = useState(
    profile.default_email_message || 
    'Hi {recipient_name},\n\nPlease find your certificate attached. Congratulations on your achievement!\n\nBest regards,\n{org_name}'
  )
  const [signature, setSignature] = useState(
    profile.default_email_signature || 'This certificate was issued by {org_name}.'
  )
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!subject || !message) {
      showToast('Subject and message are required', 'error')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/profile/update-email-defaults', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          default_email_subject: subject,
          default_email_message: message,
          default_email_signature: signature,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update email defaults')
      }

      showToast('Email defaults updated successfully', 'success')
      onUpdate()
    } catch (error) {
      console.error('Error updating email defaults:', error)
      showToast('Failed to update email defaults', 'error')
    } finally {
      setSaving(false)
    }
  }

  const previewSubject = subject
    .replace('{org_name}', profile.org_name)
    .replace('{recipient_name}', 'John Doe')
  
  const previewMessage = message
    .replace('{org_name}', profile.org_name)
    .replace('{recipient_name}', 'John Doe')
  
  const previewSignature = signature
    .replace('{org_name}', profile.org_name)

  return (
    <div className="space-y-6">
      {/* Email Defaults Form */}
      <div className="bg-white border border-[#E8ECF4] rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-2">Email Defaults</h3>
        <p className="text-sm text-gray-500 mb-6">
          These default values will pre-fill when you create a new batch. You can customize them for each batch.
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-2.5 border border-[#E8ECF4] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB] focus:border-transparent"
              placeholder="Your certificate from {org_name}"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use {'{org_name}'} and {'{recipient_name}'} as placeholders
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="w-full px-4 py-2.5 border border-[#E8ECF4] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB] focus:border-transparent resize-none"
              placeholder="Hi {recipient_name},&#10;&#10;Please find your certificate attached..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Use {'{org_name}'} and {'{recipient_name}'} as placeholders
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Signature
            </label>
            <textarea
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 border border-[#E8ECF4] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3B5BDB] focus:border-transparent resize-none"
              placeholder="This certificate was issued by {org_name}."
            />
            <p className="text-xs text-gray-500 mt-1">
              Appears at the bottom of every certificate email
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-6 px-6 py-2.5 rounded-[10px] bg-[#3B5BDB] text-white text-sm font-semibold hover:bg-[#3B5BDB]/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Saving...
            </span>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>

      {/* Email Preview */}
      <div className="bg-white border border-[#E8ECF4] rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Preview</h3>
        <div className="bg-gray-50 border border-[#E8ECF4] rounded-lg p-4">
          <div className="mb-3 pb-3 border-b border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Subject:</p>
            <p className="text-sm font-semibold text-gray-900">{previewSubject}</p>
          </div>
          <div className="space-y-3">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{previewMessage}</p>
            {signature && (
              <p className="text-xs text-gray-500 pt-3 border-t border-gray-200 italic">
                {previewSignature}
              </p>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          This is how emails will appear to recipients (with actual names replaced)
        </p>
      </div>
    </div>
  )
}

// Account Tab Component
function AccountTab({ 
  profile, 
  showToast,
  router
}: { 
  profile: Profile
  showToast: (message: string, type: 'success' | 'error') => void
  router: any
}) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const getPlanLimits = (plan: string) => {
    switch (plan) {
      case 'starter':
        return { certificates: 300, templates: 5 }
      case 'growth':
        return { certificates: 1500, templates: Infinity }
      case 'pro':
        return { certificates: Infinity, templates: Infinity }
      default:
        return { certificates: 25, templates: 1 }
    }
  }

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'starter':
        return 'bg-blue-500'
      case 'growth':
        return 'bg-purple-500'
      case 'pro':
        return 'bg-gradient-to-r from-yellow-400 to-orange-500'
      default:
        return 'bg-gray-500'
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true)
    try {
      const response = await fetch('/api/account/delete', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to delete account')
      }

      showToast('Account deleted successfully', 'success')
      // Redirect to auth page after successful deletion
      setTimeout(() => {
        router.push('/auth')
      }, 1500)
    } catch (error) {
      console.error('Error deleting account:', error)
      showToast('Failed to delete account', 'error')
      setDeleting(false)
    }
  }

  const limits = getPlanLimits(profile.plan)
  const usagePercent = limits.certificates === Infinity 
    ? 0 
    : Math.min((profile.certificates_used_this_month / limits.certificates) * 100, 100)

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <div className="bg-white border border-[#E8ECF4] rounded-xl shadow-sm overflow-hidden">
        <div className={`${getPlanColor(profile.plan)} px-6 py-4 text-white`}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm opacity-90 mb-1">Current Plan</p>
              <h2 className="text-2xl font-bold capitalize">{profile.plan}</h2>
            </div>
            {profile.subscription_status && profile.subscription_status !== 'canceled' && (
              <div className="px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold uppercase">
                {profile.subscription_status}
              </div>
            )}
          </div>
        </div>

        <div className="p-6">
          {/* Usage Stats */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Certificates This Month
              </span>
              <span className="text-sm font-bold text-gray-900">
                {profile.certificates_used_this_month} / {limits.certificates === Infinity ? '∞' : limits.certificates}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  usagePercent > 90 ? 'bg-red-500' : usagePercent > 70 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Resets on {new Date(profile.usage_reset_date).toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
          </div>

          {/* Plan Features */}
          <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-[#E8ECF4]">
            <div>
              <p className="text-xs text-gray-500 mb-1">Certificates/month</p>
              <p className="text-lg font-bold text-gray-900">
                {limits.certificates === Infinity ? 'Unlimited' : limits.certificates.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Templates</p>
              <p className="text-lg font-bold text-gray-900">
                {limits.templates === Infinity ? 'Unlimited' : limits.templates}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 flex-col sm:flex-row">
            {profile.plan === 'free' ? (
              <Link
                href="/pricing"
                className="flex-1 py-2.5 rounded-[10px] bg-[#3B5BDB] text-white text-sm font-semibold text-center hover:bg-[#3B5BDB]/90 transition"
              >
                Upgrade Plan
              </Link>
            ) : (
              <>
                <Link
                  href="/pricing"
                  className="flex-1 py-2.5 rounded-[10px] bg-[#3B5BDB] text-white text-sm font-semibold text-center hover:bg-[#3B5BDB]/90 transition"
                >
                  Change Plan
                </Link>
                <button
                  onClick={() => showToast('Stripe Customer Portal integration coming soon!', 'error')}
                  className="px-4 py-2.5 rounded-[10px] border border-[#E8ECF4] text-gray-700 text-sm font-semibold hover:bg-gray-50 transition"
                >
                  Manage Billing
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white border border-red-200 rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-bold text-red-600 mb-2">Danger Zone</h3>
        <p className="text-sm text-gray-600 mb-4">
          Once you delete your account, there is no going back. All your templates, batches, and certificates will be permanently deleted.
        </p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="px-6 py-2.5 rounded-[10px] bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition"
        >
          Delete Account
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => !deleting && setShowDeleteModal(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Delete Account?
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              This action cannot be undone. All your data will be permanently deleted, including:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 mb-6 space-y-1">
              <li>All templates you've created</li>
              <li>All certificate batches</li>
              <li>All generated certificates</li>
              <li>Your organization profile</li>
            </ul>
            <div className="flex gap-3 flex-col sm:flex-row">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-[10px] border border-[#E8ECF4] text-gray-700 text-sm font-semibold hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-[10px] bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition disabled:opacity-50"
              >
                {deleting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Deleting...
                  </span>
                ) : (
                  'Yes, Delete My Account'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

