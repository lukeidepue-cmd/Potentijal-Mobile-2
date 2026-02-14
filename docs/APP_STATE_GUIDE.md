# App State Guide - Complete Context Documentation

**Last Updated:** End of session (console log cleanup, payments & progress doc update)  
**Purpose:** This document provides complete context about the current state of the app for new chat sessions. Use this as the source of truth for understanding the app architecture, patterns, and implementation details.

---

## Where We Left Off (Session Summary)

This section gives the next chat a precise snapshot so you can pick up seamlessly.

- **Payments & Subscriptions:** RevenueCat is fully integrated: in-app purchase screen (`purchase-premium`), Restore Purchases and Manage Subscription in settings, webhook (`revenuecat-webhook`) and `sync-subscription` Edge Functions, `Purchases.configure` / `Purchases.logIn` in root layout, profile refresh on app foreground. Premium/creator status is in `profiles` (`is_premium`, `plan`). `useFeatures()` gates: games, practices, AI Trainer, highlights, creator workouts, more sports. Trial-ending-soon Edge Function exists for Loops reminders.
- **Progress Tab:** Fully implemented. Tab is under `(tabs)/meals/`: main carousel (`index.tsx`), Progress Graphs, Skill Map, Consistency Score, Training Statistics, plus purchase-premium entry. Hooks: `useProgressGraphView`, `useSkillMapData`, `useConsistencyScore`, `usePersonalRecords`, `useMostLoggedExercises`, `useExerciseProgressGraphDirect`. APIs: `exercise-filtering`, `progress-view-calculations`, `consistency-score`, `personal-records`, `most-logged-exercises`. Victory Native used for charts.
- **Notifications:** Implemented (not “ready for implementation”). `lib/notifications/notifications.ts`: workout reminders (per-mode, 11:21 PM), consistency score (weekly Sunday 8 AM, premium only), AI Trainer reminder (every 7 workouts), cancel-today’s-workout on save. Preferences in settings; root layout calls `scheduleAllWorkoutNotifications` and `scheduleConsistencyScoreNotification` when user enters main app. All console logs removed from this file.
- **Console log cleanup:** Large cleanup done to reduce logs and improve load. Removed from: `_layout.tsx`, `lib/api/` (loops, ai-trainer, settings, profile, workouts, exercise-filtering, consistency-score, personal-records, most-logged-exercises, progress-view-calculations), `hooks/` (useFeatures, useProgressGraphView, useMostLoggedExercises, useAvailableModes, useExerciseProgressGraphDirect, useConsistencyScore, usePersonalRecords), `lib/notifications/notifications.ts`, `app/(tabs)/` (workouts, workout-summary, creator-workouts), `app/onboarding/` (premium-offer, email-entry, account-basics, app-intro, sport-selection, training-intent, notifications, completion, email-verification), `app/(tabs)/settings/` (notifications, account/email-password, privacy-security, my-sports, blocked-users), `app/(tabs)/(home)/schedule-week.tsx`. **Still have console logs:** `app/(tabs)/profile/index.tsx` (many), `app/(tabs)/test-onboarding.tsx`, `lib/deep-links.ts`, `providers/AuthProvider.tsx`, `providers/SettingsContext.tsx`, `lib/api/` (schedule, social, highlights), `components/AITrainerChat.tsx`, `hooks/useExerciseProgressGraph.ts`, and **Supabase Edge Functions** (revenuecat-webhook, sync-subscription, trial-ending-soon, ai-trainer, loops, delete-auth-user) — server-side, optional to trim.
- **Profile tab:** Still controlled by `PROFILE_FEATURES_ENABLED` (default `false`). When enabled: profile, highlights, creator workouts, privacy, blocked users, etc.

