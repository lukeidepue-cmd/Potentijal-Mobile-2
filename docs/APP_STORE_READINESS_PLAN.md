# App Store Readiness Plan

**Purpose:** This plan lists changes and checks needed so the app meets Apple App Store (and, where noted, Google Play) guidelines and avoids common rejection reasons. Only items that may apply to this codebase are included. Complete each section before submission.

**How to use:** Work through the sections in order. Fix code/content where indicated; for “ensure in App Store Connect” items, complete those in the Apple Developer portal and App Store Connect (no code change).

---

## 1. Privacy, Data, and Legal

### 1.1 Privacy policy and terms – placeholders and links ✅ Done

- **Terms of Service (in-app):** Contact section now uses `lukeidepue@gmail.com`; mailing address placeholder removed in `app/(tabs)/settings/support-legal/terms.tsx`.

- **Privacy Policy (in-app):** Contact section now uses `lukeidepue@gmail.com`; mailing address placeholder removed in `app/(tabs)/settings/support-legal/privacy-policy.tsx`.

- **Support email consistency:** One support email used everywhere: `lukeidepue@gmail.com` (Contact screen, Help, Terms, Privacy Policy). Ensure that inbox is monitored for App Review and user support.

- **Privacy policy URL for App Store Connect:** Apple requires a **URL** to your privacy policy in App Store Connect (not only in-app text).  
  **Action:** Host your privacy policy at a stable URL (e.g. your website) and enter that URL in App Store Connect → App Information → Privacy Policy URL. The in-app Privacy Policy screen can remain; the URL is for the store listing and reviewer verification.

### 1.2 Account deletion (required when accounts exist)

- **Current state:** Account deletion is implemented: Settings → Delete Account → type "DELETE" → confirm → `deleteAccount()` (profile + auth deletion, sign-out).  
  **Action:** No code change required. Ensure the path is easy for reviewers to find (e.g. Settings → Account → Delete Account). In App Review notes, you can mention: *“Account deletion: Settings → Account → Delete Account.”*

### 1.3 Sign in with Apple (if you add third-party login)

- **Current state:** Welcome screen only shows “Continue with Email” (OTP). AuthProvider has `signInWithOAuth('apple' | 'google')` but these are not shown on the welcome/onboarding UI.  
  **Action:** If you **ever expose** Google or Facebook (or any other third-party) sign-in in the app UI, you **must** also offer Sign in with Apple as an equivalent option on the same screen. Until then, no change needed.

---

## 2. App Store Connect and submission

### 2.1 Metadata and listing

- **Privacy Policy URL:** ✅ Done. Use this URL in App Store Connect: **https://potentijal-privacy-policy.base44.app** (also defined in `constants/links.ts`; the in-app Privacy Policy screen has a “View full policy online” link that opens it).
- **Support URL:** Required. Use a page that includes contact email (and optionally the same address as in Terms/Privacy). Ensure the URL works when the reviewer opens it.
- **App name:** No price or “free” in the app name; no trademark abuse (e.g. “Apple”, “Instagram”).
- **Description:** Accurately describe the app; if Premium features require purchase, mention that (e.g. “Some features require an in-app subscription”). No placeholder or “TBD” text.
- **In-app purchases:** If you use subscriptions, ensure products and metadata are complete in App Store Connect and that the description does not promise features that don’t exist.

### 2.2 App Review notes (recommended)

- **Login flow:** Add a short note such as: *“Login: User enters email and receives a 6-digit code by email. They enter the code on the next screen to sign in. No password.”*
- **Optional demo account:** If you can, provide a test account (email + instructions to receive the OTP) so reviewers can sign in quickly if email delivery is slow. Not mandatory if signup is straightforward.
- **Account deletion:** Mention where it is (e.g. Settings → Account → Delete Account).

---

## 3. Test / debug screens and build hygiene

### 3.1 test-auth and test-onboarding

