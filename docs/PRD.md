# Product Requirements Document (PRD): Potentijal

**Version:** 1.0  
**Last updated:** February 2025  
**Purpose:** Product requirements for the Potentijal sports training app, for use with TestSprite and QA.

---

## 1. Product overview

**Potentijal** is a mobile-first sports training and athletic progress app. Users choose one or more sports (e.g. Basketball, Football, Soccer, Baseball, Hockey, Tennis, Lifting), log games and practices with sport-specific metrics, track workouts, and view progress over time. The app supports a free tier and a premium subscription (RevenueCat/App Store) with advanced analytics and an AI trainer.

**Platform:** React Native (Expo), runs on iOS, Android, and Web. Primary testing target for frontend: **Expo Web** at `http://localhost:8081` (or configured port).

---

## 2. Goals

- Enable athletes to log training and games per sport with relevant metrics (e.g. shooting %, drills, reps, weight).
- Provide a single place to see progress across sports (progress graphs, consistency, statistics).
- Support multiple sports per user with a clear home experience per sport.
- Monetize via premium subscription (monthly/yearly, free trial) without blocking core logging for free users.
- Offer optional AI trainer and advanced analytics for premium users.

---

## 3. Target users

- Athletes (youth to adult) who train in one or more sports.
- Users who want to track games, practices, and gym work in one app.
- Users who may want to follow creators or share progress (profile/social features).

---

## 4. Tech stack (high level)

- **Frontend:** Expo (React Native), expo-router, React Navigation.
- **Auth & data:** Supabase (auth, database, RLS).
- **Payments:** RevenueCat + App Store (subscriptions).
- **Analytics:** PostHog.
- **Platforms:** iOS, Android, Web (Expo web).

---

## 5. Main app structure

### 5.1 Tabs (main navigation)

- **Home** – Sport switcher and sport-specific home (current sport’s dashboard, log game/practice, weekly goals).
- **Workouts** – Workout builder and logging (exercise squares, sets, reps, weight, sport-specific square types).
- **Workout Summary** – Post-workout summary (hidden from tab bar).
- **Progress** (meals) – “Your Athletic Journey”: progress cards carousel (Progress Graphs, Skill Map, Training Statistics, Consistency Score).
- **History** – Past sessions (games/practices/workouts) with detail view per session.
- **Profile** – User profile, edit profile, followers, following, find friends, creator workouts (optional; can be hidden via feature flag).
- **Settings** – Accessed from home; not a tab. Contains Account, Premium, Support & Legal, etc.
- **Purchase Premium** – Paywall screen (hidden from tab bar; reached via upgrade prompts or Settings).

### 5.2 Onboarding (unauthenticated / new users)

Linear flow:

1. **Welcome** – Entry; start sign-up.
2. **Email entry** – User enters email.
3. **Email verification** – User verifies email (Supabase magic link / OTP).
4. **Account basics** – Name, age (or similar).
5. **Sport selection** – Select one or more sports (Basketball, Football, Soccer, Baseball, Hockey, Tennis, Lifting).
6. **Training intent** – Why they train (optional).
7. **App intro** – Short product intro.
8. **Notifications** – Request notification permission.
9. **Premium offer** – Present free trial / premium; single “Continue” (no obligation).
10. **Completion** – Onboarding complete; navigate to main app (Home).

After onboarding, the user lands on **Home** with a default sport selected.

---

## 6. Functional requirements by area

### 6.1 Authentication

- **Email sign-up:** User can sign up with email; verification required.
- **Sign-in:** Returning users sign in with email (and password or magic link as implemented).
- **Sign-out:** Available from Settings or profile; clears session.
- **Session persistence:** Supabase auth session persists across app restarts when valid.

**Acceptance:** User can complete onboarding, sign out, and sign back in without losing account.

### 6.2 Home

- **Sport switcher:** User can switch current sport among enabled sports (Lifting, Basketball, Football, Baseball, Soccer, Hockey, Tennis).
- **Sport-specific home:** Each sport has a dedicated home (e.g. basketball, football, soccer) with:
  - Quick actions: Log Game, Log Practice (and sport-specific CTAs).
  - Weekly goals entry or display where applicable.
  - Schedule/week view where implemented.
- **Navigation:** From home, user can open Settings, Progress, Workouts, History, and (if enabled) Profile.
- **Premium gates:** Some actions (e.g. Add Sports beyond limit, certain progress cards) may show upgrade modal for free users.

**Acceptance:** Switching sport updates the home content; primary CTAs navigate to correct log screens.

### 6.3 Logging: Games & practices

- **Per-sport screens:** Each sport has “Add Game” and “Add Practice” (or equivalent) screens.
- **Sport-specific inputs:** e.g. Basketball: shooting %, drills, exercises; Football: sprints, drills, completion; Baseball: hitting, fielding; Soccer: shooting, drills; Hockey: shooting, drills; Tennis: rally; Lifting: exercises, sets, reps, weight.
- **Save:** User can save a game or practice; data persists (Supabase).
- **Validation:** Required fields must be filled before save where applicable.

**Acceptance:** User can open Add Game / Add Practice for current sport, fill fields, save, and see the session in History.

### 6.4 Workouts

