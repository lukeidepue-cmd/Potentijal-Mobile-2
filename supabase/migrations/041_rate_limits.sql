-- =====================================================
-- Migration 041: Rate limiting for Edge Functions
-- Table and RPC used by all public Edge Functions to enforce
-- per-user or per-IP limits (e.g. requests per minute).
-- =====================================================

-- Table: one row per (function_name, identifier) with sliding 1-minute window
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key text PRIMARY KEY,
  count int NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now()
);

-- Optional: prune old rows periodically to avoid unbounded growth (e.g. keys older than 2 minutes)
-- Can be done via pg_cron or a separate cleanup job. Not required for correctness.

COMMENT ON TABLE public.rate_limits IS 'Rate limit state per key (function:identifier). Used by Edge Functions only.';

-- RPC: atomically increment or reset window; returns true if request is allowed, false if over limit.
-- Identifier is sanitized (safe chars only, max 256 chars) to avoid injection.
CREATE OR REPLACE FUNCTION public.rate_limit_check(
  p_function_name text,
  p_identifier text,
  p_max_per_minute int
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rkey text;
  new_count int;
  new_window_start timestamptz;
BEGIN
  IF p_function_name IS NULL OR p_identifier IS NULL OR p_max_per_minute IS NULL OR p_max_per_minute < 1 THEN
    RETURN false;
  END IF;

  -- Build key: sanitize identifier (alphanumeric, dash, underscore, dot only; max 256 chars)
  rkey := p_function_name || ':' || left(regexp_replace(coalesce(trim(p_identifier), ''), '[^a-zA-Z0-9\-_.]', '_', 'g'), 256);
  IF length(rkey) <= length(p_function_name) + 1 THEN
    RETURN false; -- no valid identifier
  END IF;

  INSERT INTO public.rate_limits (key, count, window_start)
  VALUES (rkey, 1, now())
  ON CONFLICT (key) DO UPDATE SET
    count = CASE
      WHEN public.rate_limits.window_start < now() - interval '1 minute' THEN 1
      ELSE public.rate_limits.count + 1
    END,
    window_start = CASE
      WHEN public.rate_limits.window_start < now() - interval '1 minute' THEN now()
      ELSE public.rate_limits.window_start
    END
  RETURNING count, window_start INTO new_count, new_window_start;

  RETURN new_count <= p_max_per_minute;
END;
$$;

COMMENT ON FUNCTION public.rate_limit_check(text, text, int) IS 'Rate limit check for Edge Functions. Returns true if under limit, false if over. 1-minute sliding window.';
