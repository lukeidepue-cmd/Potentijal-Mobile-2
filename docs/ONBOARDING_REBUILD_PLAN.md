# Onboarding Rebuild Plan

**Created:** March 15, 2026  
**Purpose:** Coding plan for transforming the current 10-screen onboarding into a new 7-screen flow that delivers value before asking for signup.

---

## Current vs New Flow

| Current (10 screens) | New (7 screens + dashboard drop) |
|---|---|
| 1. Welcome (auth selection) | 1. **Identity** ("Built for athletes who put in the work") |
| 2. Email Entry | 2. **Sport Selection** (moved before auth) |
| 3. Email Verification | 3. **First Win** (log first exercise) - NEW |
| 4. Account Basics (name + birth year) | 4. **Visualization** (graph preview) - NEW |
| 5. Sport Selection | 5. **Email Signup** ("Save your progress") |
| 6. Training Intent | 6. **Email Verification** (OTP) |
| 7. App Intro | 7. **Name Entry** (just name, no birth year) |
| 8. Notifications | 8. Dashboard drop → `/(tabs)` |
| 9. Premium Offer | |
| 10. Completion | |

---

## The Big Architectural Shift

Auth now happens at step 5-6 instead of step 2-3. Screens 1-4 run without an authenticated user. Data collected pre-auth (sports, first exercise) must be stored locally and synced to Supabase after authentication completes.

---

## Phase 1: Create `OnboardingDataContext` (pre-auth state manager)

**New file:** `providers/OnboardingDataContext.tsx`

**Purpose:** Hold all onboarding data in memory + AsyncStorage so it survives the auth flow and can be synced to Supabase after account creation.

**State it holds:**

```typescript
{
  selectedSports: string[];      // from step 2
  primarySport: string | null;   // first sport selected
  firstExercise: {               // from step 3
    name: string;
    type: ExerciseType;
    mode: SportMode;
    value1: number;              // reps/attempted/etc.
    value2: number;              // weight/made/etc.
    value1Label: string;         // "Attempts", "Reps", etc.
    value2Label: string;         // "Made", "Weight (lbs)", etc.
  } | null;
}
```

**Methods:**

- `setSports(sports, primarySport)` - save to state + AsyncStorage
- `setFirstExercise(data)` - save to state + AsyncStorage
- `syncToSupabase()` - called after auth: creates profile sports + workout/exercise/set records
- `clearOnboardingData()` - clear AsyncStorage after sync

**Why a context instead of just AsyncStorage:** The data needs to flow between screens instantly (sport selection → first-win → visualization) without async reads. AsyncStorage is the backup for resume scenarios.

**Where to mount it:** Inside `AuthProvider` in the root layout, wrapping `RootLayoutNav`. Must be available even when the user is NOT authenticated.

---

## Phase 2: Screen-by-Screen Implementation

### Screen 1: `identity.tsx` (NEW — replaces `welcome.tsx`)

**File action:** Create `app/onboarding/identity.tsx`. Keep `welcome.tsx` temporarily until fully replaced.

**Content:**

- Big bold heading: "Built for athletes who put in the work."
- Subtitle: "Track your training. See your progress. Know you're getting better."
- Single green "Continue" button at the bottom
- Same visual style as current welcome (dark gradient background) but WITHOUT the image carousel and without any auth buttons
- No progress bar (this is the identity/hook screen)

**Navigation:** `router.push('/onboarding/sport-selection')`

**Data changes:** None (pure motivational screen)

---

### Screen 2: `sport-selection.tsx` (MODIFY existing)

**File action:** Modify `app/onboarding/sport-selection.tsx` in place.

**Changes:**

