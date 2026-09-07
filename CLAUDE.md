# AthleteCraft — Project Guide for Claude

## Your role in this repo: **BUILDER**

You are the **builder**, not the marketer, not the researcher, not the strategist.
Luke has a separate project for marketing and research. In this repo your job is:

- Write and edit the code
- Find and fix bugs
- Refactor, clean up, and improve architecture
- Write migrations and edge functions
- Ship features

Do not drift into positioning, copywriting strategy, growth ideas, or market
research unless explicitly asked. Build.

---

## 1. What the app is

**AthleteCraft** — a free iOS app for tracking athletic training progress, **live on
the Apple App Store**. Owner/founder: **Luke Depue** (former competitive hockey
player).

- Bundle id: `com.lukedepue.myfirstapp`
- URL scheme: `myfirstapp://`, associated domain `potentijal.com`

### The problem it solves

Athletes can't tell whether they're actually improving at the specific,
unconventional things they train — ankle mobility, stickhandling, shooting
accuracy, sprint times, wrist strength. **Logging isn't the hard part** — most
athletes already log. The hard part is doing the arithmetic across weeks and
months to know whether this month beats three months ago. Almost nobody does it
by hand, so athletes train on feel. Classic failure: someone hits a flat stretch,
concludes the program isn't working, changes everything — when the program *was*
working and the gain was just smaller than week-to-week noise.

### Why existing apps don't solve it

Every other workout app assumes two things: (1) your exercise comes from a
built-in list, and (2) a set is reps × weight. That's correct for bench and
squat. It breaks completely for a stickhandling drill or an ankle mobility test —
the exercise isn't in any list, and reps/weight isn't what you'd measure. The
usual workaround is stuffing numbers into the wrong field (shooting accuracy
logged as "weight"), which falls apart the moment you read a graph six weeks
later.

### Target audience

**Athletes who train — NOT generic gym-goers.** This distinction is the entire
positioning. People training sport-specific skills, often unorthodox and
unweighted, who care about measurable improvement over months. Hockey,
basketball, soccer, football, track. Both skill work (stickhandling, shooting,
ball handling) and physical work (sprints, mobility, agility).

**Explicitly not the target:** someone whose training is bench/squat/rows. For
them Strong or Hevy is genuinely a better tool, and the marketing says so.

### One-line positioning

> Every other app decides what counts as progress for you. This one doesn't.

---

## 2. The core model — Presets → Exercises → Views

**This is the heart of the product. Keep these three layers straight.**

### Preset

A **user-defined set of input statistics (2–5)** that describes what a "set" is
made of. Created once, reused across every exercise measured the same way.

```
"Lifting"   = reps + weight
"Shooting"  = makes + misses
"Sprints"   = reps + time
"Mobility"  = a single measurement in cm
"Cleans"    = reps + weight + time
```

Stored in `exercise_presets` (`stat_names text[]`, 2–5 entries, plus icon +
color). API: [lib/api/presets.ts](lib/api/presets.ts).

### Exercise

**There is no built-in exercise list.** The user *types* the exercise name.
All data ever logged under the same name groups automatically as one tracked
exercise. This is `workout_exercises.name`, linked to its preset via
`workout_exercises.preset_id`.

**One preset carries many exercises.** Tapping "Shooting" and naming it "layups",
then tapping "Shooting" again and naming it "3-pointers", produces two separate
tracked exercises that share the makes/misses structure. "Bench Press" and
"Squats" are two *exercises* under one "Lifting" *preset* — they are not presets.

**Identity rule:** an exercise is identified by its **name** (case-insensitive).
Every set ever logged in a box named "Sprint drill" is the *same* exercise; its
data is unioned across all workouts. Both analytics screens filter by name so one
exercise shows only its own data, never the rest of the preset.

Per-set values live in `workout_set_stats` (`stat_name` → `value`, ordered by
`stat_index`).

### View

A user-defined **way of reducing a preset's stats to a single number**.
A View = (preset, stat formula, aggregation).

- **Formula** — show one input alone, `multiply` any number of inputs, or
  `divide` one input by another. (e.g. `reps × weight`, `makes / misses`)
- **Aggregation** — `highest` | `total` | `average`.

Examples: "highest reps × weight", "average makes / misses", "lowest time".

Stored in `views`. **Views are shared by the Progress Graph and the Skill Map**
(same table). API: [lib/api/views.ts](lib/api/views.ts).

### Logging flow

1. Start a workout, name it.
2. All of the user's presets appear as buttons.
3. Tap a preset → adds a box containing that preset's input fields.
4. Type the exercise name onto the box (e.g. "corner 3s").
5. Log the statistics for each set.
6. Finish → summary screen → save.

