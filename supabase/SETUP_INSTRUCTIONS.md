# Supabase Database Setup Instructions

## Step 1: Delete Old Tables

Before running the migration, delete your old tables in Supabase:

1. Go to **Supabase Dashboard** → **Database** → **Table Editor**
2. Delete tables in this order (due to foreign key dependencies):
   - `meals_items`
   - `meals`
   - `workout_items`
   - `workouts`
   - `profiles`

**Optional:** Delete test user:
- Go to **Authentication** → **Users**
- Delete any test users you created

## Step 2: Run the Migration

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Click **New Query**
3. Copy the **entire contents** of `supabase/migrations/001_initial_schema.sql`
4. Paste it into the SQL Editor
5. Click **Run** (or press Ctrl+Enter)

## Step 3: Create Storage Bucket for Highlights

1. Go to **Storage** in Supabase Dashboard
2. Click **New bucket**
3. Name it: `highlights`
4. Make it **Public** (so anyone can view highlights)
5. Click **Create bucket**

## Step 4: Verify Setup

After running the migration, verify:

1. **Tables created:**
   - Go to **Database** → **Table Editor**
   - You should see all the new tables listed

2. **Test the connection:**
   - Your app should still show: `✅ Supabase connected successfully. Session: No session`
   - This is expected - no user is logged in yet

## What Was Created

This migration creates:

- ✅ All core tables (profiles, workouts, meals, etc.)
- ✅ All enums (sport_mode, exercise_type, meal_type, etc.)
- ✅ Row Level Security (RLS) policies
- ✅ Automatic triggers (updated_at timestamps, auto-create profile on signup)
- ✅ Foreign key relationships
- ✅ Indexes for performance

## Next Steps

Once the migration is complete, we'll proceed with:
- Phase 2: Backend helpers for graphs & fuzzy matching
- Phase 3: Wiring the frontend to the backend


