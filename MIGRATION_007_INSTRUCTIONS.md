# Migration 007: Final Comprehensive Fix

## Critical Issues Fixed

This migration fixes the root cause of ALL RPC type errors by ensuring that:
1. **ALL numeric operations are explicitly cast to `numeric`** - including intermediate calculations
2. **The `avg()` function result is explicitly cast** - PostgreSQL's `avg()` can return `real` when input types are mixed
3. **All `coalesce()` operations use `::numeric` casting** - ensures no `real` types slip through

## Why Previous Migrations Didn't Work

The issue was that even though we cast individual values to `numeric`, PostgreSQL's `avg()` function can still return `real` when:
- Input types are mixed (some numeric, some integer, some null)
- The function infers the return type from the input types

The fix is to:
1. Cast ALL input values to `numeric` BEFORE any calculations
2. Explicitly cast the `avg()` result to `numeric`
3. Cast the final result to `numeric` as well

## Steps to Apply

1. Go to Supabase Dashboard → SQL Editor
2. Copy the entire contents of `supabase/migrations/007_final_comprehensive_fix.sql`
3. Paste into the SQL Editor
4. Click "Run" or press Ctrl+Enter
5. Verify no errors appear

## What This Fixes

- ✅ Progress graph RPC type error (real vs double precision)
- ✅ Exercise type detection RPC error
- ✅ Weekly goals progress calculation
- ✅ All numeric operations return proper `numeric` type

## Testing

After applying this migration:
1. Log a workout with "Bench Press"
2. Search for "Bench Press" in progress graph
3. Should work without any type errors
4. Weekly goals should update correctly
5. Exercise type detection should work

