-- Migration 015: Fix Workout Exercises and Sets RLS for Creator Workouts
-- Allow users to view exercises and sets from other creators' finalized workouts
-- The current policies only allow users to see their own exercises/sets

-- Add SELECT policy for workout_exercises to allow viewing exercises from creator workouts
create policy "Anyone can view creator workout exercises"
  on public.workout_exercises for select
  using (
    -- Check if the exercise belongs to a workout from a creator
    exists (
      select 1 from public.workouts w
      join public.profiles p on p.id = w.user_id
      where w.id = workout_exercises.workout_id
      and p.is_creator = true
      and (w.is_finalized is null or w.is_finalized = true)
    )
  );

-- Add SELECT policy for workout_sets to allow viewing sets from creator workouts
create policy "Anyone can view creator workout sets"
  on public.workout_sets for select
  using (
    -- Check if the set belongs to an exercise in a workout from a creator
    exists (
      select 1 from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      join public.profiles p on p.id = w.user_id
      where we.id = workout_sets.workout_exercise_id
      and p.is_creator = true
      and (w.is_finalized is null or w.is_finalized = true)
    )
  );

