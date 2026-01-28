-- Change completed column from boolean to numeric
-- This allows storing the number of completed reps instead of just true/false

-- First, convert existing boolean values to numeric (true = 1, false = 0, null = null)
-- We'll use a temporary column approach to avoid data loss

-- Step 1: Add new numeric column
ALTER TABLE public.workout_sets 
ADD COLUMN completed_numeric numeric;

-- Step 2: Migrate existing data (convert boolean to numeric)
UPDATE public.workout_sets
SET completed_numeric = CASE 
  WHEN completed = true THEN 1
  WHEN completed = false THEN 0
  ELSE NULL
END;

-- Step 3: Drop old boolean column
ALTER TABLE public.workout_sets 
DROP COLUMN completed;

-- Step 4: Rename new column to completed
ALTER TABLE public.workout_sets 
RENAME COLUMN completed_numeric TO completed;
