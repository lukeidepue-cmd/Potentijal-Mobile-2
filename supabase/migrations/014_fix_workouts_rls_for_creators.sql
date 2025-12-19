-- Migration 014: Fix Workouts RLS for Creator Workouts
-- Allow users to view other creators' finalized workouts
-- The current policy only allows users to see their own workouts

-- First, check if is_finalized column exists and create it if it doesn't
-- This ensures the column exists before we reference it in the policy
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'workouts' 
    and column_name = 'is_finalized'
  ) then
    alter table public.workouts
    add column is_finalized boolean not null default true;
    
    -- Add index for querying finalized workouts
    create index if not exists idx_workouts_is_finalized on public.workouts(is_finalized);
  end if;
end $$;

-- Add a SELECT policy that allows anyone to view finalized workouts from creators
-- A creator is someone with is_creator = true in their profile
-- This policy works alongside the existing "Users can manage own workouts" policy
-- PostgreSQL RLS policies are OR'd together, so users can see:
--   1. Their own workouts (from existing policy)
--   2. Other creators' finalized workouts (from this new policy)
create policy "Anyone can view creator workouts"
  on public.workouts for select
  using (
    -- Check if the workout belongs to a creator
    exists (
      select 1 from public.profiles
      where profiles.id = workouts.user_id
      and profiles.is_creator = true
    )
    -- Only show finalized workouts (is_finalized = true or null)
    and (workouts.is_finalized is null or workouts.is_finalized = true)
  );

