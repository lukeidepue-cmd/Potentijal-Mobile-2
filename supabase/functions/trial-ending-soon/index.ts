// supabase/functions/trial-ending-soon/index.ts
// Sends two Loops reminder emails. Run daily (e.g. Supabase cron or external scheduler).
// 1) trial_one_week_remaining: paid subscription renews in ~1 week (premium_period_type = normal, expiry 6–8 days away).
// 2) trial_ending_soon: free trial ends in 1 day (premium_period_type = trial, expiry within 1 day).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LOOPS_EVENTS_URL = "https://app.loops.so/api/v1/events/send";
const TRIAL_ONE_DAY_WINDOW_DAYS = 1; // "trial ending soon" = 1 day before
const TRIAL_ONE_WEEK_START_DAYS = 6; // "one week remaining" window start
const TRIAL_ONE_WEEK_END_DAYS = 8;   // "one week remaining" window end (catch 7-day expiry)

type ResultItem = { id: string; email?: string; sent: boolean; error?: string };

async function sendTrialReminders(
  supabase: ReturnType<typeof createClient>,
  loopsApiKey: string,
  now: Date,
): Promise<{ oneWeek: ResultItem[]; oneDay: ResultItem[] }> {
  const nowIso = now.toISOString();

  // --- 1) Subscription renews in ~1 week: paid period only, expiry between 6 and 8 days from now ---
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() + TRIAL_ONE_WEEK_START_DAYS);
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + TRIAL_ONE_WEEK_END_DAYS);
  const weekStartIso = weekStart.toISOString();
  const weekEndIso = weekEnd.toISOString();

  const { data: profilesOneWeek, error: errWeek } = await supabase
    .from("profiles")
    .select("id, premium_expires_at")
    .not("premium_expires_at", "is", null)
    .eq("premium_period_type", "normal")
    .is("trial_one_week_email_sent_at", null)
    .gte("premium_expires_at", weekStartIso)
    .lte("premium_expires_at", weekEndIso);

  const oneWeekResults: ResultItem[] = [];
  if (!errWeek && profilesOneWeek?.length) {
    for (const profile of profilesOneWeek) {
      const { email, sent, error } = await sendLoopsAndUpdate(
        supabase,
        loopsApiKey,
        profile.id,
        profile.premium_expires_at,
        "trial_one_week_remaining",
        "trial_one_week_email_sent_at",
      );
      oneWeekResults.push({ id: profile.id, email, sent, error });
    }
  }

  // --- 2) Free trial ending in 1 day: trial period only, expiry within next 1 day ---
  const dayEnd = new Date(now);
  dayEnd.setDate(dayEnd.getDate() + TRIAL_ONE_DAY_WINDOW_DAYS);
  const dayEndIso = dayEnd.toISOString();

  const { data: profilesOneDay, error: errDay } = await supabase
    .from("profiles")
    .select("id, premium_expires_at")
    .not("premium_expires_at", "is", null)
    .eq("premium_period_type", "trial")
    .is("trial_ending_email_sent_at", null)
    .gte("premium_expires_at", nowIso)
    .lte("premium_expires_at", dayEndIso);

  const oneDayResults: ResultItem[] = [];
  if (!errDay && profilesOneDay?.length) {
    for (const profile of profilesOneDay) {
      const { email, sent, error } = await sendLoopsAndUpdate(
        supabase,
        loopsApiKey,
        profile.id,
        profile.premium_expires_at,
        "trial_ending_soon",
        "trial_ending_email_sent_at",
      );
      oneDayResults.push({ id: profile.id, email, sent, error });
    }
  }

  return { oneWeek: oneWeekResults, oneDay: oneDayResults };
}

async function sendLoopsAndUpdate(
  supabase: ReturnType<typeof createClient>,
  loopsApiKey: string,
  userId: string,
  premiumExpiresAt: string | null,
  eventName: string,
  sentAtColumn: "trial_one_week_email_sent_at" | "trial_ending_email_sent_at",
): Promise<{ email?: string; sent: boolean; error?: string }> {
  const { data: authUser, error: authErr } = await supabase.auth.admin.getUserById(userId);
  const email = authUser?.user?.email;

  if (authErr || !email) {
    return { email: undefined, sent: false, error: authErr?.message ?? "No email" };
  }

  try {
    const loopsRes = await fetch(LOOPS_EVENTS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${loopsApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        eventName,
        eventProperties: { premium_expires_at: premiumExpiresAt },
      }),
    });

    if (!loopsRes.ok) {
      const errText = await loopsRes.text();
      return { email, sent: false, error: `Loops ${loopsRes.status}: ${errText}` };
    }

    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ [sentAtColumn]: new Date().toISOString() })
      .eq("id", userId);

    if (updateErr) {
      return { email, sent: true, error: `Profile update: ${updateErr.message}` };
    }
    return { email, sent: true };
  } catch (e) {
    return { email, sent: false, error: String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret) {
    const provided = req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("secret");
    if (provided !== cronSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const loopsApiKey = Deno.env.get("LOOPS_API_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: "Server configuration error (Supabase)" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
  if (!loopsApiKey) {
    return new Response(
      JSON.stringify({ error: "LOOPS_API_KEY not set" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const now = new Date();

  let oneWeek: ResultItem[] = [];
  let oneDay: ResultItem[] = [];
  let selectError: string | null = null;

  try {
    const result = await sendTrialReminders(supabase, loopsApiKey, now);
    oneWeek = result.oneWeek;
    oneDay = result.oneDay;
  } catch (e) {
    console.error("[trial-ending-soon] Error:", e);
    selectError = String(e);
  }

  return new Response(
    JSON.stringify({
      ok: !selectError,
      ...(selectError && { error: selectError }),
      trial_one_week_remaining: { processed: oneWeek.length, results: oneWeek },
      trial_ending_soon: { processed: oneDay.length, results: oneDay },
    }),
    { status: selectError ? 500 : 200, headers: { "Content-Type": "application/json" } },
  );
});