---

## 3. Screen-by-screen behavior

### Home tab — `app/(tabs)/(home)/`

- **Top:** weekly calendar + settings button.
- **Weekly calendar day colors:**
  - **Green** — the user logged a workout on a day that had a scheduled name,
    **or** the day had no name scheduled at all.
  - **Red** — the day had a name in the workout schedule but **no workout was
    logged**.
- **Edit Schedule** → `schedule-week.tsx`. The user types whatever "workout" they
  have on each day of the week. Free text; purpose is scheduling the week.
- **Build New Preset** → `build-preset.tsx`.
- **Log Practice** and **Log Game** — shown **only if the user selected a sport in
  onboarding**.
  - Practice → two free-text boxes: **Drills** and **Notes**.
  - Game → two free-text boxes: **Stats** and **Notes**.
  - Free text by design; the user records their own drills/stats/notes.

### Workouts tab — `app/(tabs)/workouts.tsx`

Start a workout → name box → all preset buttons → tap presets to add exercise
boxes → name each exercise → log sets → **Finish** → summary
(`workout-summary.tsx`) → save.

### Progress tab — `app/(tabs)/meals/`  ⚠️ folder is named `meals/` for legacy reasons

Hub screen (`meals/index.tsx`) with 4 cards, each its own sub-screen:

**1. Progress Graph** (`progress-graphs.tsx`) — free

- Pick a View (a View belongs to one preset) → search/pick **one exercise** under
  that preset → see that exercise's View-value over time.
- X-axis is always dates. Timeframes: **30 / 90 / 180 / 360 days**, switchable at
  any time regardless of View.
- The window is split into **6 equal intervals**; the value is shown per interval,
  not per session. **Why:** single sessions are too noisy to read — the graph
  compares periods against each other.

**2. Skill Map** (`skill-map.tsx`) — premium

- Same Views as the Progress Graph. Instead of one exercise over time, compares
  **up to 6 exercises against each other** on a radar chart.
- All 6 must be under the same preset + View, so their numbers are directly
  comparable. Each spoke = one exercise; % is that exercise's View-value relative
  to the strongest selected one (100% = best).
- Same 30/90/180/360 day timeframes.

**3. Consistency Score** (`consistency-score.tsx`) — premium

- Weekly score for how consistent the user was. Factors: **workouts scheduled vs.
  workouts logged**, plus **consecutive days of logging**.
- Exact formula lives in [lib/api/consistency-score.ts](lib/api/consistency-score.ts) —
  don't change it without asking.

**4. Training Stats** (`training-statistics.tsx`) — premium

- Search **any exercise ever logged** → personal bests in multiple categories.
  The categories depend on the exercise's preset (e.g. bench press → Highest
  Reps × Weight, Highest Reps, Highest Weight).
- Also shows the **10 most frequently logged exercises** and their log counts,
  across the same timeframes.

### History tab — `app/(tabs)/history/`

A database of everything logged. Tap any workout → **every single set ever
logged** in it. Also holds the database of all logged **practices and games** —
tappable to read what the user wrote.

### Onboarding — `app/onboarding/`

`identity → sport-selection → email-entry → email-verification → name-entry`.
Supabase Auth via **email OTP** (6-digit code, not magic link). Resumable from
`onboarding_data.current_step`. Sport selection drives whether Log Game / Log
Practice appear on Home; it no longer drives exercise types.

---

## 4. Tech stack

- **Frontend:** Expo SDK 57, React Native 0.86, React 19.2, expo-router 57
  (file-based routing, typed routes, New Architecture — now the only
  architecture; `newArchEnabled` is no longer a valid app.json key)
- **Minimum iOS: 16.4** (raised from 15.1 by SDK 56 — this dropped iOS 15 users)
- **Backend:** Supabase — Postgres + Auth + Storage + Edge Functions. Single
  client at [lib/supabase.ts](lib/supabase.ts). Session in SecureStore (iOS) /
  AsyncStorage (Android).
- **IAP:** RevenueCat (`react-native-purchases`). Public SDK key in `app.json`
  extra; secrets server-side only.
- **AI:** OpenAI `gpt-4o-mini` via the `ai-trainer` edge function (key never
  client-side).
- **Email:** Loops.so via edge function.
- **Analytics:** PostHog (with iOS ATT prompt).
- **Charts:** `victory-native` + `@shopify/react-native-skia` + `react-native-svg`.
- **Build:** EAS Build. `app.config.js` injects Supabase URL/anon key from EAS
  secrets so TestFlight/App Store builds connect.

