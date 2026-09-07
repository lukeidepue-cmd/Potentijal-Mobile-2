/**
 * Server-side premium/creator check for Edge Functions.
 * Use for any backend that gates "premium-only" behavior so entitlements
 * are never trusted from the client (IAP / server-authoritative).
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface PremiumCheckResult {
  /** True if user is premium or creator and may access the feature. */
  allowed: boolean;
  isPremium: boolean;
  isCreator: boolean;
  /** If allowed is false, return this response to the client (403 or 503). */
  errorResponse: Response | null;
}

/**
 * Load profile and check if user is premium or creator.
 * Use after auth in any Edge Function that gates premium-only behavior.
 *
 * @param supabase - Supabase client (service role)
 * @param userId - Authenticated user id
 * @param corsHeaders - Headers to attach to error responses
 * @param featureName - Optional; used in 403 message (e.g. "AI Trainer")
 */
export async function checkPremiumOrCreator(
  supabase: SupabaseClient,
  userId: string,
  corsHeaders: Record<string, string> = {},
  featureName: string = "This feature"
): Promise<PremiumCheckResult> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_premium, plan")
    .eq("id", userId)
    .single();

  if (profileError) {
    console.warn("[premium check] Could not load profile:", profileError.message);
    return {
      allowed: false,
      isPremium: false,
      isCreator: false,
      errorResponse: new Response(
        JSON.stringify({ error: "Could not verify subscription" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      ),
    };
  }

  const isPremium = profile?.is_premium === true || profile?.plan === "premium";
  const isCreator = profile?.plan === "creator";

  if (!isPremium && !isCreator) {
    return {
      allowed: false,
      isPremium: false,
      isCreator: false,
      errorResponse: new Response(
        JSON.stringify({
          error: `Pro or creator subscription required to use ${featureName}`,
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      ),
    };
  }

  return {
    allowed: true,
    isPremium,
    isCreator,
    errorResponse: null,
  };
}
