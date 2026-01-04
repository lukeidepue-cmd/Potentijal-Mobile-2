-- Migration 019: Fix Privacy Settings RLS to allow reading other users' privacy settings
-- The current policy only allows users to manage their own settings
-- We need to allow users to READ other users' privacy settings for privacy enforcement

-- Drop the existing restrictive policy
drop policy if exists "Users can manage own privacy settings" on public.user_privacy_settings;

-- Policy for INSERT/UPDATE/DELETE: Users can manage their own privacy settings
create policy "Users can manage own privacy settings"
  on public.user_privacy_settings for all
  using (auth.uid() = user_id);

-- Policy for SELECT: Allow anyone to read privacy settings (needed for privacy enforcement)
-- This allows the app to check privacy settings when viewing profiles
create policy "Anyone can read privacy settings for enforcement"
  on public.user_privacy_settings for select
  using (true);