- Remove the `updateProfileFromOnboarding` call (user isn't authenticated yet)
- Remove the `updateOnboardingStep` call
- Instead, call `OnboardingDataContext.setSports(selectedSports, primarySport)`
- Update `TOTAL_STEPS` from 10 → 7, `CURRENT_STEP` from 5 → 2
- Fix the missing `Alert` import
- Keep the same visual design and "up to 2 sports" limit

**Navigation:** `router.push('/onboarding/first-win')`

---

### Screen 3: `first-win.tsx` (NEW — the aha moment)

**File action:** Create `app/onboarding/first-win.tsx`

**Purpose:** Let the user log their first exercise in ~10 seconds.

**Design:**

- Heading: "Log your first exercise"
- Subtitle: "This is where your progress starts."
- Based on the primary sport (from OnboardingDataContext), show a pre-filled exercise name (editable) and two simple inputs
- Progress bar: step 3/7

**Sport-specific defaults:**

| Sport | Default Exercise | Type | Input 1 | Input 2 |
|-------|-----------------|------|---------|---------|
| Lifting | Bench Press | `exercise` | Reps | Weight (lbs) |
| Basketball | Free Throws | `shooting` | Attempts | Made |
| Football | Routes Run | `drill` | Reps | Completed |
| Baseball | Batting Practice | `hitting` | At Bats | Hits |
| Soccer | Penalty Kicks | `shooting` | Attempts | Made |
| Hockey | Wrist Shots | `shooting` | Attempts | Made |
| Tennis | First Serves | `shooting` | Attempts | Made |

**UI elements:**

- Exercise name in an editable text field (pre-filled, can change)
- Two number inputs with labels (side by side or stacked)
- Green "Next" button (enabled when both inputs have values)
- Same gradient background and styling as other onboarding screens

**Data flow:** On "Next", call `OnboardingDataContext.setFirstExercise(data)` with the exercise name, type, mode, and both values.

**Navigation:** `router.push('/onboarding/visualization')`

---

### Screen 4: `visualization.tsx` (NEW — the emotional hook)

**File action:** Create `app/onboarding/visualization.tsx`

**Purpose:** Show the user's first data point on a graph with a projected improvement line.

**Design:**

- Heading: "This is your starting point."
- Subtitle: "Every session you log builds your proof."
- A chart (Victory Native — already in the project) showing:
  - X-axis: time labels (Today, 1 Week, 1 Month, 3 Months)
  - Y-axis: the metric from their exercise
  - One solid dot at "Today" with their actual value
  - A faint dotted/dashed line curving upward from that point, showing projected improvement
- Below the chart, their exercise name and value displayed cleanly
- Progress bar: step 4/7

**Data source:** Read from `OnboardingDataContext.firstExercise`

**How to compute the projected line:**

- Start with their actual value (e.g., 7/10 free throws = 70%)
- Generate 3-4 projected points with modest improvement (e.g., 75%, 82%, 88%)
- Use a dashed/dotted line style for the projection
- This is purely motivational — not saved to the database

**Navigation:** `router.push('/onboarding/email-entry')`

---

### Screen 5: `email-entry.tsx` (MODIFY existing)

**File action:** Modify `app/onboarding/email-entry.tsx` in place.

**Changes:**

- Update heading from "Get started with Potentijal" → "Save your progress"
- Update subtitle: "Create your account to keep your training data."
- Remove "or Log in" text (or change to something subtle)
- Update `TOTAL_STEPS` from 10 → 7, `CURRENT_STEP` from 2 → 5
- Keep all the OTP sending logic exactly the same
- Keep the same input styling and bouncing dot loading animation

**Navigation:** Same — `router.push` to `email-verification` with email param.

---

### Screen 6: `email-verification.tsx` (MODIFY existing)

**File action:** Modify `app/onboarding/email-verification.tsx` in place.

**Changes:**

- Update `TOTAL_STEPS` from 10 → 7, `CURRENT_STEP` from 3 → 6
- **Critical change:** After OTP verification succeeds and user is authenticated, trigger the data sync:
  - Call `OnboardingDataContext.syncToSupabase()` to save sports to profile and create the first workout/exercise/set
  - Call `updateOnboardingStep('email_verification')` (same as before)
- Change the `useEffect` that watches `user` to navigate to `name-entry` instead of `account-basics`

**The sync function (`syncToSupabase`) will:**

1. Call `updateProfileFromOnboarding({ sports, primary_sport })` — same API that exists today
2. Call `saveCompleteWorkout()` with the first exercise data — uses existing API
3. Call `clearOnboardingData()` to clean up AsyncStorage

**Navigation:** After user state changes → `router.push('/onboarding/name-entry')`

---

### Screen 7: `name-entry.tsx` (NEW — simplified from `account-basics.tsx`)

**File action:** Create `app/onboarding/name-entry.tsx`. Keep `account-basics.tsx` temporarily.

**Changes from account-basics:**

- Remove birth year input entirely (can be asked later in settings if needed)
- Just one input field: display name
- Update heading: "What's your name?" or "What should we call you?"
- Update `TOTAL_STEPS` from 10 → 7, `CURRENT_STEP` → 7
- On submit: call `updateProfileFromOnboarding({ display_name })` + `completeOnboarding()` + `refreshOnboardingStatus()`

**Navigation:** After completion → `router.replace('/(tabs)')` — straight to dashboard.

**Important:** Remove the 15-second delay that exists in the current completion screen. The transition to dashboard should be immediate after the API calls succeed (with a reasonable loading state).

---

## Phase 3: Update Onboarding Layout

**File:** `app/onboarding/_layout.tsx`

**Changes:**

Replace the 10-screen Stack with 7 screens:

```
<Stack.Screen name="identity" />           // Step 1
<Stack.Screen name="sport-selection" />     // Step 2
<Stack.Screen name="first-win" />           // Step 3
<Stack.Screen name="visualization" />       // Step 4
<Stack.Screen name="email-entry" />         // Step 5
<Stack.Screen name="email-verification" />  // Step 6
<Stack.Screen name="name-entry" />          // Step 7
```

- Keep `animation: 'fade'` for smooth transitions
- Old screens (`welcome`, `account-basics`, `training-intent`, `app-intro`, `notifications`, `premium-offer`, `completion`) are removed from the Stack

---

## Phase 4: Update Root Layout Routing

**File:** `app/_layout.tsx`

**Changes to routing logic:**

```
No user → /onboarding/identity (was /onboarding/welcome)

User + needsOnboarding === true → resume:
  - Get current_step from onboarding_data
  - If step is pre-auth (identity, sport_selection, first_win, visualization,
    email_entry, email_verification) → /onboarding/name-entry
    (they're already authenticated, just need name)
  - If step is name_entry → /onboarding/name-entry
  - Default → /onboarding/name-entry

User + needsOnboarding === false → /(tabs) (unchanged)
```

The resume logic becomes much simpler. Since there's only ONE post-auth onboarding step (name-entry), any authenticated user who still needs onboarding goes straight to name-entry. The pre-auth steps don't need database-based resume because the user has no account yet — they just start over from identity (which is fine since it's only 4 quick screens before auth).

**Update `stepToRoute` mapping** to include new step names and remove old ones.

---

## Phase 5: Update Onboarding API

**File:** `lib/api/onboarding.ts`

**Changes:**

- The `OnboardingData` interface gets updated step names
- `completeOnboarding()` stays the same
- `needsOnboarding()` stays the same
- `updateOnboardingStep()` stays the same (just accepts new step name strings)
- `updateProfileFromOnboarding()` stays the same
- Remove `updatePreferencesFromOnboarding()` from onboarding usage (notifications are handled post-onboarding now)
- Add a new helper function `syncOnboardingExercise()` that creates a workout + exercise + set from the first-win data using `saveCompleteWorkout()`

---

## Phase 6: Notification Permission (moved out of onboarding)

**Strategy:** Don't request notification permission during onboarding at all. Instead:

- On first entry to the main app (after onboarding completes), schedule a delayed prompt (e.g., after 2-3 app opens, or after they log their first real workout)
- Or request contextually when they interact with schedule/reminders features
- The existing `scheduleAllWorkoutNotifications()` in the root layout already handles this gracefully — it checks permission status internally

This is a separate follow-up task — no changes needed during the onboarding rewrite itself. The current root layout already calls notification scheduling when `needsOnboarding === false`, and that code handles the case where permissions haven't been granted.

---

## Phase 7: Cleanup

1. **Remove old screen files** (or leave them as dead code initially for safety):
   - `app/onboarding/welcome.tsx` → replaced by `identity.tsx`
   - `app/onboarding/account-basics.tsx` → replaced by `name-entry.tsx`
   - `app/onboarding/training-intent.tsx` → removed from flow
   - `app/onboarding/app-intro.tsx` → removed from flow
   - `app/onboarding/notifications.tsx` → removed from flow
   - `app/onboarding/premium-offer.tsx` → removed from flow
   - `app/onboarding/completion.tsx` → removed from flow

2. **Fix pre-existing bugs** along the way:
   - Add missing `Alert` imports where needed
   - Remove the 15-second delay in completion flow (now gone entirely)

3. **Update `docs/APP_STATE_GUIDE.md`** with the new onboarding flow

---

## Phase 8: Implementation Order

This is the sequence to code in, designed to minimize breakage:

1. **OnboardingDataContext** — create the context/provider, mount it in root layout. No screens change yet, so nothing breaks.

2. **`identity.tsx`** — create the new first screen. Not wired in yet, so nothing breaks.

3. **`first-win.tsx`** — create the exercise logging screen. Not wired in yet.

4. **`visualization.tsx`** — create the graph preview screen. Not wired in yet.

5. **`name-entry.tsx`** — create the simplified name screen with completion logic. Not wired in yet.

6. **Modify `sport-selection.tsx`** — switch from Supabase calls to OnboardingDataContext. Update step numbers.

7. **Modify `email-entry.tsx`** — update copy and step numbers.

8. **Modify `email-verification.tsx`** — add data sync after auth, navigate to name-entry instead of account-basics. This is the most critical change.

9. **Update `onboarding/_layout.tsx`** — swap to the new 7-screen Stack. **This is the "flip the switch" moment** where the new flow goes live.

10. **Update root `_layout.tsx`** — change routing from `/onboarding/welcome` to `/onboarding/identity`, update `stepToRoute`, simplify resume logic.

11. **Cleanup** — remove old files, update docs.

---

## Risk Mitigation

- **Existing users mid-onboarding:** If someone is partway through the OLD onboarding and we deploy, the root layout resume logic will route them to `name-entry` (since they're already authenticated). They'll just enter their name and go to the dashboard. Their sports might not be set — but they can add sports from settings. This is an acceptable edge case.

- **No database migration needed:** The `onboarding_data` table's `current_step` is a string field — new step names work without schema changes. The workout/exercise/set tables are unchanged.

- **Rollback:** If something goes wrong, reverting `_layout.tsx` (both root and onboarding) to the old screen names restores the old flow. The new screen files just become dead code.
