-- Migration 034: RLS performance – evaluate auth.uid() once per query
-- Fixes Supabase "Auth RLS Initialization Plan" performance advisories.
-- Replace auth.uid() with (select auth.uid()) so the value is computed once per statement, not per row.

-- 1. profiles: Users can view own profile
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using ((select auth.uid()) = id);

-- 2. profiles: Users can update own profile
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using ((select auth.uid()) = id);

-- 3. workouts: Users can manage own workouts
drop policy if exists "Users can manage own workouts" on public.workouts;
create policy "Users can manage own workouts"
  on public.workouts for all
  using ((select auth.uid()) = user_id);

-- 4. workout_exercises: Users can manage own workout exercises
drop policy if exists "Users can manage own workout exercises" on public.workout_exercises;
create policy "Users can manage own workout exercises"
  on public.workout_exercises for all
  using (
    exists (
      select 1 from public.workouts
      where workouts.id = workout_exercises.workout_id
      and workouts.user_id = (select auth.uid())
    )
  );

-- 5. highlights: Users can manage own highlights
drop policy if exists "Users can manage own highlights" on public.highlights;
create policy "Users can manage own highlights"
  on public.highlights for all
  using ((select auth.uid()) = user_id);

-- 6. profile_code_uses: Users can view own code uses
drop policy if exists "Users can view own code uses" on public.profile_code_uses;
create policy "Users can view own code uses"
  on public.profile_code_uses for select
  using ((select auth.uid()) = profile_id);

-- 7. workout_sets: Users can manage own workout sets
drop policy if exists "Users can manage own workout sets" on public.workout_sets;
create policy "Users can manage own workout sets"
  on public.workout_sets for all
  using (
    exists (
      select 1 from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      where we.id = workout_sets.workout_exercise_id
      and w.user_id = (select auth.uid())
    )
  );

-- 8. runs: Users can manage own runs
drop policy if exists "Users can manage own runs" on public.runs;
create policy "Users can manage own runs"
  on public.runs for all
  using (
    exists (
      select 1 from public.workouts
      where workouts.id = runs.workout_id
      and workouts.user_id = (select auth.uid())
    )
  );

-- 9. weekly_schedules: Users can manage own weekly schedules
drop policy if exists "Users can manage own weekly schedules" on public.weekly_schedules;
create policy "Users can manage own weekly schedules"
  on public.weekly_schedules for all
  using ((select auth.uid()) = user_id);

-- 10. weekly_goals: Users can manage own weekly goals
drop policy if exists "Users can manage own weekly goals" on public.weekly_goals;
create policy "Users can manage own weekly goals"
  on public.weekly_goals for all
  using ((select auth.uid()) = user_id);
