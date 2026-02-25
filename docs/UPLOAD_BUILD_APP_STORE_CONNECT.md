# Upload a build for App Store Connect (version 1.0)

This gets a build into App Store Connect so you can **select it** for version 1.0 (and fix IAP / RevenueCat offerings).

---

## Re-evaluation: The original problem and where we are now

**The very original problem:** **Product configuration / offerings error.** RevenueCat `getOfferings()` was failing — you saw “Error fetching offerings”, plans showed “—”, or “Plans are not available right now”. Apple was not serving your IAP products to the app. The **original fixes we tried from the beginning** were: check the IDs (product IDs and bundle ID match everywhere), fix the metadata issue (localization for each subscription in App Store Connect), make a test user (sandbox tester in App Store Connect), and get sandbox to show up (sign in with sandbox Apple ID on the device). On top of that, we found the **main missing piece**: either (a) **no build was linked to your app version** in App Store Connect (the Build section for version 1.0 was empty), or (b) your IAP subscription products were not linked to that version. So the full fix is: do all of the above (see "Everything we tried from the beginning" below), then get a build into App Store Connect and **select it for version 1.0** so Apple can serve the products and RevenueCat can fetch offerings.

**The fix for that original problem:** Steps 1–4 below: build → submit → wait for Apple’s email → **select the build for version 1.0** in App Store Connect. Nothing else in code is required to fix the product configuration. After that, wait 15–30 minutes if needed, then test IAP on a physical device with a Sandbox Apple ID.

**What went wrong along the way:** While trying to fix or work around things, we introduced other issues and changed code that didn’t need to change for the original problem:
- **Crash on launch** — After installing via TestFlight, the app crashed. We then changed RevenueCat init (lazy-init, etc.) and Supabase (placeholder URLs). Those changes fixed or worked around the crash but caused **connection error** on login (production build had no real Supabase URL because EAS doesn’t read `.env`).
- **Connection error** — “Unable to connect to the server” on login happened because the production build was using placeholder Supabase URLs when env vars were missing.

**What we reverted:** We put the code back to a simpler state: RevenueCat configured at app launch again, purchase screen using the SDK at top level, Supabase using env vars directly (no placeholders). So we’re no longer layering “fixes” on top of the original issue.

**Where to go from here (knowing what we know now):**

1. **Focus on the original fix only.** Do steps 1–4 in this doc: build, submit, wait for Apple email, **select the build for version 1.0**. That addresses the product configuration / offerings error. Test IAP after that.
2. **Before your next production build, do two config-only things** (no extra code changes):
   - **RevenueCat:** In app config use the **iOS Public API key** (Project Settings → API Keys in RevenueCat), **not** the Test Store key. Using the Test Store key in a production/TestFlight build causes RevenueCat to crash the app on purpose.
   - **EAS Secrets:** Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` so the production build can connect to Supabase and login works (EAS doesn’t use your local `.env`).

**Set EAS Secrets (one-time, so production build can log in):**

The project uses `app.config.js` to inject `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` into the app at build time. Without these EAS secrets, the TestFlight build uses placeholders and shows "Connection Error" on login.

```bash
cd my-first-app
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://YOUR_PROJECT.supabase.co" --scope project
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "YOUR_ANON_KEY" --scope project
```

Use the same values as in your local `.env`. Then run `eas build --platform ios --profile production` again.

**Checklist before your next production build:**
- [ ] RevenueCat: **iOS Public API key** in app config (not Test Store).
- [ ] EAS Secrets: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` set for the project.
- [ ] After build + submit + Apple email: **Select the build for version 1.0** in App Store Connect (Step 4 below).

**How to confirm you're using the right RevenueCat key (for production/App Store):**

