-- Migration 020: Email delivery tracking
ALTER TABLE public.certificates
  DROP CONSTRAINT IF EXISTS certificates_status_check;

ALTER TABLE public.certificates
  ADD CONSTRAINT certificates_status_check
  CHECK (status IN (
    'pending', 'generating', 'completed', 'failed', 'sent',
    'delivered', 'opened', 'bounced'
  ));

CREATE TABLE IF NOT EXISTS public.email_events (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id  UUID        NOT NULL REFERENCES public.certificates(id) ON DELETE CASCADE,
  event_type      TEXT        NOT NULL,
  resend_email_id TEXT,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata        JSONB       DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_email_events_certificate_id
  ON public.email_events (certificate_id);
CREATE INDEX IF NOT EXISTS idx_email_events_resend_id
  ON public.email_events (resend_email_id);