- **Current state:**  
  - Workouts tab: when the user is **not** signed in, the app does `router.replace('/(tabs)/test-auth')` (`app/(tabs)/workouts.tsx`).  
  - Home (for certain mode branches) has a button that navigates to `/(tabs)/test-auth`.  
  So reviewers or users can reach a “test auth” screen instead of the normal onboarding/welcome flow.

- **Action (choose one):**  
  - **Option A (recommended):** When the user is not signed in and tries to access a gated tab (e.g. Workouts), redirect to the main onboarding entry instead of test-auth, e.g. `router.replace('/onboarding/welcome')` (or your intended entry). Remove or repurpose the home button that opens test-auth so production builds don’t expose “test” screens.  
  - **Option B:** If you keep a separate “sign in” screen, rename it and style it as the official sign-in flow (no “test” in the UI or screen name). Ensure it matches the rest of the app (e.g. email OTP as in onboarding).

- **test-onboarding:** It is hidden from the tab bar but may still be reachable via navigation. For submission, ensure test/debug screens are either unreachable in the production build or clearly part of the intended user flow (no “test” or “beta” in labels).

### 3.2 No “beta” or “coming soon” in the app

- **Current state:** No “Coming soon”, “Lorem ipsum”, or “beta” labels were found in user-facing app code.  
- **Action:** Before submit, do a final search for “coming soon”, “beta”, “demo”, “TBD”, “placeholder” in UI strings and remove or replace any that remain.

---

## 4. Permissions and usage descriptions

### 4.1 iOS usage descriptions

- **Current state:** `app.json` has minimal `infoPlist` (e.g. `ITSAppUsesNonExemptEncryption`). The app uses:
  - **Photo library / media:** Profile photo and highlights (video) via `expo-image-picker` (library, not camera).
  - **Notifications:** `expo-notifications` for workout/consistency/AI reminders.

- **Action:** Ensure your built app has the correct usage description keys (Expo may add some via plugins). Verify that:
  - Photo library access has an `NSPhotoLibraryUsageDescription` (and `NSPhotoLibraryAddUsageDescription` if you save to library) that clearly explains why (e.g. “To choose a profile photo” / “To add highlight videos”).
  - Notifications are requested in context (e.g. onboarding or before scheduling reminders); the system prompt is sufficient if you don’t add custom text.
  - You do **not** request camera, location, or other permissions you don’t use.

### 4.2 Android permissions

- **Current state:** `app.json` includes `"android.permission.CAMERA"`. The codebase uses `expo-image-picker` for **library** only (profile image, highlights); no camera capture flow was found.
- **Action:** If the app does not use the camera at all, remove `android.permission.CAMERA` from `app.json` to avoid “unused permission” scrutiny. If you later add camera capture, add the permission back and document why in Data Safety / store listing.

---

## 5. Deep links and config

### 5.1 Associated domains (iOS)

- **Current state:** In `app.json`, `ios.associatedDomains` includes placeholder values like `"applinks:yourapp.com"`.
- **Action:** Replace with your real domain(s) for universal links (e.g. email verification, OAuth callback). If you don’t use universal links yet, use the same domain you use for Supabase auth redirects (if any). Incorrect or placeholder domains can cause deep links to fail during review or in production.

---

## 6. In-app purchase and payments

### 6.1 Compliance (current implementation)

- **Current state:** Premium is sold via Apple IAP (RevenueCat); purchase and restore flows are in-app. No external purchase links or alternative payment for digital Premium features were found in the app.  
- **Action:** No code change required for IAP compliance. In the description and UI, don’t add text like “Subscribe on our website for a discount” or links to external payment for the same digital content.

### 6.2 Subscription and trial disclosure

- **Action:** Ensure the paywall (or first purchase screen) clearly states that a subscription is required, whether a free trial is offered, and how to cancel (e.g. via Apple subscription management). Your Manage Subscription and Restore flows already point users to the right place.

---

## 7. User experience and completeness

### 7.1 Terms and Privacy before signup

