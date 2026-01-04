-- Migration 017 Rollback: Remove settings from migration 017
-- This reverses the effects of migration 017 so migration 016 can be used instead
-- Run this BEFORE running migration 016

-- =====================================================
-- Drop Triggers First (before dropping tables)
-- =====================================================

-- Drop triggers that might reference the tables
DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON public.notification_preferences;
DROP TRIGGER IF EXISTS update_ai_memory_updated_at ON public.ai_memory;

-- =====================================================
-- Drop Policies (RLS policies are automatically dropped with tables, but let's be explicit)
-- =====================================================

-- Drop policies for notification_preferences
DROP POLICY IF EXISTS "Users can view their own notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can update their own notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can insert their own notification preferences" ON public.notification_preferences;

-- Drop policies for ai_memory
DROP POLICY IF EXISTS "Users can view their own AI memory" ON public.ai_memory;
DROP POLICY IF EXISTS "Users can insert their own AI memory" ON public.ai_memory;
DROP POLICY IF EXISTS "Users can update their own AI memory" ON public.ai_memory;
DROP POLICY IF EXISTS "Users can delete their own AI memory" ON public.ai_memory;

-- Drop policies for blocked_users
DROP POLICY IF EXISTS "Users can view their own blocked list" ON public.blocked_users;
DROP POLICY IF EXISTS "Users can block other users" ON public.blocked_users;
DROP POLICY IF EXISTS "Users can unblock users" ON public.blocked_users;

-- =====================================================
-- Drop Tables (in reverse order of dependencies)
-- =====================================================

-- Drop ai_memory table
DROP TABLE IF EXISTS public.ai_memory CASCADE;

-- Drop notification_preferences table
DROP TABLE IF EXISTS public.notification_preferences CASCADE;

-- Drop blocked_users table
DROP TABLE IF EXISTS public.blocked_users CASCADE;

-- =====================================================
-- Drop Enum Types
-- =====================================================

-- Drop ai_personality enum (if it exists)
DROP TYPE IF EXISTS public.ai_personality CASCADE;

-- =====================================================
-- Remove Columns from profiles table
-- =====================================================

-- Remove privacy columns
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS is_private,
  DROP COLUMN IF EXISTS profile_visibility,
  DROP COLUMN IF EXISTS highlights_visibility;

-- Remove app preferences columns
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS preferred_units,
  DROP COLUMN IF EXISTS theme_preference;

-- Remove AI Trainer columns
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS ai_trainer_enabled,
  DROP COLUMN IF EXISTS ai_personality,
  DROP COLUMN IF EXISTS ai_data_permissions,
  DROP COLUMN IF EXISTS injury_notes;

-- Remove nutrition settings column
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS meal_reset_time;

-- =====================================================
-- Drop Indexes (if they exist)
-- =====================================================

DROP INDEX IF EXISTS public.idx_blocked_users_blocker;
DROP INDEX IF EXISTS public.idx_blocked_users_blocked;
DROP INDEX IF EXISTS public.idx_ai_memory_user_id;
DROP INDEX IF EXISTS public.idx_ai_memory_type;

-- =====================================================
-- Note: RLS Policies are automatically dropped when tables are dropped
-- =====================================================

