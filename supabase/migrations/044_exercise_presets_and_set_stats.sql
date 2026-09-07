-- Migration 044: user-defined exercise presets + arbitrary set-stat storage.
-- Replaces the old fixed sport-mode preset buttons with user-built ones.
--
-- exercise_presets: a user's saved template (e.g. "Bench Press" with stats
--   ["Reps", "Weight"]). Stat names are user-typed strings; 2-5 per preset.
--
-- workout_set_stats: arbitrary per-set values keyed by stat name. Sits next
--   to the existing fixed columns on workout_sets (reps/weight/attempted/
--   made/etc.), which are kept for backwards compatibility with workouts
--   logged under the old sport-mode preset types.

-- =====================================================
-- exercise_presets
-- =====================================================
create table if not exists public.exercise_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  -- Stat names in display order. 2..5 entries (enforced below).
  stat_names text[] not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint stat_names_length check (
    stat_names is not null
    and array_length(stat_names, 1) between 2 and 5
  )
);

alter table public.exercise_presets enable row level security;

drop policy if exists "Users can manage own exercise presets" on public.exercise_presets;
create policy "Users can manage own exercise presets"
  on public.exercise_presets for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop trigger if exists update_exercise_presets_updated_at on public.exercise_presets;
create trigger update_exercise_presets_updated_at
  before update on public.exercise_presets
  for each row execute function update_updated_at_column();

create index if not exists exercise_presets_user_idx
  on public.exercise_presets(user_id);

-- =====================================================
-- workout_set_stats
-- =====================================================
create table if not exists public.workout_set_stats (
  id uuid primary key default gen_random_uuid(),
  workout_set_id uuid not null references public.workout_sets(id) on delete cascade,
  stat_name text not null,
  value numeric,
  created_at timestamptz default now(),
  constraint uniq_set_stat unique (workout_set_id, stat_name)
);

alter table public.workout_set_stats enable row level security;

drop policy if exists "Users can manage own set stats" on public.workout_set_stats;
create policy "Users can manage own set stats"
  on public.workout_set_stats for all
  using (
    exists (
      select 1
        from public.workout_sets ws
        join public.workout_exercises we on we.id = ws.workout_exercise_id
        join public.workouts w on w.id = we.workout_id
       where ws.id = workout_set_stats.workout_set_id
         and w.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
        from public.workout_sets ws
        join public.workout_exercises we on we.id = ws.workout_exercise_id
        join public.workouts w on w.id = we.workout_id
       where ws.id = workout_set_stats.workout_set_id
         and w.user_id = (select auth.uid())
    )
  );

create index if not exists workout_set_stats_set_idx
  on public.workout_set_stats(workout_set_id);