- **Workout list/builder:** User can create or select workouts (sport-specific exercise squares).
- **Exercise square types:** Vary by sport (e.g. Exercise, Shooting, Drill for Basketball; Exercise, Drill, Sprints for Football; Hitting, Fielding for Baseball).
- **Logging:** User can log sets, reps, weight, or sport-specific metrics (e.g. attempted/made, distance, time).
- **Workout summary:** After completing a workout, user can see a summary screen.

**Acceptance:** User can build/log a workout and see it reflected in History and Progress where applicable.

### 6.5 Progress tab

- **Entry:** Progress tab shows “Your Athletic Journey” and a carousel of cards.
- **Cards (examples):** Progress Graphs, Skill Map, Training Statistics, Consistency Score. Each card navigates to a dedicated screen.
- **Progress graphs:** User can search/select an exercise; view depends on sport and exercise type (e.g. Performance, Tonnage, Shooting %, Drill, Completion, Speed, Sprints, Hits, Distance, Fielding, Rally). Time ranges: 30 / 90 / 180 / 360 days. Data must reflect actual logged data per mode.
- **Skill map, Training statistics, Consistency score:** Each screen shows metrics as designed (may be premium-gated in part).
- **Premium:** Some progress features may require premium; upgrade modal or lock state should be clear.

**Acceptance:** User can open Progress, open each card, and (for Progress Graphs) search an exercise and see the correct view(s) and time range.

### 6.6 History

- **List:** User sees past sessions (games, practices, workouts) in reverse chronological order.
- **Filter/navigation:** User can open a session to view details (e.g. date, sport, exercises, metrics).
- **Premium:** History list or detail may be gated for free users; behavior should be consistent.

**Acceptance:** User can open History, see their sessions, and tap one to view details.

### 6.7 Profile (if enabled)

- **View:** User can view own profile (avatar, name, bio, etc.).
- **Edit:** User can edit profile (e.g. name, photo).
- **Social:** Followers, Following, Find Friends, Creator Workouts where implemented.
- **Premium:** Some profile/social features may be premium-only.

**Acceptance:** User can open Profile, edit profile, and navigate to followers/following/find friends without crashes.

### 6.8 Settings

- **Sections:**
  - **Account:** My Sports, Add Sports (premium or limit), Notification Preferences, Email & Password, Units.
  - **Premium:** Plan card (Free / Premium Active / Creator). If free: Upgrade. If premium/creator: Manage Subscription, Restore Purchases; AI Trainer Settings.
  - **Support & Legal:** Help, Contact Support, Privacy Policy, Terms.
  - **Privacy & Security:** Blocked users, etc.
  - **About:** Credits, app version.
  - **Sign out / Delete account:** Where implemented.
- **Navigation:** Every listed row navigates to the correct sub-screen without error.
- **Manage Subscription:** Opens Apple subscription management (e.g. URL or system sheet); user does not cancel inside the app.
- **Restore Purchases:** Calls RevenueCat restore; UI reflects success/failure.

**Acceptance:** User can open Settings, navigate to each subsection, and use Manage Subscription and Restore Purchases without crashes; premium state reflects correctly after restore.

### 6.9 Premium & paywall

- **Paywall:** Purchase Premium screen shows plan options (e.g. monthly, yearly, free trial). User can purchase or dismiss.
- **Gates:** Locked features (e.g. Add Sports, some progress cards, AI Trainer) show upgrade modal or redirect to paywall.
- **Offerings:** Plans loaded via RevenueCat `getOfferings()`; errors (e.g. “There was a problem with the App Store”) are shown with a clear message where implemented.
- **Post-purchase:** After successful purchase, premium features unlock; Manage Subscription and Restore Purchases appear in Settings for subscribers.

**Acceptance:** Free user sees upgrade when hitting locked feature; after purchase (or restore), premium features and settings entries are available.

### 6.10 AI Trainer (premium)

- **Access:** Available to premium/creator users from Home or Settings (AI Trainer Settings).
- **Chat/UI:** User can interact with AI trainer (e.g. chat); behavior depends on implementation.

**Acceptance:** Premium user can open AI Trainer and perform at least one successful interaction without crash.

---

## 7. Non-functional requirements (for testing)

- **Responsiveness:** Key screens (Home, Workouts, Progress, History, Settings) render without layout errors on web viewport (e.g. 375×667 and 1280×720).
- **Navigation:** No broken routes; back/forward and deep links behave as expected.
- **Auth state:** After sign-in, protected routes show app content; after sign-out, user is redirected to welcome/onboarding or login.
- **Errors:** Network or API errors should not crash the app; user sees an error message or retry where implemented.
- **Accessibility:** Critical buttons and links have labels; forms have associated labels (for automated and manual testing).

---

## 8. Test accounts & test data

- For TestSprite or manual QA, use a **test Supabase project** and **test user** (email/password or magic link).
- For **subscription testing,** use Sandbox Apple ID and RevenueCat sandbox if available.
- Test data: at least one user with multiple sports, some logged games/practices/workouts, and (optionally) one premium and one free account.

---

## 9. Out of scope for this PRD

- Backend/API contract details (covered by Supabase schema and RLS).
- Exact copy and pixel-perfect UI specs (high-level flows and features only).
- Push notification payloads and deep-link URL scheme details (can be added later for deep-link testing).

---

## 10. Document history

| Version | Date       | Changes                          |
|--------|------------|-----------------------------------|
| 1.0    | Feb 2025   | Initial PRD for TestSprite use.   |
