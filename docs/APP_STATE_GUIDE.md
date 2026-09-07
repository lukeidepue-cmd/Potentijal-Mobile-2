# App State Guide - Complete Context Documentation

**Last Updated:** March 15, 2026  
**Purpose:** This document provides complete context about the current state of the Potentijal app for new chat sessions. Use this as the source of truth for understanding the app architecture, patterns, and implementation details.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Authentication & User Management](#authentication--user-management)
5. [Onboarding Flow (Detailed)](#onboarding-flow-detailed)
6. [Navigation Structure](#navigation-structure)
7. [State Management](#state-management)
8. [UI/UX System](#uiux-system)
9. [API Structure](#api-structure)
10. [Feature Flags](#feature-flags)
11. [Payments & Subscriptions (RevenueCat)](#payments--subscriptions-revenuecat)
12. [Progress Tab (Meals)](#progress-tab-meals)
13. [Notifications (Implemented)](#notifications-implemented)
14. [Analytics (PostHog)](#analytics-posthog)
15. [Build & Distribution: Development Build (EAS)](#build--distribution-development-build-eas)
16. [Important Patterns & Conventions](#important-patterns--conventions)
17. [Known Issues](#known-issues)
18. [Important Notes for Next Chat](#important-notes-for-next-chat)

---

## Project Overview

**Potentijal** is a React Native fitness/sports tracking app built with Expo, live on the App Store. The app allows users to:
- Track workouts, practices, and games across multiple sports (Lifting, Basketball, Football, Baseball, Soccer, Hockey, Tennis)
- View progress and statistics (graphs, skill map, consistency score, training statistics)
- Manage training schedules
- Use an AI Trainer feature (premium)
- Track highlights and achievements (profile features currently hidden)

**Key Characteristics:**
- Dark theme with premium glassmorphism design
- Multi-sport support with mode switching
- Onboarding flow for new users (7-step flow with value-first design)
- Premium subscription model (RevenueCat)
- Supabase backend for authentication and data
- Loops integration for email marketing
- PostHog analytics integration
- iOS Development Build (EAS), not Expo Go

---

## Tech Stack

### Core Framework
- **React Native:** 0.81.5
- **React:** 19.1.0
- **Expo:** ~54.0.32
- **Expo Router:** ~6.0.21 (file-based routing)

### Key Libraries
- **Supabase:** @supabase/supabase-js (Auth, Database, Storage)
- **React Native Reanimated:** ~4.1.1 (Animations)
- **Expo Haptics:** (Haptic feedback)
- **Expo Blur:** (Glassmorphism effects)
- **Expo Linear Gradient:** (Gradients)
- **React Navigation:** Bottom tabs, Stack navigation
- **Expo Notifications:** (Local scheduled notifications)
- **Victory Native:** (Charts/graphs)
- **@shopify/react-native-skia:** (Advanced graphics)
- **react-native-purchases:** (RevenueCat payments)
- **posthog-react-native:** (Analytics)
- **expo-tracking-transparency:** (ATT on iOS)
- **expo-image:** (Optimized image loading)

### Fonts
- **Geist:** Primary UI font (Regular, Medium, SemiBold, Bold, ExtraBold)
- **Space Grotesk:** Display font (Bold)

---

## Project Structure

```
my-first-app/
├── app/                          # Expo Router file-based routing
│   ├── _layout.tsx              # Root layout with auth/onboarding routing, providers, PostHog, ATT
│   ├── index.tsx                # Entry / redirect
│   ├── +not-found.tsx           # 404 screen
│   ├── (tabs)/                  # Main app tabs
│   │   ├── _layout.tsx          # Tab bar configuration
│   │   ├── (home)/              # Home tab (sport-specific screens)
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx        # Home screen router (routes by current mode)
│   │   │   ├── schedule-week.tsx
│   │   │   ├── add-weekly-goal.tsx
│   │   │   ├── lifting/         # Lifting mode (index only)
│   │   │   ├── basketball/      # index, add-game, add-practice, weekly-goals
│   │   │   ├── football/        # Same pattern
│   │   │   ├── baseball/        # Same pattern
│   │   │   ├── soccer/          # Same pattern
│   │   │   ├── hockey/          # Same pattern
│   │   │   └── tennis/          # Same pattern
│   │   ├── workouts.tsx         # Workouts tab (lifting workouts)
│   │   ├── workout-summary.tsx  # Post-workout summary
│   │   ├── meals/               # Progress tab
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx        # Main carousel
│   │   │   ├── progress-graphs.tsx
│   │   │   ├── skill-map.tsx
│   │   │   ├── consistency-score.tsx
│   │   │   └── training-statistics.tsx
│   │   ├── history/             # History tab
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx
│   │   │   └── [id].tsx
│   │   ├── profile/             # Profile tab (hidden if PROFILE_FEATURES_ENABLED = false)
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx
│   │   │   ├── edit.tsx
│   │   │   ├── find-friends.tsx
│   │   │   ├── following.tsx
│   │   │   ├── followers.tsx
│   │   │   └── creator-workouts.tsx
│   │   ├── purchase-premium/    # RevenueCat purchase screen
│   │   │   ├── _layout.tsx
│   │   │   └── index.tsx
│   │   └── settings/            # Settings screens
│   │       ├── _layout.tsx
│   │       ├── index.tsx
│   │       ├── account/         # email-password, delete-account
│   │       ├── app-preferences/ # units
│   │       ├── notifications/   # index
│   │       ├── premium/         # manage-subscription, restore-purchases
│   │       ├── privacy-security/ # index, blocked-users
│   │       ├── sports-training/ # my-sports, add-sports
│   │       ├── support-legal/   # help, contact, privacy-policy, terms
│   │       ├── ai-trainer/      # index
│   │       └── about/           # credits
│   └── onboarding/              # Onboarding flow (7 screens, value-first)
│       ├── _layout.tsx          # Stack with fade transitions
│       ├── identity.tsx         # Step 1: Identity hook ("Built for athletes...")
│       ├── sport-selection.tsx  # Step 2: Select up to 2 sports (pre-auth)
│       ├── first-win.tsx        # Step 3: Log first exercise (pre-auth, aha moment)
│       ├── visualization.tsx    # Step 4: Progress graph preview (pre-auth)
│       ├── email-entry.tsx      # Step 5: Email signup ("Save your progress")
│       ├── email-verification.tsx # Step 6: OTP verification + data sync
│       └── name-entry.tsx       # Step 7: Display name → dashboard
├── components/                   # Reusable components
│   ├── AITrainerChat.tsx
│   ├── AnimatedInput.tsx
│   ├── AnimatedProgressBar.tsx
│   ├── AppHeader.tsx
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Collapsible.tsx
│   ├── Confetti.tsx
│   ├── ConsistencyScoreVisualization.tsx
│   ├── ErrorToast.tsx
│   ├── HelpOverlay.tsx
│   ├── PremiumGatedCard.tsx
│   ├── ProgressBar.tsx
│   ├── Skeleton.tsx
│   ├── SuccessToast.tsx
│   ├── ThemedText.tsx
│   ├── ThemedView.tsx
│   ├── UpgradeModal.tsx
│   ├── WeekStrip.tsx
│   └── ui/
│       ├── AnimatedTabBarIcon.tsx
│       ├── CustomRefreshControl.tsx
│       ├── IconSymbol.tsx / IconSymbol.ios.tsx
│       └── TabBarBackground.tsx / TabBarBackground.ios.tsx
├── providers/
│   ├── AuthProvider.tsx         # Authentication context + onboarding status
│   ├── ModeContext.tsx          # Sport mode context
│   ├── SettingsContext.tsx      # Settings context
│   ├── FeaturesContext.tsx      # Features/premium context
│   ├── ProfileRefreshContext.tsx # Profile refresh on foreground
│   ├── PostHogProvider.tsx      # PostHog analytics wrapper
│   └── OnboardingDataContext.tsx # Pre-auth onboarding data (sports, exercise)
├── hooks/
│   ├── useFeatures.ts           # Premium/creator feature access
│   ├── useFeaturesFallback.ts   # Features fallback
│   ├── useAvailableModes.ts     # Available sport modes from profile
│   ├── useColorScheme.ts        # Theme hook
│   ├── useThemeColor.ts         # Theme color hook
│   ├── useProgressGraphView.ts  # Progress graphs data
│   ├── useSkillMapData.ts       # Skill map data
│   ├── useConsistencyScore.ts   # Consistency score
│   ├── usePersonalRecords.ts    # Personal records
│   ├── useMostLoggedExercises.ts # Most logged exercises
│   ├── useExerciseProgressGraph.ts
│   └── useExerciseProgressGraphDirect.ts
├── lib/
│   ├── supabase.ts              # Supabase client
│   ├── types.ts                 # TypeScript types
│   ├── deep-links.ts            # Email verification / OAuth callbacks
│   ├── premium-cache-storage.ts # Premium status caching
│   ├── api/                     # API functions
│   │   ├── onboarding.ts        # Onboarding state, steps, profile/prefs
│   │   ├── workouts.ts
│   │   ├── practices.ts
│   │   ├── games.ts
│   │   ├── history.ts
│   │   ├── profile.ts
│   │   ├── settings.ts
│   │   ├── schedule.ts
│   │   ├── loops.ts             # Loops email integration
│   │   ├── ai-trainer.ts
│   │   ├── social.ts
│   │   ├── highlights.ts
│   │   ├── goals.ts
│   │   ├── goals-direct.ts
│   │   ├── exercise-filtering.ts
│   │   ├── exercise-types.ts
│   │   ├── exercise-types-direct.ts
│   │   ├── progress-view-calculations.ts
│   │   ├── progress-views.ts
│   │   ├── consistency-score.ts
│   │   ├── personal-records.ts
│   │   └── most-logged-exercises.ts
│   ├── notifications/
│   │   └── notifications.ts     # Local scheduled notifications
│   ├── posthog/
│   │   ├── posthog.ts           # PostHog config
│   │   └── user-tracking.ts     # User identification tracking
│   ├── search/
│   │   └── brands.ts
│   └── utils/
│       └── time-intervals.ts
├── constants/
│   ├── theme.ts                 # Design system (colors, typography, spacing)
│   ├── features.ts              # Feature flags (PROFILE_FEATURES_ENABLED)
│   └── links.ts                 # External URLs (privacy policy, terms)
├── supabase/
│   ├── migrations/              # DB migrations (including 024_onboarding_data.sql)
│   └── functions/               # Edge Functions
│       ├── revenuecat-webhook/
│       ├── sync-subscription/
│       ├── trial-ending-soon/
│       ├── ai-trainer/
│       ├── loops/
│       └── delete-auth-user/
├── testsprite_tests/            # E2E tests (TestSprite)
├── .github/workflows/           # CI (semgrep.yml)
├── assets/images/               # App images, onboarding backgrounds
├── app.json                     # Expo config (name: Potentijal, bundle: com.lukedepue.myfirstapp)
├── app.config.js                # Env injection for EAS
├── eas.json                     # EAS Build config
└── scripts/                     # Build/utility scripts
```

---

## Authentication & User Management

### AuthProvider (`providers/AuthProvider.tsx`)

**Context API:** Provides authentication state and methods throughout the app.

**State:**
- `user`: Current Supabase user object (null if not authenticated)
- `session`: Current Supabase session
- `loading`: Initial auth loading state
- `needsOnboarding`: Boolean | null - whether user needs to complete onboarding
- `onboardingLoading`: Loading state for onboarding check

**Methods:**
- `signIn(email, password)`: Email/password sign in
- `signUp(email, password, metadata?)`: Email/password sign up (syncs to Loops)
- `signOut()`: Sign out user
- `signInWithOAuth(provider)`: OAuth sign in (Apple/Google) - method exists but not wired in onboarding UI
- `signInWithOtp(email)`: Send 6-digit OTP code to email
- `verifyOtp(email, token)`: Verify OTP code
- `refreshOnboardingStatus()`: Re-check onboarding status

**Key Behaviors:**
- Automatically syncs new users to Loops on signup (via `signUp()` and `verifyOtp()`)
- Checks onboarding status after auth state changes
- Listens to Supabase auth state changes
- Onboarding status is checked via `needsOnboarding()` API call

### Root Layout Routing (`app/_layout.tsx`)

The root layout wraps the app in providers:
`PostHogProvider` > `GestureHandlerRootView` > `OnboardingDataProvider` > `AuthProvider` > `SettingsProvider` > `ProfileRefreshProvider` > `FeaturesProvider` > `ModeProvider` > `RootLayoutNav`

**RootLayoutNav handles:**
- RevenueCat configuration and `Purchases.logIn(user.id)` on user change
- Profile refresh on app foreground (throttled, max once per 15s)
- App Tracking Transparency (ATT) request on iOS (1.5s delay)
- PostHog user tracking and screen view tracking
- Deep link listener setup
- Auth/onboarding routing logic
- Loading screen with spinning star animation (`star.png` over `loading-background.png`)

**Routing Logic:**
- Shows loading screen (spinning star) while auth/onboarding status loads
- No user + not in onboarding → `/onboarding/identity`
- User + `needsOnboarding === true` → `/onboarding/name-entry` (only post-auth step remaining)
- User + `needsOnboarding === false` → `/(tabs)` + schedule notifications

---

## Onboarding Flow (Detailed)

### Overview

7-step value-first onboarding flow. Auth happens at steps 5-6, after the user has already experienced the product (selected sports, logged an exercise, seen a visualization). Pre-auth data is held in `OnboardingDataContext` (backed by AsyncStorage) and synced to Supabase after authentication.

### Screen Flow

| Step | Screen | Route | Auth Required | Data Collected |
|------|--------|-------|---------------|----------------|
| 1 | Identity | `identity` | No | None (motivational hook) |
| 2 | Sport Selection | `sport-selection` | No | `selectedSports`, `primarySport` → OnboardingDataContext |
| 3 | First Win | `first-win` | No | `firstExercise` (name, kind, mode, values) → OnboardingDataContext |
| 4 | Visualization | `visualization` | No | None (reads firstExercise, shows projected graph) |
| 5 | Email Signup | `email-entry` | No | Email (sends OTP) |
| 6 | Email Verification | `email-verification` | No → Yes | OTP verification, then syncs pre-auth data to Supabase |
| 7 | Name Entry | `name-entry` | Yes | `display_name` → `profiles`, then `completeOnboarding()` |

### Pre-Auth Data Architecture

`OnboardingDataProvider` (`providers/OnboardingDataContext.tsx`) manages data collected before authentication:
- Stores `selectedSports`, `primarySport`, and `firstExercise` in React state + AsyncStorage
- Mounted outside `AuthProvider` in the root layout so it's available regardless of auth state
- On successful OTP verification (step 6), `email-verification.tsx` syncs this data to Supabase:
  1. Calls `updateProfileFromOnboarding({ sports, primary_sport })`
  2. Calls `saveCompleteWorkout()` with the first exercise data
  3. Calls `clearOnboardingData()` to clean up AsyncStorage

### Navigation Between Steps

- `identity` → `sport-selection` (push)
- `sport-selection` → `first-win` (push)
- `first-win` → `visualization` (push)
- `visualization` → `email-entry` (push)
- `email-entry` → `email-verification` (push, passes email param)
- `email-verification` → `name-entry` (useEffect on `user` state change after OTP success)
- `name-entry` → `/(tabs)` (replace, after `updateProfileFromOnboarding()` + `completeOnboarding()` + `refreshOnboardingStatus()`)

### Resume Behavior

Since auth happens at step 5-6, only one resume scenario matters:
- **Authenticated user with `needsOnboarding === true`:** Routes directly to `/onboarding/name-entry` (the only post-auth step)
- **Unauthenticated user:** Starts from `/onboarding/identity`. Pre-auth steps (1-4) are quick enough that restarting is acceptable.

### Onboarding API (`lib/api/onboarding.ts`)

- `getOnboardingState()` - Get current step, creates default record with `current_step: 'identity'` if none exists
- `updateOnboardingStep(step, data?)` - Update current step and add to completed_steps array
- `completeOnboarding()` - Upserts `completed: true`, `completed_at`, `current_step: 'completed'`
- `needsOnboarding()` - Returns `!data.completed` (true if no record exists)
- `updateProfileFromOnboarding(updates)` - Updates `profiles` table (name, sports, primary_sport)
- `updatePreferencesFromOnboarding(updates)` - Updates `user_preferences` table (not used in current onboarding, kept for settings)

### Visual Design

- **Identity screen (step 1):** Full-screen dark gradient (no progress bar), bold heading "Built for athletes who put in the work", subtitle, single green "Continue" button
- **Steps 2-7:** Consistent layout with back button (left), progress bar + step counter (right), dark gradient backgrounds, content area, footer button with green (#17D67F) enabled state and `strokeSoft` disabled state
- **First Win (step 3):** Sport-specific pre-filled exercise name with two numerical inputs (e.g., Reps/Weight for lifting, Attempted/Made for basketball)
- **Visualization (step 4):** Custom SVG chart showing user's first data point with projected improvement dotted line (Today → Wk 2 → Mo 1 → Mo 3)
- **Name Entry (step 7):** Single name input, "Let's go" button with bouncing dots loading animation, immediate navigation to dashboard on success

### Notification Strategy

Notification permissions are NOT requested during onboarding. Instead:
- Root layout calls `scheduleAllWorkoutNotifications()` and `scheduleConsistencyScoreNotification()` when `needsOnboarding === false`
- Those functions internally call `requestNotificationPermissions()` which handles the OS permission prompt
- This follows contextual/progressive disclosure principles

---

## Navigation Structure

### Tab Navigation (`app/(tabs)/_layout.tsx`)

**Tabs (visible in tab bar):**
1. **Home** - `(home)` - Sport-specific home screens
2. **Workouts** - `workouts` - Lifting workout creation/management
3. **Progress** - `meals` - Statistics, graphs, progress tracking
4. **History** - `history` - Past workouts, practices, games
5. **Profile** - `profile` - User profile (hidden if `PROFILE_FEATURES_ENABLED = false`)

**Hidden Screens (not in tab bar):**
- `workout-summary` - Workout completion screen
- `settings/*` - All settings screens
- `purchase-premium` - Premium purchase screen

**Tab Bar Styling:**
- Glassmorphism background (`TabBarBackground` component)
- Animated icons (`AnimatedTabBarIcon` with scale animation)
- Brand green (#22C55E) for active state
- Semi-transparent white for inactive state

### Home Tab Structure

Routes to sport-specific screens based on current mode. Each sport (except lifting) has: `index.tsx`, `add-game.tsx`, `add-practice.tsx`, `weekly-goals.tsx`. Lifting only has `index.tsx`.

### Stack Navigations

- **Home Stack:** Fade animations for sport screens
- **Meals Stack:** Progress-related screens
- **Settings Stack:** Nested settings categories
- **Onboarding Stack:** Fade transitions between 7 steps (identity → sport-selection → first-win → visualization → email-entry → email-verification → name-entry)

---

## State Management

### Context Providers

1. **AuthProvider** (`providers/AuthProvider.tsx`) — Authentication state, user session, onboarding status
2. **ModeContext** (`providers/ModeContext.tsx`) — Current sport mode, loads from `primary_sport` in profile, defaults to `"lifting"`
3. **SettingsContext** (`providers/SettingsContext.tsx`) — App settings state
4. **FeaturesContext** (`providers/FeaturesContext.tsx`) — Premium/creator feature access
5. **ProfileRefreshContext** (`providers/ProfileRefreshContext.tsx`) — Profile refresh on app foreground (used by root layout)
6. **PostHogProvider** (`providers/PostHogProvider.tsx`) — PostHog analytics wrapper
7. **OnboardingDataProvider** (`providers/OnboardingDataContext.tsx`) — Pre-auth onboarding data (sports, first exercise) stored in memory + AsyncStorage, synced to Supabase after auth

### Hooks

- `useAuth()` - Access auth context
- `useMode()` - Access mode context
- `useFeatures()` - Check premium/creator feature flags
- `useColorScheme()` - Theme colors
- `useProfileRefresh()` - Trigger profile refresh
- `useOnboardingData()` - Access pre-auth onboarding data context (sports, first exercise, clear/set methods)

---

## UI/UX System

### Theme (`constants/theme.ts`)

**Color Palette:**
- **Backgrounds:** `bg0` (#070B10), `surface1` (#0D131B), `surface2` (#111A24)
- **Text:** `textHi` (#E6F1FF), `textLo` (#8AA0B5)
- **Brand:** `primary600` (#17D67F), `primary500` (#1FEA8D), `primary700` (#0DBA6D)
- **Brand Green (Tab Bar):** #22C55E
- **Purple accent:** `purple` (#A78BFA) — available in theme (not currently used in onboarding)
- **Secondary:** `secondary500` (Blue)
- **Accents:** Blue, Teal, Mint, Amber, Rose
- **Strokes:** `strokeSoft` — used for borders, disabled states

**Typography:** H1 (28px/900), H2 (22px/900), Title (16px/900), Label (12px/800 uppercase), Muted (13px/700)

**Spacing:** `xs: 6`, `sm: 8`, `md: 10`, `lg: 12`, `xl: 16`, `xxl: 20`

**Border Radius:** `sm: 8`, `md: 12`, `lg: 16`, `xl: 24`, `pill: 999`

### Design Principles

1. **Dark Theme:** Deep dark backgrounds with light text
2. **Glassmorphism:** Blur effects on headers, tab bar, modals
3. **Gradients:** Multi-layer gradients for depth (base gradient + vignette + grain overlay)
4. **Animations:** Smooth spring/timing animations via Reanimated
5. **Haptic Feedback:** Light haptics on interactions
6. **Loading States:** Spinning star (loading screen), bouncing dots (onboarding name-entry submit)

---

## API Structure

### API Functions (`lib/api/`)

All API functions follow a consistent pattern:
- Return `{ data: T | null, error: any }`
- Handle authentication automatically via Supabase client
- Use `lib/supabase.ts` client

**Key APIs:** workouts, practices, games, history, profile, onboarding, settings, schedule, loops, ai-trainer, social, highlights, goals, exercise-filtering, progress-view-calculations, consistency-score, personal-records, most-logged-exercises

---

## Feature Flags

### Current Flags (`constants/features.ts`)

**PROFILE_FEATURES_ENABLED** (default: `false`)
- Controls visibility of profile tab and all profile features
- When `false`: Profile tab hidden from tab bar
- All profile code remains intact, just hidden from UI

---

## Payments & Subscriptions (RevenueCat)

**Status:** Fully integrated.

### Client (App)
- Root layout configures RevenueCat at launch, calls `Purchases.logIn(user.id)` on user change
- Purchase screen: `app/(tabs)/purchase-premium/index.tsx` — loads RevenueCat offerings, purchase flow, promo codes
- Settings: restore purchases (`sync-subscription` Edge Function), manage subscription
- Premium gating: `useFeatures()` hook derives `isPremium` from profile, gates features via `UpgradeModal` and `PremiumGatedCard`

### Backend (Supabase)
- `revenuecat-webhook` Edge Function — processes RevenueCat events, updates `profiles.is_premium` and `profiles.plan`
- `sync-subscription` Edge Function — called by Restore Purchases, reads RevenueCat API
- `trial-ending-soon` Edge Function — daily cron for Loops trial reminder emails

---

## Progress Tab (Meals)

**Status:** Fully implemented under `(tabs)/meals/`.

### Screens
- **index.tsx** — Horizontal carousel of cards (Training Statistics, Progress Graphs, Skill Map, Consistency Score)
- **training-statistics.tsx** — Training metrics by sport/mode/time range
- **progress-graphs.tsx** — Progress over time charts (Victory Native)
- **skill-map.tsx** — Relative strength/performance per exercise
- **consistency-score.tsx** — Weekly scheduled vs logged workouts

### Hooks & APIs
Dedicated hooks (`useProgressGraphView`, `useSkillMapData`, `useConsistencyScore`, `usePersonalRecords`, `useMostLoggedExercises`, `useExerciseProgressGraphDirect`) and API functions for each progress feature.

---

## Notifications (Implemented)

**Status:** Implemented. Local scheduled notifications; preferences stored and respected.

- **Workout reminders:** Per sport mode, scheduled for 11:21 PM if user has scheduled workout for today
- **Consistency score:** Weekly notification (Sunday 8 AM, premium only)
- **AI Trainer reminder:** After every 7th logged workout, 1 hour later
- **Entry points:** Root layout (on main app entry), schedule-week save, workout-summary save
- **Settings:** Toggles in `settings/notifications/index.tsx`

---

## Analytics (PostHog)

**Status:** Integrated.

- **PostHogProvider** wraps the app when API key is configured
- **User tracking:** `lib/posthog/user-tracking.ts` identifies users via `usePostHogUserTracking()` hook in root layout
- **Screen tracking:** Root layout tracks screen views based on Expo Router segments
- **Event tracking:** `app_opened` event captured on launch (2s delay)
- **ATT:** App Tracking Transparency requested on iOS (1.5s delay) before PostHog tracking
- **Config:** API key and host from `EXPO_PUBLIC_POSTHOG_API_KEY` / `EXPO_PUBLIC_POSTHOG_HOST` env vars or `app.config.js` extras

---

## Build & Distribution: Development Build (EAS)

**Status:** App runs on an iOS Development Build (EAS), not Expo Go.

### Current Workflow
1. Use development build on phone, not Expo Go
2. Run dev server: `npx expo start`
3. Fast Refresh on save; reload in dev build if needed
4. Rebuild only when adding/removing native modules

### Do Not Re-Introduce
- `expo-barcode-scanner` or `expo-camera`
- Invalid `"undefined"` dependency in `package.json`
- Barcode scanner plugin in Expo config

---

## Important Patterns & Conventions

### Code Style
1. **TypeScript:** Strict typing throughout
2. **Error Handling:** All API functions return `{ data, error }` pattern
3. **Console Logging:** Client-side logs have been cleaned up; Edge Functions retain server-side logs
4. **Onboarding error handling:** Consistent pattern of checking for network errors and showing retry/cancel Alert dialogs

### Animation Patterns
- React Native Reanimated for all animations
- Spring animations for interactive elements
- Timing animations for transitions
- `useSharedValue` + `useAnimatedStyle` pattern

### Haptic Feedback
- Light Impact: General interactions
- Medium Impact: Important actions
- Selection Haptic: List item selections

### Navigation
- Expo Router file-based routing
- `router.push()` for forward navigation
- `router.replace()` for redirects (auth routing, onboarding completion)
- `router.back()` for back navigation

---

## Known Issues

1. **OAuth not wired** — Only email OTP flow is implemented for sign-up. OAuth buttons (Apple/Google) exist in AuthProvider but are not exposed in the onboarding UI.
2. **Old onboarding files deleted** — `welcome.tsx`, `account-basics.tsx`, `training-intent.tsx`, `app-intro.tsx`, `notifications.tsx`, `premium-offer.tsx`, `completion.tsx` were removed. All their known bugs (missing Alert imports, 15-second delay, broken Open Settings, unlinked premium offer) are resolved by removal.
3. **Existing mid-onboarding users** — Users who were partway through the old 10-step flow and re-open the app will be routed to `name-entry` (since they're already authenticated). Their sports may not be set if they hadn't reached that step — they can add sports from settings.

---

## Important Notes for Next Chat

1. **Build:** iOS Development Build (EAS). Use `npx expo start` for dev. Only `eas build` when adding/removing native modules.
2. **Payments:** RevenueCat fully wired. Don't modify unless asked.
3. **Progress Tab:** Fully implemented under `(tabs)/meals/`. Don't assume it's unfinished.
4. **Notifications:** Local scheduled notifications implemented. Push token registration not documented.
5. **Profile Features:** Hidden (`PROFILE_FEATURES_ENABLED = false`). Don't modify unless asked.
6. **Analytics:** PostHog integrated in root layout and providers.
7. **Console logs:** Client-side logs cleaned up. Keep minimal in new code.
8. **Loops:** User sync on signup works. Welcome email journeys not yet set up in Loops dashboard.
9. **Testing:** Test on real devices when possible.
10. **Onboarding:** Rebuilt with 7-step value-first flow. Auth at step 5-6. Pre-auth data stored in `OnboardingDataContext`. See `docs/ONBOARDING_REBUILD_PLAN.md` for design rationale.

---

**End of Guide**

This document should be updated whenever significant changes are made to the app architecture, patterns, or structure.
