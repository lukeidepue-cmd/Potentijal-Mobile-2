-- =====================================================
-- Migration 024: Onboarding Data Table
-- Creates table to track user onboarding progress and collected data
-- =====================================================

-- Onboarding data table
CREATE TABLE IF NOT EXISTS public.onboarding_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  
  -- Progress tracking
  current_step text,
  completed_steps text[] DEFAULT '{}',
  completed boolean DEFAULT false,
  completed_at timestamptz,
  
  -- Collected data
  training_intent text CHECK (training_intent IN ('getting_stronger', 'consistency', 'progress', 'efficiency')),
  intro_completed boolean DEFAULT false,
  notifications_enabled boolean DEFAULT false,
  premium_offer_shown boolean DEFAULT false,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.onboarding_data ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view own onboarding data" ON public.onboarding_data;
DROP POLICY IF EXISTS "Users can update own onboarding data" ON public.onboarding_data;
DROP POLICY IF EXISTS "Users can insert own onboarding data" ON public.onboarding_data;

CREATE POLICY "Users can view own onboarding data"
  ON public.onboarding_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding data"
  ON public.onboarding_data FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding data"
  ON public.onboarding_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_onboarding_data_updated_at ON public.onboarding_data;
CREATE TRIGGER update_onboarding_data_updated_at
  BEFORE UPDATE ON public.onboarding_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Index for faster onboarding checks
CREATE INDEX IF NOT EXISTS idx_onboarding_data_user_id ON public.onboarding_data(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_data_completed ON public.onboarding_data(completed);

-- Add birth_year to profiles table for age calculation (optional)
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS birth_year integer;

-- Add comment to table for documentation
COMMENT ON TABLE public.onboarding_data IS 'Tracks user onboarding progress and collected data during sign-up flow';
COMMENT ON COLUMN public.onboarding_data.current_step IS 'Current step in onboarding flow (e.g., email_entry, account_basics, sport_selection)';
COMMENT ON COLUMN public.onboarding_data.completed_steps IS 'Array of completed step names';
COMMENT ON COLUMN public.onboarding_data.training_intent IS 'User-selected training intent from onboarding';
COMMENT ON COLUMN public.profiles.birth_year IS 'User birth year for age calculation (stored instead of age to avoid yearly updates)';
