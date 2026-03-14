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

    const body = await request.json()
    const { full_name, org_name, industry } = body

    // Validate required fields
    if (!full_name || !org_name || !industry) {
      return NextResponse.json(
        { error: 'Full name, organization name, and industry are required' },
        { status: 400 }
      )
    }

    // Update profile
    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name,
        org_name,
        industry,
      })
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating profile:', error)
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in update profile:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
