'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignOutButton() {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth')
    router.refresh()
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-sm font-medium text-gray-500 hover:text-navy px-4 py-2 rounded-xl hover:bg-gray-50 transition"
    >
      Sign out
    </button>
  )
}
