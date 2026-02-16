// Shared rate limiting for Supabase Edge Functions.
// Uses public.rate_limit_check RPC (see migration 041_rate_limits.sql).
// Fail closed: on RPC error we treat as rate limited (return false).

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const RPC_NAME = "rate_limit_check";

/** Get client IP from request (X-Forwarded-For, X-Real-IP, or fallback). */
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  const ip = (xff?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown").trim();
  return ip.slice(0, 256);
}

/** Build rate-limit identifier: prefer user id when available, else IP. */
export function getRateLimitId(req: Request, userId: string | null | undefined): string {
  if (userId && typeof userId === "string" && userId.length > 0) {
    return userId.slice(0, 256);
  }
  return getClientIp(req);
}

/**
 * Check rate limit. Returns true if request is allowed, false if over limit or on error (fail closed).
 * @param supabase - Supabase client (service role for Edge Functions)
 * @param functionName - e.g. "ai-trainer", "revenuecat-webhook"
 * @param identifier - user id or IP (use getRateLimitId)
 * @param maxPerMinute - max requests per 1-minute window
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  functionName: string,
  identifier: string,
  maxPerMinute: number
): Promise<boolean> {
  if (maxPerMinute < 1) return false;
  const { data, error } = await supabase.rpc(RPC_NAME, {
    p_function_name: functionName,
    p_identifier: identifier,
    p_max_per_minute: maxPerMinute,
  });
  if (error) {
    console.error("[rate-limit] RPC error:", functionName, error.message);
    return false; // fail closed
  }
  return data === true;
}

/** Standard 429 response with JSON body. */
export function rateLimitResponse(headers: Record<string, string> = {}): Response {
  return new Response(
    JSON.stringify({ error: "Too many requests", retry_after: 60 }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": "60",
        ...headers,
      },
    }
  );
}
