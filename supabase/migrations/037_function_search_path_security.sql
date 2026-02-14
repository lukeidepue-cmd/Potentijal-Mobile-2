-- Migration 037: Fix "Function Search Path Mutable" security issues
-- Set an explicit search_path on functions so they always resolve unqualified
-- names (tables, types) in a fixed schema. Prevents an attacker from changing
-- the session search_path to point to a malicious schema and hijacking object
-- resolution (e.g. shadowing public.profiles with a table in another schema).
-- See: https://www.postgresql.org/docs/current/sql-alterfunction.html

alter function public.delete_user_account()
  set search_path = public;

alter function public.get_running_progress(uuid, text, int)
  set search_path = public;

alter function public.get_weekly_goal_progress(uuid)
  set search_path = public;

-- search_exercise_names(p_user_id uuid, p_mode sport_mode, p_query text, p_limit int default 10)
alter function public.search_exercise_names(uuid, sport_mode, text, int)
  set search_path = public;
