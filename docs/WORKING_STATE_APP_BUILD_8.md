# Working state of code (Build 8 — app working)

**Purpose:** This document captures the **current working state** of the key files after build 8 succeeded, the app opens, login works, and the paywall is wired to RevenueCat. **Keep these files this way** when making future changes so we don’t reintroduce crash or connection errors.

**Date captured:** After you selected build 8 for version 1.0 in App Store Connect and confirmed the app works on device.

---

## 1. `lib/supabase.ts`

- Uses **process.env** first, then **Constants.expoConfig.extra** (supabaseUrl, supabaseAnonKey) so TestFlight/builds can connect.
- Uses **safeUrl / safeKey** with a placeholder only when both are missing, so `createClient` never receives `undefined`.

```ts
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Prefer .env (process.env). Fallback to app.json extra so TestFlight/builds can connect.
const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? extra.supabaseUrl ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? extra.supabaseAnonKey ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Missing URL or anon key. Set in .env or app.json extra.');
}

const safeUrl = supabaseUrl || 'https://placeholder.supabase.co';
const safeKey = supabaseAnonKey || 'placeholder-key';

export const supabase = createClient(safeUrl, safeKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

---

## 2. `app.json` — `expo.extra` section

- **revenueCatPublicApiKey** = iOS Public API key (not Test Store).
- **supabaseUrl** and **supabaseAnonKey** = same values as in `.env`, so builds without EAS Secrets still connect.

Keep the `extra` object exactly like this (only the values may change if you rotate keys):

```json
"extra": {
  "router": {},
  "eas": {
    "projectId": "01792316-d8cf-483b-a425-8fbf73fa7a9c"
  },
  "revenueCatPublicApiKey": "your-revenuecat-public-sdk-key",
  "supabaseUrl": "https://your-project.supabase.co",
  "supabaseAnonKey": "your-supabase-anon-key"
}
```

---

## 3. `app/_layout.tsx` — RevenueCat block only

- RevenueCat is **configured at launch** (first `useEffect`, empty deps).
- **logIn / logOut** on user change (second `useEffect`, depends on `user?.id`).
- API key from **Constants.expoConfig.extra.revenueCatPublicApiKey**.
- Both blocks are wrapped in **try/catch** so a missing or bad key doesn’t crash the app.

This block lives inside `RootLayoutNav`, right after `const [resumeStep, setResumeStep] = React.useState<string | null>(null);` and before `// Track user in PostHog`:

```tsx
  // Steps 18–19: RevenueCat — configure at launch (use iOS Public API key from app.json, not Test Store).
  useEffect(() => {
    const apiKey = (Constants.expoConfig?.extra as Record<string, unknown>)?.revenueCatPublicApiKey as string | undefined;
    if (!apiKey?.trim()) return;
    try {
      const Purchases = require('react-native-purchases').default;
      Purchases.configure({ apiKey, appUserID: user?.id ?? 'anonymous' });
    } catch (e) {
      if (__DEV__) console.warn('[RevenueCat] Configure skipped:', e);
    }
  }, []);

  useEffect(() => {
    const apiKey = (Constants.expoConfig?.extra as Record<string, unknown>)?.revenueCatPublicApiKey as string | undefined;
    if (!apiKey?.trim()) return;
    try {
      const Purchases = require('react-native-purchases').default;
      if (user?.id) Purchases.logIn(user.id);
      else Purchases.logOut();
    } catch (e) {
      if (__DEV__) console.warn('[RevenueCat] logIn/logOut skipped:', e);
    }
  }, [user?.id]);
```

---

## 4. `app/(tabs)/purchase-premium/index.tsx` — what to keep

- **Import:** `Purchases from "react-native-purchases"` at top level.
- **State:** offeringsLoading, offeringsError, currentOffering { monthly, annual }, purchasing, purchaseError.
- **loadOfferings:** calls `Purchases.getOfferings()`, maps packages to monthly/annual, sets currentOffering or offeringsError.
- **useEffect:** runs loadOfferings on mount.
- **selectedPackage:** from currentOffering + selectedPlan.
- **handleContinue:** calls `Purchases.purchasePackage(selectedPackage)` or `Purchases.purchaseProduct(productId)` if no package; handles success (alert + router.back) and errors (userCancelled vs other); sets purchasing true/false.
- **UI:** loading state (ActivityIndicator), error state (offeringsError), pricing cards show `currentOffering?.monthly?.product?.priceString ?? "—"` and same for annual; purchaseError shown below cards; Continue button disabled when purchasing, label "Processing…" when purchasing.

Do **not** remove RevenueCat from this screen or change Supabase/RevenueCat config in the other files above without updating this doc and re-testing a build.

---

## Summary

| File | What to preserve |
|------|-------------------|
| **lib/supabase.ts** | Constants fallback for supabaseUrl/supabaseAnonKey; safeUrl/safeKey so createClient never gets undefined. |
| **app.json** | extra.revenueCatPublicApiKey, extra.supabaseUrl, extra.supabaseAnonKey. |
| **app/_layout.tsx** | RevenueCat configure (once) + logIn/logOut (on user change), try/catch, key from extra. |
| **app/(tabs)/purchase-premium/index.tsx** | getOfferings, currentOffering, purchasePackage/purchaseProduct, loading/error/purchase states. |
