// Supabase Edge Function: process-scheduled-batches
// Finds scheduled batches that are due and triggers generation.
// Intended to run on a cron schedule (every 5 minutes via pg_cron).

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Allow manual invocations via HTTP (e.g. curl for testing)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Find all scheduled batches whose time has arrived
  const { data: dueBatches, error } = await supabase
    .from('batches')
    .select('id')
    .eq('status', 'draft')
    .not('scheduled_for', 'is', null)
    .lte('scheduled_for', new Date().toISOString())

  if (error) {
    console.error('Failed to fetch due batches:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log(`Found ${dueBatches?.length ?? 0} due batch(es)`)

  const results: { batchId: string; success: boolean; error?: string }[] = []

  for (const batch of dueBatches ?? []) {
    try {
      // Mark as generating so the cron doesn't pick it up again
      const { error: updateError } = await supabase
        .from('batches')
        .update({ status: 'generating', updated_at: new Date().toISOString() })
        .eq('id', batch.id)
        .eq('status', 'draft') // guard against double-processing

      if (updateError) {
        console.error(`Failed to mark batch ${batch.id} as generating:`, updateError.message)
        results.push({ batchId: batch.id, success: false, error: updateError.message })
        continue
      }

      // Trigger the generate-certificates Edge Function
      const res = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-certificates`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({ batch_id: batch.id }),
        }
      )

      if (!res.ok) {
        const text = await res.text()
        console.error(`Generation trigger failed for batch ${batch.id}:`, text)
        results.push({ batchId: batch.id, success: false, error: text })
      } else {
        console.log(`✓ Triggered generation for batch ${batch.id}`)
        results.push({ batchId: batch.id, success: true })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`Error processing batch ${batch.id}:`, msg)
      results.push({ batchId: batch.id, success: false, error: msg })
    }
  }

  return new Response(
    JSON.stringify({ processed: dueBatches?.length ?? 0, results }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