- **Current state:** On the welcome screen, the text says “By continuing, you agree to our Terms of Service and Privacy Policy” but “Terms of Service” and “Privacy Policy” are plain `Text` with `termsLink` style—they are **not** tappable.
- **Action:** Make “Terms of Service” and “Privacy Policy” tappable (e.g. `Pressable` or `TouchableOpacity` that navigate to the in-app Terms and Privacy Policy screens, or open the same URLs you use in App Store Connect). This improves transparency and matches store expectations for “easily accessible” policies.

### 7.2 Stability and completeness

- **Action:** Run the app on a real device (and simulator) through: install → onboarding → email OTP → complete onboarding → use Home, Workouts, Progress, History, Settings (including Restore, Manage Subscription, Delete Account, Privacy, Terms, Contact). Confirm there are no crashes, dead ends, or “under construction” screens. Fix any crashes or broken flows before submitting.

---

## 8. Fitness / health and AI

### 8.1 Disclaimers

- **Current state:** Privacy Policy already states that the AI Trainer is “for informational and motivational use only” and “not medical or professional advice,” and advises users not to share sensitive medical details.
- **Action:** If any other screen or feature could be read as giving health or training “advice” (e.g. suggestions based on workouts), add a short disclaimer that it’s not medical advice and that users should consult professionals as needed. No code change is strictly required if the current privacy/AI wording is the only place that could be read as advice.

---

## 9. User-generated content (when Profile/Social is enabled)

### 9.1 When PROFILE_FEATURES_ENABLED is true

- **Current state:** With profile features enabled, the app has profiles, highlights (video upload), follow/block, and related UGC/social features. Terms mention that you may remove content and suspend accounts; there is block functionality and privacy settings.
- **Action (when you enable profile/social):**
  - **Reporting:** Consider adding a way for users to **report** objectionable content or behavior (in addition to block), and document in your review notes how you handle reports.
  - **Terms:** Ensure Terms of Service clearly prohibit objectionable content (harassment, hate speech, illegal content, etc.) and that you reserve the right to remove content and suspend accounts (you already do).
  - **Moderation:** Have a process (manual or automated) to act on reports and remove violating content; Apple may ask how you moderate UGC.

---

## 10. Tracking and analytics (ATT)

### 10.1 App Tracking Transparency

- **Current state:** PostHog is used for first-party product analytics (screen views, app lifecycle, deep links). There was no evidence of cross-app tracking or ad-related tracking in the code.
- **Action:** If you do **not** use PostHog (or any SDK) for cross-app tracking or for advertising/sharing data with data brokers, you typically do **not** need to show the App Tracking Transparency (ATT) prompt. If you later add advertising or cross-app tracking, implement ATT and request tracking only after the system prompt. Document in your privacy policy what analytics you use and that you don’t sell data or use it for third-party advertising if that’s the case.

---

## 11. Checklist summary

Before you submit:

| Area | Item |
|------|------|
| Legal / contact | ✅ Done: placeholder removed; contact is lukeidepue@gmail.com. |
| Legal / contact | ✅ Done: lukeidepue@gmail.com used in Contact, Help, Terms, Privacy. |
| App Store Connect | ✅ Done: Privacy Policy URL set to https://potentijal-privacy-policy.base44.app. |
| App Store Connect | Set Support URL (working, with contact info). |
| App Store Connect | Add App Review notes (login flow, account deletion path; optional: demo account). |
| Navigation | ✅ Done: Workouts → /onboarding/welcome when not signed in; Home button → welcome or signOut. |
| Navigation | Remove or rename test/debug screens (test-auth, test-onboarding) so production doesn’t show “test” UI. |
| Welcome screen | Make “Terms of Service” and “Privacy Policy” tappable. |
| Config | Fix `ios.associatedDomains` to real domain(s). |
| Android | Remove `android.permission.CAMERA` if camera is not used. |
| iOS | Confirm NSPhotoLibraryUsageDescription (and any other usage descriptions) are present and accurate. |
| Quality | Full pass: signup → onboarding → purchase/restore → settings (including delete account) with no crashes or broken screens. |

---

**End of plan.** Address each item that applies to your build and store listing before submission. Re-check the latest [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) and [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/) if anything has changed since this document was written.
