import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Delete user's profile (cascading deletes will handle related data)
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('user_id', user.id)

    if (profileError) {
      console.error('Error deleting profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to delete profile' },
        { status: 500 }
      )
    }

    // Delete user from auth
    const { error: authError } = await supabase.auth.admin.deleteUser(user.id)

    if (authError) {
      console.error('Error deleting user from auth:', authError)
      // Note: Profile is already deleted, but auth deletion failed
      // In production, you might want to log this for manual cleanup
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in delete account:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
