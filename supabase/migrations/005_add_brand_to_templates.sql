-- Run this in Supabase SQL Editor after 004_add_fields_to_templates.sql
-- SQL Editor → New query → Paste → Run
--
-- Adds brand columns used by the design-from-scratch editor (Session 6).
-- org_name  — the user's organisation name (shown at the top of the certificate)
-- logo_text — optional tagline or website URL

ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS org_name  TEXT,
  ADD COLUMN IF NOT EXISTS logo_text TEXT;
