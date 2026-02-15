-- Enable RLS on rate_limits so only the table owner (and service role) can access it.
-- Edge Functions call rate_limit_check() RPC with service role; the RPC runs as DEFINER (owner) and bypasses RLS.
-- No policies: anon/authenticated get no direct access. Defense in depth.

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.rate_limits IS 'Rate limit state per key (function:identifier). Used by Edge Functions only. RLS enabled; no policies so only owner/service_role can access.';
