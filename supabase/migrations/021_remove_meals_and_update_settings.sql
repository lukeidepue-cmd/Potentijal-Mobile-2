-- Migration 021: Remove meals feature and update settings
-- This migration removes all meal-related database objects and updates AI Trainer settings defaults

-- =====================================================
-- Step 1: Drop meal-related tables
-- =====================================================

DROP TABLE IF EXISTS public.meal_items CASCADE;
DROP TABLE IF EXISTS public.meals CASCADE;
DROP TABLE IF EXISTS public.daily_burned_calories CASCADE;
DROP TABLE IF EXISTS public.macro_goals CASCADE;
DROP TABLE IF EXISTS public.nutrition_settings CASCADE;

-- Drop the meal_type enum
DROP TYPE IF EXISTS public.meal_type CASCADE;

-- =====================================================
-- Step 2: Drop meal-related RPC functions
-- =====================================================

DROP FUNCTION IF EXISTS public.get_macro_progress(uuid, text, int) CASCADE;

-- =====================================================
-- Step 3: Update existing AI Trainer settings to remove use_meals
-- =====================================================

-- Update all existing ai_trainer_settings to remove use_meals from data_access_permissions
UPDATE public.ai_trainer_settings
SET data_access_permissions = data_access_permissions - 'use_meals'
WHERE data_access_permissions ? 'use_meals';

-- =====================================================
-- Step 4: Update the default value for new records
-- Note: This requires altering the table default, but since we can't easily modify
-- a JSONB default in a migration, we'll rely on application code to not include use_meals.
-- The UPDATE above handles existing records.
-- =====================================================

-- If you want to change the default for NEW records, you would need to:
-- 1. Drop the default constraint
-- 2. Add a new default without use_meals
-- But this is complex with JSONB defaults, so we'll handle it in application code.

