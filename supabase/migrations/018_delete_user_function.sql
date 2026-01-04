-- =====================================================
-- Migration 018: Delete User Account Function
-- Creates a database function to safely delete user accounts
-- This function can be called via RPC from the client
-- =====================================================

-- Create function to delete user account
-- This function deletes the profile and all related data via CASCADE
-- Note: The auth.users record will remain but the user won't be able to access the app
-- For complete deletion of auth.users, you would need to use Supabase Admin API or Edge Function
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Get the current authenticated user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Delete the profile - this will CASCADE delete all related data
  -- due to foreign key constraints with ON DELETE CASCADE
  DELETE FROM public.profiles
  WHERE id = current_user_id;

  -- Note: auth.users record will still exist
  -- To fully delete auth.users, you would need:
  -- 1. Supabase Admin API (requires service role key)
  -- 2. Or a Supabase Edge Function with admin privileges
  -- 3. Or manual deletion via Supabase Dashboard
  
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.delete_user_account() IS 'Deletes the current user account and all related data. Auth user record remains but user cannot access app.';

