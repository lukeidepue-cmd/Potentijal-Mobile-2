-- Migration 009: Add is_finalized field to workouts table
-- This allows workouts to be saved as drafts and only finalized when user clicks "Finish Workout"

alter table public.workouts
add column if not exists is_finalized boolean not null default false;

-- Add index for querying finalized workouts
create index if not exists idx_workouts_is_finalized on public.workouts(is_finalized);

-- Add comment
comment on column public.workouts.is_finalized is 'Whether the workout has been finalized (true) or is still a draft (false)';

