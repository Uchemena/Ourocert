-- Migration 013: Webhook events deduplication table
-- Prevents Stripe webhooks from being processed more than once.
-- The unique constraint on stripe_event_id causes a 23505 error on
-- the second insert, which the webhook handler uses as a duplicate signal.

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT        NOT NULL UNIQUE,
  processed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for the auto-clean query (keep for 30 days then prune via cron)
CREATE INDEX idx_webhook_events_processed_at
  ON public.webhook_events (processed_at);
