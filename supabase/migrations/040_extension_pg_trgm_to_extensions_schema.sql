-- Migration 040: Move pg_trgm from public to extensions schema (security)
-- Extensions in public can be a security concern; Supabase recommends an
-- "extensions" schema. Functions that use pg_trgm (e.g. similarity()) must
-- have search_path that includes "extensions" so they still resolve.

-- 1. Ensure extensions schema exists
create schema if not exists extensions;

-- 2. Move the extension (objects like similarity() will now live in extensions)
alter extension pg_trgm set schema extensions;

-- 3. Grant usage so roles can resolve extension objects when search_path includes extensions
grant usage on schema extensions to public;

-- 4. Functions that call similarity() need to see extensions schema
alter function public.search_exercise_names(uuid, sport_mode, text, int)
  set search_path = public, extensions;

alter function public.get_primary_exercise_type(uuid, sport_mode, text)
  set search_path = public, extensions;

alter function public.get_weekly_goal_progress(uuid)
  set search_path = public, extensions;
