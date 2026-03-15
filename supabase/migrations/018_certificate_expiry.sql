-- Migration 018: Certificate expiry dates
ALTER TABLE public.batches
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Copy batch expiry to certificates on insert
CREATE OR REPLACE FUNCTION public.set_certificate_expiry()
RETURNS TRIGGER AS $$
DECLARE
  batch_expiry TIMESTAMPTZ;
BEGIN
  SELECT expires_at INTO batch_expiry
  FROM public.batches
  WHERE id = NEW.batch_id;
  IF batch_expiry IS NOT NULL THEN
    NEW.expires_at := batch_expiry;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER copy_expiry_to_certificates
  BEFORE INSERT ON public.certificates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_certificate_expiry();