---

## 5. Repo layout (source root: `Potentijal-Mobile-2/`)

```
app/                       expo-router file-based routing
  _layout.tsx              providers, auth/onboarding gating, RevenueCat, deep links, notifications, PostHog
  (tabs)/_layout.tsx       4 visible tabs (Home, Workouts, Progress, History); everything else href: null
  (tabs)/(home)/           home + schedule-week + add-game + add-practice + build-preset + build-view
  (tabs)/workouts.tsx      ~2250-line workout builder/logger
  (tabs)/meals/            the PROGRESS tab (legacy folder name)
  (tabs)/history/          workout/game/practice database
  (tabs)/settings/         settings tree (reached from the home header)
  (tabs)/purchase-premium/ paywall
  (tabs)/profile/          social — feature-flagged OFF
  onboarding/
components/                shared UI primitives
providers/                 AuthProvider, FeaturesContext (premium), SettingsContext,
                           TutorialContext, ModeContext (stub), PostHogProvider,
                           OnboardingDataContext, ProfileRefreshContext
hooks/                     data hooks (premium, progress graph, consistency, PRs, ...)
lib/api/                   one module per backend domain
lib/expo-env.ts            isExpoGo() — used to skip RevenueCat in dev
constants/                 theme.ts, features.ts, links.ts, preset-icons.ts, preset-cosmetics.ts
supabase/migrations/       001…048 (see numbering caveat in §9)
supabase/functions/        ai-trainer, loops, revenuecat-webhook, sync-subscription,
                           trial-ending-soon, delete-auth-user, _shared
docs/, docs2/              OLD planning notes + checklists from AI-assisted building.
                           Lots of stale/contradictory info. DO NOT treat as authoritative.
```

---

## 6. Premium

- Plans: `free | premium | creator` (`app_plan` enum).
- **Server is source of truth** — `profiles.is_premium` / `profiles.plan`,
  updated by the RevenueCat webhook. Never gate purely client-side; always defer
  to `useFeatures()`.
- Client cache in [providers/FeaturesContext.tsx](providers/FeaturesContext.tsx)
  (in-memory + persistent) so unlocks paint instantly.
- **Gated:** AI Trainer, Skill Map, Consistency Score, Training Stats,
  Highlights, Creator Workouts, logging Games, logging Practices.
- Paywall loads RevenueCat offerings; monthly/annual with 1-week intro trial
  configured in App Store Connect.

### RevenueCat in Expo Go

The native module isn't bundled in Expo Go, so `Purchases.*` throws there. All
call sites are guarded by `isExpoGo()` ([lib/expo-env.ts](lib/expo-env.ts)):
`app/_layout.tsx`, `purchase-premium/index.tsx`,
`settings/premium/restore-purchases.tsx`. EAS/TestFlight/App Store builds are
unaffected.

---

## 6b. SDK 57 upgrade — what changed and what's still owed

Upgraded 54 → 57 in one hop (Sept 2026). Landed changes:

- `app.json`: removed `newArchEnabled` and `android.edgeToEdgeEnabled` (both
  deleted in SDK 55); added the `@react-native-community/datetimepicker`,
  `expo-image` and `expo-status-bar` config plugins.
- **`StyleSheet.absoluteFillObject` was removed at runtime in RN 0.86.**
  Replaced with `StyleSheet.absoluteFill` at 21 sites across 13 files. This one
  is nasty: all uses were spreads, and `{...undefined}` is legal JS, so it would
  have silently produced unpositioned overlays rather than throwing. **Never
  reintroduce `absoluteFillObject`.**
- `@react-navigation/*` dropped — expo-router no longer depends on it. The three
  import sites now use `expo-router/react-navigation` and `expo-router/js-tabs`.
- Removed `react-native-maps`, `react-native-webview`, `expo-video-thumbnails`
  (installed but never imported).
- TypeScript 5.9 → 6.0, eslint-config-expo → 57.

Still owed:

- **`@expo/vector-icons` is deprecated** in favour of `@react-native-vector-icons/*`
  (53 files). Still works; codemod is `npx @react-native-vector-icons/codemod`
  and it needs a clean git tree to run.
- **`expo-av` removed, and the profile routes moved.** `profile/index.tsx`
  imported `expo-av`, which SDK 55 pulled out of Expo Go — and because
  expo-router builds its route tree from the filesystem, the file was required
  at launch and crashed the app with `Cannot find native module 'ExponentAV'`,
  even though every entry point to it was already switched off. The whole
  folder now lives in **`_disabled-features/profile/`** (outside `app/`, so it
  is not routed and not typechecked), unedited, with a README explaining how to
  revive it. `expo-av` is uninstalled. Note `lib/api/profile.ts` is unrelated
  and stays — live screens use it.
