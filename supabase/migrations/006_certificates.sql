-- Run this in Supabase SQL Editor after 005_add_brand_to_templates.sql
-- SQL Editor → New query → Paste → Run

-- ─────────────────────────────────────────────
-- Certificates table
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.certificates (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id        UUID        NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_name  TEXT        NOT NULL,
  recipient_email TEXT,
  recipient_data  JSONB       NOT NULL DEFAULT '{}',  -- All field values for this recipient
  file_url        TEXT,                               -- URL to generated certificate in Storage
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'generating', 'completed', 'failed', 'sent')),
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reuse the updated_at trigger function
CREATE TRIGGER set_certificates_updated_at
  BEFORE UPDATE ON public.certificates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Index for fast batch lookups
CREATE INDEX idx_certificates_batch_id ON public.certificates (batch_id, created_at DESC);
CREATE INDEX idx_certificates_user_id ON public.certificates (user_id, created_at DESC);

-- ─────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own certificates"
  ON public.certificates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own certificates"
  ON public.certificates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own certificates"
  ON public.certificates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own certificates"
  ON public.certificates FOR DELETE
  USING (auth.uid() = user_id);
