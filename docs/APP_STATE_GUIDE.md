# App State Guide - Complete Context Documentation

**Last Updated:** Current Session  
**Purpose:** This document provides complete context about the current state of the app for new chat sessions. Use this as the source of truth for understanding the app architecture, patterns, and implementation details.

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
10. [Recent UI/UX Improvements](#recent-uiux-improvements)
11. [Important Patterns & Conventions](#important-patterns--conventions)
12. [Next Steps: Loops & Notifications](#next-steps-loops--notifications)

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
- **Expo Notifications:** ~0.32.16 (Push notifications - ready for implementation)
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
│   │   ├── meals/               # Progress tab (stats, graphs)
│   │   ├── history/             # History tab (past workouts/games/practices)
│   │   ├── profile/             # Profile tab (hidden if PROFILE_FEATURES_ENABLED = false)
│   │   └── settings/            # Settings screens
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
├── constants/
│   ├── theme.ts                 # Design system (colors, typography, spacing)
│   └── features.ts              # Feature flags
├── hooks/
│   ├── useFeatures.ts           # Feature flag hook
│   ├── useColorScheme.ts        # Theme hook
│   └── useExerciseProgressGraph.ts
├── lib/
│   ├── api/                     # API functions
│   │   ├── workouts.ts
│   │   ├── practices.ts
│   │   ├── games.ts
│   │   ├── history.ts
│   │   ├── profile.ts
│   │   ├── onboarding.ts
│   │   ├── loops.ts             # Loops email integration
│   │   └── [other APIs]
│   ├── supabase.ts              # Supabase client
│   └── types.ts                 # TypeScript types
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

## Important Patterns & Conventions

### Code Style

1. **TypeScript:** Strict typing throughout
2. **Error Handling:** All API functions return `{ data, error }` pattern
3. **Async/Await:** Used consistently for async operations
4. **Console Logging:** Uses emoji prefixes (🔵 info, ✅ success, ❌ error, ⚠️ warning)

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
- `lib/api/loops.ts` - Complete API functions
- User sync on signup (`syncUserToLoops()` called in `AuthProvider`)
- Contact creation/update
- Event tracking functions
- Transactional email functions

**What Needs Work:**
- Welcome email Journey setup in Loops dashboard
- Event tracking implementation throughout app
- Email preferences management
- Unsubscribe handling
- Email update confirmations (if needed)

**Key Files:**
- `lib/api/loops.ts` - All Loops API functions
- `providers/AuthProvider.tsx` - Calls `syncUserToLoops()` on signup
- `docs/LOOPS_*.md` - Existing Loops documentation

### Current Notifications Integration

**Status:** Ready for implementation

**What's Set Up:**
- `expo-notifications` package installed
- Notification settings screen exists (`app/(tabs)/settings/notifications/index.tsx`)
- Onboarding notifications screen exists (`app/onboarding/notifications.tsx`)

**What Needs Work:**
- Notification permissions request
- Push notification token registration
- Notification scheduling
- Notification handling (foreground/background)
- Notification preferences sync with backend
- Local notification scheduling
- Push notification receiving

**Key Files:**
- `app/(tabs)/settings/notifications/index.tsx` - Settings screen
- `app/onboarding/notifications.tsx` - Onboarding screen

**Environment:**
- Expo Notifications package ready
- Supabase backend ready (likely has notifications table)
- Need to implement notification service

---

## Important Notes for Next Chat

1. **Profile Features:** Currently hidden (`PROFILE_FEATURES_ENABLED = false`). Don't modify profile-related code unless explicitly asked.

2. **User Preferences:** Many UI improvements were user-approved. Don't revert changes unless user requests.

3. **Loops Integration:** User sync is working. Focus on:
   - Setting up Loops Journeys for welcome emails
   - Implementing event tracking
   - Email preferences management

4. **Notifications:** Package is installed but not implemented. Need to:
   - Request permissions
   - Register push tokens
   - Implement notification scheduling
   - Handle notification events

5. **Code Quality:** The codebase is well-structured. Follow existing patterns when adding new features.

6. **Testing:** Test on real devices when possible, especially for:
   - Haptic feedback
   - Animations
   - Notifications
   - Push notifications

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
