-- Migration 045: preserve stat display order on workout_set_stats.
-- Without this, history + reopen-for-edit can't reliably show stats in the
-- order the user originally typed them in their preset.

alter table public.workout_set_stats
  add column if not exists stat_index int not null default 0;

create index if not exists workout_set_stats_order_idx
  on public.workout_set_stats(workout_set_id, stat_index);
