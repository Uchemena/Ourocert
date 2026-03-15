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

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      )
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 2MB' },
        { status: 400 }
      )
    }

    // Delete old logo if exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('logo_url')
      .eq('id', user.id)
      .single()

    if (profile?.logo_url) {
      const oldPath = profile.logo_url.split('/org-logos/')[1]
      if (oldPath) {
        await supabase.storage
          .from('org-logos')
          .remove([oldPath])
      }
    }

    // Upload new logo
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/logo.${fileExt}`
    const fileBuffer = await file.arrayBuffer()

    const { error: uploadError } = await supabase.storage
      .from('org-logos')
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error('Error uploading logo:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload logo' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('org-logos')
      .getPublicUrl(fileName)

    // Update profile with logo URL
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ logo_url: publicUrl })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating profile with logo URL:', updateError)
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({ logo_url: publicUrl })
  } catch (error) {
    console.error('Error in upload logo:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
