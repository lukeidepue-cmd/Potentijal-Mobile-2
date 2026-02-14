-- Migration 039: Fix search_path for exercise_progress and multi_sport_progress
-- Signatures from pg_proc: exercise_progress(p_name, p_metric, p_window);
-- multi_sport_progress(p_name, p_kind, p_metric, p_window).

alter function public.exercise_progress(text, text, text)
  set search_path = public;

alter function public.multi_sport_progress(text, text, text, text)
  set search_path = public;
