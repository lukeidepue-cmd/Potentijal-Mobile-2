// supabase/functions/revenuecat-webhook/index.ts
// Receives RevenueCat webhooks and updates Supabase profiles (is_premium, plan).
// Steps 27–33 of REVENUECAT_PAYMENTS_IMPLEMENTATION_PLAN.md

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "../_shared/rate-limit.ts";
import {
  readJsonWithMaxSize,
  badRequest,
  stringOrUndefined,
  MAX_BODY_SIZE_WEBHOOK,
} from "../_shared/validation.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

/** RevenueCat sends optional Authorization header you set in dashboard; we verify it. */
function verifyWebhookAuth(req: Request): boolean {
  const secret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
  // Fail closed: if secret is not set, reject. Prevents unauthenticated webhook abuse in production.
  if (!secret || secret.trim() === "") return false;
  const raw = req.headers.get("Authorization");
  if (!raw) return false;
  const auth = raw.trim();
  const secretTrim = secret.trim();
  if (auth === secretTrim) return true;
  if (auth.toLowerCase() === `bearer ${secretTrim}`.toLowerCase()) return true;
  return false;
}

type EventType =
  | "INITIAL_PURCHASE"
  | "RENEWAL"
  | "CANCELLATION"
  | "EXPIRATION"
  | "BILLING_ISSUE"
  | "UNCANCELLATION"
  | "NON_RENEWING_PURCHASE"
  | "SUBSCRIPTION_EXTENDED"
  | "PRODUCT_CHANGE"
  | "REFUND_REVERSED"
  | "SUBSCRIPTION_PAUSED"
  | "TRANSFER"
  | string;

interface RevenueCatEvent {
  type: EventType;
  app_user_id?: string;
  product_id?: string;
  period_type?: string;
  expiration_at_ms?: number;
  [key: string]: unknown;
}

const LOOPS_EVENTS_URL = "https://app.loops.so/api/v1/events/send";

interface WebhookBody {
  event?: RevenueCatEvent;
  api_version?: string;
}

const PREMIUM_EVENT_TYPES: EventType[] = [
  "INITIAL_PURCHASE",
  "RENEWAL",
  "UNCANCELLATION",
  "NON_RENEWING_PURCHASE",
  "SUBSCRIPTION_EXTENDED",
  "PRODUCT_CHANGE",
  "REFUND_REVERSED",
  "SUBSCRIPTION_PAUSED",
];