**Quick reference for next session:** To continue seamlessly, read [Payments & Subscriptions (RevenueCat)](#payments--subscriptions-revenuecat), [Progress Tab (Meals)](#progress-tab-meals), [Notifications (Implemented)](#notifications-implemented), and [Console Log Cleanup](#console-log-cleanup). Client-side console logs have been removed; only Edge Functions keep server-side logs.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Authentication & User Management](#authentication--user-management)
5. [Navigation Structure](#navigation-structure)
6. [State Management](#state-management)
7. [UI/UX System](#uiux-system)
8. [API Structure](#api-structure)
9. [Feature Flags](#feature-flags)
10. [Payments & Subscriptions (RevenueCat)](#payments--subscriptions-revenuecat)
11. [Progress Tab (Meals)](#progress-tab-meals)
12. [Notifications (Implemented)](#notifications-implemented)
13. [Console Log Cleanup](#console-log-cleanup)
14. [Recent UI/UX Improvements](#recent-uiux-improvements)
15. [Build & Distribution: Development Build (EAS)](#build--distribution-development-build-eas)
16. [Important Patterns & Conventions](#important-patterns--conventions)
17. [Next Steps: Loops & Notifications](#next-steps-loops--notifications)

---

## Project Overview

This is a React Native fitness/sports tracking app built with Expo. The app allows users to:
- Track workouts, practices, and games across multiple sports (Lifting, Basketball, Football, Baseball, Soccer, Hockey, Tennis)
- View progress and statistics
- Manage training schedules
- Use an AI Trainer feature (premium)
- Track highlights and achievements

**Key Characteristics:**
- Dark theme with premium glassmorphism design
- Multi-sport support with mode switching
- Onboarding flow for new users
- Premium subscription model
- Supabase backend for authentication and data
- Loops integration for email marketing

---

## Tech Stack

### Core Framework
- **React Native:** 0.81.5
- **React:** 19.1.0
- **Expo:** ~54.0.31
- **Expo Router:** ~6.0.21 (file-based routing)

### Key Libraries
- **Supabase:** @supabase/supabase-js ^2.84.0 (Auth, Database, Storage)
- **React Native Reanimated:** ~4.1.1 (Animations)
- **Expo Haptics:** ~15.0.8 (Haptic feedback)
- **Expo Blur:** ~15.0.8 (Glassmorphism effects)
- **Expo Linear Gradient:** ~15.0.8 (Gradients)
- **React Navigation:** Bottom tabs, Stack navigation
- **Expo Notifications:** ~0.32.16 (Local scheduled notifications — implemented; see Notifications section)
- **Victory Native:** ^41.20.1 (Charts/graphs)

### Fonts
- **Geist:** Primary UI font (Regular, Medium, SemiBold, Bold, ExtraBold)
- **Space Grotesk:** Display font (Bold)

---

## Project Structure

```
my-first-app/
├── app/                          # Expo Router file-based routing
│   ├── _layout.tsx              # Root layout with auth/onboarding routing
│   ├── (tabs)/                  # Main app tabs
│   │   ├── _layout.tsx          # Tab bar configuration
│   │   ├── (home)/              # Home tab (sport-specific screens)
│   │   │   ├── index.tsx        # Home screen router
│   │   │   ├── lifting/         # Lifting mode screens
│   │   │   ├── basketball/      # Basketball mode screens
│   │   │   │   ├── index.tsx
│   │   │   │   ├── add-game.tsx
│   │   │   │   └── add-practice.tsx
│   │   │   └── [other sports]/  # Similar structure for other sports
│   │   ├── workouts.tsx         # Workouts tab (lifting workouts)
│   │   ├── meals/               # Progress tab: index (carousel), progress-graphs, skill-map, consistency-score, training-statistics, purchase-premium
│   │   ├── history/             # History tab (past workouts/games/practices)
│   │   ├── profile/             # Profile tab (hidden if PROFILE_FEATURES_ENABLED = false)
│   │   ├── purchase-premium/    # RevenueCat purchase screen (also linked from meals stack)
│   │   └── settings/            # Settings (notifications, account, privacy-security, sports-training, premium, etc.)
│   └── onboarding/              # Onboarding flow
│       ├── _layout.tsx
│       ├── welcome.tsx
│       ├── email-entry.tsx
│       ├── email-verification.tsx
│       ├── account-basics.tsx
│       ├── sport-selection.tsx
│       ├── training-intent.tsx
│       ├── app-intro.tsx
│       ├── notifications.tsx
│       ├── premium-offer.tsx
│       └── completion.tsx
├── components/                   # Reusable components
│   ├── AnimatedInput.tsx        # Input with focus animations
│   ├── AnimatedProgressBar.tsx  # Progress bar with animations
│   ├── AppHeader.tsx            # App header with glassmorphism
│   ├── AITrainerChat.tsx        # AI Trainer chat interface
│   ├── Button.tsx               # Primary/secondary buttons with haptics
│   ├── Card.tsx                 # Card component with gradients
│   ├── ErrorToast.tsx           # Error toast notifications
│   ├── SuccessToast.tsx         # Success toast notifications
│   ├── PremiumGatedCard.tsx     # Premium feature gating
│   ├── UpgradeModal.tsx         # Premium upgrade modal
│   └── ui/                      # UI-specific components
│       ├── AnimatedTabBarIcon.tsx
│       ├── TabBarBackground.tsx
│       └── CustomRefreshControl.tsx
├── supabase/
│   └── functions/               # Edge Functions
│       ├── revenuecat-webhook/  # RevenueCat → profiles (is_premium, plan)
│       ├── sync-subscription/   # Restore purchases: RevenueCat → profiles
│       ├── trial-ending-soon/    # Loops trial reminder emails (cron)
│       ├── ai-trainer/          # AI Trainer chat backend
│       ├── loops/               # Loops (if used)
│       └── delete-auth-user/    # Account deletion
├── constants/
│   ├── theme.ts                 # Design system (colors, typography, spacing)
│   └── features.ts              # Feature flags
├── hooks/
│   ├── useFeatures.ts           # Premium/creator feature access (getMyProfile, isPremium, canLogGames, etc.)
│   ├── useColorScheme.ts        # Theme hook
│   ├── useProgressGraphView.ts  # Progress tab: bucket data for progress-graphs
│   ├── useSkillMapData.ts       # Progress tab: skill map data
│   ├── useConsistencyScore.ts   # Progress tab: consistency score
│   ├── usePersonalRecords.ts    # Progress tab: PRs
│   ├── useMostLoggedExercises.ts # Progress tab: most logged exercises
│   ├── useExerciseProgressGraphDirect.ts # Progress: direct metric over time
│   ├── useAvailableModes.ts     # Available sport modes from profile
│   └── useExerciseProgressGraph.ts
├── lib/
│   ├── api/                     # API functions
│   │   ├── workouts.ts
│   │   ├── practices.ts
│   │   ├── games.ts
│   │   ├── history.ts
│   │   ├── profile.ts
│   │   ├── onboarding.ts
│   │   ├── settings.ts          # updateEmail, deleteAccount, reorderSports, getUserPreferences, etc.
│   │   ├── loops.ts             # Loops email integration
│   │   ├── exercise-filtering.ts # getAvailableExercisesForView (Progress tab)
│   │   ├── progress-view-calculations.ts # Drill/completion/etc. bucket value calcs
│   │   ├── consistency-score.ts
│   │   ├── personal-records.ts
│   │   ├── most-logged-exercises.ts
│   │   ├── schedule.ts
│   │   ├── ai-trainer.ts
│   │   └── [other APIs]
│   ├── notifications/           # Local scheduled notifications (workout, consistency, AI reminder)
│   │   └── notifications.ts
│   ├── supabase.ts
│   ├── deep-links.ts            # Email verification / OAuth callback handling
│   └── types.ts
├── providers/
│   ├── AuthProvider.tsx         # Authentication context
│   ├── ModeContext.tsx          # Sport mode context
│   └── SettingsContext.tsx      # Settings context
└── docs/                        # Documentation

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
- `signInWithOAuth(provider)`: OAuth sign in (Apple/Google)
- `signInWithOtp(email)`: Send 6-digit OTP code to email
- `verifyOtp(email, token)`: Verify OTP code
- `refreshOnboardingStatus()`: Re-check onboarding status

**Key Behaviors:**
- Automatically syncs new users to Loops on signup
- Checks onboarding status after auth state changes
- Listens to Supabase auth state changes
- Onboarding status is checked via `needsOnboarding()` API call

### Authentication Flow

1. **New User:**
   - Enters email → Receives OTP code → Verifies code → Creates account
   - OR: OAuth sign in (Apple/Google)
   - User is synced to Loops automatically
   - Onboarding status set to `true`
   - Routed to onboarding flow

2. **Existing User:**
   - Signs in → Onboarding status checked
   - If `needsOnboarding === true`: Routed to onboarding (resumes from last step)
   - If `needsOnboarding === false`: Routed to main app

3. **Onboarding Flow:**
   - Multi-step process tracked in `onboarding` table
   - Current step stored in `current_step` column
   - Steps: welcome → email-entry → email-verification → account-basics → sport-selection → training-intent → app-intro → notifications → premium-offer → completion
   - If user is authenticated, email-entry and email-verification are skipped

### Root Layout Routing (`app/_layout.tsx`)

**Logic:**
- Shows loading screen while auth/onboarding status loads
- Routes based on:
  - No user → `/onboarding/welcome`
  - User + `needsOnboarding === true` → Resume onboarding from `current_step`
  - User + `needsOnboarding === false` → `/(tabs)` (main app)

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
- `settings/*` - All settings screens (accessed via settings button)
- `purchase-premium` - Premium purchase screen
- `test-auth` - Auth testing screen

**Tab Bar Styling:**
- Glassmorphism background (`TabBarBackground` component)
- Animated icons (`AnimatedTabBarIcon` with scale animation)
- Brand green (#22C55E) for active state
- Semi-transparent white for inactive state

### Home Tab Structure (`app/(tabs)/(home)/`)

**Router Screen:** `index.tsx` - Routes to sport-specific home screens based on current mode

**Sport-Specific Screens:**
Each sport has its own directory with:
- `index.tsx` - Home screen for that sport
- `add-game.tsx` - Add game screen
- `add-practice.tsx` - Add practice screen
- `weekly-goals.tsx` - Weekly goals (some sports)

**Supported Sports:**
- `lifting` - Weightlifting/workouts
- `basketball` - Basketball
- `football` - Football
- `baseball` - Baseball
- `soccer` - Soccer
- `hockey` - Hockey
- `tennis` - Tennis

### Stack Navigations

- **Home Stack:** `(home)/_layout.tsx` - Fade animations for add-game/add-practice screens
- **Meals Stack:** `meals/_layout.tsx` - Progress-related screens
- **Settings Stack:** `settings/_layout.tsx` - Settings screens
- **Onboarding Stack:** `onboarding/_layout.tsx` - Fade transitions

---

## State Management

### Context Providers

1. **AuthProvider** (`providers/AuthProvider.tsx`)
   - Authentication state
   - User session
   - Onboarding status

2. **ModeContext** (`providers/ModeContext.tsx`)
   - Current sport mode: `"lifting" | "basketball" | "football" | "baseball" | "soccer" | "hockey" | "tennis"`
   - Loads from user's `primary_sport` in profile
   - Falls back to first sport in `sports` array
   - Defaults to `"lifting"` if no sport set

3. **SettingsContext** (`providers/SettingsContext.tsx`)
   - App settings state

### Hooks

- `useAuth()` - Access auth context
- `useMode()` - Access mode context
- `useFeatures()` - Check feature flags
- `useColorScheme()` - Theme colors

---

## UI/UX System

### Theme (`constants/theme.ts`)

**Color Palette:**
- **Backgrounds:** `bg0` (#070B10), `surface1` (#0D131B), `surface2` (#111A24)
- **Text:** `textHi` (#E6F1FF), `textLo` (#8AA0B5)
- **Brand:** `primary600` (#17D67F), `primary500` (#1FEA8D), `primary700` (#0DBA6D)
- **Brand Green (Tab Bar):** #22C55E
- **Accents:** Blue, Teal, Mint, Amber, Rose

**Typography:**
- **H1:** 28px, 900 weight
- **H2:** 22px, 900 weight
- **Title:** 16px, 900 weight
- **Label:** 12px, 800 weight, uppercase
- **Muted:** 13px, 700 weight

**Spacing:**
- `xs: 6`, `sm: 8`, `md: 10`, `lg: 12`, `xl: 16`, `xxl: 20`

**Border Radius:**
- `sm: 8`, `md: 12`, `lg: 16`, `xl: 24`, `pill: 999`

**Shadows:**
- `soft`: opacity 0.25, radius 12, elevation 6
- `hard`: opacity 0.40, radius 18, elevation 10

### Design System Principles

1. **Dark Theme:** Deep dark backgrounds with light text
2. **Glassmorphism:** Blur effects on headers, tab bar, modals
3. **Gradients:** Subtle gradients for depth
4. **Animations:** Smooth spring animations for interactions
5. **Haptic Feedback:** Light haptics on button presses, tab changes, input focus

### Key Components

**AnimatedInput** (`components/AnimatedInput.tsx`)
- Text input with focus animations
- Scale animation on focus (1.02x)
- Border color transition
- Haptic feedback on focus

**Button** (`components/Button.tsx`)
- Primary and secondary variants
- Haptic feedback on press
- Gradient backgrounds for primary

**Card** (`components/Card.tsx`)
- Glassmorphism-style card
- Gradient overlays
- Top highlight gradient
- Optional press handler

**SuccessToast** (`components/SuccessToast.tsx`)
- Animated success notification
- Checkmark animation
- Auto-dismisses after 2 seconds
- Spring animations

**ErrorToast** (`components/ErrorToast.tsx`)
- Animated error notification
- Shake animation
- Auto-dismisses after 3 seconds

**AnimatedProgressBar** (`components/AnimatedProgressBar.tsx`)
- Progress bar with percentage display
- Smooth animations
- Used for uploads and long operations

**AppHeader** (`components/AppHeader.tsx`)
- Glassmorphism header with blur
- Title, icon, and right accessory support
- Used across sport-specific screens

---

## API Structure

### API Functions (`lib/api/`)

All API functions follow a consistent pattern:
- Return `{ data: T | null, error: any }`
- Handle authentication automatically
- Use Supabase client from `lib/supabase.ts`

**Key APIs:**

**Workouts** (`workouts.ts`)
- `createWorkout()`, `getWorkoutWithDetails()`, `listWorkouts()`, etc.

**Practices** (`practices.ts`)
- `createPractice()`, `getPracticeDetail()`, `listPractices()`, etc.

**Games** (`games.ts`)
- `createGame()`, `getGameDetail()`, `listGames()`, etc.

**History** (`history.ts`)
- `listWorkouts()`, `listPractices()`, `listGames()`
- `getHistoryStats()` - Statistics for history tab
- `getWorkoutDetail()`, `getPracticeDetail()`, `getGameDetail()`

**Onboarding** (`onboarding.ts`)
- `getOnboardingState()` - Get current onboarding step
- `updateOnboardingStep()` - Update current step
- `needsOnboarding()` - Check if user needs onboarding
- `completeOnboarding()` - Mark onboarding as complete

**Loops** (`loops.ts`)
- `createOrUpdateContact()` - Sync user to Loops
- `sendTransactionalEmail()` - Send transactional emails
- `trackEvent()` - Track user events
- `deleteContact()` - Remove user from Loops
- `syncUserToLoops()` - Helper for signup sync

**Profile** (`profile.ts`)
- `getMyProfile()` - Get current user's profile
- `updateProfile()` - Update profile data

### Supabase Client (`lib/supabase.ts`)

- Configured with environment variables
- Used by all API functions
- Handles authentication automatically

---

## Feature Flags

### Current Flags (`constants/features.ts`)

**PROFILE_FEATURES_ENABLED** (default: `false`)
- Controls visibility of profile tab and all profile features
- When `false`: Profile tab hidden from tab bar
- All profile code remains intact, just hidden from UI
- To re-enable: Set to `true` and restart app

**Usage:**
```typescript
import { PROFILE_FEATURES_ENABLED } from '../constants/features';
// In tab layout:
href: PROFILE_FEATURES_ENABLED ? undefined : null
```

---

## Payments & Subscriptions (RevenueCat)

**Status:** Fully integrated. Purchases unlock premium in the app via Supabase `profiles` and the RevenueCat webhook.

### Client (App)

- **Root layout (`app/_layout.tsx`):**
  - RevenueCat configured at launch: `Purchases.configure({ apiKey, appUserID: user?.id ?? 'anonymous' })` (API key from `Constants.expoConfig?.extra?.revenueCatPublicApiKey` or `process.env.EXPO_PUBLIC_REVENUECAT_API_KEY`).
  - On user change: `Purchases.logIn(user.id)` when signed in, `Purchases.logOut()` when not (so webhook receives Supabase user UUID).
  - On app foreground: `ProfileRefreshContext.refreshProfile()` throttled (max once per 15s) so webhook-updated premium status is reflected without reopening app.
- **Purchase screen:** `app/(tabs)/purchase-premium/index.tsx` — loads RevenueCat offerings (monthly/yearly), purchase flow, promo code entry, `recordPaywallCodeEntered`, `completeOnboarding` when from onboarding. Uses `react-native-purchases` (Purchases).
- **Settings:** `app/(tabs)/settings/premium/restore-purchases.tsx` (calls `Purchases.restorePurchases()` then `supabase.functions.invoke('sync-subscription')`, then `refreshProfile()`); `app/(tabs)/settings/premium/manage-subscription.tsx` for subscription management.
- **Premium gating:** `hooks/useFeatures.ts` — reads `getMyProfile()`, derives `isPremium` from `profile.plan === 'premium' || profile.is_premium === true || profile.plan === 'creator' || profile.is_creator === true`. Creators get all premium features without subscribing. Exposes: `canLogGames`, `canLogPractices`, `canUseAITrainer`, `canAddHighlights`, `canViewCreatorWorkouts`, `canAddMoreSports`. Components: `UpgradeModal`, `PremiumGatedCard`.

### Backend (Supabase)

- **Edge Function: `revenuecat-webhook`**
  - Receives RevenueCat webhooks (POST). Auth: `Authorization` header must match `REVENUECAT_WEBHOOK_SECRET` (or `Bearer <secret>`).
  - Events that set premium: `INITIAL_PURCHASE`, `RENEWAL`, `UNCANCELLATION`, `NON_RENEWING_PURCHASE`, `SUBSCRIPTION_EXTENDED`, `PRODUCT_CHANGE`, `REFUND_REVERSED`, `SUBSCRIPTION_PAUSED` → set `profiles.is_premium = true`, `profiles.plan = 'premium'` for `id = app_user_id`.
  - Events that set free: `CANCELLATION`, `EXPIRATION` → `is_premium = false`, `plan = 'free'`.
  - `BILLING_ISSUE`: no profile change. Optional: Loops events (e.g. purchase) if configured.
  - Always returns 200 for valid POSTs. Configure webhook URL in RevenueCat (Sandbox + Production if you want TestFlight/sandbox to update profiles). **Critical:** App must call `Purchases.logIn(user.id)` so `app_user_id` is the Supabase user UUID.
- **Edge Function: `sync-subscription`**
  - POST, requires Supabase JWT. Reads user from JWT, calls RevenueCat `GET /v1/subscribers/{app_user_id}` with **secret** API key, then updates `profiles.is_premium` and `profiles.plan` from entitlement. Used by Restore Purchases.
- **Secrets:** `REVENUECAT_WEBHOOK_SECRET` (webhook auth), `REVENUECAT_SECRET_API_KEY` (sk_..., for sync-subscription). Public API key is in app config / env only.

### Trial / Loops

- **Edge Function: `trial-ending-soon`** — Intended for daily cron. Sends Loops events: `trial_one_week_remaining` (paid renews in ~1 week), `trial_ending_soon` (free trial ends in 1 day). Uses `LOOPS_API_KEY`; optional `CRON_SECRET` for auth.

### Docs

- `supabase/functions/revenuecat-webhook/README.md`, `supabase/functions/sync-subscription/README.md`, `supabase/functions/trial-ending-soon/README.md`.

---

## Progress Tab (Meals)

**Status:** Fully implemented. The “Progress” tab in the tab bar is the `meals` group (path `(tabs)/meals/`).

### Screens (`app/(tabs)/meals/`)

- **index.tsx** — Main Progress screen: horizontal carousel of cards (Training Statistics, Progress Graphs, Skill Map, Consistency Score, etc.). Uses `useFeatures()` for premium; some cards link to `purchase-premium` or show upgrade modal. AI Trainer chat can be opened from here.
- **training-statistics.tsx** — Training statistics view (sport/mode, time range, metrics).
- **progress-graphs.tsx** — Progress over time: view type (e.g. drill/completion), exercise picker, time interval, chart (Victory Native). Data from `getAvailableExercisesForView` and progress view calculations.
- **skill-map.tsx** — Skill map visualization: select exercises, time range, sport; chart shows relative strength/performance per exercise.
- **consistency-score.tsx** — Weekly consistency score (scheduled vs logged workouts).
- **purchase-premium** — Stack screen in same stack; links to premium purchase (RevenueCat).

### Layout

- **meals/_layout.tsx** — Stack with `index`, `progress-graphs`, `skill-map`, `consistency-score`, `training-statistics`, `purchase-premium`; all with `headerShown: false`, fade animation.

### Hooks (data for Progress)

- **useProgressGraphView** — Fetches workouts/exercises/sets for a mode/view/interval, buckets by time, computes view-specific value (e.g. drill = total reps, completion = avg completion %). Used by progress-graphs.
- **useSkillMapData** — Fetches exercises/sets for selected exercises and time range; computes skill map values per exercise. Used by skill-map.
- **useConsistencyScore** — Current week, historical weeks, average consistency. Used by consistency-score.
- **usePersonalRecords** — Personal records for an exercise type. Used by training statistics / PRs.
- **useMostLoggedExercises** — Most logged exercises for a mode/interval. Used for exercise pickers.
- **useExerciseProgressGraphDirect** — Direct workout/exercise/set query for a metric and query string; buckets into time buckets for line chart.

### API / Lib

- **lib/api/exercise-filtering.ts** — `getAvailableExercisesForView(mode, viewName, timeInterval)` — unique exercise names for a sport mode and view type (e.g. drill, completion), with optional time window.
- **lib/api/progress-view-calculations.ts** — Pure functions: `calculateDrillView`, `calculateCompletionView`, etc., and interval variants (e.g. `calculateDrillViewForInterval`). Used by hooks to compute one value per bucket.
- **lib/api/consistency-score.ts** — Fetch scheduled vs logged workouts, compute consistency; historical and average scores.
- **lib/api/personal-records.ts** — Detect exercise type, fetch workouts/exercises/sets, compute PRs.
- **lib/api/most-logged-exercises.ts** — Most logged exercises for mode/interval.

### Docs

- `docs/PROGRESS_TAB_IMPLEMENTATION_PLAN.md`, `docs/TRAINING_STATISTICS_IMPLEMENTATION_PLAN.md`, `docs/CONSISTENCY_SCORE_IMPLEMENTATION_PLAN.md`, `docs/SKILL_MAP_IMPLEMENTATION_PLAN.md`.

---

## Notifications (Implemented)

**Status:** Implemented in app code. Local scheduled notifications; preferences stored and respected.

### Behavior

- **Workout reminders (per sport mode):** If user has a scheduled workout for today (from schedule) and workout_reminders preference is on, app schedules one notification per mode for “today” at 11:21 PM (configurable in code). When user saves a workout, “today’s” notification for that mode is canceled (`cancelTodaysWorkoutNotification(mode)`). Rescheduled when user saves schedule week (`schedule-week.tsx` calls `scheduleWorkoutNotification(m)`).
- **Consistency score (weekly):** For premium/creator users with workout_reminders on, a weekly notification is scheduled (Sunday 8 AM). `scheduleConsistencyScoreNotification()` in root layout when user enters main app.
- **AI Trainer reminder:** After every 7th logged workout (tracked in AsyncStorage), if ai_trainer_insights preference is on, a notification is scheduled for 1 hour from now. `trackWorkoutAndScheduleAITrainerReminder()` is called from `workout-summary.tsx` after save.

### Entry points

- **Root layout:** When `needsOnboarding === false` and user is routed to `/(tabs)`, calls `scheduleAllWorkoutNotifications().catch(() => {})` and `scheduleConsistencyScoreNotification().catch(() => {})`.
- **Schedule week save:** `app/(tabs)/(home)/schedule-week.tsx` — after saving schedule, calls `scheduleWorkoutNotification(m)` for the relevant mode.
- **Workout summary:** After successful save, calls `cancelTodaysWorkoutNotification(workoutData.mode)` and `trackWorkoutAndScheduleAITrainerReminder()`.

### API (`lib/notifications/notifications.ts`)

- `requestNotificationPermissions()`, `cancelNotification(identifier)`, `cancelAllNotifications()`.
- `scheduleWorkoutNotification(mode)`, `scheduleAllWorkoutNotifications()`, `scheduleConsistencyScoreNotification()`, `trackWorkoutAndScheduleAITrainerReminder()`, `cancelTodaysWorkoutNotification(mode)`.
- Uses: `getUserPreferences()`, `getScheduleWithStatus()`, `getMyProfile()`, `getCurrentWeekStart()`. Notification IDs: `SCHEDULED_WORKOUT`, `CONSISTENCY_SCORE`, `AI_TRAINER_REMINDER`.

### Settings

- **app/(tabs)/settings/notifications/index.tsx** — Toggles for workout_reminders, email_notifications, ai_trainer_insights. When workout_reminders is turned off, cancels all scheduled workout and consistency score notifications; when turned on, calls `scheduleAllWorkoutNotifications()` and `scheduleConsistencyScoreNotification()`. When ai_trainer_insights is turned off, cancels AI Trainer reminder. All console logs removed from this screen.

### Package

- **expo-notifications** — Used for permissions, scheduling, and cancellation. No push token sending to backend documented here (local-only scheduling).

---

## Console Log Cleanup

A large console log cleanup was done to reduce noise and improve perceived load. Only essential or intentional logs remain in a few places.

### Files where console.* was removed (no or minimal logs left)

- **Root / layout:** `app/_layout.tsx`
- **API:** `lib/api/loops.ts`, `lib/api/ai-trainer.ts`, `lib/api/settings.ts` (updateEmail, deleteAccount, reorderSports), `lib/api/profile.ts` (getProfileStats, uploadProfileImage), `lib/api/workouts.ts`, `lib/api/exercise-filtering.ts`, `lib/api/consistency-score.ts`, `lib/api/personal-records.ts`, `lib/api/most-logged-exercises.ts`, `lib/api/progress-view-calculations.ts`
- **Hooks:** `hooks/useFeatures.ts`, `hooks/useProgressGraphView.ts`, `hooks/useMostLoggedExercises.ts`, `hooks/useAvailableModes.ts`, `hooks/useExerciseProgressGraphDirect.ts`, `hooks/useConsistencyScore.ts`, `hooks/usePersonalRecords.ts`
- **Notifications:** `lib/notifications/notifications.ts`
- **Screens:** `app/(tabs)/workouts.tsx`, `app/(tabs)/workout-summary.tsx`, `app/(tabs)/profile/creator-workouts.tsx`, `app/onboarding/` (premium-offer, email-entry, account-basics, app-intro, sport-selection, training-intent, notifications, completion, email-verification), `app/(tabs)/(home)/schedule-week.tsx`, `app/(tabs)/settings/notifications/index.tsx`, `app/(tabs)/settings/account/email-password.tsx`, `app/(tabs)/settings/privacy-security/index.tsx`, `app/(tabs)/settings/privacy-security/blocked-users.tsx`, `app/(tabs)/settings/sports-training/my-sports.tsx`

### Client-side console logs (cleaned)

All unnecessary client-side console logs have been removed from: `app/(tabs)/profile/index.tsx`, `app/(tabs)/test-onboarding.tsx`, `lib/deep-links.ts`, `providers/AuthProvider.tsx`, `providers/SettingsContext.tsx`, `lib/api/schedule.ts`, `lib/api/social.ts`, `lib/api/highlights.ts`, `components/AITrainerChat.tsx`, `hooks/useAvailableModes.ts`, `hooks/useExerciseProgressGraph.ts`. Only essential behavior remains; no debug/info logging in the app.

### Edge Functions (server-side)

**Edge Functions (server-side)** still contain console.* for server debugging: `revenuecat-webhook`, `sync-subscription`, `trial-ending-soon`, `ai-trainer`, `loops`, `delete-auth-user`. These do not run in the app and do not affect client performance.

---

## Recent UI/UX Improvements

The following improvements have been implemented (as of this session):

### ✅ Completed Steps

1. **Input Focus Animations** (Step 4)
   - Scale animations on input focus
   - Haptic feedback on focus
   - Applied to search bars, workout name input, chat input

2. **Success/Error Feedback Animations** (Step 6)
   - `SuccessToast` component with checkmark animation
   - `ErrorToast` component with shake animation
   - Applied to all save operations (workouts, games, practices)
   - Auto-dismiss with smooth animations

3. **Haptic Feedback** (Step 7)
   - Added to all interactive elements:
     - Button presses (Light impact)
     - Switch toggles (Light impact)
     - Tab changes (Light impact)
     - Input focus (Light impact)
     - List item presses (Selection haptic)

4. **Progress Indicators** (Step 8)
   - `AnimatedProgressBar` component
   - Used for file uploads (profile images, highlights)
   - Shows percentage and label
   - Smooth animations

5. **Glassmorphism** (Step 11)
   - Applied to tab bar background
   - Applied to app headers
   - Applied to workout tab header
   - BlurView with intensity 15-25

### ❌ Skipped Steps

- **Step 5:** List Item Entrance Animations (reverted)
- **Step 9:** Swipe Gestures (reverted - user didn't like)
- **Step 10:** Tab Bar Active Indicator (reverted - didn't work well)

### Current UI State

- **Tab Bar:** Glassmorphism background, animated icons, brand green active state
- **Inputs:** Focus animations with scale and haptics
- **Buttons:** Haptic feedback, smooth press animations
- **Toasts:** Success/error feedback with animations
- **Progress:** Animated progress bars for long operations
- **Modals:** Standard modals (glassmorphism was reverted by user)

---

## Build & Distribution: Development Build (EAS)

**Status:** App runs on an **iOS Development Build** (EAS), not Expo Go. This section documents the migration and current build workflow so Cursor can continue building accordingly.

### Goal of Migration

Move the app from Expo Go to a real iOS Development Build so native SDKs (RevenueCat, push, etc.) can work.

### 1) EAS Setup + Apple Developer Enrollment

**What was done:**
- Installed/used EAS CLI and configured the project: `eas build:configure`
- Enrolled in the Apple Developer Program ($99/yr)
- Registered the iPhone as an internal distribution device (Expo generated QR/profile install)

**Result:** Project prepared for EAS builds; device registered to install dev builds.

### 2) Fixed Corrupted Dependency (Broke All EAS Installs)

**Root cause:** EAS failed at "Install dependencies" with:
- `npm ERR! EINVALIDTAGNAME` — Invalid tag name `"\"` of package `"undefined@"\"`

**Actual bug in package.json:**
```json
"dependencies": {
  "undefined": "\\"
}
```

**What was changed:** Removed this invalid dependency line from `package.json`. Cleaned installs and regenerated lockfile (`rm node_modules`, `rm package-lock.json`, `npm install`), then committed and pushed.

**Result:** Dependency install phase stopped failing; EAS proceeded to native build steps.

### 3) Fixed iOS Native Build Failure (Barcode Scanner Module)

**Root cause:** EAS iOS build failed with Xcode errors:
- `'ExpoModulesCore/EXBarcodeScannerInterface.h' file not found`
- `could not build Objective-C module 'EXBarCodeScanner'`
- Caused by deprecated/legacy module: `expo-barcode-scanner@13.0.1`

**What was changed:**
- Removed: `npm uninstall expo-barcode-scanner`
- Removed: `npm uninstall expo-camera` (camera/scanner no longer needed)
- Verified no remaining code references to `expo-barcode-scanner` or `BarCodeScanner`
- Clean reinstall (removed `node_modules` + `package-lock.json`, `npm install`), committed and pushed

**Result:** Native barcode/camera modules removed from dependency graph.

### 4) Removed Leftover Expo Config Plugin Reference

**Root cause:** After uninstalling packages, EAS still failed with:
- `Failed to resolve plugin for module "expo-barcode-scanner"`
- `npx expo config --json` exited with non-zero code (config still referenced the plugin)

**What was changed:** Removed the `"expo-barcode-scanner"` entry from the Expo config (e.g. `app.json` or `config.json` under `expo.plugins`). Committed and pushed.

**Result:** `npx expo config` worked again; EAS could proceed.

### 5) Successful iOS Development Build + Install

**What was done:**
- Ran: `eas build --profile development --platform ios --clear-cache`
- Scanned QR / installed the iOS dev build ("my-first-app") onto the phone
- Enabled Developer Mode on iPhone (required for dev builds)
- Started Metro locally: `npx expo start` — scanning QR now opens the dev build app instead of Expo Go

**Result:** Dev build is installed and working; app loads from Metro; Cursor edits reflect via hot reload / reload.

### Current Removed Packages / Config

- **Removed:** `expo-barcode-scanner`
- **Removed:** `expo-camera`
- **Removed:** Invalid dependency `"undefined": "\\"` from `package.json`
- **Removed:** `expo-barcode-scanner` from `expo.plugins` in app config (e.g. `app.json`)

### Current Workflow (Important for Cursor)

1. **Use development build on phone, not Expo Go.** The app runs in the custom dev build.
2. **Run dev server:** `npx expo start` — connect device to Metro.
3. **App updates:** Fast Refresh on save, or reload in the dev build if needed.
4. **Rebuild dev build only when:** Adding/removing native modules (e.g. RevenueCat, new native SDKs). Normal JS/React changes do not require a new build.

### Do Not Re-Introduce

- Do not add `expo-barcode-scanner` or `expo-camera` back unless explicitly required.
- Do not add the invalid `"undefined"` dependency back to `package.json`.
- Do not add the barcode scanner plugin back to Expo config.
- Assume the app runs in a **development build** (native code present); do not assume Expo Go–only workflows.

---

## Important Patterns & Conventions

### Code Style

1. **TypeScript:** Strict typing throughout
2. **Error Handling:** All API functions return `{ data, error }` pattern
3. **Async/Await:** Used consistently for async operations
4. **Console Logging:** A major cleanup removed most client-side logs for performance. In cleaned files, avoid re-adding non-essential console.*. Remaining logs (e.g. profile, onboarding, Edge Functions) may still use emoji prefixes (🔵 ✅ ❌ ⚠️). Prefer minimal logging in new code.

### Animation Patterns

1. **React Native Reanimated:** Used for all animations
2. **Spring Animations:** Preferred for interactive elements
3. **Timing Animations:** Used for simple transitions
4. **Shared Values:** Used for animated values
5. **Animated Styles:** Created with `useAnimatedStyle()`

### Haptic Feedback Patterns

- **Light Impact:** General interactions (buttons, switches, tabs)
- **Medium Impact:** Important actions (upgrade buttons)
- **Selection Haptic:** List item selections

### Component Patterns

1. **Reusable Components:** Created in `components/` directory
2. **UI Components:** Specialized components in `components/ui/`
3. **Consistent Props:** Similar components use similar prop patterns
4. **Platform-Specific:** Use `Platform.OS` checks when needed

### Navigation Patterns

1. **Expo Router:** File-based routing
2. **Stack Navigation:** Used for nested screens
3. **Tab Navigation:** Main app navigation
4. **Deep Links:** Supported via expo-router

### API Patterns

1. **Consistent Returns:** `{ data: T | null, error: any }`
2. **Auth Checks:** All APIs check authentication automatically
3. **Error Handling:** Errors logged and returned, not thrown
4. **Type Safety:** TypeScript interfaces for all data structures

---

## Next Steps: Loops & Notifications

### Current Loops Integration

**Status:** Partially implemented

**What's Working:**
- `lib/api/loops.ts` - Complete API functions (all console logs removed in cleanup)
- User sync on signup (`syncUserToLoops()` called in `AuthProvider`)
- Contact creation/update
- Event tracking functions
- Transactional email functions
- RevenueCat webhook can send Loops events on purchase (if configured)
- `trial-ending-soon` Edge Function for trial reminder emails (Loops)

**What Needs Work:**
- Welcome email Journey setup in Loops dashboard
- Event tracking implementation throughout app
- Email preferences management
- Unsubscribe handling
- Email update confirmations (if needed)

**Key Files:**
- `lib/api/loops.ts` - All Loops API functions
- `providers/AuthProvider.tsx` - Calls `syncUserToLoops()` on signup
- `supabase/functions/loops/` - Edge Function if used
- `docs/LOOPS_*.md` - Existing Loops documentation

### Current Notifications Integration

**Status:** Implemented (local scheduled notifications). See [Notifications (Implemented)](#notifications-implemented) for full detail.

**What's Done:**
- `expo-notifications` package in use
- Permissions, scheduling, cancellation in `lib/notifications/notifications.ts` (all console logs removed)
- Workout reminders (per mode, 11:21 PM), consistency score (weekly, premium), AI Trainer reminder (every 7 workouts)
- Settings screen toggles and reschedule/cancel on preference change
- Root layout schedules workout + consistency notifications when user enters main app
- Workout summary cancels today’s reminder and triggers AI Trainer reminder after save

---

## Important Notes for Next Chat

1. **Build & Distribution:** The app runs on an **iOS Development Build** (EAS), not Expo Go. Use `npx expo start` for dev; only suggest `eas build` when adding/removing native modules. Do not re-add `expo-barcode-scanner`, `expo-camera`, or the invalid `undefined` dependency. See [Build & Distribution: Development Build (EAS)](#build--distribution-development-build-eas) for full context.

2. **Payments:** RevenueCat is fully wired: purchase screen, restore/manage in settings, webhook + sync-subscription Edge Functions, `Purchases.logIn(user.id)` in root layout, profile refresh on foreground. Premium/creator comes from `profiles`. See [Payments & Subscriptions (RevenueCat)](#payments--subscriptions-revenuecat).

3. **Progress Tab:** Fully implemented under `(tabs)/meals/`: carousel, progress graphs, skill map, consistency score, training statistics; hooks and APIs listed in [Progress Tab (Meals)](#progress-tab-meals). Don’t assume it’s unfinished.

4. **Notifications:** Local scheduled notifications are implemented (workout reminders, consistency score, AI Trainer reminder). See [Notifications (Implemented)](#notifications-implemented). Push token registration / server-side push is not documented here.

5. **Profile Features:** Currently hidden (`PROFILE_FEATURES_ENABLED = false`). Don’t modify profile-related code unless explicitly asked. When enabled: profile tab, highlights, creator workouts, privacy, blocked users.

6. **Console logs:** Client-side logs have been removed from all app code (profile, providers, lib, hooks, components). Edge Functions retain server-side logs for debugging. See [Console Log Cleanup](#console-log-cleanup).

7. **Loops:** User sync on signup works. Next: Loops Journeys (welcome emails), event tracking in app, email preferences. Trial-ending-soon Edge Function exists for trial reminder emails.

8. **Code Quality:** Follow existing patterns. Prefer keeping console usage minimal in client code; Edge Functions can keep logs for server debugging unless user wants them reduced.

9. **Testing:** Test on real devices when possible (haptics, animations, notifications, purchases).

---

## Quick Reference

### Key Imports

```typescript
// Auth
import { useAuth } from '../providers/AuthProvider';

// Mode
import { useMode } from '../providers/ModeContext';

// Theme
import { theme } from '../constants/theme';

// Features
import { PROFILE_FEATURES_ENABLED } from '../constants/features';

// Navigation
import { router } from 'expo-router';

// Haptics
import * as Haptics from 'expo-haptics';

// Animations
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
```

### Common Patterns

**API Call:**
```typescript
const { data, error } = await someApiFunction();
if (error) {
  console.error('Error:', error);
  return;
}
// Use data
```

**Haptic Feedback:**
```typescript
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
```

**Animation:**
```typescript
const scale = useSharedValue(1);
const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: scale.value }],
}));
scale.value = withSpring(1.1, { damping: 15, stiffness: 300 });
```

**Navigation:**
```typescript
router.push('/(tabs)/workouts');
router.replace('/onboarding/welcome');
```

---

**End of Guide**

This document should be updated whenever significant changes are made to the app architecture, patterns, or structure.
