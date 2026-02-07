// supabase/functions/sync-subscription/index.ts
// Step 36: Sync subscription from RevenueCat to Supabase profiles (for Restore Purchases).
// Called by the app with the user's JWT; fetches Customer Info from RevenueCat and updates profiles.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const REVENUECAT_API_BASE = "https://api.revenuecat.com/v1";
const ENTITLEMENT_ID = "premium"; // must match your RevenueCat entitlement

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
  const token = authHeader?.replace(/^Bearer\s+/i, "")?.trim();
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const {
    data: { user },
    error: authError,
  } = await supabaseAuth.auth.getUser(token);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const appUserId = user.id;
  const secretKey = Deno.env.get("REVENUECAT_SECRET_API_KEY");
  if (!secretKey) {
    console.error("[sync-subscription] REVENUECAT_SECRET_API_KEY not set");
    return new Response(JSON.stringify({ error: "Subscription sync not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const encodedId = encodeURIComponent(appUserId);
  const rcRes = await fetch(`${REVENUECAT_API_BASE}/subscribers/${encodedId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!rcRes.ok) {
    const text = await rcRes.text();
    console.error("[sync-subscription] RevenueCat API error:", rcRes.status, text);
    return new Response(
      JSON.stringify({ error: "Could not fetch subscription status", details: rcRes.status === 404 ? "Customer not found" : undefined }),
      { status: rcRes.status === 404 ? 404 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let raw: unknown;
  try {
    raw = await rcRes.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid response from subscription service" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = raw && typeof raw === "object" && "value" in raw ? (raw as { value: unknown }).value : raw;
  const subscriber = body && typeof body === "object" && "subscriber" in body ? (body as { subscriber: unknown }).subscriber : null;
  const entitlements = subscriber && typeof subscriber === "object" && "entitlements" in subscriber ? (subscriber as { entitlements: Record<string, { expires_date?: string | null }> }).entitlements : {};
  const ent = entitlements[ENTITLEMENT_ID];
  const entitlement = ent && typeof ent === "object" ? ent : null;
  const isPremium =
    !!entitlement &&
    (entitlement.expires_date == null ||
      new Date(entitlement.expires_date).getTime() > Date.now());

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({
      is_premium: isPremium,
      plan: isPremium ? "premium" : "free",
    })
    .eq("id", appUserId)
    .select("id");

  if (updateError) {
    console.error("[sync-subscription] Profile update failed:", updateError);
    return new Response(JSON.stringify({ error: "Failed to update profile" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ success: true, is_premium: isPremium }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
