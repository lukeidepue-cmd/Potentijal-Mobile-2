# RevenueCat Webhook (revenuecat-webhook)

This Edge Function receives webhooks from RevenueCat and updates the Supabase `profiles` table so pro features unlock after purchase (steps 27–35 of the RevenueCat implementation plan).

## What the function does

- **POST only** with JSON body (RevenueCat event).
- **Auth:** If `REVENUECAT_WEBHOOK_SECRET` is set, the request must include an `Authorization` header that equals that secret or `Bearer <secret>`.
- **Events:**  
  - `INITIAL_PURCHASE`, `RENEWAL`, `UNCANCELLATION`, `NON_RENEWING_PURCHASE`, `SUBSCRIPTION_EXTENDED`, `PRODUCT_CHANGE`, `REFUND_REVERSED`, `SUBSCRIPTION_PAUSED` → set `profiles.is_premium = true`, `profiles.plan = 'premium'` for `id = app_user_id`.  
  - `CANCELLATION`, `EXPIRATION` → set `is_premium = false`, `plan = 'free'`.  
  - `BILLING_ISSUE` → no profile change (only logged).  
  - Other types → no profile change, return 200.
- Always returns **200** for valid POSTs so RevenueCat marks the webhook as delivered.

## What you need to do

### 1. Set the webhook secret (step 28)

Generate a strong random string (e.g. from a password manager or `openssl rand -hex 32`). Then set it in Supabase:

```bash
supabase secrets set REVENUECAT_WEBHOOK_SECRET="your-secret-here"
```

Use the **same** value in the RevenueCat webhook configuration as the Authorization header (see step 3).

### 2. Deploy the function (step 34)

From the project root (where `supabase/` lives):

```bash
supabase functions deploy revenuecat-webhook
```

Copy the printed URL, e.g.:

`https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook`

### 3. Configure the webhook in RevenueCat (step 35)

1. Log in to [RevenueCat](https://app.revenuecat.com) and open your project.
2. Go to **Project → Integrations → Webhooks** (or **Apps → [your app] → Webhooks**).
3. Add a new webhook:
   - **URL:** the deployed function URL from step 2.
   - **Authorization header (optional but recommended):** set to the same value you used for `REVENUECAT_WEBHOOK_SECRET` (e.g. `Bearer your-secret-here` or just `your-secret-here`).
   - **Events / environment:** Enable **Sandbox** (and Production) so TestFlight and sandbox purchases trigger the webhook. If you only enable Production, sandbox purchases will not update profiles.
4. Save and enable the webhook.

After this, when a user completes a purchase (or subscription renews/cancels/expires), RevenueCat will POST to this function and the app’s `profiles` table will stay in sync so `useFeatures().isPremium` reflects their status.

### 4. Verify it’s working

- **Supabase:** Dashboard → Edge Functions → `revenuecat-webhook` → Logs. After a test purchase you should see a line like `Received event: { type: "INITIAL_PURCHASE", app_user_id: "<uuid>", environment: "SANDBOX" }` and either `Set premium for app_user_id: ...` or a warning (e.g. no profile row, or anonymous id).
- **RevenueCat:** Integrations → Webhooks → your webhook. Check delivery history: requests should return 200. If 401, the Authorization header doesn’t match your secret.
- **App:** Ensure the app calls `Purchases.logIn(user.id)` when the user is signed in (so RevenueCat’s `app_user_id` is your Supabase user UUID). Otherwise the webhook may receive an anonymous id and cannot update the correct profile.
