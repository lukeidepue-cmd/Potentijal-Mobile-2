# Migration 009 Instructions - IMPORTANT

## The Error You're Seeing

If you see: **"Could not find the 'is_finalized' column of 'workouts' in the schema cache"**

This means the migration hasn't been run yet. The code has been updated to work without the column, but you should still run the migration for the proper save/finalize flow.

## How to Run the Migration

1. **Go to Supabase Dashboard**
   - Open your Supabase project
   - Click on "SQL Editor" in the left sidebar

2. **Run the Migration**
   - Copy the entire contents of `supabase/migrations/009_add_is_finalized.sql`
   - Paste it into the SQL Editor
   - Click "Run" or press Ctrl+Enter

3. **Verify It Worked**
   - Go to "Table Editor" → "workouts" table
   - You should see a new column called `is_finalized` (boolean, default false)

## What the Migration Does

- Adds `is_finalized` boolean column to `workouts` table
- Sets default value to `false` (workouts start as drafts)
- Creates an index for better query performance

## Current Behavior (Without Migration)

The code will work, but:
- All workouts will be saved immediately (no draft/finalize distinction)
- "Finish Workout" will still work, but won't mark workouts as finalized

## After Running Migration

- "Save Workout" creates a draft (`is_finalized = false`)
- "Finish Workout" finalizes it (`is_finalized = true`)
- You can filter workouts by finalization status

## If Migration Fails

If you get an error running the migration:
1. Check if the column already exists (it might have been created manually)
2. Make sure you're running it in the correct database
3. Check the error message for specific issues

