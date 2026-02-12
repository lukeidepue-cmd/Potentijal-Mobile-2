// supabase/functions/revenuecat-webhook/index.ts
// Receives RevenueCat webhooks and updates Supabase profiles (is_premium, plan).
// Steps 27–33 of REVENUECAT_PAYMENTS_IMPLEMENTATION_PLAN.md

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** RevenueCat sends optional Authorization header you set in dashboard; we verify it. */
function verifyWebhookAuth(req: Request): boolean {
  const secret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
  if (!secret) return true; // If not set, skip verification (not recommended for production)
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  const secretLen = (Deno.env.get("REVENUECAT_WEBHOOK_SECRET") ?? "").length;
  if (!verifyWebhookAuth(req)) {
    console.error("[revenuecat-webhook] Unauthorized: Authorization header missing or does not match secret. (Header length:", (authHeader ?? "").length, ", secret length:", secretLen, ")");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: WebhookBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const event = body?.event;
  if (!event || typeof event !== "object") {
    return new Response(JSON.stringify({ error: "Missing event" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const eventType = (event.type ?? "") as EventType;
  const appUserId = event.app_user_id as string | undefined;
  const environment = (event as { environment?: string }).environment ?? "unknown";

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

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[revenuecat-webhook] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
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
    const productId = (event as RevenueCatEvent).product_id ?? undefined;
    const periodType = (event as RevenueCatEvent).period_type ?? undefined;
    const expirationAtMs = (event as RevenueCatEvent).expiration_at_ms;
    const premiumExpiresAt = expirationAtMs
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
