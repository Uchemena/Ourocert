-- Migration 011: Add increment_certificate_usage function
-- Called by the generate-certificates Edge Function after a batch completes
-- to safely increment the user's monthly certificate usage counter.

CREATE OR REPLACE FUNCTION public.increment_certificate_usage(
  p_user_id UUID,
  p_count INTEGER
)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET certificates_used_this_month =
      certificates_used_this_month + p_count
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
