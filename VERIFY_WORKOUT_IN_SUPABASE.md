# How to Verify Your Workout Was Saved in Supabase

## Quick Check

1. Go to your **Supabase Dashboard**
2. Navigate to **Database** → **Table Editor**

## Tables to Check

### 1. `workouts` table
- You should see a row with:
  - `name` = your workout name
  - `mode` = the sport mode you used (e.g., 'workout', 'basketball')
  - `performed_at` = today's date
  - `user_id` = your user's UUID

### 2. `workout_exercises` table
- You should see rows for each exercise you added
- Each row has:
  - `workout_id` = links to the workout
  - `exercise_type` = the type (e.g., 'exercise', 'shooting')
  - `name` = the exercise name you typed

### 3. `workout_sets` table
- You should see rows for each set of each exercise
- Each row has:
  - `workout_exercise_id` = links to the exercise
  - `set_index` = the set number (1, 2, 3, etc.)
  - `reps`, `weight`, `attempted`, `made`, etc. = the values you entered

## Quick SQL Query

You can also run this in **SQL Editor** to see everything:

SELECT 
  w.name as workout_name,
  w.mode,
  w.performed_at,
  we.name as exercise_name,
  we.exercise_type,
  COUNT(ws.id) as set_count
FROM workouts w
LEFT JOIN workout_exercises we ON we.workout_id = w.id
LEFT JOIN workout_sets ws ON ws.workout_exercise_id = we.id
GROUP BY w.id, w.name, w.mode, w.performed_at, we.id, we.name, we.exercise_type
ORDER BY w.created_at DESC
LIMIT 10;

This will show you all your recent workouts with their exercises and set counts!

