// supabase/functions/loops/index.ts
// Supabase Edge Function for Loops API
// This function securely handles Loops API calls with the API key stored in Supabase secrets
// According to Loops docs: "Your Loops API key should never be used client side or exposed to your end users."

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOOPS_API_URL = "https://app.loops.so/api/v1";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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

    // Parse the request body
    const body = await req.json();
    const { action, ...params } = body;

    if (!action) {
      return new Response(
        JSON.stringify({ error: "Missing action parameter" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let response: Response;
    let endpoint: string;
    let requestBody: any;

    // Route to the appropriate Loops API endpoint
    switch (action) {
      case "createOrUpdateContact": {
        endpoint = `${LOOPS_API_URL}/contacts/create`;
        requestBody = {
          email: params.email,
          firstName: params.firstName,
          lastName: params.lastName,
          source: params.source,
          subscribed: params.subscribed,
          userGroup: params.userGroup,
          userId: params.userId,
        };
        break;
      }

      case "sendTransactional": {
        endpoint = `${LOOPS_API_URL}/transactional`;
        requestBody = {
          transactionalId: params.transactionalId,
          email: params.email,
          dataVariables: params.dataVariables || {},
        };
        if (params.addToAudience !== undefined) {
          requestBody.addToAudience = params.addToAudience;
        }
        break;
      }

      case "trackEvent": {
        endpoint = `${LOOPS_API_URL}/events/send`;
        requestBody = {
          eventName: params.eventName,
          eventProperties: params.eventProperties || {},
        };
        // Email or userId is required for events
        if (params.email) requestBody.email = params.email;
        if (params.userId) requestBody.userId = params.userId;
        // Optional contact updates
        if (params.firstName) requestBody.firstName = params.firstName;
        if (params.lastName) requestBody.lastName = params.lastName;
        if (params.mailingLists) requestBody.mailingLists = params.mailingLists;
        break;
      }

      case "deleteContact": {
        endpoint = `${LOOPS_API_URL}/contacts/delete`;
        requestBody = { email: params.email };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
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
  } catch (error: any) {
    console.error("❌ [Loops Edge Function] Error:", error);
    return new Response(
      JSON.stringify({
        data: null,
        error: { message: error.message || "Internal server error" },
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