/** Allowlist of known RevenueCat event types (strict validation). */
const ALLOWED_EVENT_TYPES: readonly string[] = [
  "INITIAL_PURCHASE",
  "RENEWAL",
  "CANCELLATION",
  "EXPIRATION",
  "BILLING_ISSUE",
  "UNCANCELLATION",
  "NON_RENEWING_PURCHASE",
  "SUBSCRIPTION_EXTENDED",
  "PRODUCT_CHANGE",
  "REFUND_REVERSED",
  "SUBSCRIPTION_PAUSED",
  "TRANSFER",
];

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!verifyWebhookAuth(req)) {
    console.error("[revenuecat-webhook] Unauthorized: missing or invalid Authorization");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Rate limit: 60 requests per minute per IP (webhook bursts)
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (supabaseUrl && supabaseServiceKey) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const allowed = await checkRateLimit(
      supabase,
      "revenuecat-webhook",
      getClientIp(req),
      60
    );
    if (!allowed) {
      return rateLimitResponse(corsHeaders);
    }
  }

  const [body, bodyError] = await readJsonWithMaxSize(req, MAX_BODY_SIZE_WEBHOOK, corsHeaders);
  if (bodyError) return bodyError;

  const raw = body as WebhookBody;
  const event = raw?.event;
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    return badRequest("Missing or invalid event", corsHeaders);
  }

  const eventTypeRaw = event.type;
  if (typeof eventTypeRaw !== "string" || eventTypeRaw.length === 0) {
    return badRequest("Missing or invalid event.type", corsHeaders);
  }
  if (!ALLOWED_EVENT_TYPES.includes(eventTypeRaw)) {
    return badRequest("Unknown event.type", corsHeaders);
  }
  const eventType = eventTypeRaw as EventType;

  const appUserId = stringOrUndefined(event.app_user_id, 256);
  const productId = stringOrUndefined(event.product_id, 128);
  const periodType = stringOrUndefined(event.period_type, 32);
  let expirationAtMs: number | null = null;
  if (event.expiration_at_ms != null) {
    if (typeof event.expiration_at_ms !== "number" || !Number.isFinite(event.expiration_at_ms)) {
      return badRequest("Invalid event.expiration_at_ms", corsHeaders);
    }
    expirationAtMs = event.expiration_at_ms;
  }

  const environment = stringOrUndefined((event as { environment?: unknown }).environment, 32) ?? "unknown";

  console.log("[revenuecat-webhook] Received event:", { type: eventType, app_user_id: appUserId, environment });

  if (!appUserId || typeof appUserId !== "string") {
    console.warn("[revenuecat-webhook] Missing app_user_id, skipping profile update");
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // If RevenueCat sends an anonymous id (e.g. $RCAnonymousID:...), no profile row will match
  if (appUserId.startsWith("$RCAnonymousID:")) {
    console.warn("[revenuecat-webhook] app_user_id is anonymous - user was not logged in at purchase. Log in with Purchases.logIn(supabaseUserId) before purchase so webhook can update the correct profile.");
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("[revenuecat-webhook] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Fetch current profile so we never overwrite creator accounts (creators get premium for free, set manually in DB).
  const { data: existingProfile } = await supabaseAdmin
    .from("profiles")
    .select("plan, is_creator")
    .eq("id", appUserId)
    .single();
  const isCreator = existingProfile?.plan === "creator" || existingProfile?.is_creator === true;

  if (eventType === "BILLING_ISSUE") {
    console.log("[revenuecat-webhook] BILLING_ISSUE for app_user_id:", appUserId, "- not revoking premium");
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (eventType === "CANCELLATION" || eventType === "EXPIRATION") {
    if (isCreator) {
      console.log("[revenuecat-webhook] Skipping set free for creator app_user_id:", appUserId);
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: updated, error } = await supabaseAdmin
      .from("profiles")
      .update({ is_premium: false, plan: "free" })
      .eq("id", appUserId)
      .select("id");

    if (error) {
      console.error("[revenuecat-webhook] Failed to set free:", error);
    } else if (!updated?.length) {
      console.warn("[revenuecat-webhook] Set free: no profile row found for app_user_id:", appUserId, "- ensure app_user_id is the Supabase auth user UUID (Purchases.logIn(user.id))");
    } else {
      console.log("[revenuecat-webhook] Set free for app_user_id:", appUserId);
    }
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (PREMIUM_EVENT_TYPES.includes(eventType)) {
    const premiumExpiresAt = expirationAtMs != null
      ? new Date(expirationAtMs).toISOString()
      : null;

    // When we set a new premium_expires_at (new period), clear trial-email flags so they get reminder emails again for this period.
    const trialFlagsReset =
      premiumExpiresAt
        ? { trial_ending_email_sent_at: null, trial_one_week_email_sent_at: null }
        : {};
    // trial = free trial; normal = paid subscription (used for trial_ending_soon vs trial_one_week_remaining).
    const premiumPeriodType =
      periodType === "TRIAL" ? "trial" : periodType ? "normal" : undefined;

    const updatePayload = isCreator
      ? {
          is_premium: true,
          plan: "creator",
          ...(premiumExpiresAt && { premium_expires_at: premiumExpiresAt }),
          ...(premiumPeriodType && { premium_period_type: premiumPeriodType }),
          ...trialFlagsReset,
        }
      : {
          is_premium: true,
          plan: "premium",
          ...(premiumExpiresAt && { premium_expires_at: premiumExpiresAt }),
          ...(premiumPeriodType && { premium_period_type: premiumPeriodType }),
          ...trialFlagsReset,
        };

    const { data: updated, error } = await supabaseAdmin
      .from("profiles")
      .update(updatePayload)
      .eq("id", appUserId)
      .select("id");

    if (error) {
      console.error("[revenuecat-webhook] Failed to set premium:", error);
    } else if (!updated?.length) {
      console.warn("[revenuecat-webhook] Set premium: no profile row found for app_user_id:", appUserId, "- ensure app_user_id is the Supabase auth user UUID (Purchases.logIn(user.id))");
    } else {
      console.log("[revenuecat-webhook] Set premium for app_user_id:", appUserId, "type:", eventType, isCreator ? "(creator kept)" : "");
    }

    // Paywall codes analytics: on first purchase, record which code was used with monthly vs yearly
    if (eventType === "INITIAL_PURCHASE") {
      const { data: profileRow } = await supabaseAdmin
        .from("profiles")
        .select("pending_paywall_code")
        .eq("id", appUserId)
        .single();
      const pendingCode = profileRow?.pending_paywall_code?.trim();
      if (pendingCode && productId) {
        const productIdLower = String(productId).toLowerCase();
        const isYearly = productIdLower.includes("annual") || productIdLower.includes("yearly") || productIdLower.includes("year");
        const purchaseType = isYearly ? "yearly" : "monthly";
        await supabaseAdmin.rpc("increment_paywall_code_purchase", {
          p_code: pendingCode,
          p_type: purchaseType,
        });
        await supabaseAdmin
          .from("profiles")
          .update({ pending_paywall_code: null })
          .eq("id", appUserId);
      }
    }

    // Steps 49 & 51: Send Loops events (premium_purchased on first purchase, subscription_renewed on renewal)
    const loopsApiKey = Deno.env.get("LOOPS_API_KEY");
    if (loopsApiKey) {
      try {
        const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.getUserById(appUserId);
        const email = authUser?.user?.email;
        if (!authErr && email) {
          const eventName = eventType === "INITIAL_PURCHASE" ? "premium_purchased" : "subscription_renewed";
          const eventProperties: Record<string, unknown> = {
            product_id: productId ?? null,
            period_type: periodType ?? null,
            event_type: eventType,
          };
          const loopsRes = await fetch(LOOPS_EVENTS_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${loopsApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email,
              eventName,
              eventProperties,
            }),
          });
          if (!loopsRes.ok) {
            const errText = await loopsRes.text();
            console.error("[revenuecat-webhook] Loops event failed:", loopsRes.status, errText);
          } else {
            console.log("[revenuecat-webhook] Loops event sent:", eventName, "for", email);
          }
        } else {
          console.warn("[revenuecat-webhook] Could not get user email for Loops (user may not exist):", appUserId);
        }
      } catch (loopsErr) {
        console.error("[revenuecat-webhook] Loops error:", loopsErr);
      }
    } else {
      console.warn("[revenuecat-webhook] LOOPS_API_KEY not set; skipping Loops event");
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // TRANSFER, REFUND, or unknown: log and return 200 so RevenueCat doesn't retry
  console.log("[revenuecat-webhook] Unhandled event type:", eventType, "app_user_id:", appUserId);
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
