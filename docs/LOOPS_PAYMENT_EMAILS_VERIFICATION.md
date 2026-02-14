# Verify the 4 Loops Payment-Related Emails

This doc explains how to confirm that each of the four payment-related Loops emails is triggered correctly. No code changes—just checks and optional manual tests.

---

## The 4 payment-related Loops events

| # | Loops event name | Triggered by | Purpose |
|---|------------------|--------------|---------|
| 1 | **premium_purchased** | RevenueCat webhook when `event.type === "INITIAL_PURCHASE"` | Welcome to Premium (first purchase) |
| 2 | **subscription_renewed** | RevenueCat webhook on RENEWAL, PRODUCT_CHANGE, etc. | Subscription renewed / receipt |
| 3 | **trial_one_week_remaining** | `trial-ending-soon` Edge Function (daily cron) | Paid subscription renews in ~1 week |
| 4 | **trial_ending_soon** | `trial-ending-soon` Edge Function (daily cron) | Free trial ends in 1 day |

In Loops, you should have **Journeys** that trigger on these 4 events and send the corresponding emails.

---

## 1. Verify `premium_purchased` (Welcome to Premium)

**Trigger:** User makes their **first** premium purchase (or starts free trial). RevenueCat sends a webhook with `type: "INITIAL_PURCHASE"`. The webhook then sends the Loops event `premium_purchased` for that user’s email.

**How to verify:**

1. **After a real sandbox purchase (new user, first purchase):**
   - Supabase Dashboard → **Edge Functions** → **revenuecat-webhook** → **Logs**.
   - Look for: `Received event: { type: "INITIAL_PURCHASE", app_user_id: "<uuid>", ... }` and `Loops event sent: premium_purchased for <email>`.
   - In **Loops** → **Contacts** (or **Events**), confirm the contact received the `premium_purchased` event and that the Journey sent the email.

2. **Optional – manual webhook test (no real purchase):**
   - Get a **real** Supabase user UUID and that user’s email (e.g. a test account).
   - Get your `REVENUECAT_WEBHOOK_SECRET` (Supabase → Project Settings → Edge Functions → Secrets).
   - Send a POST to your webhook URL (e.g. `https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook`):
     - Headers: `Content-Type: application/json`, `Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>`
     - Body (minimal):  
       `{ "event": { "type": "INITIAL_PURCHASE", "app_user_id": "<real-supabase-user-uuid>", "product_id": "premium_yearly", "period_type": "TRIAL" } }`
   - Check webhook logs for `Loops event sent: premium_purchased for <email>`.
   - Check that the test user received the premium welcome email (and that their profile was updated to premium).

**Note:** If the same Apple ID already had a subscription, RevenueCat may send `PRODUCT_CHANGE` or `RENEWAL` instead of `INITIAL_PURCHASE`, so you’d get `subscription_renewed` in Loops, not `premium_purchased`. Use a **new** sandbox tester / new app account for a true first purchase.

---

## 2. Verify `subscription_renewed`

**Trigger:** RevenueCat sends a webhook with `type` one of: `RENEWAL`, `PRODUCT_CHANGE`, etc. (not `INITIAL_PURCHASE`). The webhook sends the Loops event `subscription_renewed`.

**How to verify:**

1. **After a renewal in sandbox** (sandbox compresses time, so “monthly” renews multiple times in a day):
   - Webhook logs: look for `Received event: { type: "RENEWAL", ... }` and `Loops event sent: subscription_renewed for <email>`.
   - Loops: confirm the contact has the `subscription_renewed` event and that the renewal/receipt Journey sent the email.

2. **Optional – manual webhook test:**  
   Same as above, but use body:  
   `{ "event": { "type": "RENEWAL", "app_user_id": "<real-supabase-user-uuid>", "product_id": "premium_monthly", "period_type": "NORMAL" } }`  
   Then check logs and Loops for `subscription_renewed`.

