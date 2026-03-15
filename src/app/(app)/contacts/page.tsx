// src/app/(app)/contacts/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ToastProvider'

interface ContactList {
  id: string
  name: string
  description?: string
  created_at: string
  contact_count?: number
}

interface Contact {
  id: string
  name: string
  email?: string
  extra_data: Record<string, string>
  created_at: string
}

export default function ContactsPage() {
  const supabase = createClient()
  const router = useRouter()
  const { showToast } = useToast()
  const csvInputRef = useRef<HTMLInputElement>(null)

  const [lists, setLists] = useState<ContactList[]>([])
  const [selectedList, setSelectedList] = useState<ContactList | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // New list form
  const [showNewListForm, setShowNewListForm] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListDescription, setNewListDescription] = useState('')
  const [creatingList, setCreatingList] = useState(false)

  // CSV import
  const [importingCSV, setImportingCSV] = useState(false)

  // Delete
  const [deletingListId, setDeletingListId] = useState<string | null>(null)

  useEffect(() => {
    loadLists()
  }, [])

  async function loadLists() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: listsData } = await supabase
        .from('contact_lists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      const lists = (listsData as ContactList[]) || []

      // Get contact counts for each list
      const listsWithCounts = await Promise.all(
        lists.map(async (list) => {
          const { count } = await supabase
            .from('contacts')
            .select('*', { count: 'exact', head: true })
            .eq('list_id', list.id)
          return { ...list, contact_count: count ?? 0 }
        })
      )

      setLists(listsWithCounts)
    } catch (err) {
      console.error('Failed to load lists:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadContacts(listId: string) {
    setLoadingContacts(true)
    try {
      const { data } = await supabase
        .from('contacts')
        .select('*')
        .eq('list_id', listId)
        .order('created_at', { ascending: false })

      setContacts((data as Contact[]) || [])
    } catch (err) {
      console.error('Failed to load contacts:', err)
    } finally {
      setLoadingContacts(false)
    }
  }

  function handleSelectList(list: ContactList) {
    setSelectedList(list)
    setSearchQuery('')
    loadContacts(list.id)
  }

  async function handleCreateList() {
    if (!newListName.trim()) return
    setCreatingList(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('contact_lists')
        .insert({
          user_id: user.id,
          name: newListName.trim(),
          description: newListDescription.trim() || null,
        })
        .select()
        .single()

      if (error) throw error

      const newList = { ...data, contact_count: 0 } as ContactList
      setLists(prev => [newList, ...prev])
      setNewListName('')
      setNewListDescription('')
      setShowNewListForm(false)
      showToast('Contact list created', 'success')
      handleSelectList(newList)
    } catch (err) {
      console.error('Failed to create list:', err)
      showToast('Failed to create list', 'error')
    } finally {
      setCreatingList(false)
    }
  }

  async function handleDeleteList(listId: string) {
    if (!confirm('Delete this contact list and all its contacts? This cannot be undone.')) return
    setDeletingListId(listId)
    try {
      const { error } = await supabase
        .from('contact_lists')
        .delete()
        .eq('id', listId)

      if (error) throw error

      setLists(prev => prev.filter(l => l.id !== listId))
      if (selectedList?.id === listId) {
        setSelectedList(null)
        setContacts([])
      }
      showToast('Contact list deleted', 'success')
    } catch (err) {
      console.error('Failed to delete list:', err)
      showToast('Failed to delete list', 'error')
    } finally {
      setDeletingListId(null)
    }
  }

  async function handleCSVImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !selectedList) return
    e.target.value = ''

    setImportingCSV(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const text = await file.text()
      const lines = text.trim().split('\n')
      if (lines.length < 2) {
        showToast('CSV file is empty', 'error')
        return
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''))
      const nameIdx = headers.findIndex(h => h.toLowerCase() === 'name' || h.toLowerCase() === 'full name')
      const emailIdx = headers.findIndex(h => h.toLowerCase() === 'email')

      const contactRecords = []
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''))
        const extra_data: Record<string, string> = {}
        headers.forEach((h, idx) => {
          if (idx !== nameIdx && idx !== emailIdx) {
            extra_data[h] = values[idx] || ''
          }
        })
        contactRecords.push({
          user_id: user.id,
          list_id: selectedList.id,
          name: nameIdx >= 0 ? (values[nameIdx] || 'Unknown') : (values[0] || 'Unknown'),
          email: emailIdx >= 0 ? values[emailIdx] || null : null,
          extra_data,
        })
      }

      const { error } = await supabase.from('contacts').insert(contactRecords)
      if (error) throw error

      await loadContacts(selectedList.id)
      // Update count
      setLists(prev => prev.map(l =>
        l.id === selectedList.id
          ? { ...l, contact_count: (l.contact_count || 0) + contactRecords.length }
          : l
      ))
      showToast(`${contactRecords.length} contacts imported`, 'success')
    } catch (err) {
      console.error('Failed to import CSV:', err)
      showToast('Failed to import contacts', 'error')
    } finally {
      setImportingCSV(false)
    }
  }

  function handleExportCSV() {
    if (!selectedList || contacts.length === 0) return

    const rows = [
      ['Name', 'Email', ...Object.keys(contacts[0]?.extra_data || {})],
      ...contacts.map(c => [
        c.name,
        c.email || '',
        ...Object.values(c.extra_data || {}),
      ]),
    ]

    const csvContent = rows.map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${selectedList.name.replace(/[^a-z0-9]/gi, '_')}_contacts.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F8FC] flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F7F8FC] px-6 py-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
            <p className="text-sm text-gray-400 mt-1">Manage your recipient lists for quick batch creation</p>
          </div>
          <button
            onClick={() => setShowNewListForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1.5v11M1.5 7h11" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            New List
          </button>
        </div>

        <div className="flex gap-5 flex-col lg:flex-row">

          {/* ── Left Panel: Lists ── */}
          <div className="w-full lg:w-72 flex-shrink-0">

            {/* New List Form */}
            {showNewListForm && (
              <div className="bg-white border border-[#E8ECF4] rounded-xl shadow-sm p-4 mb-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3">New Contact List</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">List name</label>
                    <input
                      type="text"
                      value={newListName}
                      onChange={e => setNewListName(e.target.value)}
                      placeholder="e.g. Q1 2024 Workshop"
                      className="w-full px-3 py-2 rounded-[8px] border border-[#E8ECF4] text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Description <span className="text-gray-300">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={newListDescription}
                      onChange={e => setNewListDescription(e.target.value)}
                      placeholder="Optional description"
                      className="w-full px-3 py-2 rounded-[8px] border border-[#E8ECF4] text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => { setShowNewListForm(false); setNewListName(''); setNewListDescription('') }}
                      className="flex-1 py-2 rounded-[8px] border border-[#E8ECF4] text-xs font-medium text-gray-500 hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateList}
                      disabled={!newListName.trim() || creatingList}
                      className="flex-1 py-2 rounded-[8px] bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition disabled:opacity-50"
                    >
                      {creatingList ? 'Creating...' : 'Create'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Lists */}
            <div className="bg-white border border-[#E8ECF4] rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-[#E8ECF4]">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Your Lists ({lists.length})
                </p>
              </div>

              {lists.length === 0 ? (
                <div className="py-10 text-center px-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center mx-auto mb-3">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <circle cx="7" cy="6" r="3" stroke="#3B5BDB" strokeWidth="1.5"/>
                      <path d="M1 17c0-3.31 2.69-6 6-6s6 2.69 6 6" stroke="#3B5BDB" strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M15 8v5M17.5 10.5h-5" stroke="#3B5BDB" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500 mb-1">No lists yet</p>
                  <p className="text-xs text-gray-400">Create your first contact list</p>
                </div>
              ) : (
                <div className="divide-y divide-[#E8ECF4]">
                  {lists.map(list => (
                    <div
                      key={list.id}
                      className={`px-4 py-3 cursor-pointer transition-colors flex items-center justify-between group ${
                        selectedList?.id === list.id
                          ? 'bg-primary/5 border-l-[3px] border-primary'
                          : 'hover:bg-gray-50 border-l-[3px] border-transparent'
                      }`}
                      onClick={() => handleSelectList(list)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${selectedList?.id === list.id ? 'text-primary' : 'text-gray-900'}`}>
                          {list.name}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {list.contact_count ?? 0} contact{(list.contact_count ?? 0) === 1 ? '' : 's'}
                        </p>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteList(list.id) }}
                        disabled={deletingListId === list.id}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition flex-shrink-0 opacity-0 group-hover:opacity-100"
                        title="Delete list"
                      >
                        {deletingListId === list.id ? (
                          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                        ) : (
                          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                            <path d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M11.5 3.5l-.7 7.7a1 1 0 01-1 .8H4.2a1 1 0 01-1-.8L2.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Right Panel: Contacts ── */}
          <div className="flex-1 min-w-0">
            {!selectedList ? (
              <div className="bg-white border border-[#E8ECF4] rounded-xl shadow-sm py-20 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center mb-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="8" cy="7" r="4" stroke="#3B5BDB" strokeWidth="1.8"/>
                    <path d="M2 21c0-3.31 2.69-6 6-6s6 2.69 6 6" stroke="#3B5BDB" strokeWidth="1.8" strokeLinecap="round"/>
                    <path d="M18 10v6M21 13h-6" stroke="#3B5BDB" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Select a contact list</h3>
                <p className="text-sm text-gray-400">Choose a list from the left to view and manage contacts</p>
              </div>
            ) : (
              <div className="bg-white border border-[#E8ECF4] rounded-xl shadow-sm overflow-hidden">

                {/* Header */}
                <div className="px-6 py-4 border-b border-[#E8ECF4]">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <h2 className="text-base font-bold text-gray-900">{selectedList.name}</h2>
                      {selectedList.description && (
                        <p className="text-xs text-gray-400 mt-0.5">{selectedList.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Search */}
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search..."
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="pl-8 pr-3 py-2 rounded-lg border border-[#E8ECF4] text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-48"
                        />
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </div>

                      {/* Import CSV */}
                      <input
                        ref={csvInputRef}
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={handleCSVImport}
                      />
                      <button
                        onClick={() => csvInputRef.current?.click()}
                        disabled={importingCSV}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E8ECF4] text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                      >
                        {importingCSV ? (
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <path d="M8 10V2M8 10L5 7M8 10l3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M2 12v2h12v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        )}
                        Import CSV
                      </button>

                      {/* Export CSV */}
                      <button
                        onClick={handleExportCSV}
                        disabled={contacts.length === 0}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E8ECF4] text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <path d="M8 2v8M8 10l3-3M8 10L5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M2 12v2h12v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        Export CSV
                      </button>

                      {/* Use this list */}
                      <button
                        onClick={() => router.push(`/batch/new?list=${selectedList.id}`)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition"
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M7 1.5v11M1.5 7h11" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        Use this list
                      </button>
                    </div>
                  </div>
                </div>

                {/* Contacts Table */}
                {loadingContacts ? (
                  <div className="py-12 flex items-center justify-center">
                    <svg className="animate-spin h-6 w-6 text-primary" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  </div>
                ) : contacts.length === 0 ? (
                  <div className="py-16 text-center px-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <circle cx="7" cy="6" r="3" stroke="#9CA3AF" strokeWidth="1.5"/>
                        <path d="M1 17c0-3.31 2.69-6 6-6s6 2.69 6 6" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <p className="text-sm text-gray-500 mb-1">No contacts yet</p>
                    <p className="text-xs text-gray-400">Import a CSV to add contacts to this list</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-[#E8ECF4]">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Added</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E8ECF4]">
                        {filteredContacts.map(contact => (
                          <tr key={contact.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-3">
                              <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                            </td>
                            <td className="px-6 py-3">
                              <p className="text-sm text-gray-500">{contact.email || '-'}</p>
                            </td>
                            <td className="px-6 py-3">
                              <p className="text-xs text-gray-400">
                                {new Date(contact.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {filteredContacts.length === 0 && searchQuery && (
                      <div className="py-8 text-center text-sm text-gray-400">
                        No contacts match &quot;{searchQuery}&quot;
                      </div>
                    )}
                  </div>
                )}

                {contacts.length > 0 && (
                  <div className="px-6 py-3 border-t border-[#E8ECF4] text-xs text-gray-400">
                    {filteredContacts.length} of {contacts.length} contacts
                    {searchQuery && ` matching "${searchQuery}"`}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
