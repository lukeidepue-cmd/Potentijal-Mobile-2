// supabase/functions/loops/index.ts
// Supabase Edge Function for Loops API
// This function securely handles Loops API calls with the API key stored in Supabase secrets
// According to Loops docs: "Your Loops API key should never be used client side or exposed to your end users."

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
  isValidEmailFormat,
  MAX_BODY_SIZE_LOOPS,
} from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOOPS_API_URL = "https://app.loops.so/api/v1";

const ALLOWED_ACTIONS = [
  "createOrUpdateContact",
  "sendTransactional",
  "trackEvent",
  "deleteContact",
] as const;

const MAX_STRING_LEN = 500;
const MAX_EVENT_NAME_LEN = 100;
const MAX_EVENT_PROPERTIES_KEYS = 20;
const MAX_DATA_VARIABLES_KEYS = 30;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Rate limit: 30 requests per minute per IP (no auth on this endpoint)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const allowed = await checkRateLimit(
        supabase,
        "loops",
        getClientIp(req),
        30
      );
      if (!allowed) {
        return rateLimitResponse(corsHeaders);
      }
    }

    // Get the Loops API key from Supabase secrets
    const loopsApiKey = Deno.env.get("LOOPS_API_KEY");
    if (!loopsApiKey) {
      console.error("❌ [Loops Edge Function] LOOPS_API_KEY not found in environment");
      return new Response(
        JSON.stringify({ error: "Loops service not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse and validate request body (max 50 KB)
    const [body, bodyError] = await readJsonWithMaxSize(req, MAX_BODY_SIZE_LOOPS, corsHeaders);
    if (bodyError) return bodyError;

    const raw = body as Record<string, unknown>;
    const action = raw?.action;
    if (typeof action !== "string" || !ALLOWED_ACTIONS.includes(action as typeof ALLOWED_ACTIONS[number])) {
      return badRequest("Missing or invalid action: must be one of createOrUpdateContact, sendTransactional, trackEvent, deleteContact", corsHeaders);
    }

    const params = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
    let response: Response;
    let endpoint: string;
    let requestBody: Record<string, unknown>;

    switch (action) {
      case "createOrUpdateContact": {
        const email = stringOrUndefined(params.email, 254);
        if (!email || !isValidEmailFormat(email)) {
          return badRequest("Valid email required for createOrUpdateContact", corsHeaders);
        }
        endpoint = `${LOOPS_API_URL}/contacts/create`;
        requestBody = {
          email,
          firstName: stringOrUndefined(params.firstName, MAX_STRING_LEN),
          lastName: stringOrUndefined(params.lastName, MAX_STRING_LEN),
          source: stringOrUndefined(params.source, MAX_STRING_LEN),
          subscribed: params.subscribed === true || params.subscribed === false ? params.subscribed : undefined,
          userGroup: stringOrUndefined(params.userGroup, MAX_STRING_LEN),
          userId: stringOrUndefined(params.userId, MAX_STRING_LEN),
        };
        break;
      }

      case "sendTransactional": {
        const email = stringOrUndefined(params.email, 254);
        if (!email || !isValidEmailFormat(email)) {
          return badRequest("Valid email required for sendTransactional", corsHeaders);
        }
        const transactionalId = stringOrUndefined(params.transactionalId, MAX_STRING_LEN);
        if (!transactionalId) {
          return badRequest("transactionalId required for sendTransactional", corsHeaders);
        }
        let dataVariables: Record<string, unknown> = {};
        if (params.dataVariables != null && typeof params.dataVariables === "object" && !Array.isArray(params.dataVariables)) {
          const keys = Object.keys(params.dataVariables);
          if (keys.length > MAX_DATA_VARIABLES_KEYS) {
            return badRequest("dataVariables has too many keys", corsHeaders);
          }
          for (const k of keys) {
            const v = (params.dataVariables as Record<string, unknown>)[k];
            if (typeof v === "string") dataVariables[k] = v.slice(0, 500);
            else if (typeof v === "number" || typeof v === "boolean") dataVariables[k] = v;
          }
        }
        endpoint = `${LOOPS_API_URL}/transactional`;
        requestBody = {
          transactionalId,
          email,
          dataVariables,
        };
        if (params.addToAudience === true || params.addToAudience === false) {
          requestBody.addToAudience = params.addToAudience;
        }
        break;
      }

      case "trackEvent": {
        const eventName = stringOrUndefined(params.eventName, MAX_EVENT_NAME_LEN);
        if (!eventName) {
          return badRequest("eventName required for trackEvent", corsHeaders);
        }
        let eventProperties: Record<string, unknown> = {};
        if (params.eventProperties != null && typeof params.eventProperties === "object" && !Array.isArray(params.eventProperties)) {
          const keys = Object.keys(params.eventProperties);
          if (keys.length > MAX_EVENT_PROPERTIES_KEYS) {
            return badRequest("eventProperties has too many keys", corsHeaders);
          }
          for (const k of keys) {
            const v = (params.eventProperties as Record<string, unknown>)[k];
            if (typeof v === "string") eventProperties[k] = v.slice(0, 500);
            else if (typeof v === "number" || typeof v === "boolean") eventProperties[k] = v;
          }
        }
        endpoint = `${LOOPS_API_URL}/events/send`;
        requestBody = { eventName, eventProperties };
        const eventEmail = stringOrUndefined(params.email, 254);
        if (eventEmail && isValidEmailFormat(eventEmail)) requestBody.email = eventEmail;
        const eventUserId = stringOrUndefined(params.userId, MAX_STRING_LEN);
        if (eventUserId) requestBody.userId = eventUserId;
        if (!requestBody.email && !requestBody.userId) {
          return badRequest("email or userId required for trackEvent", corsHeaders);
        }
        const fn = stringOrUndefined(params.firstName, MAX_STRING_LEN);
        if (fn) requestBody.firstName = fn;
        const ln = stringOrUndefined(params.lastName, MAX_STRING_LEN);
        if (ln) requestBody.lastName = ln;
        if (params.mailingLists != null && Array.isArray(params.mailingLists)) {
          requestBody.mailingLists = params.mailingLists.slice(0, 10).filter((x): x is string => typeof x === "string").map((s) => s.slice(0, 100));
        }
        break;
      }

      case "deleteContact": {
        const email = stringOrUndefined(params.email, 254);
        if (!email || !isValidEmailFormat(email)) {
          return badRequest("Valid email required for deleteContact", corsHeaders);
        }
        endpoint = `${LOOPS_API_URL}/contacts/delete`;
        requestBody = { email };
        break;
      }

      default: {
        return badRequest("Unknown action", corsHeaders);
      }
    }

    // Make the request to Loops API
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${loopsApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`❌ [Loops Edge Function] Loops API error:`, data);
      return new Response(
        JSON.stringify({
          data: null,
          error: { message: data.message || "Loops API request failed" },
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ data, error: null }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("[loops] Error:", error instanceof Error ? error.message : "unknown");
    return new Response(
      JSON.stringify({
        data: null,
        error: { message: "Internal server error" },
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
