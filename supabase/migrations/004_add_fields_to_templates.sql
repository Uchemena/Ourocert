-- Run this in Supabase SQL Editor after 003_templates.sql
-- SQL Editor → New query → Paste → Run
--
-- Adds the fields JSONB column (stores field config array) and style TEXT
-- column (reserved for future designed-template theme data).

ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS fields JSONB    NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS style  TEXT;

-- Example fields value:
-- [
--   {
--     "id": "1",
--     "name": "Recipient Name",
--     "position": "Center Large",
--     "size": "Extra Large",
--     "color": "#1B2A4A",
--     "font": "Playfair Display"
--   }
-- ]
