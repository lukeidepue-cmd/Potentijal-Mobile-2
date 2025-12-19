# Migration 004: Fix Progress Graph Type Error

## Issue
The progress graph RPC function was returning `real` type instead of `numeric` (double precision), causing the error:
```
"Returned type real does not match expected type double precision in column 2"
```

## Solution
This migration fixes the type casting in the `get_exercise_progress` function to ensure all calculations return `numeric` type.

## Steps to Apply

1. Go to Supabase Dashboard → SQL Editor
2. Copy the entire contents of `supabase/migrations/004_fix_progress_graph_type.sql`
3. Paste into the SQL Editor
4. Click "Run" or press Ctrl+Enter
5. Verify no errors appear

## What This Fixes

- Progress graph search will now work correctly
- No more type mismatch errors when searching exercises
- Graph will display data properly for all exercise types

## Testing

After applying this migration:
1. Log a workout with "Bench Press" exercise
2. Go to Home tab → Progress graph
3. Search for "Bench Press" (or variations like "bench press", "bench")
4. Graph should display data without errors

