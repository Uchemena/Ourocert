-- Migration 016: Certificate verification codes
-- Every certificate gets a unique human-readable verification code.
-- Recipients can visit /verify/<code> to confirm their certificate is genuine.

ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS verification_code TEXT UNIQUE;

-- Generates a code like: A3F2-2025-4C8E1B
CREATE OR REPLACE FUNCTION public.generate_verification_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.verification_code :=
    upper(substring(md5(random()::text) from 1 for 4)) ||
    '-' ||
    EXTRACT(YEAR FROM now())::text ||
    '-' ||
    upper(substring(md5(NEW.id::text) from 1 for 6));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_verification_code
  BEFORE INSERT ON public.certificates
  FOR EACH ROW
  WHEN (NEW.verification_code IS NULL)
  EXECUTE FUNCTION public.generate_verification_code();

CREATE INDEX IF NOT EXISTS idx_certificates_verification_code
  ON public.certificates (verification_code);

-- Public read policy so the /verify page works without authentication
CREATE POLICY "Anyone can verify a certificate"
  ON public.certificates FOR SELECT
  USING (verification_code IS NOT NULL);
