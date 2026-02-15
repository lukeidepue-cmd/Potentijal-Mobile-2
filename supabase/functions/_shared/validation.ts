/**
 * Shared input validation and sanitization for Edge Functions.
 * Use for all user-controlled input (body, params, headers) and for LLM/third-party output.
 */

/** Max request body size in bytes (100 KB) for AI Trainer and similar. */
export const MAX_BODY_SIZE_AI = 100 * 1024;

/** Max request body for webhooks (64 KB). */
export const MAX_BODY_SIZE_WEBHOOK = 64 * 1024;

/** Max request body for small JSON payloads (e.g. delete-auth-user, sync-subscription). */
export const MAX_BODY_SIZE_SMALL = 1024;

/** Max request body for Loops (50 KB). */
export const MAX_BODY_SIZE_LOOPS = 50 * 1024;

/** Max length for a single user message in AI Trainer. */
export const MAX_MESSAGE_LENGTH = 8 * 1024;

/** Max number of messages in conversationHistory. */
export const MAX_CONVERSATION_HISTORY_COUNT = 20;

/** Max length per message content in conversationHistory. */
export const MAX_CONVERSATION_MESSAGE_LENGTH = 2 * 1024;

/** Max length for AI response returned to client. */
export const MAX_AI_RESPONSE_LENGTH = 8 * 1024;

/** UUID v4 regex (simple; allows any UUID format). */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Allowlist for conversation message roles. */
const ALLOWED_ROLES = ["user", "assistant"] as const;

export type ConversationMessage = { role: "user" | "assistant"; content: string };

/**
 * Read request body with a max size limit. Returns [body, null] or [null, Response] on error.
 * Caller should return the Response when non-null.
 */
export async function readJsonWithMaxSize(
  req: Request,
  maxBytes: number,
  corsHeaders: Record<string, string> = {}
): Promise<[unknown, Response | null]> {
  const contentLength = req.headers.get("content-length");
  if (contentLength) {
    const len = parseInt(contentLength, 10);
    if (Number.isNaN(len) || len > maxBytes) {
      return [
        null,
        new Response(
          JSON.stringify({ error: "Request body too large" }),
          { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        ),
      ];
    }
  }
  let raw: string;
  try {
    const buf = await req.arrayBuffer();
    if (buf.byteLength > maxBytes) {
      return [
        null,
        new Response(
          JSON.stringify({ error: "Request body too large" }),
          { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        ),
      ];
    }
    raw = new TextDecoder().decode(buf);
  } catch {
    return [
      null,
      new Response(JSON.stringify({ error: "Failed to read body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    ];
  }
  const trimmed = raw.trim();
  if (trimmed === "") {
    return [{}, null];
  }
  try {
    const parsed = JSON.parse(raw);
    return [parsed, null];
  } catch {
    return [
      null,
      new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    ];
  }
}

/** Return a 400 JSON response with a message. */
export function badRequest(
  message: string,
  corsHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Check if string is a valid UUID (Supabase auth user id format). */
export function isValidUuid(s: unknown): s is string {
  return typeof s === "string" && UUID_REGEX.test(s.trim());
}

/**
 * Strip control characters and null bytes from text; truncate to maxLen.
 * Use for sanitizing user input or LLM output before storing or returning.
 */
export function sanitizeText(text: unknown, maxLen: number): string {
  if (text == null) return "";
  let s = String(text);
  // Remove null bytes and control chars
  s = s.replace(/\0/g, "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  if (s.length > maxLen) s = s.slice(0, maxLen);
  return s;
}

/**
 * Validate and normalize conversationHistory. Returns normalized array or null if invalid.
 * Each message must have role in ["user","assistant"] and content string within length limit.
 */
export function validateConversationHistory(
  raw: unknown
): ConversationMessage[] | null {
  if (raw == null) return [];
  if (!Array.isArray(raw)) return null;
  if (raw.length > MAX_CONVERSATION_HISTORY_COUNT) return null;
  const out: ConversationMessage[] = [];
  for (const item of raw) {
    if (item == null || typeof item !== "object") return null;
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if (
      !ALLOWED_ROLES.includes(role as "user" | "assistant") ||
      typeof content !== "string"
    )
      return null;
    const contentSanitized = sanitizeText(content, MAX_CONVERSATION_MESSAGE_LENGTH);
    out.push({
      role: role as "user" | "assistant",
      content: contentSanitized,
    });
  }
  return out;
}

/**
 * Strip dangerous URL schemes from text (H2: treat LLM output as untrusted; no executable content).
 */
function stripDangerousUrlSchemes(s: string): string {
  return s
    .replace(/\bjavascript:\s*[^\s]*/gi, "[removed]")
    .replace(/\bdata:\s*[^\s]*/gi, "[removed]")
    .replace(/\bvbscript:\s*[^\s]*/gi, "[removed]");
}

/**
 * Sanitize AI/LLM response before returning to client: strip control chars, dangerous URL schemes, enforce max length.
 * Treat output as untrusted; no code or command execution.
 */
export function sanitizeAiOutput(content: unknown): string {
  const t = sanitizeText(content, MAX_AI_RESPONSE_LENGTH);
  return stripDangerousUrlSchemes(t);
}

/** Basic email format check (allowlist chars, one @, reasonable length). */
export function isValidEmailFormat(s: unknown): boolean {
  if (typeof s !== "string") return false;
  const t = s.trim();
  if (t.length === 0 || t.length > 254) return false;
  const at = t.indexOf("@");
  if (at <= 0 || at === t.length - 1) return false;
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/.test(
    t
  );
}

/** Clamp string to max length; return undefined if not a string. */
export function stringOrUndefined(value: unknown, maxLen: number): string | undefined {
  if (value == null) return undefined;
  if (typeof value !== "string") return undefined;
  return sanitizeText(value, maxLen).trim() || undefined;
}
