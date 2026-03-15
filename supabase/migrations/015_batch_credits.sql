-- Migration 015: Batch credits for pay-per-batch purchases
-- Each one-time Stripe payment grants the user one batch credit.
-- A credit allows one batch generation even when the monthly quota is full.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS batch_credits INTEGER DEFAULT 0;

-- Atomically increments batch_credits by 1 and returns the new value.
-- Called by the Stripe webhook handler on a successful one-time payment.
CREATE OR REPLACE FUNCTION public.increment_batch_credits(
  p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  new_credits INTEGER;
BEGIN
  UPDATE public.profiles
  SET batch_credits = batch_credits + 1
  WHERE id = p_user_id
  RETURNING batch_credits INTO new_credits;
  RETURN new_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
