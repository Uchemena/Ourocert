// Supabase Edge Function: send-certificates
// Sends generated certificates via email using Resend API

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get certificate_id and batch_id from request
    const { certificate_id, batch_id } = await req.json()
    
    if (!certificate_id || !batch_id) {
      return new Response(
        JSON.stringify({ error: 'certificate_id and batch_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Fetch certificate details
    const { data: certificate, error: certError } = await supabase
      .from('certificates')
      .select('*')
      .eq('id', certificate_id)
      .single()

    if (certError || !certificate) {
      throw new Error(`Certificate not found: ${certError?.message}`)
    }

    // Only send if status is "completed"
    if (certificate.status !== 'completed') {
      return new Response(
        JSON.stringify({ error: 'Certificate is not ready to send' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch batch details for email template
    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .select('email_subject, email_message, user_id')
      .eq('id', batch_id)
      .single()

    if (batchError || !batch) {
      throw new Error(`Batch not found: ${batchError?.message}`)
    }

    // Get recipient email from certificate data
    const recipientEmail = certificate.recipient_email
    const recipientName = certificate.recipient_name

    if (!recipientEmail) {
      throw new Error('No email address found for recipient')
    }

    // Replace [Recipient Name] placeholder in email subject and body
    const emailSubject = (batch.email_subject || 'Your certificate')
      .replace(/\[Recipient Name\]/g, recipientName)
    
    const emailMessage = (batch.email_message || 'Please find your certificate attached.')
      .replace(/\[Recipient Name\]/g, recipientName)

    // Download certificate file from Storage
    const fileName = certificate.file_url.split('/').pop()
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('generated-certificates')
      .download(`${batch_id}/${certificate_id}.png`)

    if (downloadError) {
      throw new Error(`Failed to download certificate: ${downloadError.message}`)
    }

    // Convert blob to base64 for email attachment
    const fileBuffer = await fileData.arrayBuffer()
    const base64File = btoa(
      new Uint8Array(fileBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    )

    // Send email via Resend
    const resend = await import('npm:resend@2.0.0')
    const resendClient = new resend.Resend(Deno.env.get('RESEND_API_KEY'))

    const { data: emailData, error: emailError } = await resendClient.emails.send({
      from: 'OUROCERT <noreply@yourdomain.com>',
      to: recipientEmail,
      subject: emailSubject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3B5BDB;">Your Certificate</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            ${emailMessage.split('\n').join('<br>')}
          </p>
          <p style="font-size: 14px; color: #666; margin-top: 32px;">
            Your certificate is attached to this email as a PNG image.
          </p>
        </div>
      `,
      attachments: [
        {
          filename: `certificate-${recipientName.replace(/\s+/g, '-').toLowerCase()}.png`,
          content: base64File
        }
      ]
    })

    if (emailError) {
      throw new Error(`Failed to send email: ${emailError.message}`)
    }

    // Update certificate status to "sent"
    await supabase
      .from('certificates')
      .update({ 
        status: 'sent',
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', certificate_id)

    console.log(`✓ Sent certificate to ${recipientEmail}`)

    return new Response(
      JSON.stringify({ 
        success: true,
        email: recipientEmail,
        messageId: emailData?.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error sending certificate:', error)
    
    // Try to update certificate status to failed
    try {
      const { certificate_id } = await req.clone().json()
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      
      await supabase
        .from('certificates')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', certificate_id)
    } catch (e) {
      console.error('Failed to update certificate status:', e)
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
