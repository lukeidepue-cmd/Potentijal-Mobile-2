-- Migration 013: Fix Follows RLS Policies
-- The current policy only allows users to see follows where they are the follower
-- We need to also allow users to see follows where they are being followed (to see their followers)

-- Drop the existing restrictive policy
drop policy if exists "Users can manage own follows" on public.follows;

-- Policy for INSERT/UPDATE/DELETE: Users can manage follows where they are the follower
create policy "Users can manage own follows"
  on public.follows for all
  using (auth.uid() = follower_id);

-- Policy for SELECT: Users can see follows where they are the follower (who they follow)
create policy "Users can see who they follow"
  on public.follows for select
  using (auth.uid() = follower_id);

-- Policy for SELECT: Users can see follows where they are being followed (their followers)
create policy "Users can see their followers"
  on public.follows for select
  using (auth.uid() = following_id);

-- Policy for SELECT: Anyone can view all follows (for social features like mutual friends)
-- This allows users to see follow relationships between other users
create policy "Anyone can view follows"
  on public.follows for select
  using (true);

