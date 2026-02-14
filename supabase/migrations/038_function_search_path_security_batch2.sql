-- Migration 038: Fix remaining "Function Search Path Mutable" security issues
-- Sets explicit search_path on all reported functions so object resolution
-- cannot be hijacked via the caller's session search_path.

-- RPC / helper functions (signatures from migrations)
alter function public.get_primary_exercise_type(uuid, sport_mode, text)
  set search_path = public;

alter function public.is_rest_day_label(text)
  set search_path = public;

alter function public.get_exercise_progress(uuid, sport_mode, text, text, int)
  set search_path = public;

-- Trigger functions (no arguments)
alter function public.update_updated_at_column()
  set search_path = public;

alter function public.handle_new_user()
  set search_path = public;

alter function public.set_workout_user_id()
  set search_path = public;

alter function public.set_meal_user_id()
  set search_path = public;

alter function public.set_user_id()
  set search_path = public;

-- exercise_progress and multi_sport_progress: not present in this project's DB
-- (or they have a different signature). If your scanner still reports them,
-- run: select proname, pg_get_function_identity_arguments(oid) from pg_proc
--      where pronamespace = (select oid from pg_namespace where nspname = 'public')
--        and proname in ('exercise_progress','multi_sport_progress');
-- Then add ALTER FUNCTION public.<name>(<args>) SET search_path = public; in a new migration.
