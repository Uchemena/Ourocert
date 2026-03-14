-- Run this in Supabase SQL Editor after 002_batches.sql
-- SQL Editor → New query → Paste → Run

-- ─────────────────────────────────────────────
-- Templates table
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.templates (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  type          TEXT        NOT NULL DEFAULT 'upload'
                            CHECK (type IN ('upload', 'designed', 'starter')),
  thumbnail_url TEXT,                        -- Supabase Storage URL
  file_url      TEXT,                        -- Original file (upload type only)
  field_count   INT         NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reuse the updated_at trigger function created in 001_profiles.sql
CREATE TRIGGER set_templates_updated_at
  BEFORE UPDATE ON public.templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Index for fast per-user lookups
CREATE INDEX idx_templates_user_id ON public.templates (user_id, created_at DESC);

-- ─────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own templates"
  ON public.templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own templates"
  ON public.templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
  ON public.templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
  ON public.templates FOR DELETE
  USING (auth.uid() = user_id);
