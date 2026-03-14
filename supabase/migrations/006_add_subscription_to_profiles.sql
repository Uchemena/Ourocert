-- Add subscription and usage tracking columns to profiles table

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'growth', 'pro')),
  ADD COLUMN IF NOT EXISTS certificates_used_this_month INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS usage_reset_date TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT,
  ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ;

-- Create index for faster stripe lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_plan ON public.profiles(plan);

-- Function to reset monthly usage (run via cron job or edge function on first of month)
CREATE OR REPLACE FUNCTION public.reset_monthly_usage()
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET certificates_used_this_month = 0,
      usage_reset_date = now()
  WHERE usage_reset_date < now() - INTERVAL '1 month';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
