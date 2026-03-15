-- Migration 021: Batch scheduling
ALTER TABLE public.batches
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_batches_scheduled
  ON public.batches (scheduled_for)
  WHERE status = 'draft' AND scheduled_for IS NOT NULL;

-- Requires pg_cron + pg_net extensions enabled in Supabase Dashboard
SELECT cron.schedule(
  'process-scheduled-batches',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/process-scheduled-batches',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  )
  $$
);
