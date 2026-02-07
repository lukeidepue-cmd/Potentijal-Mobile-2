# Sync Subscription (sync-subscription)

Step 36 of the RevenueCat implementation plan. This Edge Function lets the app sync the current user’s subscription from RevenueCat to the Supabase `profiles` table (for Restore Purchases and similar flows).

## Behavior

- **Method:** POST (no body required).
- **Auth:** Requires a valid Supabase JWT (user session). The app calls it with the logged-in user’s session so the function knows who to sync.
- **Flow:** Reads the user id from the JWT, calls RevenueCat’s `GET /v1/subscribers/{app_user_id}` with the **secret** API key, then sets `profiles.is_premium` and `profiles.plan` from the `premium` entitlement.

## What you need to do

### 1. Add the RevenueCat secret API key to Supabase

In RevenueCat: **Project → API Keys** (or **Integrations → API Keys**). Create or copy a **Secret** API key (starts with `sk_`). Do not use the public key here.

Then set it in Supabase:

```bash
supabase secrets set REVENUECAT_SECRET_API_KEY="sk_your_secret_key_here"
```

### 2. Deploy the function

From the project root:

```bash
supabase functions deploy sync-subscription
```

This function uses the default JWT verification (no `verify_jwt = false`), so only authenticated requests with a valid Supabase session can call it.

## App usage

The Restore Purchases screen should:

1. Call `Purchases.restorePurchases()` (RevenueCat SDK).
2. Call this function: `supabase.functions.invoke('sync-subscription')` (session is sent automatically).
3. Call `refreshProfile()` so the UI updates.
4. Show success or error.
