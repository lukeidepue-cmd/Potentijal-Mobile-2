-- Migration 036: Merge multiple permissive SELECT policies into one per table
-- Supabase reports that multiple SELECT policies on the same table force the DB to evaluate
-- each policy per row, which is suboptimal. Fix: one SELECT policy per table with a combined
-- USING expression (original conditions OR'd together). Split "for all" into SELECT (merged)
-- plus INSERT/UPDATE/DELETE policies where applicable. Use (select auth.uid()) for consistency.

-- =============================================================================
-- blocked_users: 2 SELECT policies -> 1 SELECT (blocker OR blocked), 1 for write (blocker)
-- =============================================================================
drop policy if exists "Users can manage own blocked users" on public.blocked_users;
drop policy if exists "Users can see if they are blocked" on public.blocked_users;

create policy "Users can view blocked users"
  on public.blocked_users for select
  using ((select auth.uid()) = blocker_id or (select auth.uid()) = blocked_id);

create policy "Users can insert own blocked users"
  on public.blocked_users for insert
  with check ((select auth.uid()) = blocker_id);

create policy "Users can update own blocked users"
  on public.blocked_users for update
  using ((select auth.uid()) = blocker_id);

create policy "Users can delete own blocked users"
  on public.blocked_users for delete
  using ((select auth.uid()) = blocker_id);

-- =============================================================================
-- follows: 4 SELECT policies -> 1 SELECT (true), 1 for insert/update/delete (follower)
-- =============================================================================
drop policy if exists "Anyone can view follows" on public.follows;
drop policy if exists "Users can manage own follows" on public.follows;
drop policy if exists "Users can see their followers" on public.follows;
drop policy if exists "Users can see who they follow" on public.follows;

create policy "Anyone can view follows"
  on public.follows for select
  using (true);

create policy "Users can manage own follows"
  on public.follows for insert
  with check ((select auth.uid()) = follower_id);

create policy "Users can update own follows"
  on public.follows for update
  using ((select auth.uid()) = follower_id);

create policy "Users can delete own follows"
  on public.follows for delete
  using ((select auth.uid()) = follower_id);

-- =============================================================================
-- highlights: 2 SELECT policies -> 1 SELECT (true), 1 for insert/update/delete (user_id)
-- =============================================================================
drop policy if exists "Anyone can view highlights" on public.highlights;
drop policy if exists "Users can manage own highlights" on public.highlights;

create policy "Anyone can view highlights"
  on public.highlights for select
  using (true);

create policy "Users can manage own highlights"
  on public.highlights for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can update own highlights"
  on public.highlights for update
  using ((select auth.uid()) = user_id);

create policy "Users can delete own highlights"
  on public.highlights for delete
  using ((select auth.uid()) = user_id);

-- =============================================================================
-- profiles: 2 SELECT policies -> 1 SELECT (true). Keep "Users can update own profile" as-is.
-- =============================================================================
drop policy if exists "Anyone can view profiles" on public.profiles;
drop policy if exists "Users can view own profile" on public.profiles;

create policy "Anyone can view profiles"
  on public.profiles for select
  using (true);

-- "Users can update own profile" already exists and is update-only; re-create with (select auth.uid())
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using ((select auth.uid()) = id);

-- =============================================================================
-- user_privacy_settings: 2 SELECT policies -> 1 SELECT (true), 1 for insert/update/delete (user_id)
-- =============================================================================
drop policy if exists "Anyone can read privacy settings for enforcement" on public.user_privacy_settings;
drop policy if exists "Users can manage own privacy settings" on public.user_privacy_settings;

create policy "Anyone can read privacy settings for enforcement"
  on public.user_privacy_settings for select
  using (true);

create policy "Users can manage own privacy settings"
  on public.user_privacy_settings for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can update own privacy settings"
  on public.user_privacy_settings for update
  using ((select auth.uid()) = user_id);

create policy "Users can delete own privacy settings"
  on public.user_privacy_settings for delete
  using ((select auth.uid()) = user_id);

-- =============================================================================
-- workout_exercises: 2 SELECT policies -> 1 SELECT (creator OR own), 1 for insert/update/delete (own)
-- =============================================================================
drop policy if exists "Anyone can view creator workout exercises" on public.workout_exercises;
drop policy if exists "Users can manage own workout exercises" on public.workout_exercises;

create policy "Users can view workout exercises"
  on public.workout_exercises for select
  using (
    exists (
      select 1 from public.workouts w
      join public.profiles p on p.id = w.user_id
      where w.id = workout_exercises.workout_id
      and p.is_creator = true
      and (w.is_finalized is null or w.is_finalized = true)
    )
    or
    exists (
      select 1 from public.workouts
      where workouts.id = workout_exercises.workout_id
      and workouts.user_id = (select auth.uid())
    )
  );

create policy "Users can manage own workout exercises"
  on public.workout_exercises for insert
  with check (
    exists (
      select 1 from public.workouts
      where workouts.id = workout_exercises.workout_id
      and workouts.user_id = (select auth.uid())
    )
  );

create policy "Users can update own workout exercises"
  on public.workout_exercises for update
  using (
    exists (
      select 1 from public.workouts
      where workouts.id = workout_exercises.workout_id
      and workouts.user_id = (select auth.uid())
    )
  );

create policy "Users can delete own workout exercises"
  on public.workout_exercises for delete
  using (
    exists (
      select 1 from public.workouts
      where workouts.id = workout_exercises.workout_id
      and workouts.user_id = (select auth.uid())
    )
  );

-- =============================================================================
-- workout_sets: 2 SELECT policies -> 1 SELECT (creator OR own), 1 for insert/update/delete (own)
-- =============================================================================
drop policy if exists "Anyone can view creator workout sets" on public.workout_sets;
drop policy if exists "Users can manage own workout sets" on public.workout_sets;

create policy "Users can view workout sets"
  on public.workout_sets for select
  using (
    exists (
      select 1 from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      join public.profiles p on p.id = w.user_id
      where we.id = workout_sets.workout_exercise_id
      and p.is_creator = true
      and (w.is_finalized is null or w.is_finalized = true)
    )
    or
    exists (
      select 1 from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      where we.id = workout_sets.workout_exercise_id
      and w.user_id = (select auth.uid())
    )
  );

create policy "Users can manage own workout sets"
  on public.workout_sets for insert
  with check (
    exists (
      select 1 from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      where we.id = workout_sets.workout_exercise_id
      and w.user_id = (select auth.uid())
    )
  );

create policy "Users can update own workout sets"
  on public.workout_sets for update
  using (
    exists (
      select 1 from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      where we.id = workout_sets.workout_exercise_id
      and w.user_id = (select auth.uid())
    )
  );

create policy "Users can delete own workout sets"
  on public.workout_sets for delete
  using (
    exists (
      select 1 from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      where we.id = workout_sets.workout_exercise_id
      and w.user_id = (select auth.uid())
    )
  );

-- =============================================================================
-- workouts: 2 SELECT policies -> 1 SELECT (creator OR own), 1 for insert/update/delete (own)
-- =============================================================================
drop policy if exists "Anyone can view creator workouts" on public.workouts;
drop policy if exists "Users can manage own workouts" on public.workouts;

create policy "Users can view workouts"
  on public.workouts for select
  using (
    (
      exists (
        select 1 from public.profiles
        where profiles.id = workouts.user_id
        and profiles.is_creator = true
      )
      and (workouts.is_finalized is null or workouts.is_finalized = true)
    )
    or (select auth.uid()) = user_id
  );

create policy "Users can manage own workouts"
  on public.workouts for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can update own workouts"
  on public.workouts for update
  using ((select auth.uid()) = user_id);

create policy "Users can delete own workouts"
  on public.workouts for delete
  using ((select auth.uid()) = user_id);
