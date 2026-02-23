
-- Add onboarding columns to user_profiles
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS has_completed_onboarding boolean DEFAULT false;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS onboarding_progress jsonb DEFAULT '[]'::jsonb;

-- Add phone and notes columns to clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS notes text;
