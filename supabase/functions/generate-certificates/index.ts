// Supabase Edge Function: generate-certificates
// Generates certificate images/PDFs for each recipient in a batch

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// ─── Security helper ──────────────────────────────────────────────────────────
// Escapes characters that are meaningful in SVG/XML so that user-supplied
// strings cannot break out of a <text> node and inject new SVG elements.
function escapeSvg(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Deno.serve is the entry point for Edge Functions
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get batch_id from request body
    const { batch_id } = await req.json()

    if (!batch_id) {
      return new Response(
        JSON.stringify({ error: 'batch_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Fix 7: Verify the calling user owns this batch ────────────────────────
    // Extract the user's JWT from the Authorization header and create a
    // user-scoped client so we can confirm identity without trusting the payload.
    const authHeader = req.headers.get('Authorization') ?? ''
    const jwt = authHeader.replace('Bearer ', '')

    const userSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: `Bearer ${jwt}` } },
        auth: { autoRefreshToken: false, persistSession: false }
      }
    )

    const { data: { user: callingUser } } = await userSupabase.auth.getUser()

    if (!callingUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Initialize Supabase client with service role key (has admin access)
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

    // Fetch batch details
    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .select('*, template:templates(*)')
      .eq('id', batch_id)
      .single()

    if (batchError || !batch) {
      throw new Error(`Batch not found: ${batchError?.message}`)
    }

    // ── Fix 7 (continued): Confirm batch belongs to the calling user ──────────
    if (batch.user_id !== callingUser.id) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Update batch status to "generating"
    await supabase
      .from('batches')
      .update({ status: 'generating' })
      .eq('id', batch_id)

    // Fetch all certificates for this batch
    const { data: certificates, error: certsError } = await supabase
      .from('certificates')
      .select('*')
      .eq('batch_id', batch_id)
      .eq('status', 'pending')

    if (certsError) {
      throw new Error(`Failed to fetch certificates: ${certsError.message}`)
    }

    console.log(`Processing ${certificates?.length || 0} certificates for batch ${batch_id}`)

    // Per-certificate processing logic
    async function processCert(cert: any) {
      try {
        await supabase
          .from('certificates')
          .update({ status: 'generating' })
          .eq('id', cert.id)

        let fileUrl: string

        if (batch.template.type === 'upload') {
          fileUrl = await generateUploadedCertificate(supabase, batch.template, cert)
        } else {
          fileUrl = await generateDesignedCertificate(supabase, batch.template, cert)
        }

        await supabase
          .from('certificates')
          .update({
            file_url: fileUrl,
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', cert.id)

        console.log(`✓ Generated certificate ${cert.id}`)

        // Don't await this — let it run independently
        fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-certificates`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
          },
          body: JSON.stringify({
            certificate_id: cert.id,
            batch_id: batch_id
          })
        }).catch(err => console.error('Send trigger failed:', err))

      } catch (error) {
        console.error(`✗ Failed to generate certificate ${cert.id}:`, error)

        await supabase
          .from('certificates')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', cert.id)
      }
    }

    // Process certificates in parallel batches of 10
    const allCerts = certificates || []
    for (let i = 0; i < allCerts.length; i += 10) {
      const chunk = allCerts.slice(i, i + 10)
      await Promise.all(chunk.map((cert: any) => processCert(cert)))
    }

    // Check if all certificates are processed
    const { data: remainingCerts } = await supabase
      .from('certificates')
      .select('status')
      .eq('batch_id', batch_id)
      .in('status', ['pending', 'generating'])

    if (!remainingCerts || remainingCerts.length === 0) {
      // All done! Update batch status
      await supabase
        .from('batches')
        .update({ status: 'sent' })
        .eq('id', batch_id)

      // ── Fix 4B: Increment the user's monthly certificate usage counter ──────
      const { count: completedCount } = await supabase
        .from('certificates')
        .select('*', { count: 'exact', head: true })
        .eq('batch_id', batch_id)
        .eq('status', 'sent')

      await supabase.rpc('increment_certificate_usage', {
        p_user_id: batch.user_id,
        p_count: completedCount ?? 0
      })
      // ────────────────────────────────────────────────────────────────────────

      // Send completion email to batch creator
      await sendBatchCompletionEmail(supabase, batch)
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: certificates?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Generate certificate from uploaded template (image + text overlay)
// ─────────────────────────────────────────────────────────────────────────────
async function generateUploadedCertificate(supabase: any, template: any, cert: any): Promise<string> {
  // Import Sharp for image processing (Deno uses npm: prefix)
  const sharp = await import('npm:sharp@0.33.0')

  // Download the template image from Supabase Storage
  const { data: imageData, error: downloadError } = await supabase
    .storage
    .from('certificate-templates')
    .download(template.file_url.split('/').pop())

  if (downloadError) {
    throw new Error(`Failed to download template: ${downloadError.message}`)
  }

  // Convert blob to buffer
  const imageBuffer = await imageData.arrayBuffer()

  // Get image metadata
  const image = sharp.default(imageBuffer)
  const metadata = await image.metadata()
  const width = metadata.width || 1920
  const height = metadata.height || 1080

  // Create SVG overlays for text fields
  const fields = template.fields || []
  const recipientData = cert.recipient_data || {}

  // Map position names to coordinates
  const positionMap: Record<string, { x: number, y: number, anchor: string }> = {
    'Top Center': { x: width / 2, y: height * 0.15, anchor: 'middle' },
    'Upper Middle': { x: width / 2, y: height * 0.3, anchor: 'middle' },
    'Center Large': { x: width / 2, y: height * 0.45, anchor: 'middle' },
    'Center Medium': { x: width / 2, y: height * 0.5, anchor: 'middle' },
    'Lower Middle': { x: width / 2, y: height * 0.7, anchor: 'middle' },
    'Bottom Left': { x: width * 0.15, y: height * 0.85, anchor: 'start' },
    'Bottom Center': { x: width / 2, y: height * 0.85, anchor: 'middle' },
    'Bottom Right': { x: width * 0.85, y: height * 0.85, anchor: 'end' }
  }

  // Map size names to font sizes
  const sizeMap: Record<string, number> = {
    'Small': 32,
    'Medium': 48,
    'Large': 64,
    'Extra Large': 96
  }

  // Build SVG overlay with all text fields
  let svgOverlay = `<svg width="${width}" height="${height}">`

  for (const field of fields) {
    const pos = positionMap[field.position] || positionMap['Center Medium']
    const fontSize = sizeMap[field.size] || 48
    // ── Fix 1: Escape recipient data before injecting into SVG ───────────────
    const text = escapeSvg(recipientData[field.name] || field.name)
    // ─────────────────────────────────────────────────────────────────────────
    const fontFamily = field.font === 'Playfair Display' ? 'serif' : 'sans-serif'
    const fontWeight = ['Large', 'Extra Large'].includes(field.size) ? 600 : 400

    svgOverlay += `
      <text
        x="${pos.x}"
        y="${pos.y}"
        text-anchor="${pos.anchor}"
        font-family="${fontFamily}"
        font-size="${fontSize}"
        font-weight="${fontWeight}"
        fill="${field.color}"
      >${text}</text>
    `
  }

  svgOverlay += '</svg>'

  // Composite text onto image
  const outputBuffer = await image
    .composite([{
      input: Buffer.from(svgOverlay),
      top: 0,
      left: 0
    }])
    .png()
    .toBuffer()

  // Upload to Supabase Storage
  const fileName = `${cert.batch_id}/${cert.id}.png`
  const { error: uploadError } = await supabase
    .storage
    .from('generated-certificates')
    .upload(fileName, outputBuffer, {
      contentType: 'image/png',
      upsert: true
    })

  if (uploadError) {
    throw new Error(`Failed to upload certificate: ${uploadError.message}`)
  }

  // Get public URL
  const { data: urlData } = supabase
    .storage
    .from('generated-certificates')
    .getPublicUrl(fileName)

  return urlData.publicUrl
}

// ─────────────────────────────────────────────────────────────────────────────
// Generate certificate from designed template (HTML to image)
// ─────────────────────────────────────────────────────────────────────────────
async function generateDesignedCertificate(supabase: any, template: any, cert: any): Promise<string> {
  // For designed templates, we'll render HTML to an image
  // Using Puppeteer in Deno is complex, so we'll use a simpler approach:
  // Create an HTML canvas and render to PNG using a headless approach

  // For now, this is a placeholder - in production you'd use:
  // 1. Puppeteer/Playwright to render HTML to image
  // 2. Or a screenshot API service like ScreenshotAPI
  // 3. Or html-to-image library (but it needs browser environment)

  // Simplified version: generate SVG certificate
  const recipientData = cert.recipient_data || {}
  const style = template.style || 'Classic Blue'

  // Style configurations
  const styleConfig: Record<string, { bg: string, border: string, accent: string }> = {
    'Classic Blue': { bg: '#EEF2FF', border: '#3B5BDB', accent: '#3B5BDB' },
    'Elegant Gold': { bg: '#FFFBEB', border: '#D97706', accent: '#D97706' },
    'Clean Minimal': { bg: '#F8FAFF', border: '#E8ECF4', accent: '#3B5BDB' },
    'Forest Green': { bg: '#ECFDF5', border: '#059669', accent: '#059669' },
    'Royal Purple': { bg: '#F5F3FF', border: '#9333EA', accent: '#9333EA' },
    'Rose': { bg: '#FFF1F2', border: '#E11D48', accent: '#E11D48' }
  }

  const config = styleConfig[style] || styleConfig['Classic Blue']

  // Build SVG certificate
  const width = 1920
  const height = 1080

  // ── Fix 2: Escape all user-controlled values before SVG injection ──────────
  const safeOrgName = escapeSvg(template.org_name || 'OUROCERT')
  const safeLogoText = template.logo_text ? escapeSvg(template.logo_text) : null
  // ──────────────────────────────────────────────────────────────────────────

  let svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <!-- Background -->
      <rect width="${width}" height="${height}" fill="${config.bg}"/>

      <!-- Border -->
      <rect x="60" y="60" width="${width - 120}" height="${height - 120}"
            fill="white" stroke="${config.border}" stroke-width="8" rx="20"/>

      <!-- Corner decorations -->
      <circle cx="120" cy="120" r="30" fill="${config.accent}" opacity="0.2"/>
      <circle cx="${width - 120}" cy="120" r="30" fill="${config.accent}" opacity="0.2"/>
      <circle cx="120" cy="${height - 120}" r="30" fill="${config.accent}" opacity="0.2"/>
      <circle cx="${width - 120}" cy="${height - 120}" r="30" fill="${config.accent}" opacity="0.2"/>

      <!-- Organization name -->
      <text x="${width / 2}" y="180" text-anchor="middle"
            font-family="sans-serif" font-size="36" font-weight="700" fill="${config.accent}">
        ${safeOrgName}
      </text>

      <!-- Logo text / tagline -->
      ${safeLogoText ? `
        <text x="${width / 2}" y="220" text-anchor="middle"
              font-family="sans-serif" font-size="18" fill="#666">
          ${safeLogoText}
        </text>
      ` : ''}

      <!-- Title -->
      <text x="${width / 2}" y="340" text-anchor="middle"
            font-family="serif" font-size="72" font-weight="700" fill="#1B2B4B">
        Certificate of Completion
      </text>

      <!-- Subtitle -->
      <text x="${width / 2}" y="400" text-anchor="middle"
            font-family="sans-serif" font-size="24" fill="#666">
        This is to certify that
      </text>
  `

  // Add dynamic fields
  const fields = template.fields || []
  const positionYMap: Record<string, number> = {
    'Top Center': 280,
    'Upper Middle': 380,
    'Center Large': 500,
    'Center Medium': 540,
    'Lower Middle': 680,
    'Bottom Left': 880,
    'Bottom Center': 920,
    'Bottom Right': 880
  }

  const sizeMap: Record<string, number> = {
    'Small': 32,
    'Medium': 48,
    'Large': 64,
    'Extra Large': 96
  }

  for (const field of fields) {
    const y = positionYMap[field.position] || 540
    const fontSize = sizeMap[field.size] || 48
    // ── Fix 2: Escape recipient data before injecting into SVG ───────────────
    const text = escapeSvg(recipientData[field.name] || field.name)
    // ─────────────────────────────────────────────────────────────────────────
    const fontFamily = field.font === 'Playfair Display' ? 'serif' : 'sans-serif'
    const fontWeight = ['Large', 'Extra Large'].includes(field.size) ? 600 : 400

    let anchor = 'middle'
    let x = width / 2

    if (field.position === 'Bottom Left') {
      anchor = 'start'
      x = 200
    } else if (field.position === 'Bottom Right') {
      anchor = 'end'
      x = width - 200
    }

    svg += `
      <text x="${x}" y="${y}" text-anchor="${anchor}"
            font-family="${fontFamily}" font-size="${fontSize}"
            font-weight="${fontWeight}" fill="${field.color}">
        ${text}
      </text>
    `
  }

  // Add signature line and date
  svg += `
    <!-- Signature line -->
    <line x1="${width / 2 - 200}" y1="${height - 200}"
          x2="${width / 2 + 200}" y2="${height - 200}"
          stroke="#333" stroke-width="2"/>

    <text x="${width / 2}" y="${height - 170}" text-anchor="middle"
          font-family="sans-serif" font-size="20" fill="#666">
      Authorized Signature
    </text>

    <!-- Date -->
    <text x="${width / 2}" y="${height - 120}" text-anchor="middle"
          font-family="sans-serif" font-size="20" fill="#666">
      ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
    </text>
  `

  svg += '</svg>'

  // Convert SVG to PNG using sharp
  const sharp = await import('npm:sharp@0.33.0')
  const pngBuffer = await sharp.default(Buffer.from(svg))
    .png()
    .toBuffer()

  // Upload to Storage
  const fileName = `${cert.batch_id}/${cert.id}.png`
  const { error: uploadError } = await supabase
    .storage
    .from('generated-certificates')
    .upload(fileName, pngBuffer, {
      contentType: 'image/png',
      upsert: true
    })

  if (uploadError) {
    throw new Error(`Failed to upload certificate: ${uploadError.message}`)
  }

  // Get public URL
  const { data: urlData } = supabase
    .storage
    .from('generated-certificates')
    .getPublicUrl(fileName)

  return urlData.publicUrl
}

// ─────────────────────────────────────────────────────────────────────────────
// Send completion email to batch creator
// ─────────────────────────────────────────────────────────────────────────────
async function sendBatchCompletionEmail(supabase: any, batch: any) {
  try {
    // Get user email
    const { data: userData } = await supabase.auth.admin.getUserById(batch.user_id)

    if (!userData?.user?.email) {
      console.log('No email found for user')
      return
    }

    // Get certificate count
    const { count } = await supabase
      .from('certificates')
      .select('*', { count: 'exact', head: true })
      .eq('batch_id', batch.id)
      .eq('status', 'sent')

    // Send email via Resend
    const resend = await import('npm:resend@2.0.0')
    const resendClient = new resend.Resend(Deno.env.get('RESEND_API_KEY'))

    await resendClient.emails.send({
      from: 'OUROCERT <noreply@yourdomain.com>',
      to: userData.user.email,
      subject: `✅ Your ${count} certificates have been sent!`,
      html: `
        <h2>Batch Complete!</h2>
        <p>Great news! Your batch "<strong>${batch.name}</strong>" has finished processing.</p>
        <p><strong>${count} certificates</strong> have been generated and sent to recipients.</p>
        <p><a href="${Deno.env.get('SITE_URL')}/batch/${batch.id}">View batch details →</a></p>
      `
    })

    console.log(`✓ Sent completion email to ${userData.user.email}`)
  } catch (error) {
    console.error('Failed to send completion email:', error)
  }
}
