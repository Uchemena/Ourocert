-- Migration 017: Add category/course label to batches
ALTER TABLE public.batches
  ADD COLUMN IF NOT EXISTS category TEXT;

CREATE INDEX IF NOT EXISTS idx_batches_category
  ON public.batches (user_id, category);
