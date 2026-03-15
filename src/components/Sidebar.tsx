// src/components/Sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', parent: '/dashboard', icon: GridIcon },
  { href: '/templates', label: 'Templates', parent: '/templates', icon: TemplatesIcon },
  { href: '/contacts', label: 'Contacts', parent: '/contacts', icon: ContactsIcon },
  { href: '/batch/new', label: 'New Batch', parent: '/batch', icon: PlusCircleIcon },
  { href: '/settings', label: 'Settings', parent: '/settings', icon: SettingsIcon },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth')
    router.refresh()
  }

  function isActive(parent: string) {
    return pathname === parent || pathname.startsWith(parent + '/')
  }

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="fixed inset-y-0 left-0 z-40 w-60 bg-white border-r border-[#E8ECF4] hidden md:flex flex-col">

        {/* Logo */}
        <div className="h-[60px] flex-shrink-0 flex items-center gap-2.5 px-5 border-b border-[#E8ECF4]">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <StarIcon />
          </div>
          <span className="text-[15px] font-bold text-primary tracking-tight">OUROCERT</span>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.parent)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  'flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800',
                ].join(' ')}
              >
                <item.icon />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Sign out */}
        <div className="flex-shrink-0 px-3 py-4 border-t border-[#E8ECF4]">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-[10px] text-sm font-medium text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          >
            <SignOutIcon />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Mobile: sticky top bar ── */}
      <header className="sticky top-0 z-30 md:hidden bg-white border-b border-[#E8ECF4] px-4 h-14 flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
          <StarIcon small />
        </div>
        <span className="text-sm font-bold text-primary tracking-tight">OUROCERT</span>
      </header>

      {/* ── Mobile: bottom nav ── */}
      <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white border-t border-[#E8ECF4] flex h-14">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.parent)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors',
                active ? 'text-primary' : 'text-gray-400',
              ].join(' ')}
            >
              <item.icon />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}

// ── Icons ──────────────────────────────────────────────────

function StarIcon({ small }: { small?: boolean }) {
  const s = small ? 11 : 14
  return (
    <svg width={s} height={s} viewBox="0 0 20 20" fill="none">
      <path d="M10 2L12.5 7.5H18L13.5 11L15.5 17L10 13.5L4.5 17L6.5 11L2 7.5H7.5L10 2Z" fill="white" />
    </svg>
  )
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function TemplatesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="1.5" width="12" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.5 5.5h7M4.5 8h7M4.5 10.5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function ContactsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M1 13c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M12 7v4M14 9h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function PlusCircleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 5v6M5 8h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.1 3.1l1.05 1.05M11.85 11.85l1.05 1.05M3.1 12.9l1.05-1.05M11.85 4.15l1.05-1.05"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

function SignOutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M5.5 2H3a1 1 0 00-1 1v10a1 1 0 001 1h2.5M10.5 11l3-3-3-3M13.5 8H6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
