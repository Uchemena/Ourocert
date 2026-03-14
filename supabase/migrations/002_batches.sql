-- Run this in Supabase SQL Editor after 001_profiles.sql
-- SQL Editor → New query → Paste → Run

-- ─────────────────────────────────────────────
-- Batches table
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.batches (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft', 'generating', 'sent', 'failed')),
  recipient_count INT         NOT NULL DEFAULT 0,
  template_id     UUID,                        -- FK to templates table (future)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reuse the updated_at trigger function created in 001_profiles.sql
CREATE TRIGGER set_batches_updated_at
  BEFORE UPDATE ON public.batches
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Index for fast per-user lookups
CREATE INDEX idx_batches_user_id ON public.batches (user_id, created_at DESC);

-- ─────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own batches"
  ON public.batches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own batches"
  ON public.batches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own batches"
  ON public.batches FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own batches"
  ON public.batches FOR DELETE
  USING (auth.uid() = user_id);
