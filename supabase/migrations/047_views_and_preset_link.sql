-- Migration 047: user-built Views on the Progress Graph.
-- Replaces the old sport-mode-tied view system with views the user defines:
-- name + chosen preset + stat-formula + aggregation.
--
-- Also adds workout_exercises.preset_id so each preset-logged exercise points
-- back at the preset it came from. Views query by preset_id (exact, no fuzzy
-- matching). Existing preset-logged exercises predating this column won't have
-- it set and simply won't appear in any view.

-- =====================================================
-- workout_exercises.preset_id
-- =====================================================
alter table public.workout_exercises
  add column if not exists preset_id uuid
    references public.exercise_presets(id) on delete set null;

create index if not exists workout_exercises_preset_idx
  on public.workout_exercises(preset_id);

-- =====================================================
-- views
-- =====================================================
create table if not exists public.views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  preset_id uuid not null references public.exercise_presets(id) on delete cascade,
  name text not null,
  -- How the stats combine into a single per-set value:
  --   'multiply' — multiply every stat in stat_names (1..5 stats)
  --   'divide'   — stat_names[0] / stat_names[1] (exactly 2 stats)
  operation text not null check (operation in ('multiply', 'divide')),
  -- The stat names used in the formula, in display/operation order.
  -- Must match names that exist on the linked preset.
  stat_names text[] not null,
  -- How to collapse multiple sets in a single time bucket into the Y-value:
  --   'highest' — max of set values
  --   'total'   — sum of set values
  --   'average' — mean of set values
  aggregation text not null check (aggregation in ('highest', 'total', 'average')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint stat_names_length check (
    stat_names is not null
    and array_length(stat_names, 1) between 1 and 5
  )
);

alter table public.views enable row level security;

drop policy if exists "Users can manage own views" on public.views;
create policy "Users can manage own views"
  on public.views for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop trigger if exists update_views_updated_at on public.views;
create trigger update_views_updated_at
  before update on public.views
  for each row execute function update_updated_at_column();

create index if not exists views_user_idx on public.views(user_id);
create index if not exists views_preset_idx on public.views(preset_id);

-- Tell PostgREST to refresh its schema cache so the new column + table are
-- visible to API calls immediately, not after the next automatic refresh.
notify pgrst, 'reload schema';
