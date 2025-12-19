# Migration 008: Radical Fix - Double Precision Return Type

## The Problem

PostgreSQL's `avg()` function was returning `real` type instead of `double precision`, causing type mismatch errors. Even with explicit casting to `numeric`, PostgreSQL was still inferring `real` in some cases.

## The Solution

1. **Changed return type to `double precision`** - This matches what Supabase/PostgREST expects
2. **Used `sum() / count()` instead of `avg()`** - Gives us explicit control over the calculation
3. **Explicit `double precision` casting** - All intermediate values are cast to `double precision`

## Why This Will Work

- `double precision` is what the error message is asking for
- Using `sum() / count()` avoids PostgreSQL's type inference issues with `avg()`
- All values are explicitly cast to `double precision` at every step

## Steps to Apply

1. Go to Supabase Dashboard → SQL Editor
2. Copy the entire contents of `supabase/migrations/008_radical_fix.sql`
3. Paste into the SQL Editor
4. Click "Run" or press Ctrl+Enter
5. Verify no errors appear

## What This Fixes

- ✅ Progress graph RPC type error (real vs double precision)
- ✅ Graph will now display data correctly
- ✅ All numeric operations return `double precision`

## Testing

After applying this migration:
1. Log a workout with "Bench Press" exercise
2. Go to Home tab → Progress graph
3. Search for "Bench Press"
4. Graph should display data without errors

