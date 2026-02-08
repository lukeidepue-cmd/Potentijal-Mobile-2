# RevenueCat In-App Purchases — Implementation Plan

**Status:** Planning (no code written)  
**Purpose:** Detailed plan for implementing real payments with RevenueCat: subscription management, restore purchases, redeem/discount codes, 7-day free trial, and Loops email triggers.  
**Scope:** iOS first (development build); Apple IAP only (no Stripe).

---

## Table of Contents

1. [Executive Summary & Goals](#1-executive-summary--goals)
2. [Why RevenueCat (Not Stripe) for iOS](#2-why-revenuecat-not-stripe-for-ios)
3. [Current App State (What Exists Today)](#3-current-app-state-what-exists-today)
4. [Prerequisites & Accounts](#4-prerequisites--accounts)
5. [Before vs After App Store Connect](#5-before-vs-after-app-store-connect)
6. [RevenueCat Concepts (Quick Reference)](#6-revenuecat-concepts-quick-reference)
7. [Apple App Store Connect Setup](#7-apple-app-store-connect-setup)
8. [RevenueCat Dashboard Setup](#8-revenuecat-dashboard-setup)
9. [Discount Codes & Custom Code Names](#9-discount-codes--custom-code-names)
10. [7-Day Free Trial (Introductory Offer)](#10-7-day-free-trial-introductory-offer)
11. [SDK Integration (React Native + Expo Dev Build)](#11-sdk-integration-react-native--expo-dev-build)
12. [Syncing Premium Status to Supabase](#12-syncing-premium-status-to-supabase)
13. [Settings Screens: Manage, Restore, Redeem](#13-settings-screens-manage-restore-redeem)
14. [Loops Email Integration](#14-loops-email-integration)
15. [Implementation Phases (Order of Work)](#15-implementation-phases-order-of-work)
16. [Security & Edge Cases](#16-security--edge-cases)
17. [Testing Checklist](#17-testing-checklist)
18. [Docs & Resources to Request](#18-docs--resources-to-request)
19. [Step-by-Step Implementation Guide](#step-by-step-implementation-guide)

---

## 1. Executive Summary & Goals

**Goals:**

- Implement **RevenueCat** for iOS in-app purchases (no Stripe for IAP).
- Make **payment settings** functional: **Manage Subscription**, **Restore Purchases**, **Redeem Code**.
- Support **discount/promo codes** with **custom code names** you can create and control.
- Offer a **7-day free trial** for Premium: user **enters payment method first**, then gets 7 days free; after 7 days, app starts charging (standard Apple introductory offer).
- **Loops**: send emails for (1) **purchase premium**, (2) **free trial about to end**, (3) **monthly/yearly billing** (renewal or receipt).

**Out of scope for this plan:** Android, Stripe, web payments. Plan assumes iOS + RevenueCat only unless you add platforms later.

---

## 2. Why RevenueCat (Not Stripe) for iOS

- **Apple’s rules:** In-app digital goods/subscriptions on iOS must use **Apple In-App Purchase (IAP)**. You cannot use Stripe (or any other payment processor) for unlocking premium features inside the app; that would violate App Store guidelines.
- **RevenueCat** sits on top of Apple IAP: it handles receipts, entitlements, restore, promo codes, and (optionally) webhooks. You still create products and subscriptions in **App Store Connect**; RevenueCat tracks ownership and exposes a simple API (e.g. “does this user have `premium`?”).
- **Stripe** is typically used for: web subscriptions, one-time purchases outside the app, or physical goods. For “Premium” inside the iOS app, the flow is: **App Store IAP → RevenueCat → your backend (e.g. Supabase)** for a single source of truth.

So: **payments for in-app Premium = Apple IAP + RevenueCat**. No Stripe for this flow.

---

## 3. Current App State (What Exists Today)

**Premium gating:**

- **`hooks/useFeatures.ts`** — Reads `profile.plan` and `profile.is_premium` from Supabase. `isPremium` is true if `plan === 'premium'` or `is_premium === true` or user is creator.
- **Profile** (`lib/api/profile.ts`, `Profile` type) — Fields: `is_premium`, `plan: 'free' | 'premium' | 'creator'`.
- Premium features (e.g. Skill Map, Consistency Score, Training Statistics, AI Trainer, games/practices on home screens) already check `isPremium` from `useFeatures()`.

**Settings — Premium (placeholders):**

- **Manage Subscription** — `app/(tabs)/settings/premium/manage-subscription.tsx` — Placeholder “Coming soon”.
- **Restore Purchases** — `app/(tabs)/settings/premium/restore-purchases.tsx` — Placeholder “Coming soon”.
- **Redeem Code** — `app/(tabs)/settings/premium/redeem-code.tsx` — Calls `redeemCode()` from `lib/api/settings.ts`; works for **promoter codes** in DB (`promoter_codes` table): types `creator_signup` and `premium_discount`. No RevenueCat yet.

**Purchase entry points:**

- **`app/(tabs)/purchase-premium/index.tsx`** — Premium purchase screen (likely placeholder or simple CTA).
- **`components/UpgradeModal.tsx`** — Navigates to `/(tabs)/purchase-premium`.
- Settings index links “Manage Subscription” to manage-subscription, “Restore” to restore-purchases, “Redeem Code” to redeem-code.

**Loops:**

- **`lib/api/loops.ts`** — All calls go through a **Supabase Edge Function** (Loops API key server-side). Actions: `createOrUpdateContact`, `sendTransactional`, `trackEvent`, `deleteContact`.
- No purchase/trial/billing events or transactional emails defined yet; plan will add event names and trigger points.

**Implications for the plan:**

- Premium **source of truth** can remain **Supabase `profiles`** (`is_premium`, `plan`), but those fields must be **driven by RevenueCat** (via webhook or server-side sync).
- Manage / Restore / Redeem screens need to call RevenueCat SDK (and optionally your backend) instead of showing placeholders.
- Redeem Code can: (A) use RevenueCat’s promo codes for Apple’s system, and/or (B) keep your existing `promoter_codes` for **custom code names** that map to RevenueCat offers or entitlements.
- Loops events and transactionals will be triggered from your backend (e.g. Edge Function) when RevenueCat or your sync layer indicates: purchase, trial ending soon, renewal.

---

## 4. Prerequisites & Accounts

**You do *not* need to create subscription products in App Store Connect before adding RevenueCat or building the paywall.** You only need App Store Connect product setup when you want real purchases and sandbox/TestFlight testing to work. See [Section 5](#5-before-vs-after-app-store-connect) for what to do before vs after.

Baseline:

1. **Apple Developer Program** — Already have (used for dev build).
2. **App Store Connect (app only)** — Your app record and bundle ID exist (e.g. from EAS). You do *not* need In-App Purchase products created yet to start RevenueCat or the paywall.
3. **RevenueCat account** — Sign up at revenuecat.com. You can create a project and add the iOS app by **bundle ID only**; the Shared Secret (and full IAP setup) comes later when you create products in App Store Connect.
4. **Development build** — You already moved off Expo Go; RevenueCat’s native SDK will work in this dev build. No Expo Go for IAP testing.

Optional but recommended:

- **Sandbox testers** in App Store Connect (needed only when you test real purchases).
- **Supabase Edge Functions** (or another backend) for: RevenueCat webhooks, updating `profiles`, and calling Loops (you already use Edge Function for Loops).

---

## 5. Before vs After App Store Connect

This section clarifies **what you can build and test without creating subscription products in App Store Connect**, and **what requires App Store Connect product setup**.

### 5.1 What you need App Store Connect for (and when)

You need **App Store Connect** (with In-App Purchase products) for:

- **Creating subscription products** — Subscription group, monthly/yearly products, 7-day introductory offer.
- **Linking those products to RevenueCat** — RevenueCat uses the same product IDs you create in App Store Connect; you then add them in the RevenueCat dashboard.
- **Getting the Shared Secret** — Required for RevenueCat to validate Apple receipts; you get this from App Store Connect.
- **Real purchases** — Any `purchasePackage()` call goes to Apple; if the product doesn’t exist in App Store Connect, the purchase will fail.
- **Testing with Apple Sandbox or TestFlight** — Sandbox testers and TestFlight builds require the app and products to exist in App Store Connect.

So: **before** you create subscription products in App Store Connect, **purchases will not complete**, but a lot of the app and RevenueCat setup can still be done.

### 5.2 What to do BEFORE App Store Connect (no subscription products yet)

You can do all of the following **without** creating any In-App Purchase subscription products in App Store Connect:

| Area | What you can do |
|------|------------------|
| **RevenueCat** | Create account, create project, add iOS app (bundle ID only; Shared Secret can be added later). Define **Products** in RevenueCat using the **exact product IDs you plan to create** in App Store Connect (e.g. `premium_monthly`, `premium_yearly`). Create Entitlement (e.g. `premium`), create Offering with packages. Get your **public API key** for the SDK. |
| **Paywall UI** | Build the full paywall screen: layout, copy, “Monthly” / “Yearly” options, “Start 7-day free trial” / “Subscribe” buttons, loading and error states. You can either (a) **hardcode/mock** prices and copy for now, or (b) **wire up `getOfferings()`** — RevenueCat will return your offering and packages; **prices may be empty or placeholder** until products exist in App Store Connect and are linked, but the structure (packages, identifiers) can still be displayed. |
| **RevenueCat SDK** | Install `react-native-purchases`, run a new EAS dev build. Call `Purchases.configure({ apiKey, appUserID: supabaseUserId })` on login. Call `Purchases.getOfferings()` and render packages on the paywall. Wire the “Subscribe” button to `Purchases.purchasePackage(pkg)` — the call will run but **Apple will fail the purchase** until products exist. You can handle the error gracefully (“Product not available yet” or “Coming soon”). |
| **Manage Subscription** | Implement “Open Subscription Settings” that opens Apple’s subscription management URL. It works regardless of products; user may see an empty list until they have a subscription. |
| **Restore Purchases** | Implement the “Restore” button that calls `Purchases.restorePurchases()`. Until the user has ever purchased, restore will simply return “no purchases to restore” — the flow is valid to build and test. |
| **Redeem Code** | Implement the Redeem Code screen: input + “Redeem”. Call RevenueCat’s redeem API; for codes created in RevenueCat they may require a valid product/offer in App Store Connect to fully apply, but the UI and error handling can be built. Your existing `promoter_codes` (creator / premium_discount) can stay as-is. |
| **Webhook handler** | Implement the Supabase Edge Function (or backend) that receives RevenueCat webhooks, verifies the signature, and updates `profiles.is_premium` / `profiles.plan`. You can deploy it and set the URL in RevenueCat; events will only fire once real purchases exist, but the handler is ready. |
| **Loops** | Define event names and (optionally) Journeys/transactionals in Loops. Your webhook handler can be written to call Loops on `INITIAL_PURCHASE`, `trial_ending_soon`, `RENEWAL`; no real events until real purchases. |

**Summary:** You can **add RevenueCat, build the paywall, integrate the SDK (configure, getOfferings, purchasePackage, restorePurchases, redeemCode), and implement Manage Subscription, Restore, Redeem, webhook handler, and Loops wiring** — all **before** creating subscription products in App Store Connect. The only thing that *won’t* work is **completing an actual purchase** (and therefore seeing real entitlement updates and webhook events from a real payment).

### 5.3 What to do AFTER App Store Connect (subscription products created)

Once you create subscription products in App Store Connect and link them in RevenueCat:

| Step | What to do |
|------|------------|
| **App Store Connect** | Create subscription group; create monthly and yearly subscription products with the **same product IDs** you already used in RevenueCat; add 7-day free trial as introductory offer; generate and copy the **Shared Secret**. |
| **RevenueCat** | Add the Shared Secret (and optionally App Store Connect API key) in RevenueCat for your iOS app. RevenueCat will then validate receipts and entitlements against Apple. |
| **Testing** | Create a sandbox tester in App Store Connect; on device, sign in with that Apple ID (Settings → App Store → Sandbox Account). Run your dev build; `getOfferings()` should now return real prices from Apple; `purchasePackage()` will complete in sandbox; webhooks will fire; profile and Loops can be tested. |
| **TestFlight** | When you upload a build to App Store Connect, you can test with TestFlight and sandbox as well. |

So: **before App Store Connect product setup** = build paywall, RevenueCat code, settings (manage/restore/redeem), webhook + Loops. **After App Store Connect product setup** = real products, real purchases, sandbox/TestFlight testing, and full end-to-end flow.

---

## 6. RevenueCat Concepts (Quick Reference)

- **Product** — Maps to an App Store Connect In-App Purchase product ID (e.g. `premium_monthly`, `premium_yearly`).
- **Entitlement** — A “feature” you grant (e.g. `premium`). A customer has an entitlement if they have an active subscription (or non-consumable) that you’ve attached to that entitlement in RevenueCat.
- **Offering** — A set of packages you show in the app (e.g. “Default” offering with monthly and yearly packages). You can have multiple offerings for A/B tests or different paywalls.
- **Package** — One purchasable option inside an offering (e.g. `$monthly`, `$annual`).
- **Customer Info** — RevenueCat’s object for “this user’s entitlements and active subscriptions.” After `purchasePackage()` or `restorePurchases()`, you get updated CustomerInfo; check `customerInfo.entitlements.active['premium']` (or your entitlement ID).
- **App User ID** — You pass your own user id (e.g. Supabase `user.id`) when configuring the SDK so RevenueCat ties purchases to that user. Essential for webhooks and for restore on a new device.
- **Promo codes** — In RevenueCat: create codes in dashboard that map to Apple’s promotional subscription offers. User redeems in app; RevenueCat applies the offer. You can also keep your own “code names” in your DB and map them to RevenueCat promo codes or to a specific product/offer.

---

## 7. Apple App Store Connect Setup

**In-App Purchases (IAP):**

1. **Subscription group** — Create one (e.g. “Premium”). All premium subscriptions belong to this group (so user can only have one active premium sub).
2. **Subscriptions** — Create at least:
   - **Premium Monthly** — Product ID e.g. `premium_monthly`, duration 1 month.
   - **Premium Yearly** — Product ID e.g. `premium_yearly`, duration 1 year (optional but common).
3. **Introductory offer (7-day free trial):**
   - For each subscription, add an **Introductory Offer**: type “Free”, duration 7 days.
   - Apple will require the user to **add a payment method** before the trial starts; after 7 days, Apple automatically charges. No extra logic needed in app for “charge after 7 days” — Apple handles it.
4. **Subscription prices** — Set in App Store Connect (e.g. USD, local currencies).
5. **Shared Secret** (or In-App Purchase Key) — Create in App Store Connect; give this to RevenueCat so it can validate receipts.

**Optional for later:**

- **Promotional offers** — If you want “50% off first month” etc., you create these in App Store Connect and can map RevenueCat promo codes to them.
- **Offer codes** — Apple’s own offer codes (different from RevenueCat promo codes); can be used for “redeem code” if you want to support both.

**Important:** Product IDs and entitlement names you choose here must match what you configure in RevenueCat (products, entitlements, offerings).

---

## 8. RevenueCat Dashboard Setup

1. **Project** — Create project, name (e.g. your app name).
2. **App** — Add iOS app: bundle ID, App Store Connect shared secret (or IAP key).
3. **Products** — Create products that reference your App Store product IDs:
   - e.g. `premium_monthly` → App Store product ID `premium_monthly`
   - e.g. `premium_yearly` → App Store product ID `premium_yearly`
4. **Entitlements** — Create one entitlement, e.g. `premium`. Attach both products to this entitlement (so either monthly or yearly grants `premium`).
5. **Offerings** — Create at least one offering (e.g. “Default”):
   - Package monthly: product `premium_monthly`, identifier e.g. `$monthly`
   - Package yearly: product `premium_yearly`, identifier e.g. `$annual`
6. **API keys** — Get **Public API key** (iOS) for the app. This goes in the app (env or config); it’s safe for client. No secret key in the app.
7. **Webhooks** (recommended) — Configure webhook URL (your Supabase Edge Function or backend). Events: `INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `BILLING_ISSUE`, `PRODUCT_CHANGE`, `TRANSFER`, etc. You’ll use these to:
   - Update Supabase `profiles.is_premium` / `plan`
   - Trigger Loops events (purchase, trial_ending, billing)

If you want RevenueCat to send “trial will end” events, check their docs for **trial period**-related webhook payloads or use their “expiration” events and compute “trial ending soon” in your backend (e.g. if `expiration_date` is in 1–2 days and they’re still in trial).

---

## 9. Discount Codes & Custom Code Names

**Two layers:**

**A) RevenueCat promo codes (Apple-backed)**  
- Created in RevenueCat dashboard; map to Apple promotional subscription offers.  
- User enters code in your “Redeem Code” screen; you call RevenueCat SDK to redeem; RevenueCat applies the offer and returns updated CustomerInfo.  
- Code format/names are whatever you create in RevenueCat (e.g. “LAUNCH50”, “TRIAL7”).  

**B) Your custom code names (database)**  
- You already have `promoter_codes` and `redeemCode()` in `lib/api/settings.ts` (types: `creator_signup`, `premium_discount`).  
- You want to **define the code names yourself** (e.g. “FRIEND2024”, “VIP50”).  

**Ways to combine:**

1. **Only RevenueCat codes**  
   - Redeem Code screen calls RevenueCat SDK only. Code names = whatever you create in RevenueCat. No custom DB table for “code names.”  

2. **Only your DB codes**  
   - Keep `promoter_codes`; for `premium_discount` you’d need to map to an actual Apple/RevenueCat offer (e.g. open a specific RevenueCat offering or product with a specific promo). RevenueCat’s “offerings” API doesn’t always support “apply this custom code name”; typically the code is the one RevenueCat generates. So this path is more custom: e.g. your backend validates your code, then tells the app which RevenueCat package to purchase, or you create one RevenueCat promo code per your code and store that mapping server-side.  

3. **Hybrid (recommended)**  
   - **Redeem Code screen:**  
     - First try **RevenueCat** redeem (so you can use RevenueCat’s own promo code names).  
     - If that fails, call your **existing API** `redeemCode(code)` for `promoter_codes`:  
       - `creator_signup` → same as today (set plan/creator in DB).  
       - `premium_discount` → either: (i) return a “discount” message and deep-link user to purchase with a specific RevenueCat offering that has a discount, or (ii) backend creates/returns a one-time RevenueCat-compatible code and app redeems that, or (iii) backend marks user as “has discount” and app shows a custom paywall with discounted price (if you implement a custom price in app — more work).  
   - **Custom code names:** You create and manage them in your DB (`promoter_codes`). For premium discounts, you decide in backend how each code maps to RevenueCat (e.g. store `revenuecat_promo_code` or `product_id` per row).  

**Implementation plan detail:**

- **Phase 1:** Implement “Redeem Code” with **RevenueCat only** (RevenueCat promo codes; code names created in RevenueCat dashboard).  
- **Phase 2:** Add **fallback to your `redeemCode()` API** for `creator_signup` and `premium_discount`. For `premium_discount`, define in plan: either (a) map each DB code to a RevenueCat promo code ID and have backend return that so app can call RevenueCat, or (b) show “Code applied, go to Premium” and open default offering (simplest).  
- **Custom code names:** You create them in `promoter_codes` (or in RevenueCat). The “create what these code names are” is: (1) in RevenueCat dashboard for RC codes, and/or (2) your own admin or DB seeds for `promoter_codes` with a column for RevenueCat code or product/offer if needed.

---

## 10. 7-Day Free Trial (Introductory Offer)

- **Where it’s configured:** Apple App Store Connect, per subscription (e.g. `premium_monthly`, `premium_yearly`). Add “Introductory Offer” → Free trial, 7 days.  
- **User flow:** User taps “Start 7-day free trial” (or “Subscribe”) → Apple sheet → user signs in / adds payment method → Apple starts 7-day free trial; no charge until trial ends → after 7 days Apple charges and renews according to subscription.  
- **In app:** You don’t “charge after 7 days” yourself; you just offer the product that has the introductory offer. RevenueCat’s `getOfferings()` / `purchasePackage()` use the same product; Apple shows the trial terms.  
- **RevenueCat:** CustomerInfo will show entitlement active during trial and after; you can check `periodType === 'TRIAL'` or similar if you need to show “You’re in trial” in UI.  
- **Loops “trial about to end”:** Trigger from backend when you get a RevenueCat event (e.g. `EXPIRATION` or renewal) or when you compute from `expiration_date` that the current period is a trial and it ends in 1–2 days. Then call Loops (event or transactional) “trial_ending_soon”.

---

## 11. SDK Integration (React Native + Expo Dev Build)

- **Package:** `react-native-purchases` (RevenueCat’s SDK). Use a version compatible with your React Native / Expo (check Expo compatibility; may require dev build / config plugin if there is one).  
- **Install:** `npx expo install react-native-purchases` (or npm/yarn); if there’s an Expo config plugin, add it to `app.json`/`app.config.*` so native project gets the right setup.  
- **Rebuild:** Because this is a native module, you **must create a new development build** after adding the SDK (`eas build --profile development --platform ios`).  
- **Initialize:** On app load (after user is logged in), call `Purchases.configure({ apiKey: REVENUECAT_IOS_API_KEY, appUserID: supabaseUserId })`. Use Supabase `user.id` as `appUserID` so RevenueCat matches your backend and webhooks.  
- **Where to configure:** E.g. in root `_layout.tsx` or in a provider that has auth (so you have `user.id`). Handle logout: call `Purchases.logOut()` (or equivalent) so next login gets a clean identity.  
- **Entitlement check:** After `purchasePackage()`, `restorePurchases()`, or on app start, get `CustomerInfo` and set local state or sync to Supabase (see next section).  
- **Offerings:** Call `getOfferings()` to get packages and prices; show them on the purchase-premium screen. When user selects monthly/yearly, call `purchasePackage(package)`.  
- **Environment:** Store RevenueCat public API key in env (e.g. `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`) and use it in the config. No secret keys in the client.

---

## 12. Syncing Premium Status to Supabase

**Goal:** Keep `profiles.is_premium` and `profiles.plan` in sync with RevenueCat so `useFeatures()` and the rest of the app keep working without changing every screen.

**Options:**

**A) RevenueCat webhooks (recommended)**  
- RevenueCat sends webhooks to your backend (Supabase Edge Function or other) on events: `INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `EXPIRATION`, `BILLING_ISSUE`, etc.  
- Webhook payload includes `app_user_id` (your Supabase user id) and entitlement info.  
- Backend: validate webhook (RevenueCat docs: signing secret), then update Supabase `profiles` for that `app_user_id`: set `is_premium = true`, `plan = 'premium'` on grant; set `is_premium = false`, `plan = 'free'` on cancellation/expiration (per your business rules).  
- Optionally trigger Loops from the same Edge Function (purchase, trial_ending, renewal).  

**B) Client-only (not recommended as single source of truth)**  
- After `purchasePackage()` or `restorePurchases()`, app gets CustomerInfo and calls your API to update `profiles`. Works but: if user installs on another device and restores, or if webhook fires first, you need to avoid races; also users can tamper with client. So at least use webhooks for “source of truth” and client update only as optimistic UI.  

**Recommended:**  
- **Primary:** Webhook handler in Supabase Edge Function (or backend) updates `profiles` and triggers Loops.  
- **Client:** After purchase/restore, refresh profile (e.g. refetch `getMyProfile()` or invalidate cache) so UI updates immediately; optional: also call a small “sync subscription” API that reads RevenueCat server-side and updates profile (for edge cases).

**Implementation plan detail:**

- Add a Supabase Edge Function (e.g. `revenuecat-webhook`) that:  
  - Verifies RevenueCat webhook signature.  
  - Parses event type and `app_user_id`.  
  - Updates `profiles` (is_premium, plan) and optionally stores last subscription event in a `subscription_events` table for debugging.  
  - For selected events (see Loops section), call your existing Loops Edge Function or internal API to send Loops event / transactional.

---

## 13. Settings Screens: Manage, Restore, Redeem

**Manage Subscription**

- **Goal:** Send user to Apple’s subscription management (so they can cancel, change plan, update payment).  
- **Implementation:** Use `Linking.openURL()` with Apple’s “Manage Subscriptions” URL:  
  - iOS: `https://apps.apple.com/account/subscriptions` (opens Settings → Subscriptions) or use the in-app subscription management URL if you have one.  
  - RevenueCat docs sometimes suggest a specific URL; double-check for current iOS behavior.  
- **Screen:** Replace placeholder with one button: “Open Subscription Settings” (or similar) that opens this URL. No need to call RevenueCat for this.

**Restore Purchases**

- **Goal:** Restore previous Apple IAP so the user gets premium again on this device / after reinstall.  
- **Implementation:** Call `Purchases.restorePurchases()`. On success, get latest `CustomerInfo`; then either (a) refetch profile from your API (if webhook already updated Supabase) or (b) call your “sync subscription” API with `app_user_id` so backend updates profile from RevenueCat.  
- **Screen:** Replace placeholder with “Restore” button; show loading; on success show “Restored” and navigate back or refresh; on failure show error (e.g. “No purchases to restore”).

**Redeem Code**

- **Goal:** Redeem RevenueCat promo codes and/or your custom DB codes.  
- **Implementation:**  
  - Text input + “Redeem” button.  
  - First: call RevenueCat SDK to redeem (e.g. `Purchases.redeemCode(code)` or method name per SDK). If success, refresh CustomerInfo and profile.  
  - If RevenueCat returns “invalid”/not found: call existing `redeemCode(code)` API for `promoter_codes`. Handle `creator_signup` (update profile) and `premium_discount` (per your chosen mapping: e.g. show message and open purchase screen, or map to RevenueCat offer as in section 9).  
- **Custom code names:** You define them in RevenueCat dashboard and/or in `promoter_codes`; no extra “admin screen” in app required unless you want one later.

---

## 14. Loops Email Integration

**Requirement:** Send emails (1) when user purchases premium, (2) when free trial is about to end, (3) on monthly/yearly billing (renewal).

**Where to trigger:** From your **backend** (Supabase Edge Function or server), not from the app alone, so that:  
- You have one place that reacts to RevenueCat webhooks.  
- You use your existing Loops Edge Function (API key server-side) to send events or transactionals.

**Option A — Event-based (Loops events + Journeys)**  
- Backend receives RevenueCat webhook → updates Supabase → calls Loops `trackEvent` with events such as:  
  - `premium_purchased` (or `subscription_started`) — include product_id, period_type (trial vs normal), etc.  
  - `trial_ending_soon` — when you determine trial ends in 1–2 days (from webhook payload or from stored expiration).  
  - `subscription_renewed` (or `billing_occurred`) — on RENEWAL webhook; include interval (monthly/yearly) in properties.  
- In Loops, create **Journeys** that trigger on these events and send the corresponding emails (welcome/premium, trial ending, renewal receipt).

**Option B — Transactional emails**  
- Same trigger (webhook handler), but instead of (or in addition to) events, call Loops transactional email API with a predefined transactional ID for “Premium welcome”, “Trial ending”, “Renewal receipt”. Pass variables (user name, end date, etc.) from your backend.

**Implementation plan detail:**

- Extend your **Loops Edge Function** (or the new RevenueCat webhook function) to accept “send this event” or “send this transactional” with parameters.  
- In the RevenueCat webhook handler, for each event type:  
  - **INITIAL_PURCHASE** (and period_type trial or normal): update profile; call Loops “premium_purchased” (and optionally “welcome premium” email).  
  - **Before trial end:** Either use a scheduled job that runs daily and finds users whose trial expires in 1–2 days (from your DB or RevenueCat API), or use RevenueCat’s “trial will expire” webhook if they have one; then call Loops “trial_ending_soon” and send “Trial ending” email.  
  - **RENEWAL:** Update profile (keep premium); call Loops “subscription_renewed” with interval; send “Renewal receipt” email if desired.  
- **Loops dashboard:** Create Journeys (or transactionals) for: Premium purchased, Trial ending soon, Monthly/Yearly billing (renewal). Use event names and properties you define so backend and Loops stay in sync.

---

## 15. Implementation Phases (Order of Work)

Phases are split into **before** and **after** creating subscription products in App Store Connect. You can complete all of Phase 1 (and optionally Phase 2–4) **before** touching App Store Connect product setup; only **Phase 2b** and real purchase testing require App Store Connect.

---

**Phase 1 — Before App Store Connect: RevenueCat + Paywall + SDK**  

Do this **without** creating subscription products in App Store Connect. Purchases will not complete until Phase 2b.

1. **RevenueCat dashboard:** Create project, add iOS app (bundle ID only; Shared Secret later). Define **Products** with the **exact product IDs you plan to use** in App Store Connect (e.g. `premium_monthly`, `premium_yearly`). Create entitlement `premium`, create Offering with packages (e.g. monthly, yearly). Copy **public API key** for the SDK.  
2. **SDK:** Install `react-native-purchases`, configure with API key and `appUserID` (Supabase user id) on login. Rebuild EAS dev build (native module).  
3. **Paywall:** Build purchase-premium screen: call `getOfferings()`, display packages (monthly/yearly). Show “Start 7-day free trial” / “Subscribe” buttons; wire to `purchasePackage()`. Handle loading and errors; when products don’t exist in App Store Connect yet, purchase will fail — show a friendly message (e.g. “Coming soon” or “Product not available yet”).  
4. **Webhook handler:** Implement Supabase Edge Function: receive RevenueCat webhooks, verify signature, update `profiles.is_premium` / `profiles.plan` on INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION. Deploy and add webhook URL in RevenueCat (events will only fire once real purchases exist).  
5. **(Optional)** “Sync subscription” API: backend uses RevenueCat Server API with user id to get current entitlement and update profile (for restore flow).

**Phase 2a — Before App Store Connect: Settings (Manage, Restore, Redeem)**  

Still no subscription products required.

6. **Manage Subscription:** Replace placeholder with button that opens Apple subscription management URL.  
7. **Restore Purchases:** Replace placeholder with “Restore” button; call `restorePurchases()`, then refresh profile or call sync API; show result (will be “no purchases” until user has purchased).  
8. **Redeem Code:** Input + Redeem; call RevenueCat redeem; on failure, call existing `redeemCode()` API for `promoter_codes`; handle creator and premium_discount.  
9. **(Optional)** Backend: map `promoter_codes.premium_discount` to RevenueCat promo codes so your custom code names work once products exist.

**Phase 2b — App Store Connect: Products + Real Purchases**  

Only from here do you need subscription products in App Store Connect.

10. **App Store Connect:** Create subscription group; create monthly and yearly subscription products with the **same product IDs** you used in RevenueCat; add 7-day free trial as introductory offer; generate **Shared Secret**.  
11. **RevenueCat:** Add Shared Secret (and optionally App Store Connect API key) for your iOS app.  
12. **Testing:** Create sandbox tester; on device, sign in with sandbox Apple ID. Run app; `getOfferings()` should show real prices; complete a purchase; verify webhook updates profile and (if implemented) Loops. Test restore, manage subscription, redeem (if you created a promo in RevenueCat/App Store Connect).

**Phase 3 — Loops**  

Can be implemented before or after Phase 2b; webhook events will only fire after real purchases.

13. In webhook handler: on INITIAL_PURCHASE → track “premium_purchased” (and send welcome email via Journey or transactional).  
14. Trial ending: implement logic (scheduled job or RevenueCat “trial will expire” if available) and track “trial_ending_soon”, send trial-ending email.  
15. On RENEWAL → track “subscription_renewed” (with interval), send renewal/billing email.  
16. Create and test Loops Journeys (or transactionals) for each.

**Phase 4 — Polish & Edge Cases**  

17. Handle billing issues (e.g. BILLING_ISSUE webhook: don’t revoke premium immediately; show “Update payment” and open manage subscription).  
18. Offline: disable or message for purchase/restore when offline.  
19. Ensure logout calls `Purchases.logOut()` and login reconfigures with new appUserID.

---

## 16. Security & Edge Cases

- **Receipt validation:** RevenueCat validates receipts with Apple; you don’t need to validate in your backend if you trust webhook signature. Always verify webhook signing secret.  
- **Never trust client alone:** Treat RevenueCat webhook (or a server-side RevenueCat API call) as source of truth for `is_premium`; client can show cached state but server should reject premium-only actions if profile says free.  
- **Restore on new device:** Same Apple ID + same app_user_id in RevenueCat; restorePurchases() will restore; webhook may fire again; profile stays in sync.  
- **Trial abuse:** Apple limits free trials per Apple ID per subscription (e.g. once per product). RevenueCat and Apple handle this; no extra logic needed in app.  
- **Cancel vs refund:** Cancellation = user won’t renew; entitlement stays until period end. Refund = Apple; RevenueCat may send a different event. Plan for “entitlement revoked” and set profile to free.  
- **Offline:** Disable or hide purchase/restore when offline; show “Connect to internet.”

---

## 17. Testing Checklist

- [ ] Sandbox: Create sandbox tester in App Store Connect; use that Apple ID on device.  
- [ ] Purchase monthly (with trial): Complete flow; see trial in Apple; after 7 days (or sandbox accelerated) see renewal.  
- [ ] Purchase yearly (with trial): Same.  
- [ ] Restore: Delete app, reinstall, Restore Purchases → premium restored, profile updated.  
- [ ] Manage Subscription: Opens Apple subscription management.  
- [ ] Redeem: Valid RevenueCat code → entitlement active; invalid → graceful error; your DB code (creator/discount) → behaves as designed.  
- [ ] Webhook: Trigger each event (purchase, renewal, cancel) and confirm profile and (when implemented) Loops events.  
- [ ] Logout/login: New user doesn’t see previous user’s premium; after login, configure RevenueCat with new app_user_id.  
- [ ] Loops: Receive “premium purchased”, “trial ending soon”, “renewal” emails in test.

---

## 18. Docs & Resources to Request

If you want to go deeper or unblock implementation, these are useful:

- **RevenueCat:**  
  - React Native SDK setup (install, config, Expo).  
  - Webhook event types and payload (for your Edge Function).  
  - Redeem promo code (client and/or server).  
  - Server API (if you want to “get current entitlement” server-side for sync).  
- **Apple:**  
  - In-App Purchase best practices, introductory offer setup.  
  - Subscription management URL for “Manage Subscription” (current).  
- **Loops:**  
  - Journey trigger on custom event.  
  - Transactional send API (if you use transactionals).

You can paste or attach any of these and we can refine the plan or implementation steps (still no code until you ask for it).

---

## Step-by-Step Implementation Guide

This section is **one end-to-end step-by-step guide** for implementing everything in this plan. Steps are ordered for a logical flow: App Store Connect and RevenueCat setup first, then app code (SDK, paywall, webhook, settings), then Loops, then testing and polish. You have App Store Connect; use it when the steps below reach it.

**Legend:** [ ] = To do. Order matters where dependencies are noted; some steps can be done in parallel (e.g. dashboard vs code).

---

### 1. App Store Connect — App and agreements

1. [ ] Log in to [App Store Connect](https://appstoreconnect.apple.com). Ensure your **Paid Applications Agreement** is signed (required for In-App Purchases). Go to Agreements, Tax, and Banking and complete any pending agreements.
2. [ ] Confirm your **app** exists in App Store Connect (e.g. created via EAS or manually). Note the **bundle ID** (must match your dev build and RevenueCat).

---

### 2. App Store Connect — Subscription products

3. [ ] In App Store Connect, go to your app → **Subscriptions** (or In-App Purchases). Create a **Subscription Group** (e.g. name “Premium”). All premium subscriptions will live in this group so a user can only have one active premium subscription.
4. [ ] Inside that group, create a **subscription**: Product ID = `premium_monthly` (or your chosen ID). Set duration = 1 month. Add at least one **price** (e.g. USD). Add **localization** (subscription name and description) as required.
5. [ ] Create a second **subscription** in the same group: Product ID = `premium_yearly`. Duration = 1 year. Add price and localization.
6. [ ] For **premium_monthly**: add an **Introductory Offer** → type **Free Trial**, duration **7 days**. User must add payment method before the trial starts; Apple charges after 7 days. Save.
7. [ ] For **premium_yearly**: add the same **Introductory Offer** (Free Trial, 7 days). Save.
8. [ ] In App Store Connect, go to **App Information** (or your app’s main page) → **App-Specific Shared Secret** (or In-App Purchase → App-Specific Shared Secret). **Generate** a shared secret and copy it. You will paste this into RevenueCat so it can validate Apple receipts.

---

### 3. RevenueCat — Project and app

9. [ ] Log in to [RevenueCat](https://app.revenuecat.com). Open your project (e.g. “Potential”).
10. [ ] Ensure your **iOS app** is added to the project (bundle ID matches App Store Connect). If you added it earlier without credentials, open the app settings and add the **App Store Connect API key** (Key ID, Issuer ID, .p8 file) if required, and the **App-Specific Shared Secret** you copied in step 8. Save.
11. [ ] In RevenueCat, go to **API Keys** (or Project → Apps → your app). Copy the **Public API key** for iOS. Store it in your app config (e.g. `config.json`, `.env`, or `app.json` extra). Do not put secret keys in the app.

---

### 4. RevenueCat — Products, entitlement, offering

12. [ ] In RevenueCat, open **Products**. Add a product: **Identifier** = `premium_monthly` (same as App Store Connect). Add a second product: **Identifier** = `premium_yearly`. Save both.
13. [ ] Open **Entitlements**. Create an entitlement with ID = `premium`. Attach both products (`premium_monthly`, `premium_yearly`) to this entitlement so either subscription grants `premium`.
14. [ ] Open **Offerings**. Create an offering (e.g. “Default”). Add **Packages**: one “Monthly” package linked to `premium_monthly` (identifier e.g. `$monthly`), one “Annual” package linked to `premium_yearly` (e.g. `$annual`). Set this offering as the **current** offering if your dashboard has that option. Save.

---

### 5. App — Install SDK and config

15. [ ] In your app repo, install the RevenueCat React Native SDK (e.g. `npx expo install react-native-purchases` or per [RevenueCat React Native docs](https://www.revenuecat.com/docs/getting-started/installation/reactnative)). Add any Expo config plugin to `app.json` / `app.config.js` if required.
16. [ ] Add the **Public API key** to your app (e.g. `config.json`, `.env` with `EXPO_PUBLIC_*`, or `app.json` extra). Only the public SDK key goes in the app; never commit secret API keys.
17. [ ] Run a **new EAS development build** (e.g. `eas build --profile development --platform ios`) so the native RevenueCat module is included. Install the new build on your device.
18. [ ] In code, create a single place that **configures** RevenueCat after the user is known: call `Purchases.configure({ apiKey: YOUR_PUBLIC_KEY, appUserID: supabaseUserId })`. Use **Supabase `user.id`** as `appUserID` so RevenueCat matches your backend and webhooks. Call this on app start if the user is already logged in, and after login.
19. [ ] On **logout**, call `Purchases.logOut()` so the next user does not see the previous user’s entitlements. After login, call `configure()` again with the new user’s id.

**Important — Production/TestFlight:** Use the **iOS Public API key** (Project Settings → API Keys in RevenueCat), **not** the **Test Store** key. Using the Test Store API key in a production or TestFlight build will cause the app to **crash on launch**. RevenueCat enforces this on purpose. For this app, RevenueCat is lazy-initialized only when the user opens the purchase screen so the app can open even if there are native init issues; ensure production builds use the correct key.

---

### 6. Paywall screen (purchase-premium)

20. [ ] Open (or create) the **purchase-premium** screen (e.g. `app/(tabs)/purchase-premium/index.tsx`). Build the layout: title, short copy, “Monthly” and “Yearly” options, and a primary CTA (e.g. “Start 7-day free trial” / “Subscribe”).
21. [ ] On screen load, call `Purchases.getOfferings()`. Show a **loading** state (spinner or skeleton). On failure (e.g. network), show an error and optionally a retry button.
22. [ ] On success, read `offerings.current` and its **packages** (e.g. monthly, annual). Store them in state and render **one row/card per package** with title and price (`product.priceString` or equivalent). If price is missing, show a placeholder (e.g. “—”).
23. [ ] Let the user **select** one package (tap to select; show selected state). Add a primary button that calls `Purchases.purchasePackage(selectedPackage)`. Disable the button or show loading while the purchase is in progress.
24. [ ] On **purchase success**: get the returned `CustomerInfo`; refresh the user’s profile from your backend (or rely on webhook). Show a success message (e.g. “You’re premium!”), then navigate back or close the paywall so `useFeatures()` reflects premium.
25. [ ] On **purchase error**: show a clear message (e.g. “Purchase cancelled”, “Something went wrong”, or “Premium is not available yet” for product-not-found). Re-enable the button.
26. [ ] Ensure the paywall is reachable from existing entry points (e.g. UpgradeModal, “Upgrade” buttons).

---

### 7. Webhook handler (Supabase Edge Function)

27. [ ] Create a new **Supabase Edge Function** that receives **RevenueCat webhooks** (POST, JSON body). Name it e.g. `revenuecat-webhook`.
28. [ ] In RevenueCat dashboard, go to **Project → Integrations → Webhooks** (or similar). Add a webhook and copy the **signing secret**. Store it in Supabase secrets (e.g. `supabase secrets set REVENUECAT_WEBHOOK_SECRET=...`). Do not hardcode it.
29. [ ] In the Edge Function, **verify the webhook signature** using the signing secret and the request body (see RevenueCat webhook docs for header and algorithm). If verification fails, return 401 or 400 and do not process.
30. [ ] Parse the webhook body: extract **event type** (e.g. `INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `EXPIRATION`, `BILLING_ISSUE`) and **app_user_id** (your Supabase user id).
31. [ ] For **INITIAL_PURCHASE** and **RENEWAL**: update Supabase `profiles` for that `app_user_id` (match by `id`): set `is_premium = true`, `plan = 'premium'`.
32. [ ] For **CANCELLATION** and **EXPIRATION** (or entitlement revoked): set `is_premium = false`, `plan = 'free'` for that user.
33. [ ] For **BILLING_ISSUE**: do not revoke premium immediately; log or flag. Return 200. For all handled events, return **200 OK** so RevenueCat marks the webhook as delivered. For unknown event types, return 200 and log.
34. [ ] **Deploy** the Edge Function (`supabase functions deploy revenuecat-webhook` or your function name). Copy the full URL (e.g. `https://xxx.supabase.co/functions/v1/revenuecat-webhook`).
35. [ ] In **RevenueCat**, paste the webhook URL and enable the webhook. Ensure the signing secret in RevenueCat matches the one in Supabase secrets.

---

### 8. Optional: Sync subscription API (for restore)

36. [ ] (Optional) Create a backend endpoint (e.g. Supabase Edge Function) that accepts the authenticated user (or user id). The endpoint calls the **RevenueCat Server API** (with a secret API key) to get the current **Customer Info** for that user. If the user has the `premium` entitlement active, update `profiles` to `is_premium = true`, `plan = 'premium'`; otherwise set to free. Use this so “Restore” in the app can trigger a server-side profile refresh.

---

### 9. Settings — Manage Subscription

37. [ ] Open **Manage Subscription** (e.g. `app/(tabs)/settings/premium/manage-subscription.tsx`). Remove the “Coming soon” placeholder.
38. [ ] Add a button (e.g. “Open Subscription Settings”). On press, open the **Apple subscription management URL** (e.g. `https://apps.apple.com/account/subscriptions`) via `Linking.openURL()`. If the URL cannot be opened, show a message or offer to copy the link. Optionally add short copy (e.g. “Cancel, change plan, or update payment in your Apple account.”).

---

### 10. Settings — Restore Purchases

39. [ ] Open **Restore Purchases** (e.g. `app/(tabs)/settings/premium/restore-purchases.tsx`). Remove the placeholder.
40. [ ] Add a “Restore purchases” button. On press, call `Purchases.restorePurchases()`. Show loading while the request runs.
41. [ ] On **success**: if you have a sync subscription API (step 36), call it with the current user id; otherwise refetch the user’s profile from Supabase. Show “Purchases restored” and navigate back or refresh so premium state updates.
42. [ ] On **failure**: show a clear message (e.g. “No purchases to restore” or “Restore failed. Try again.”). Do not leave the user in a loading state.

---

### 11. Settings — Redeem Code

43. [ ] Open **Redeem Code** (e.g. `app/(tabs)/settings/premium/redeem-code.tsx`). Ensure there is a **text input** and a **“Redeem”** button.
44. [ ] On “Redeem”, read the code (trim whitespace). If empty, show “Enter a code”.
45. [ ] Call RevenueCat’s **redeem** method (e.g. `Purchases.redeemCode(code)` per React Native SDK). On **success**: refresh CustomerInfo and the user’s profile; show “Code redeemed” and navigate back or refresh.
46. [ ] On **RevenueCat redeem failure**: call your existing **`redeemCode(code)`** API (`promoter_codes` table). If that succeeds (e.g. `creator_signup` or `premium_discount`), update UI and profile. If both fail, show “Invalid or expired code”.

---

### 12. Discount / promo codes (custom names)

47. [ ] **RevenueCat promo codes:** In RevenueCat dashboard, create promo codes that map to your subscription offers (see RevenueCat docs). These codes can be redeemed in the app via the Redeem Code screen (step 45).
48. [ ] **Custom code names:** To use your own code names (e.g. in `promoter_codes`), keep the fallback in step 46. For `premium_discount`, define how each DB code maps to RevenueCat (e.g. store a RevenueCat promo code or product id per row and have the backend return it, or show “Code applied — go to Premium” and open the paywall). Add or update rows in `promoter_codes` with the code names you want.

---

### 12b. Discount and creator offers — full setup and testing

This section covers **two** offers:

1. **25% off first month** — For discount codes (reusable; many users can use the same code). User redeems a code, then subscribes at 25% off for the first billing period only.
2. **100% off forever (creators only)** — For creator codes. User redeems a creator code and gets Pro access forever with no payment. No App Store subscription product is used; your backend grants premium.

---

#### Who sets the % off (discount codes)?

**You** set it when you create each code. The `promoter_codes` table has `discount_percent` (0–100). You choose the value per code. The app uses it to pick which subscription offer to apply. You must have a **matching subscription offer** in App Store Connect for each percentage (e.g. one offer for 25% off first month).

---

#### Part A: 25% off first month (discount codes)

**A1. App Store Connect — Create the promotional offer**

1. Go to [App Store Connect](https://appstoreconnect.apple.com) → **Apps** → your app → **Subscriptions** (left sidebar).
2. Open your **subscription group** (e.g. "Premium"), then select the **subscription product** you want to discount (e.g. monthly, and optionally yearly).
3. For each product (e.g. monthly):
   - Under **Subscription Prices**, click the **"+"** button.
   - Choose **Create Promotional Offer** (not Introductory Offer — that would apply to everyone; we only want it when the user has a code).
4. Fill in:
   - **Reference Name:** e.g. `25% off first month` (for your reference only).
   - **Promotional Offer Product Code:** e.g. `first_month_25_off`. This is the **identifier you will use in the app** and in RevenueCat. Use only letters, numbers, underscores; no spaces. Write it down.
5. Choose **Offer Type:**
   - For "25% off for 1 month" use **Pay as you go**: reduced price each period for a number of periods.
   - Set **Duration** to **1 month**.
   - Set the **price** to 25% less than your normal monthly price (e.g. if monthly is $9.99, set this to $7.49 or the equivalent in your tier).
6. Click **Save**. Submit the subscription/offer for review if required (promotional offers are part of the subscription product).
7. Repeat for the **yearly** product if you want 25% off the first period for yearly too (duration 1 period, price 25% off the yearly price for that one period).

**A2. RevenueCat — In-App Purchase Key and products**

1. **In-App Purchase Key (required for promotional offers):**
   - RevenueCat dashboard → **Project** → **Apps** → your iOS app → **App-specific shared secret / In-App Purchase**.
   - If not already done: In App Store Connect go to **Users and Access** → **Keys** (under Integrations) → create an **In-App Purchase** key, download the `.p8` file once, note Key ID and Issuer ID. In RevenueCat, upload the key (or enter Key ID, Issuer ID, path/contents). See RevenueCat docs: [In-App Purchase Key Configuration](https://www.revenuecat.com/docs/service-credentials/itunesconnect-app-specific-shared-secret/in-app-purchase-key-configuration).
2. **Products:** Ensure your subscription products (e.g. `premium_monthly`, `premium_yearly`) are added in RevenueCat and linked to the same product IDs as in App Store Connect. The SDK will return `StoreProduct.discounts` for each product; the promotional offer you created will appear there (identified by the **Promotional Offer Product Code** you set).
3. **Offerings:** Your default offering (e.g. "default") should include packages that use these products. No extra "discount" package is required — the app will take the same package’s `storeProduct`, get its `discounts`, find the one matching `first_month_25_off`, and call `getPromotionalOffer` then `purchaseDiscountedPackage`.

**A3. App and backend implementation**

1. **Backend — redeem:** When `redeemCode()` succeeds for `premium_discount`, keep recording the use in `profile_code_uses` (already done). Return in the success payload the `discount_percent` (e.g. 25) and/or a stable **offer identifier** (e.g. `first_month_25_off`) so the app knows which offer to apply.
2. **App — store "has discount":** After a successful discount-code redeem, persist that this user has a pending discount: e.g. add a column to `profiles` such as `pending_discount_offer_id` (e.g. `first_month_25_off`) or use a small table `profile_pending_discount` with `discount_percent` and optional `promoter_code_id`. Clear it after they complete a purchase (or after the first billing period, via webhook).
3. **Paywall — apply promotional offer:**
   - When the user opens the paywall, if they have a pending discount (e.g. `first_month_25_off`), load offerings as usual, then for the selected package (e.g. monthly): get `package.storeProduct.discounts`, find the discount whose identifier matches `first_month_25_off`, call RevenueCat’s `Purchases.getPromotionalOffer(product, product.discounts[i])` (or equivalent in your SDK version), then call `Purchases.purchaseDiscountedPackage(package, paymentDiscount)` instead of `purchasePackage(package)`.
   - If they have no discount, use the normal `purchasePackage(package)` flow.
4. **Clear discount after purchase:** On successful purchase (or in the RevenueCat webhook when you see INITIAL_PURCHASE with the discounted offer), clear `pending_discount_offer_id` / pending discount for that user so renewals are full price.

**A4. Reusability**

Codes are already reusable: many users can use the same code; `profile_code_uses` ensures each user can use a given code only once. No change needed.

---

#### Part B: 100% off forever (creators only)

This is **not** an App Store or RevenueCat subscription offer. Creators never pay; you grant them Pro in your backend.

**B1. No App Store Connect offer**

Do **not** create a subscription product or promotional offer for "free forever." Creator access is granted only via your database and API.

**B2. No RevenueCat product for creators**

RevenueCat continues to manage paid subscriptions only. Creator status is determined by your `profiles` table (`is_creator`, `plan`, `is_premium`).

**B3. Create creator codes in your database**

1. In your `promoter_codes` table, insert a row for each creator code you want to give out:
   - `code`: e.g. `CREATOR2024` (uppercase; your redeem-code API typically compares uppercase).
   - `type`: `creator_signup`.
   - `is_active`: `true`.
   - `description`: optional (e.g. "Creator program").
   - `discount_percent`, `duration_days`: can be null for creator codes.
2. You can create as many creator codes as you want (e.g. one per creator or one shared code). Each **user** can only redeem a given code once (`profile_code_uses`); the **code** can be used by many users.

**B4. Backend behavior (already implemented)**

When a user redeems a code that has `type = 'creator_signup'`, your `redeemCode()` logic should:
- Record the use in `profile_code_uses`.
- Update `profiles` for that user: set `is_creator = true`, `plan = 'creator'`, `is_premium = true`.
- Return success (e.g. "Creator account activated!"). No payment flow; the user is now Pro forever (unless you later revoke creator status).

**B5. App behavior**

After redeem, refresh the user’s profile. Your feature gating (`useFeatures`) already treats `plan === 'creator'` or `is_creator === true` as premium, so they immediately get Pro access. Do not send them to the paywall for a purchase.

---

#### Part C: Testing everything

**C1. Prerequisites**

1. **Sandbox tester:** App Store Connect → **Users and Access** → **Sandbox** → **Testers** → create a sandbox Apple ID (e.g. test@example.com). Use this only for testing IAP.
2. **Device:** On your iOS device, sign in to the **Sandbox account** (Settings → App Store → Sandbox Account, or when prompted during purchase). Do not use your real Apple ID for IAP tests.
3. **Build:** Use a development or TestFlight build that has RevenueCat and your redeem-code flow configured (same bundle ID and products as in App Store Connect / RevenueCat).

**C2. Test 25% off first month (discount code)**

1. **Create a discount code in your DB:** Insert into `promoter_codes`: e.g. `code = 'SAVE25'`, `type = 'premium_discount'`, `discount_percent = 25`, `is_active = true`. Ensure the app/backend will return the 25% offer identifier (e.g. `first_month_25_off`) when this code is redeemed, or that the app maps 25% to that offer.
2. **Redeem the code in the app:** Settings → Premium → Redeem Code → enter `SAVE25` → Redeem. Expect success (e.g. "Code applied! 25% discount available" or similar).
3. **Open the paywall:** Navigate to the subscription/paywall screen. The UI should reflect the 25% off (e.g. discounted price for the first period). If your paywall shows one "Subscribe" option, ensure the app is using `getPromotionalOffer` + `purchaseDiscountedPackage` when the user has a pending discount.
4. **Purchase with sandbox:** Select monthly (or yearly), tap Subscribe/Continue. Complete the purchase with the **sandbox** Apple ID. Confirm the **price shown by Apple** is the reduced price (25% off) for the first period.
5. **After purchase:** Confirm the app shows the user as premium (e.g. Pro features unlocked). In RevenueCat dashboard (with "Sandbox data" enabled), confirm the transaction. In your backend, confirm the user’s `pending_discount_offer_id` (or equivalent) is cleared so a future renewal would be full price.
6. **Reuse (same code, different user):** With another sandbox tester (or another account in your app), redeem `SAVE25` again. Confirm it works and that the second user can also purchase at 25% off. Confirm the same user cannot redeem `SAVE25` twice (you should get "Code already used" or similar).

**C3. Test 100% off forever (creator code)**

1. **Create a creator code in your DB:** Insert into `promoter_codes`: e.g. `code = 'CREATOR'`, `type = 'creator_signup'`, `is_active = true`.
2. **Redeem in the app:** Use an account that is **not** premium and **not** creator. Settings → Premium → Redeem Code → enter `CREATOR` → Redeem. Expect success (e.g. "Creator account activated!").
3. **Verify no payment:** The user must **not** be sent to the paywall to complete a purchase. They should already have Pro access.
4. **Verify profile and features:** Refresh profile; confirm `is_creator === true`, `plan === 'creator'`, `is_premium === true`. In the app, confirm Pro features (e.g. AI Trainer, log games, creator workouts) are unlocked.
5. **Verify in RevenueCat:** This user should have **no** subscription in RevenueCat; entitlement is granted only in your backend.
6. **Reuse:** With another user, redeem `CREATOR` again; confirm the second user also becomes a creator. Confirm the same user cannot redeem `CREATOR` again (e.g. "Code already used").

**C4. Test invalid and edge cases**

- **Invalid code:** Enter a code that does not exist or is inactive. Expect "Invalid or expired code" (or similar).
- **Already used code:** Redeem a code, then try to redeem the same code again with the same user. Expect "Code already used."
- **Expired or inactive code:** Set a code’s `is_active` to `false` (or use an expired code if you add expiry). Redeem; expect an error.

---

#### Summary table

| Offer              | Where it’s defined              | Where it’s applied                    | Who can use it        |
|--------------------|----------------------------------|----------------------------------------|------------------------|
| 25% off first month| App Store Connect (promo offer) + RevenueCat (IAP key, products) + your DB (`promoter_codes` type `premium_discount`) | App: redeem code → paywall → purchase with promotional offer | Any user, one use per user per code; code reusable by many users |
| 100% off forever   | Your DB only (`promoter_codes` type `creator_signup`) | Backend: redeem code → set `is_creator`, `plan`, `is_premium` | Creators you give the code to; one use per user per code |

---

### 13. Loops — Events and emails

49. [ ] In your **RevenueCat webhook handler** (same Edge Function as step 27), after updating `profiles`, call your existing **Loops** integration (e.g. Edge Function that calls Loops with API key server-side). For **INITIAL_PURCHASE**: send a Loops event (e.g. `premium_purchased`) with properties like `product_id`, `period_type` (trial vs normal). Optionally trigger a “Welcome to Premium” email via a Loops Journey or transactional.
50. [ ] For **trial ending soon**: either (a) use a scheduled job that runs daily, finds users whose trial expires in 1–2 days (from your DB or RevenueCat API), and calls Loops with event `trial_ending_soon`, or (b) use a RevenueCat “trial will expire” webhook if available. Create a Loops Journey (or transactional) that sends the “Trial ending soon” email when this event is received.
51. [ ] For **RENEWAL**: in the webhook handler, call Loops with event `subscription_renewed` and include the interval (monthly/yearly) in properties. Create a Loops Journey (or transactional) for the “Renewal / billing” email.
52. [ ] In the **Loops dashboard**, create or update **Journeys** (or transactionals) for: (1) Premium purchased / welcome, (2) Trial ending soon, (3) Monthly/yearly renewal. Use the same event names and properties your webhook sends.

---

### 14. Sandbox testing

53. [ ] In **App Store Connect**, go to **Users and Access → Sandbox → Testers**. Create a **sandbox tester** (Apple ID for testing; use a unique email). Note the password.
54. [ ] On your **iOS device**, go to **Settings → App Store → Sandbox Account** (or sign out of the App Store, then when the app prompts for purchase, sign in with the sandbox Apple ID). Do not use your real Apple ID for IAP testing.
55. [ ] Open your **dev build** of the app. Go to the paywall; confirm `getOfferings()` returns real prices. Select monthly or yearly and complete a **purchase**. Confirm the 7-day free trial is shown by Apple. After purchase, confirm the app shows premium (e.g. `useFeatures().isPremium`) and that the webhook updated `profiles` in Supabase.
56. [ ] Test **Restore**: delete the app, reinstall, log in, tap Restore Purchases. Confirm premium is restored and profile is updated.
57. [ ] Test **Manage Subscription**: tap the button and confirm Apple’s subscription management opens.
58. [ ] Test **Redeem Code**: create a promo code in RevenueCat (or use your `promoter_codes`), redeem it in the app, and confirm entitlement and profile update. Test an invalid code and confirm a clear error.

---

### 15. Polish and edge cases

59. [ ] **Logout / login:** Log out, then log in as another user (or same user). Confirm RevenueCat is configured with the correct `appUserID` and that premium state is correct (no bleed between users).
60. [ ] **Offline:** When the device is offline, disable or hide the purchase and restore buttons, or show “Connect to the internet” (or queue and retry when back online).
61. [ ] **Billing issue:** If RevenueCat sends a `BILLING_ISSUE` webhook, ensure you do not revoke premium immediately; consider showing “Update payment method” and opening the Manage Subscription URL so the user can fix payment in Apple settings.
62. [ ] **Cancel vs refund:** Plan for entitlement revoked (e.g. refund). When RevenueCat sends cancellation/expiration/revoke, set profile to free; your webhook handler (steps 31–32) should already do this.

---

**End of step-by-step guide.**  
This guide covers: App Store Connect (agreements, subscription group, monthly/yearly products, 7-day free trial, Shared Secret); RevenueCat (app, Shared Secret, products, entitlement, offering, API key, webhook); app (SDK, config, paywall, Manage/Restore/Redeem); webhook handler (verify, update profiles); optional sync API; discount/promo codes; Loops (purchase, trial ending, renewal); sandbox testing; and polish (logout, offline, billing issue, cancel/refund).

---

**End of plan.**  
This document is the single detailed plan for RevenueCat-based payments, settings (manage/restore/redeem), discount codes, 7-day trial, and Loops emails. Implementation can follow the phases in Section 15 and this step-by-step guide; adjust order or scope as you prefer.