1. Go to [RevenueCat Dashboard](https://app.revenuecat.com) → your project.
2. Open **Project** → **API Keys** (or **Apps** → select your **iOS app** → **API Keys**).
3. You’ll see at least two keys for iOS:
   - **Public app-specific API key** (sometimes labeled “Public SDK key” or “iOS Public API key”) — **use this one** in `app.json` / app config. It usually starts with `appl_` and is meant for production and TestFlight.
   - **Test Store / Sandbox key** (if listed) — **do not use this** for the build you submit. RevenueCat can crash the app on purpose when the Test Store key is used in a production build.
4. Compare the key value in RevenueCat (the **Public** one) with what’s in your app:
   - In this project the key is in `app.json` → `expo.extra.revenueCatPublicApiKey` (and can be overridden by `EXPO_PUBLIC_REVENUECAT_API_KEY` in env/EAS).
5. If they match the **Public** key from step 3, you’re good. If your app currently has the Test Store key, replace it with the Public key and rebuild.

---

## Everything we tried from the beginning (to fix the product configuration / offerings error)

This list is the full set of things that apply to fixing **"Error fetching offerings"** / product configuration. Use it so we know what we already did and **what not to do twice**. Order is roughly when they come up.

1. **Check / fix the IDs**
   - **Product IDs** must match **exactly** in all three places: App Store Connect (subscriptions `premium_monthly`, `premium_yearly`), RevenueCat (Products + Offerings packages), and in the app (e.g. purchase-premium fallback uses these IDs when offerings fail). No typos, no different naming.
   - **Bundle ID** must match everywhere: `app.json` → `com.lukedepue.myfirstapp`, App Store Connect app, RevenueCat iOS app. If any of these differ, Apple/RevenueCat won't match the app and offerings can fail.

2. **Fix the metadata issue**
   - In App Store Connect, each subscription product needs **localization** (subscription display name and description). Until that's done, products can show "Missing Metadata" or not be "Ready to Submit," and Apple may not serve them. Fix: App Store Connect → your app → Subscriptions → each subscription → add the required localization (name + description) for at least one language.

3. **Make a test user (sandbox tester)**
   - App Store Connect → **Users and Access** → **Sandbox** → **Testers**. Create a **sandbox tester** (use a unique email that's not your real Apple ID; set password). You need this to test IAP without using your real Apple ID.

4. **Get sandbox to show up on the device**
   - The **sandbox tester** you create in App Store Connect (Users and Access → Sandbox Testers) is the account you use: that **email + password** are your sandbox Apple ID. Use them when Apple prompts for sign-in.
   - **If signing in at Settings doesn’t work:** Apple often doesn’t show the sandbox account in Settings until you’ve used it in the app. **Try making a purchase in the app first:** open the app → go to the purchase/premium screen → tap the purchase (Subscribe) button. Apple will show a **sign-in popup** — enter the **sandbox tester email and password** from App Store Connect there. After you sign in during that purchase attempt, the sandbox account may then appear under **Settings → Developer → Sandbox Apple Account** (iOS 18+) or **Settings → App Store → Sandbox Account** (iOS 13+). So: create the sandbox tester in App Store Connect, then use it when the app prompts you during a purchase; you don’t have to sign in under Settings first.

5. **Link IAP products to the app version**
   - In App Store Connect, the **app version** (e.g. 1.0) must have the **In-App Purchases** linked. If you only created subscriptions but didn't add them to the version, Apple won't serve them. Go to your app → version 1.0 → find the **In-App Purchases** (or **Subscription** / **In-App Purchases**) section and add/link your subscription products (`premium_monthly`, `premium_yearly`) to this version. Save.

6. **Have a build linked to the version (this was the main missing piece)**
   - The **Build** section for version 1.0 must have a **build selected**. If it was empty, Apple doesn't associate any binary with that version and won't serve products — so `getOfferings()` keeps failing. Fix: upload a build (steps in "1. Build" below), wait for Apple's "build processed" email, then **select that build for version 1.0** (Step 4 below). After that, wait 15–30 minutes if needed, then test again on a **physical device** with the **sandbox** Apple ID.

7. **RevenueCat side (must be done for offerings to work)**
   - **Shared Secret** (and if you use it, App Store Connect API key) must be set in RevenueCat for your iOS app. Without this, RevenueCat can't validate receipts and offerings can fail.
   - **Products** in RevenueCat: identifiers = `premium_monthly`, `premium_yearly` (same as App Store Connect).
   - **Entitlement** (e.g. `premium`) with both products attached.
   - **Offerings**: at least one offering (e.g. "Default") with packages linked to those products; set as **current** offering.

8. **Paid Applications Agreement**
   - App Store Connect → **Agreements, Tax, and Banking**. The **Paid Applications Agreement** must be signed. If it's not, IAP won't work.

**What not to do again:** Don't change app code to "fix" the offerings error (no lazy-init RevenueCat, no Supabase placeholders, etc.). The fix is configuration and linking in App Store Connect + RevenueCat + build selection.

---

## Sandbox testing (physical device) — notes from RevenueCat

Use this when testing IAP on a **physical device** (e.g. TestFlight build). Simulator notes are omitted.

### Create a sandbox tester

- **Where:** App Store Connect → **Users and Access** → **Sandbox** → **Testers**.
- Create a sandbox tester: use a **valid email you can verify** and set a password. This is **not** your real Apple ID — it’s a test account only for IAP.
- That **email + password** = your sandbox Apple ID. You use them when Apple prompts for sign-in (in the app or in Settings).

### Add the sandbox account on your device

- **iOS 18+:** Settings → **Developer** → **Sandbox Apple Account**.
- **iOS 13+:** Settings → **App Store** → **Sandbox Account**.
- **If you can’t sign in there or the option is missing:** Apple often doesn’t show the sandbox account in Settings until you’ve used it in the app. **Make a purchase in the app first:** open the app → go to the purchase/premium screen → tap Subscribe (or purchase). Apple will show a **popup to sign in** — enter your **sandbox tester email and password** from App Store Connect. After that, the sandbox account may appear in Settings. So you don’t have to sign in under Settings first; you can sign in when the app prompts you during a purchase.

### Testing on device

- **Make a purchase:** Build and run the app on the device (e.g. install from TestFlight). When you tap purchase, Apple may prompt you to sign in with an Apple ID — use the **sandbox tester** credentials. The SDK only triggers this when you call purchase or restore; you can’t control whether Apple shows Face ID, Touch ID, or password.
- **Sandbox can be slow:** A sandbox purchase can take ~15 seconds; that’s normal. Production is usually much faster.
- **Prices in sandbox:** In sandbox (and TestFlight), prices and metadata often don’t match App Store Connect. Focus on the **purchase flow** working, not exact prices.
- **Verify in RevenueCat:** After a successful purchase, check the RevenueCat dashboard (with **View Sandbox Data** enabled) to see the transaction.

### TestFlight

- TestFlight uses your **production Apple Account** for the app, but **purchases still run in sandbox**. That can cause odd behavior; it’s undocumented by Apple.
- As of Dec 2024, **TestFlight subscription renewals** occur once every 24 hours (not the accelerated sandbox rate). Sandbox on a dev build renews at accelerated rates (e.g. 1 month ≈ 5 minutes).

### Other

- **Log out of sandbox to test as a new user:** Deleting the user in RevenueCat doesn’t remove their purchase history with Apple. To simulate a brand‑new user, **log out of the sandbox account on the device** (Settings → Developer → Sandbox Apple Account or App Store → Sandbox Account) and, if needed, create a new sandbox tester in App Store Connect.
- **Localization / region:** To test purchases in a specific region, set the sandbox user’s **App Store Country or Region** in App Store Connect (Sandbox Testers).

---

## 1. Build for App Store (production)

From the **my-first-app** folder:

```bash
cd my-first-app
eas build --platform ios --profile production
```

- Uses your **production** profile (App Store–compatible; version from `app.json` is 1.0.0 → matches "1.0" in App Store Connect).
- You must be logged in: `eas login` if needed.
- Build runs on EAS servers; you get a link when it’s done. Wait for it to finish.

---

## 2. Submit the build to App Store Connect

After the build **succeeds**, upload it to App Store Connect:

```bash
eas submit --platform ios --latest
```

- `--latest` = submit the most recent iOS build. Or use `--id <build-id>` from the build URL.
- EAS will ask for your **Apple ID** (App Store Connect) and may ask you to pick the **app** (Potentijal) if you have more than one.
- If prompted, choose **production** or the appropriate credentials. First time you may need to create an App Store Connect API key or use app-specific password.

When submit finishes, the build is uploaded. Apple then **processes** it (often 5–15 minutes).

---

## 3. Wait for Apple’s email

You’ll get an email from Apple when the build is **processed** and visible in App Store Connect. Until then, the build won’t appear in the version’s Build list.

---

## 4. Select the build for version 1.0

1. Open [App Store Connect](https://appstoreconnect.apple.com) → your app **Potentijal**.
2. Go to the **version** that has the IAP (e.g. **1.0** / **Prepare for Submission**).
3. Find the **Build** section (e.g. “iOS Build” or “Build”).
4. Click **“+”** or **“Select a build”** and choose the build you just uploaded (e.g. 1.0.0 (123)).
5. **Save** the version.

After this, the version 1.0 has a build and your IAP are linked to it. Wait 15–30 minutes if needed, then test IAP again on a **physical device** with a **Sandbox** Apple ID.

---

## Optional: Install via TestFlight

After the build is processed and selected for 1.0:

1. In App Store Connect, open **TestFlight** for your app.
2. Add yourself (or the tester) as an internal tester if needed.
3. Install the **TestFlight** app on your iPhone, then install **Potentijal** from TestFlight.
4. Test IAP on that build (same Sandbox Apple ID). This guarantees you’re running the build that’s linked to version 1.0.

---

## Summary

| Step | Command / action |
|------|-------------------|
| 1. Build | `eas build --platform ios --profile production` |
| 2. Submit | `eas submit --platform ios --latest` |
| 3. Wait | For Apple’s “build processed” email |
| 4. Select build | App Store Connect → app → version 1.0 → Build → select the new build → Save |

Your `app.json` already has `version: "1.0.0"` and `bundleIdentifier: "com.lukedepue.myfirstapp"`, so the build will match your app and version in App Store Connect.
