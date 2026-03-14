-- Run this in Supabase SQL Editor after 006_certificates.sql
-- SQL Editor → New query → Paste → Run

-- Add email customization fields to batches table
ALTER TABLE public.batches
  ADD COLUMN IF NOT EXISTS email_subject TEXT,
  ADD COLUMN IF NOT EXISTS email_message TEXT;