---

## 3. Verify `trial_one_week_remaining` (paid subscription renews in ~1 week)

**Trigger:** The **trial-ending-soon** Edge Function runs (daily via cron). It finds profiles where:
- `premium_period_type = 'normal'` (paid period, not trial),
- `premium_expires_at` is between 6 and 8 days from now,
- `trial_one_week_email_sent_at` is null.

It sends the Loops event `trial_one_week_remaining` and sets `trial_one_week_email_sent_at`.

**How to verify:**

1. **Cron is scheduled:**  
   In Supabase → **Database** → **Cron Jobs** (or run `SELECT * FROM cron.job WHERE jobname LIKE '%trial%';`), confirm the job `trial-ending-soon-daily` exists and runs at 09:00 UTC (or your chosen time).

2. **Invoke the function manually:**
   - Supabase Dashboard → **Edge Functions** → **trial-ending-soon** → **Invoke** (with empty body `{}`),  
     **or**  
     `curl -X POST "https://<project-ref>.supabase.co/functions/v1/trial-ending-soon" -H "Authorization: Bearer <anon_key>" -H "Content-Type: application/json" -d '{}'`
   - Response should be JSON like:  
     `{ "ok": true, "trial_one_week_remaining": { "processed": N, "results": [...] }, "trial_ending_soon": { ... } }`
   - If you have a test user whose `premium_expires_at` is 6–8 days from now and `premium_period_type = 'normal'`, that user should be in `trial_one_week_remaining.results` and should receive the Loops email (if the Journey is set up).

3. **Create a test profile (optional):**  
   Update one profile in the DB: set `premium_period_type = 'normal'`, `premium_expires_at` to 7 days from now, `trial_one_week_email_sent_at = null`. Invoke `trial-ending-soon` again and check the response and Loops.

---

## 4. Verify `trial_ending_soon` (free trial ends in 1 day)

**Trigger:** Same **trial-ending-soon** function finds profiles where:
- `premium_period_type = 'trial'`,
- `premium_expires_at` is within the next 1 day,
- `trial_ending_email_sent_at` is null.

It sends the Loops event `trial_ending_soon` and sets `trial_ending_email_sent_at`.

**How to verify:**

1. **Invoke the function** (same as in step 3). Check the `trial_ending_soon` part of the response.

2. **Test profile (optional):**  
   Set one profile: `premium_period_type = 'trial'`, `premium_expires_at` = tomorrow (within 24 hours), `trial_ending_email_sent_at = null`. Invoke the function; that user should be in `trial_ending_soon.results` and receive the “Free trial ending tomorrow” email if the Journey is set up.

---

## Checklist summary

| Email | Where to check | Quick test |
|-------|----------------|------------|
| **premium_purchased** | Webhook logs + Loops Events / Journeys | Sandbox first purchase with new account, or manual webhook POST with `INITIAL_PURCHASE` |
| **subscription_renewed** | Webhook logs + Loops | Sandbox renewal, or manual webhook POST with `RENEWAL` |
| **trial_one_week_remaining** | trial-ending-soon response + Loops | Invoke trial-ending-soon; optional: create profile with expiry 6–8 days out, `normal` period |
| **trial_ending_soon** | trial-ending-soon response + Loops | Invoke trial-ending-soon; optional: create profile with trial expiry within 1 day |

**Loops Dashboard:** For all four, go to **Loops** → **Events** (or **Contacts** → select contact → Events) to confirm the events were received. Ensure you have **4 Journeys** that trigger on these events and send the correct emails.

**Secrets:** The webhook needs `LOOPS_API_KEY` and `REVENUECAT_WEBHOOK_SECRET`. The trial-ending-soon function needs `LOOPS_API_KEY` and (for cron) Vault secrets for `project_url` and `anon_key` (and optionally `cron_secret`). If any are missing, the corresponding Loops event will not be sent (you’ll see warnings in logs).
