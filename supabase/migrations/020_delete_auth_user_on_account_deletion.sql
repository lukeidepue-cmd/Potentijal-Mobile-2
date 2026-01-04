-- =====================================================
-- Migration 020: Delete Auth User on Account Deletion
-- Updates the delete_user_account function to also delete the auth.users record
-- This requires using the Supabase service role key via a database function
-- =====================================================

-- IMPORTANT: This migration requires the Supabase service role key to be set
-- as a database secret. You'll need to:
-- 1. Get your service role key from Supabase Dashboard > Settings > API
-- 2. Set it as a database secret: 
--    SELECT vault.create_secret('supabase_service_role_key', 'your-service-role-key-here');
-- 3. Then run this migration

-- Drop the old function
DROP FUNCTION IF EXISTS public.delete_user_account();

-- Create updated function that also deletes the auth user
-- Note: This uses pg_net to make an HTTP request to Supabase Admin API
-- Alternative: Use Supabase Edge Function with admin privileges
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  service_role_key text;
  auth_user_id uuid;
BEGIN
  -- Get the current authenticated user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Store the auth user ID before deleting profile
  auth_user_id := current_user_id;

  -- Delete the profile - this will CASCADE delete all related data
  DELETE FROM public.profiles
  WHERE id = current_user_id;

  -- Try to delete the auth user via Admin API
  -- This requires the service role key to be set as a secret
  BEGIN
    -- Get service role key from vault (if available)
    SELECT decrypted_secret INTO service_role_key
    FROM vault.decrypted_secrets
    WHERE name = 'supabase_service_role_key'
    LIMIT 1;

    IF service_role_key IS NOT NULL THEN
      -- Use pg_net to call Supabase Admin API to delete auth user
      -- Note: This requires the pg_net extension to be enabled
      -- If pg_net is not available, the auth user will remain (but profile is deleted)
      PERFORM
        net.http_post(
          url := current_setting('app.supabase_url', true) || '/auth/v1/admin/users/' || auth_user_id::text,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || service_role_key,
            'apikey', service_role_key
          ),
          body := jsonb_build_object('should_soft_delete', false)
        );
      
      RAISE NOTICE 'Auth user deletion requested via Admin API';
    ELSE
      RAISE NOTICE 'Service role key not found in vault. Auth user will remain. Profile deleted.';
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- If admin API call fails, log but don't fail the function
      -- The profile is already deleted, which is the main goal
      RAISE NOTICE 'Could not delete auth user via Admin API: %', SQLERRM;
      RAISE NOTICE 'Auth user record will remain, but profile is deleted.';
  END;
  
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;

-- Update comment
COMMENT ON FUNCTION public.delete_user_account() IS 'Deletes the current user account, profile, all related data, and attempts to delete the auth.users record via Admin API. Requires service role key in vault.';

-- Alternative approach: If pg_net is not available, you can use a Supabase Edge Function
-- The Edge Function would:
-- 1. Be called from the client after profile deletion
-- 2. Use the service role key to call Supabase Admin API
-- 3. Delete the auth user
-- This is more secure as the service role key stays on the server