- **`assets/images/icon.png` is actually a JPEG** (pre-existing, since commit
  `b0805f9`). `expo-doctor` fails on it and it will block EAS builds. Needs a
  genuine re-encode to PNG — don't do it silently, it's a brand asset.
- expo-doctor's "app.json not used by app.config.js" warning is a false
  positive: `app.config.js` does spread `appJson.expo`, doctor just can't see it.

## 7. Local dev — **required** for Expo Go to work

1. Create `Potentijal-Mobile-2/.env` (gitignored) with real values:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key>
   EXPO_PUBLIC_REVENUECAT_API_KEY=<public-sdk-key>
   ```
   `app.json` only holds placeholders; without `.env` every fetch hits
   `https://your-project.supabase.co` and fails with "Network request failed".
2. `npx expo start --go -c` from `Potentijal-Mobile-2/` (`-c` clears Metro cache).
3. Open **Expo Go first**, scan the QR from inside it — the iOS Camera app will
   deep-link `myfirstapp://` to the installed App Store build instead.

---

## 8. Legacy debt you will trip over

The app used to be built around **sport modes** (lifting / basketball / hockey /
football / soccer / baseball / tennis), each with its own home screen and its own
fixed exercise types. That system was replaced by user-built presets. What
remains:

- **`providers/ModeContext.tsx` is a stub** — `useMode()` always returns
  `{ mode: 'lifting', setMode: noop, modeLoading: false }`. This keeps the
  remaining callers (`workouts.tsx`, `meals/progress-graphs.tsx`,
  `meals/training-statistics.tsx`) compiling. Delete once nothing imports it.
- **Mode key `"lifting"` maps to DB enum value `"workout"`** — see
  `mapModeKeyToSportMode` in [lib/types.ts](lib/types.ts). This naming gap runs
  through the whole codebase.
- **DB schema untouched** — the `sport_mode` enum, `mode` columns on `workouts` /
  `games` / `practices` / `weekly_schedules` / `weekly_goals`, and `p_mode` on
  `get_exercise_progress` all still exist. Preserved deliberately so existing
  user data and RPC contracts don't break.
- **Legacy `ItemKind` values** (`exercise`, `bb_shot`, `fb_sprint`, …) are kept in
  the union so old workouts still load and render in history. New workouts only
  use `'preset'`.
- **History cards still branch on stored `mode`** to render sport-specific card
  designs — old entries render as basketball/football/etc.
- **Weekly Goals fully deleted** from the app; the `weekly_goals` table still
  exists unused.
- **`weekly_schedules`** reads collapse rows across legacy modes (preferring
  `mode='workout'`); writes always insert under `mode='workout'`.
- **`PROFILE_FEATURES_ENABLED = false`** in
  [constants/features.ts](constants/features.ts) hides the entire profile/social
  system. Don't restore without asking.

---

## 9. Working notes for Claude

- **Working directory** for all `npm` / `expo` / `eas` / `supabase` commands:
  `Potentijal-Mobile-2/`. Git repo root is also there.
- **Active branch is `zmain`**, not `main`. Verify with `git branch --show-current`.
  - `zmain` — current work, what ships.
  - `main` — v1.0 launch code, frozen.
  - `sport-mode-removal-v1.0-backup` — reference snapshot, do not merge.
- **The code is the source of truth for behavior; this file is the source of
  truth for direction.** `docs/` and `docs2/` are stale — ignore unless asked.
- The `meals/` folder is the **Progress** tab.
- Shell is PowerShell (Bash tool also available) — use `;` not `&&` when chaining
  in PowerShell.
- **Typecheck:** `npm run typecheck`. It works, but there are **~76 known
  pre-existing type errors** being cleared incrementally — treat *new* errors as
  yours, not the whole count. `supabase/functions/**` is excluded from tsconfig
  because those are Deno, not React Native.
- **Migration numbering has two quirks** — `009` is used twice
  (`009_add_is_finalized.sql` and `009_nuclear_option.sql`) and `023` doesn't
  exist. **Do not rename these files** to tidy them up: if Supabase holds
  migration-history rows keyed by filename, a rename causes a re-apply or a
  mismatch. New migrations continue from `049`.
- Longer-form project notes live in
  `C:\Users\lukei\.claude\projects\c--Users-lukei-Documents-PotentijalProject\memory\`.
