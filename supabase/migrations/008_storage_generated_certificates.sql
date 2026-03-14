-- Run this in Supabase SQL Editor after 007_add_email_to_batches.sql
-- SQL Editor → New query → Paste → Run

-- This migration creates the storage bucket for generated certificates
-- Note: Storage buckets are typically created via Supabase Dashboard UI,
-- but this SQL provides the configuration reference

-- ─────────────────────────────────────────────
-- Storage: generated-certificates bucket
-- ─────────────────────────────────────────────
-- To create this bucket:
-- 1. Go to Supabase Dashboard → Storage
-- 2. Click "New bucket"
-- 3. Name: generated-certificates
-- 4. Public bucket: YES (so certificates can be downloaded via public URLs)
-- 5. File size limit: 10 MB
-- 6. Allowed MIME types: image/png, image/jpeg, application/pdf

-- Create storage policy to allow users to view their own certificates
-- Note: These policies are created automatically when you enable RLS on Storage

-- Policy: Users can upload their own generated certificates
-- This is handled by the service role key in Edge Functions

-- Policy: Public read access for generated certificates
-- This allows certificate download links to work without authentication

-- ALTERNATIVELY, if you want to use SQL to create the bucket:
-- insert into storage.buckets (id, name, public)
-- values ('generated-certificates', 'generated-certificates', true);

-- Storage RLS policies (if needed for additional security)
-- CREATE POLICY "Public read access for generated certificates"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'generated-certificates');

-- CREATE POLICY "Authenticated users can upload certificates"
--   ON storage.objects FOR INSERT
--   WITH CHECK (
--     bucket_id = 'generated-certificates' 
--     AND auth.role() = 'authenticated'
--   );
