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
    const { 
      default_email_subject, 
      default_email_message, 
      default_email_signature 
    } = body

    // Validate required fields
    if (!default_email_subject || !default_email_message) {
      return NextResponse.json(
        { error: 'Email subject and message are required' },
        { status: 400 }
      )
    }

    // Update email defaults
    const { data, error } = await supabase
      .from('profiles')
      .update({
        default_email_subject,
        default_email_message,
        default_email_signature: default_email_signature || '',
      })
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating email defaults:', error)
      return NextResponse.json(
        { error: 'Failed to update email defaults' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in update email defaults:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
