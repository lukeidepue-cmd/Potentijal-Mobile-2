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
  [key: string]: unknown;
}

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
    const updatePayload = isCreator
      ? { is_premium: true, plan: "creator" }
      : { is_premium: true, plan: "premium" };
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
