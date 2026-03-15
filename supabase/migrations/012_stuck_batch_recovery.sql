-- Migration 012: Stuck batch/certificate recovery function + cron schedule
-- Marks certificates and batches that have been stuck in a generating/pending
-- state for too long as failed, so users can retry them.

CREATE OR REPLACE FUNCTION public.recover_stuck_jobs()
RETURNS void AS $$
BEGIN
  -- Recover stuck certificates
  UPDATE public.certificates
  SET status = 'failed',
      updated_at = now()
  WHERE status IN ('pending', 'generating')
    AND updated_at < now() - INTERVAL '15 minutes';

  -- Recover stuck batches
  UPDATE public.batches
  SET status = 'failed',
      updated_at = now()
  WHERE status = 'generating'
    AND updated_at < now() - INTERVAL '20 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule to run every 10 minutes (requires pg_cron extension).
-- Enable pg_cron in Supabase Dashboard → Database → Extensions first.
SELECT cron.schedule(
  'recover-stuck-jobs',
  '*/10 * * * *',
  'SELECT public.recover_stuck_jobs()'
);
