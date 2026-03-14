-- Add email defaults and logo to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS default_email_subject TEXT DEFAULT 'Your certificate from {org_name}',
ADD COLUMN IF NOT EXISTS default_email_message TEXT DEFAULT 'Hi {recipient_name},

Please find your certificate attached. Congratulations on your achievement!

Best regards,
{org_name}',
ADD COLUMN IF NOT EXISTS default_email_signature TEXT DEFAULT 'This certificate was issued by {org_name}.';

-- Create storage bucket for organization logos if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('org-logos', 'org-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on org-logos bucket
CREATE POLICY IF NOT EXISTS "Users can upload their own org logo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'org-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Users can update their own org logo"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'org-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Users can delete their own org logo"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'org-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Anyone can view org logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'org-logos');
