-- =====================================================
-- BYPASS RPC: Create a view instead of a function
-- This avoids all RPC type issues
-- =====================================================

-- Drop the problematic function
drop function if exists get_exercise_progress(uuid, sport_mode, text, text, int);
drop function if exists get_exercise_progress(uuid, sport_mode, text, text, integer);

-- We'll query directly from the frontend instead
-- But let's also create a simpler helper function that just returns raw data

