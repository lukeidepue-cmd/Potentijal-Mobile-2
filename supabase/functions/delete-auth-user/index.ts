import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from '../_shared/rate-limit.ts';
import {
  readJsonWithMaxSize,
  badRequest,
  isValidUuid,
  MAX_BODY_SIZE_SMALL,
} from '../_shared/validation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Rate limit: 5 requests per minute per IP (sensitive delete operation)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (supabaseUrl && serviceRoleKey) {
      const supabaseRpc = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const allowed = await checkRateLimit(
        supabaseRpc,
        'delete-auth-user',
        getClientIp(req),
        5
      );
      if (!allowed) {
        return rateLimitResponse(corsHeaders);
      }
    }

    const [body, bodyError] = await readJsonWithMaxSize(req, MAX_BODY_SIZE_SMALL, corsHeaders);
    if (bodyError) return bodyError;

    const raw = body as { userId?: unknown };
    const userId = raw?.userId;
    if (userId == null || typeof userId !== 'string') {
      return badRequest('userId is required', corsHeaders);
    }
    if (!isValidUuid(userId)) {
      return badRequest('userId must be a valid UUID', corsHeaders);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role key for admin access
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Delete auth user using Admin API
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      console.error("[delete-auth-user] deleteUser error:", (error as Error)?.message);
      return new Response(
        JSON.stringify({ error: "Failed to delete user" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Auth user deleted successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error("[delete-auth-user] Error:", error instanceof Error ? error.message : "unknown");
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

