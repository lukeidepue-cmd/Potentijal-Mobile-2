-- Migration 048: per-preset color selection.
-- color: a named accent that drives the look of:
--   - the preset chip in the Workouts action row
--   - the exercise card header gradient when a preset-typed exercise is added
--   - the history workout-card date kicker (workout shows the FIRST preset's color)
-- Defaults to 'green' so existing presets keep their current look.

alter table public.exercise_presets
  add column if not exists color text not null default 'green'
    check (color in ('red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'));

-- Force PostgREST to reload its schema cache so the new column is visible
-- to API calls immediately (same pattern as migration 046).
notify pgrst, 'reload schema';
