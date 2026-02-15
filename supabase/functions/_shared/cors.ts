/**
 * CORS headers for Edge Functions (H5).
 * Set ALLOWED_ORIGINS in Supabase secrets (comma-separated, e.g. https://yourapp.com,exp://192.168.1.1:8081).
 * If set, only those origins are allowed; request Origin is echoed when in the list.
 * If unset, falls back to "*" for backward compatibility (set ALLOWED_ORIGINS in production).
 */

const DEFAULT_ACAO = "*";

function parseAllowedOrigins(): string[] | null {
  const raw = Deno.env.get("ALLOWED_ORIGINS");
  if (!raw || raw.trim() === "") return null;
  return raw.split(",").map((o) => o.trim()).filter(Boolean);
}

/**
 * Build CORS headers for this request.
 * When ALLOWED_ORIGINS is set: uses request Origin if it's in the list, else first allowed origin (for server requests with no Origin).
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const allowed = parseAllowedOrigins();
  if (!allowed.length) {
    return {
      "Access-Control-Allow-Origin": DEFAULT_ACAO,
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    };
  }
  const origin = req.headers.get("Origin")?.trim() ?? "";
  const acao = origin && allowed.includes(origin) ? origin : allowed[0];
  return {
    "Access-Control-Allow-Origin": acao,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}
