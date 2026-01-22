# Sign Up Flow - Implementation Plan

## Table of Contents
1. [Expo Go Testing Considerations](#expo-go-testing-considerations)
2. [Screen Flow Analysis](#screen-flow-analysis)
3. [Backend Implementation Plan](#backend-implementation-plan)
4. [Database Schema Changes](#database-schema-changes)
5. [Implementation Steps](#implementation-steps)
6. [Testing Strategy](#testing-strategy)

---

## Expo Go Testing Considerations

### Current Situation
- **Expo Go Limitations**: 
  - OAuth (Apple/Google) requires deep linking configuration that may not work perfectly in Expo Go
  - Email verification links will need to be handled via deep links
  - Testing requires real device or Expo Go with proper URL scheme configuration

### Recommended Testing Approach

#### Option 1: Development Build (Recommended for Full Testing)
- Create a development build with `expo prebuild` and `eas build --profile development`
- This allows full OAuth and deep linking support
- Can test on physical device or simulator
- Closest to production experience

#### Option 2: Expo Go with Workarounds
- **Email Auth**: Can be fully tested in Expo Go
- **OAuth**: May have limitations, but can test the flow
- **Deep Links**: Configure `app.json` with proper scheme
- **Email Verification**: Use magic links or test codes

#### Option 3: Test Account Strategy
- Create a test account that you can reset/delete
- Use Supabase dashboard to manually verify emails during testing
- Create a "dev mode" that auto-verifies emails (only in development)

**Recommendation**: Start with Option 2 (Expo Go) for initial development, then move to Option 1 (Development Build) for final testing before production.

---

## Screen Flow Analysis

### Optimized Screen Flow (Based on Your Requirements + Recommendations)

#### **Screen 1: Welcome / Auth Selection**
- **Purpose**: Initial entry point
- **Content**:
  - App branding/logo
  - "Sign Up" or "Sign In" buttons
  - OAuth buttons: "Continue with Apple", "Continue with Google"
  - Email option: "Continue with Email"
  - **Terms & Privacy micro-text**: "By continuing, you agree to our Terms of Service and Privacy Policy." (below buttons, not a separate screen)
- **Skip Options**: None (required to proceed)
- **Backend Action**: None yet (just UI selection)

#### **Screen 2: Email Entry** (Only if email selected)
- **Purpose**: Collect email for email-based signup
- **Content**:
  - Email input field
  - "Continue" button
  - Back button
- **Skip Options**: Can go back to Screen 1
- **Backend Action**: 
  - If new email: `supabase.auth.signUp()` with email (passwordless or with password)
  - If existing: `supabase.auth.signInWithOtp()` or redirect to sign-in
- **Validation**: Email format validation

#### **Screen 3: Email Verification** (Only if email selected)
- **Purpose**: Verify email ownership
- **Content**:
  - "We sent a code to [email]"
  - 6-digit code input (auto-focus, auto-submit on 6 digits)
  - "Resend code" link
  - "Change email" link
- **Skip Options**: Can go back to Screen 2
- **Backend Action**: 
  - `supabase.auth.verifyOtp()` with code
  - On success: Create session, proceed to Screen 4
- **Alternative**: Magic link (user clicks link in email, deep link opens app)

#### **Screen 4: Account Basics**
- **Purpose**: Collect essential user info
- **Content**:
  - Name input (required)
  - Age input (required) - or birth year with age calculation
  - "Continue" button
  - "Why we ask": Micro-copy explaining data usage
- **Skip Options**: None (required fields)
- **Backend Action**: 
  - Update `profiles` table: `display_name`, calculate `age` or store `birth_year`
  - Update `auth.users` metadata if needed

#### **Screen 5: Sport Selection**
- **Purpose**: Customize app for user's sports
- **Content**:
  - "Choose your sports" heading
  - "You can change this anytime" micro-copy
  - Sport selection cards (multi-select)
  - "Continue" button (enabled when at least 1 sport selected)
  - "Skip for now" option (uses default sports)
- **Skip Options**: Yes - can skip and set defaults later
- **Backend Action**: 
  - Update `profiles.sports` array
  - Set `profiles.primary_sport` (first selected or default)
- **Default Path**: If skipped, use `['workout']` as default

#### **Screen 6: Training Intent** (NEW - Recommended Addition)
- **Purpose**: Identity anchor - why user is here
- **Content**:
  - "What's most important to you right now?" question
  - Radio button options (pick 1):
    - "Getting stronger"
    - "Improving consistency"
    - "Tracking real progress"
    - "Becoming more efficient"
  - "Continue" button
- **Skip Options**: Yes - can skip
- **Backend Action**: 
  - Store in new `onboarding_data.training_intent` field
  - Used later for personalized messaging

#### **Screen 7: Quick App Introduction**
- **Purpose**: Show value proposition
- **Content**:
  - 2-3 slide carousel:
    - Slide 1: "Track Your Progress" - show progress graph visual
    - Slide 2: "See Real Improvement" - show consistency score
    - Slide 3: "Train Smarter" - show AI Trainer (if premium)
  - "Skip" button (top right)
  - "Next" / "Get Started" button
- **Skip Options**: Yes - prominent "Skip" button
- **Backend Action**: 
  - Mark `onboarding_data.intro_completed = true`
  - No data collection, just UX

#### **Screen 8: Notifications**
- **Purpose**: Request notification permissions
- **Content**:
  - "Stay on track with notifications" heading
  - Value proposition: "We'll only notify you when it matters"
  - "Enable Notifications" button (calls `expo-notifications.requestPermissionsAsync()`)
  - "Not now" button (skip)
- **Skip Options**: Yes - "Not now" button
- **Backend Action**: 
  - If enabled: Update `user_preferences.notification_preferences.push_enabled = true`
  - Store permission status

#### **Screen 9: Premium Offer**
- **Purpose**: Present premium value
- **Content**:
  - Premium features highlight
  - "Unlock deeper insights" value prop
  - "Try Premium" button
  - "Continue with Free" button (skip)
- **Skip Options**: Yes - "Continue with Free" button
- **Backend Action**: 
  - If selected: Redirect to purchase flow (RevenueCat or similar)
  - If skipped: Continue to Screen 10
  - Mark `onboarding_data.premium_offer_shown = true`

#### **Screen 10: Completion / Reward**
- **Purpose**: Celebrate completion, reinforce identity
- **Content**:
  - "You're all set!" celebration
  - Personalized message based on training intent
  - "Start Training" button (enters main app)
- **Skip Options**: None (final screen)
- **Backend Action**: 
  - Mark `onboarding_data.completed = true`
  - Set `onboarding_data.completed_at = now()`
  - Redirect to main app (`/(tabs)/(home)`)

---

## Backend Implementation Plan

### 1. Onboarding State Management

#### Database Table: `onboarding_data`
```sql
CREATE TABLE IF NOT EXISTS public.onboarding_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  
  -- Progress tracking
  current_step text, -- 'email_entry', 'verification', 'account_basics', etc.
  completed_steps text[] DEFAULT '{}',
  completed boolean DEFAULT false,
  completed_at timestamptz,
  
  -- Collected data
  training_intent text, -- 'getting_stronger', 'consistency', 'progress', 'efficiency'
  intro_completed boolean DEFAULT false,
  notifications_enabled boolean DEFAULT false,
  premium_offer_shown boolean DEFAULT false,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### RLS Policies
```sql
-- Users can only read/update their own onboarding data
ALTER TABLE public.onboarding_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own onboarding data"
  ON public.onboarding_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding data"
  ON public.onboarding_data FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding data"
  ON public.onboarding_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### 2. API Functions

#### File: `lib/api/onboarding.ts`

```typescript
// Get current onboarding state
export async function getOnboardingState(): Promise<{
  data: OnboardingData | null;
  error: any;
}> {
  // Fetch from onboarding_data table
  // If doesn't exist, create default entry
}

// Update onboarding step
export async function updateOnboardingStep(
  step: string,
  data?: Partial<OnboardingData>
): Promise<{ data: boolean; error: any }> {
  // Update current_step and add to completed_steps array
  // Update any additional fields passed in data
}

// Mark onboarding as complete
export async function completeOnboarding(): Promise<{
  data: boolean;
  error: any;
}> {
  // Set completed = true, completed_at = now()
  // Update profile if needed
}

// Check if user needs onboarding
export async function needsOnboarding(): Promise<{
  data: boolean;
  error: any;
}> {
  // Check if onboarding_data.completed = false or doesn't exist
}
```

### 3. Auth Flow Integration

#### Modified `AuthProvider.tsx`
- After successful sign-up/sign-in, check `needsOnboarding()`
- If true, redirect to onboarding flow
- If false, redirect to main app

#### OAuth Flow
- Apple/Google sign-in completes → check onboarding status
- If new user → start onboarding from Screen 4 (skip email verification)
- If returning user → go to main app

### 4. Email Verification Flow

#### Option A: OTP Code (Recommended)
1. User enters email → `supabase.auth.signUp({ email })` or `signInWithOtp()`
2. Supabase sends 6-digit code to email
3. User enters code → `supabase.auth.verifyOtp({ email, token: code })`
4. On success: Session created, proceed to Screen 4

#### Option B: Magic Link
1. User enters email → `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: 'myapp://verify' } })`
2. User clicks link in email → Deep link opens app
3. App handles deep link → Verify session, proceed to Screen 4

#### Deep Link Configuration (`app.json`)
```json
{
  "expo": {
    "scheme": "potential",
    "ios": {
      "associatedDomains": ["applinks:yourapp.com"]
    },
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [
            {
              "scheme": "potential",
              "host": "*"
            }
          ]
        }
      ]
    }
  }
}
```

### 5. Profile Creation Flow

#### Automatic Profile Creation
- Already exists: `handle_new_user()` trigger creates profile on signup
- Onboarding updates profile as user progresses:
  - Screen 4: Update `display_name`, calculate age
  - Screen 5: Update `sports[]`, `primary_sport`

#### Age Calculation
- Store `birth_year` in profile metadata or calculate age
- Option: Add `birth_year` column to profiles table
- Calculate age in app: `age = currentYear - birthYear`

### 6. Navigation Flow

#### Onboarding Router
Create `app/onboarding/_layout.tsx`:
```typescript
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="email-entry" />
      <Stack.Screen name="email-verification" />
      <Stack.Screen name="account-basics" />
      <Stack.Screen name="sport-selection" />
      <Stack.Screen name="training-intent" />
      <Stack.Screen name="app-intro" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="premium-offer" />
      <Stack.Screen name="completion" />
    </Stack>
  );
}
```

#### Root Layout Logic (`app/_layout.tsx`)
```typescript
// Pseudo-code
if (loading) return <LoadingScreen />;
if (!user) return <OnboardingStack />; // Start at welcome screen
if (needsOnboarding) return <OnboardingStack />; // Resume onboarding
return <MainAppTabs />; // Normal app
```

---

## Database Schema Changes

### Migration: `024_onboarding_data.sql`

```sql
-- Onboarding data table
CREATE TABLE IF NOT EXISTS public.onboarding_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  
  -- Progress tracking
  current_step text,
  completed_steps text[] DEFAULT '{}',
  completed boolean DEFAULT false,
  completed_at timestamptz,
  
  -- Collected data
  training_intent text CHECK (training_intent IN ('getting_stronger', 'consistency', 'progress', 'efficiency')),
  intro_completed boolean DEFAULT false,
  notifications_enabled boolean DEFAULT false,
  premium_offer_shown boolean DEFAULT false,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.onboarding_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own onboarding data"
  ON public.onboarding_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding data"
  ON public.onboarding_data FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding data"
  ON public.onboarding_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_onboarding_data_updated_at
  BEFORE UPDATE ON public.onboarding_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add birth_year to profiles (optional, for age calculation)
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS birth_year integer;

-- Index for faster onboarding checks
CREATE INDEX IF NOT EXISTS idx_onboarding_data_user_id ON public.onboarding_data(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_data_completed ON public.onboarding_data(completed);
```

---

## Implementation Steps

### Phase 1: Database & Backend (Week 1)

**Goal**: Build and test backend infrastructure before building any UI screens.

#### Step 1.1: Create Database Migration
**What**: Create the SQL migration file for `onboarding_data` table
**File**: `supabase/migrations/024_onboarding_data.sql`
**Test**: 
- Verify SQL syntax is correct
- Check that file is created in correct location
- No database changes yet - just file creation

#### Step 1.2: Run Migration in Supabase
**What**: Execute the migration in your Supabase project
**How**: 
- Copy SQL from migration file
- Run in Supabase SQL Editor
- Or use Supabase CLI: `supabase db push`
**Test**:
- Verify table `onboarding_data` exists
- Verify RLS policies are created
- Verify triggers are created
- Check table structure matches plan

#### Step 1.3: Test Database Manually
**What**: Manually insert/update/select data to verify table works

**Option A: Using Supabase Table Editor (Easier - GUI)**
1. Go to Supabase Dashboard → Table Editor → `onboarding_data` table
2. Click "Insert row" button
3. Fill in these values:
   - `user_id`: (Get this from `profiles` table - see instructions below)
   - `current_step`: `account_basics`
   - `training_intent`: `getting_stronger`
   - Leave other fields as default (they'll auto-fill)
4. Click "Save" - this tests INSERT
5. Find your row in the table - this tests READ (SELECT)
6. Click on your row, edit `completed` to `true`, click "Save" - this tests UPDATE
7. Click the trash icon to delete the row - this tests DELETE

**How to Get a User ID:**
1. Go to Table Editor → `profiles` table
2. Find any existing user (or create one via the app's sign-up)
3. Copy the `id` value (it's a UUID like `123e4567-e89b-12d3-a456-426614174000`)
4. Use this as your `user_id` in the test

**Option B: Using SQL Editor (More Control)**
Go to Supabase Dashboard → SQL Editor and run these queries:

```sql
-- First, get a user_id from your profiles table
SELECT id, display_name FROM profiles LIMIT 1;
-- Copy the id value from the result

-- Insert test data (replace 'YOUR-USER-ID-HERE' with the id you copied)
INSERT INTO onboarding_data (user_id, current_step, training_intent)
VALUES ('YOUR-USER-ID-HERE', 'account_basics', 'getting_stronger');

-- Read test data (replace with your user_id)
SELECT * FROM onboarding_data WHERE user_id = 'YOUR-USER-ID-HERE';

-- Update test data (replace with your user_id)
UPDATE onboarding_data 
SET completed = true, completed_at = now()
WHERE user_id = 'YOUR-USER-ID-HERE';

-- Verify the update worked
SELECT * FROM onboarding_data WHERE user_id = 'YOUR-USER-ID-HERE';
-- Should show completed = true

-- Delete test data (replace with your user_id)
DELETE FROM onboarding_data WHERE user_id = 'YOUR-USER-ID-HERE';
```

**What "Read" and "Update" Mean:**
- **Read (SELECT)**: Viewing the data in the table - you can see it in Table Editor or run a SELECT query
- **Update**: Changing existing data - edit a row in Table Editor or run an UPDATE query
- **Insert**: Adding new data - clicking "Insert row" or running INSERT query
- **Delete**: Removing data - clicking trash icon or running DELETE query

**Test**: All operations should work without errors. If you get RLS (Row Level Security) errors, that's actually good - it means security is working! But for testing, you may need to temporarily disable RLS or use a service role key (we'll handle this in the API functions).

#### Step 1.4: Create API File Structure
**What**: Create `lib/api/onboarding.ts` file with TypeScript interfaces
**File**: `lib/api/onboarding.ts`
**Content**: 
- TypeScript interfaces (`OnboardingData`, etc.)
- Export statements (empty functions for now)
**Test**: 
- File compiles without errors
- No runtime errors when importing

#### Step 1.5: Implement `getOnboardingState()` Function
**What**: Build function to fetch user's onboarding data
**Function**: `getOnboardingState()`
**Logic**:
- Get current user from `supabase.auth.getUser()`
- Query `onboarding_data` table for user
- If no record exists, create default record
- Return data or error
**Test**:
- Call function from test screen or console
- Verify it returns data for authenticated user
- Verify it creates default record if none exists
- Test with unauthenticated user (should error)

#### Step 1.6: Implement `updateOnboardingStep()` Function
**What**: Build function to update current step and progress
**Function**: `updateOnboardingStep(step: string, data?: Partial<OnboardingData>)`
**Logic**:
- Get current user
- Update `current_step` in database
- Add step to `completed_steps` array (if not already there)
- Update any additional fields from `data` parameter
- Return success/error
**Test**:
- Call function with different step names
- Verify `current_step` updates in database
- Verify `completed_steps` array grows
- Verify additional fields update correctly

#### Step 1.7: Implement `completeOnboarding()` Function
**What**: Build function to mark onboarding as finished
**Function**: `completeOnboarding()`
**Logic**:
- Get current user
- Set `completed = true`
- Set `completed_at = now()`
- Update `current_step = 'completed'`
- Return success/error
**Test**:
- Call function
- Verify `completed = true` in database
- Verify `completed_at` timestamp is set
- Verify cannot update after completion (optional validation)

#### Step 1.8: Implement `needsOnboarding()` Function
**What**: Build function to check if user needs onboarding
**Function**: `needsOnboarding()`
**Logic**:
- Get current user
- Check if `onboarding_data` record exists
- Check if `completed = false` or record doesn't exist
- Return boolean
**Test**:
- Test with new user (should return `true`)
- Test with completed user (should return `false`)
- Test with user mid-onboarding (should return `true`)

#### Step 1.9: Test All API Functions Together
**What**: Create a test sequence that exercises all functions
**Test Sequence**:
1. Call `needsOnboarding()` → should return `true`
2. Call `getOnboardingState()` → should create default record
3. Call `updateOnboardingStep('email_entry')` → should update step
4. Call `getOnboardingState()` → should show updated step
5. Call `updateOnboardingStep('account_basics', { training_intent: 'getting_stronger' })` → should update step and intent
6. Call `completeOnboarding()` → should mark as complete
7. Call `needsOnboarding()` → should return `false`
**Test**: All steps should work in sequence without errors

#### Step 1.10: Update AuthProvider Integration
**What**: Modify `AuthProvider.tsx` to check onboarding status
**Changes**:
- After successful sign-in/sign-up, call `needsOnboarding()`
- Store onboarding status in context or state
- Export onboarding status for use in navigation
**Test**:
- Sign up new user → should detect needs onboarding
- Sign in existing user → should detect onboarding status correctly
- Check status persists across app restarts

#### Step 1.11: Create Test Screen for Backend
**What**: Simple screen to test all backend functions manually
**File**: `app/(tabs)/test-onboarding.tsx` (temporary)
**Content**:
- Buttons to call each API function
- Display results on screen
- Show current onboarding state
**Test**:
- Click each button
- Verify results match database
- Test all functions work correctly

#### Step 1.12: Clean Up Test Data
**What**: Remove any test records from database
**Test**: 
- Verify production data is clean
- Remove test screen file (optional, can keep for debugging)

**Phase 1 Complete When**:
- ✅ All database tables exist and work
- ✅ All API functions work correctly
- ✅ All functions tested manually
- ✅ AuthProvider integration works
- ✅ Ready to build UI screens

### Phase 2: Auth Flow Updates (Week 1)

**Goal**: Set up routing and deep link handling so the app automatically shows onboarding screens when needed.

#### Step 2.1: Verify Deep Link Configuration
**What**: Check that `app.json` has correct scheme configuration
**File**: `app.json`
**Check**:
- `scheme` is set (should be `"myfirstapp"` or `"potential"`)
- iOS/Android deep link config if needed
**Test**: Verify configuration exists (no code changes needed if already configured)

#### Step 2.2: Create Onboarding Layout Structure
**What**: Create the onboarding folder structure and layout file
**File**: `app/onboarding/_layout.tsx`
**Content**: 
- Stack navigator for onboarding screens
- Screen definitions (empty screens for now)
**Test**: 
- File compiles without errors
- Can navigate to onboarding route (even if screens are empty)

#### Step 2.3: Create Placeholder Onboarding Screens
**What**: Create minimal placeholder screens for routing
**Files**: 
- `app/onboarding/welcome.tsx` (placeholder)
- `app/onboarding/email-entry.tsx` (placeholder)
- `app/onboarding/email-verification.tsx` (placeholder)
**Content**: Simple "Coming Soon" screens
**Test**: All screens render without errors

#### Step 2.4: Add Deep Link Handler for Email Verification
**What**: Set up expo-linking to handle email verification deep links
**File**: `app/_layout.tsx` or new hook/utility
**Logic**:
- Listen for deep links with format: `myfirstapp://verify?token=...`
- Extract token from URL
- Verify OTP with Supabase
- Navigate to next onboarding step on success
**Test**:
- Deep link handler is set up
- Can parse deep link URLs
- Can extract token from URL

#### Step 2.5: Update Root Layout with Routing Logic
**What**: Modify `app/_layout.tsx` to route based on auth and onboarding status
**File**: `app/_layout.tsx`
**Logic**:
- If not authenticated → show onboarding welcome screen
- If authenticated but needs onboarding → show onboarding flow
- If authenticated and onboarding complete → show main app tabs
- Handle loading states
**Test**:
- Unauthenticated user → sees onboarding
- Authenticated user needing onboarding → sees onboarding
- Authenticated user with completed onboarding → sees main app
- Loading states work correctly

#### Step 2.6: Test Routing with Different User States
**What**: Manually test routing with different user scenarios
**Test Scenarios**:
1. Sign out → should show onboarding welcome
2. Sign in with user who needs onboarding → should show onboarding
3. Sign in with user who completed onboarding → should show main app
4. Complete onboarding → should navigate to main app
**Test**: All routing scenarios work correctly

#### Step 2.7: Test Deep Link Handling (Manual)
**What**: Test that deep links can be received and parsed
**Test**: 
- Create test deep link URL
- Open in app (or use Expo Go deep link)
- Verify handler receives and parses the link
- Note: Full email verification flow will be tested when screens are built

#### Step 2.8: Verify OAuth Redirect Works
**What**: Ensure OAuth sign-in redirects back to app correctly
**File**: `providers/AuthProvider.tsx` (already configured)
**Test**:
- OAuth redirect URL is correct
- After OAuth, user is authenticated
- Onboarding status is checked after OAuth sign-in

**Phase 2 Complete When**:
- ✅ Deep link configuration is set up
- ✅ Onboarding layout structure exists
- ✅ Root layout routes correctly based on auth/onboarding status
- ✅ Deep link handler is set up (ready for email verification)
- ✅ OAuth redirects work
- ✅ Ready to build actual onboarding screens

### Phase 3: Onboarding Screens (Week 2)
1. ✅ Create `app/onboarding/_layout.tsx`
2. ✅ Build Screen 1: Welcome/Auth Selection
3. ✅ Build Screen 2: Email Entry
4. ✅ Build Screen 3: Email Verification
5. ✅ Build Screen 4: Account Basics
6. ✅ Build Screen 5: Sport Selection
7. ✅ Build Screen 6: Training Intent
8. ✅ Build Screen 7: App Introduction
9. ✅ Build Screen 8: Notifications
10. ✅ Build Screen 9: Premium Offer
11. ✅ Build Screen 10: Completion

### Phase 4: Integration & State Management (Week 2)

**Goal**: Connect all onboarding screens to the backend API, save user data as they progress, and implement resume functionality so users can continue where they left off.

#### Step 4.1: Connect Email Entry Screen to Backend
**What**: Save progress when user enters email
**File**: `app/onboarding/email-entry.tsx`
**Changes**:
- After successful OTP send, call `updateOnboardingStep('email_entry')`
- Save email to user metadata if needed
**Test**: 
- Enter email, send OTP
- Check database: `onboarding_data.current_step` should be `'email_entry'`
- Check `completed_steps` array includes `'email_entry'`

#### Step 4.2: Connect Email Verification Screen to Backend
**What**: Save progress when email is verified
**File**: `app/onboarding/email-verification.tsx`
**Changes**:
- After successful OTP verification, call `updateOnboardingStep('email_verification')`
**Test**:
- Verify email with code
- Check database: `current_step` should be `'email_verification'`
- Check `completed_steps` includes `'email_verification'`

#### Step 4.3: Connect Account Basics Screen to Backend
**What**: Save name and age to profiles table and update onboarding progress
**File**: `app/onboarding/account-basics.tsx`
**Changes**:
- On "Next" button press, call `updateProfileFromOnboarding()` with name and age
- Then call `updateOnboardingStep('account_basics')`
- Calculate age from birth year if using birth year input
**API Function**: Use `updateProfileFromOnboarding()` from `lib/api/onboarding.ts`
**Test**:
- Enter name and age, press Next
- Check `profiles` table: `display_name` and calculated age should be saved
- Check `onboarding_data.current_step` should be `'account_basics'`

#### Step 4.4: Connect Sport Selection Screen to Backend
**What**: Save selected sports to profiles table and update progress
**File**: `app/onboarding/sport-selection.tsx`
**Changes**:
- On "Next" button press, call `updateProfileFromOnboarding()` with selected sports
- Set `primary_sport` to first selected sport
- Then call `updateOnboardingStep('sport_selection')`
**Test**:
- Select 1-2 sports, press Next
- Check `profiles.sports` array contains selected sports
- Check `profiles.primary_sport` is set to first sport
- Check `onboarding_data.current_step` should be `'sport_selection'`

#### Step 4.5: Connect Training Intent Screen to Backend
**What**: Save training intent selection
**File**: `app/onboarding/training-intent.tsx`
**Changes**:
- On "Next" button press, call `updateOnboardingStep('training_intent', { training_intent: selectedIntent })`
- Map UI intent IDs to database values if needed
**Test**:
- Select training intent, press Next
- Check `onboarding_data.training_intent` matches selection
- Check `current_step` should be `'training_intent'`

#### Step 4.6: Connect App Introduction Screen to Backend
**What**: Mark intro as completed
**File**: `app/onboarding/app-intro.tsx`
**Changes**:
- On "Next" button press, call `updateOnboardingStep('app_intro', { intro_completed: true })`
**Test**:
- Press Next on intro screen
- Check `onboarding_data.intro_completed` is `true`
- Check `current_step` should be `'app_intro'`

#### Step 4.7: Connect Notifications Screen to Backend
**What**: Save notification preference
**File**: `app/onboarding/notifications.tsx`
**Changes**:
- After user grants/denies notification permission, call `updateOnboardingStep('notifications', { notifications_enabled: permissionStatus === 'granted' })`
- Also update `user_preferences.notification_preferences.push_enabled`
**Test**:
- Grant or deny notifications
- Check `onboarding_data.notifications_enabled` matches permission
- Check `user_preferences.notification_preferences.push_enabled` matches
- Check `current_step` should be `'notifications'`

#### Step 4.8: Connect Premium Offer Screen to Backend
**What**: Mark premium offer as shown
**File**: `app/onboarding/premium-offer.tsx`
**Changes**:
- On "Skip for now" or after purchase attempt, call `updateOnboardingStep('premium_offer', { premium_offer_shown: true })`
- If user purchases, handle purchase flow (future implementation)
**Test**:
- Press "Skip for now" or attempt purchase
- Check `onboarding_data.premium_offer_shown` is `true`
- Check `current_step` should be `'premium_offer'`

#### Step 4.9: Verify Completion Screen Integration
**What**: Ensure completion screen properly marks onboarding as complete
**File**: `app/onboarding/completion.tsx`
**Changes**:
- Verify `completeOnboarding()` is called correctly
- Ensure all data is saved before marking complete
**Test**:
- Complete full flow
- Check `onboarding_data.completed` is `true`
- Check `onboarding_data.completed_at` is set
- Check `current_step` is `'completed'`

#### Step 4.10: Implement Resume Functionality
**What**: If user closes app mid-onboarding, resume from last completed step
**File**: `app/_layout.tsx` and `app/onboarding/_layout.tsx`
**Changes**:
- On app load, check `onboarding_data.current_step`
- Route user to the appropriate screen based on `current_step`
- Handle edge cases (user completed some steps but not others)
**Logic**:
- If `current_step === 'email_entry'` → route to email-entry
- If `current_step === 'email_verification'` → route to email-verification
- If `current_step === 'account_basics'` → route to account-basics
- Continue for all steps...
**Test**:
- Start onboarding, complete a few steps
- Close app completely
- Reopen app
- Should resume from last completed step (or next step)

#### Step 4.11: Add Error Handling to All Screens
**What**: Handle API errors gracefully on all screens
**Files**: All onboarding screen files
**Changes**:
- Wrap API calls in try-catch blocks
- Show user-friendly error messages
- Allow retry on network errors
- Log errors for debugging
**Test**:
- Test with network disconnected
- Test with invalid data
- Verify error messages are user-friendly
- Verify retry functionality works

#### Step 4.12: Test Full Flow End-to-End
**What**: Complete end-to-end testing of entire onboarding flow
**Test Scenarios**:
1. **New Email User Flow**:
   - Welcome → Email Entry → Verification → Account Basics → Sport Selection → Training Intent → App Intro → Notifications → Premium → Completion
   - Verify all data is saved correctly
   - Verify progress is tracked
   - Verify user can complete flow

2. **OAuth User Flow**:
   - Welcome → OAuth Sign In → Account Basics → (rest of flow)
   - Verify OAuth users skip email entry/verification
   - Verify all data is saved

3. **Resume Flow**:
   - Start onboarding, complete 3 steps
   - Close app
   - Reopen app
   - Verify resumes from correct step
   - Complete remaining steps
   - Verify all data is saved

4. **Skip Flow**:
   - Test all skip buttons work
   - Verify skipped steps still save progress
   - Verify default values are applied

5. **Error Recovery**:
   - Test network errors at each step
   - Verify user can retry
   - Verify data isn't lost on error

**Phase 4 Complete When**:
- ✅ All screens save progress to database
- ✅ All user data is saved correctly
- ✅ Resume functionality works
- ✅ Error handling is implemented
- ✅ Full flow tested end-to-end
- ✅ OAuth and Email flows both work
- ✅ Skip functionality works

### Phase 5: Polish & Testing (Week 3)
1. ✅ Add loading states
2. ✅ Add error handling
3. ✅ Add animations/transitions
4. ✅ Test on Expo Go
5. ✅ Test on development build
6. ✅ Test OAuth flows
7. ✅ Test email verification
8. ✅ Test skip flows

---

## Testing Strategy

### Unit Tests
- Test API functions (`onboarding.ts`)
- Test navigation logic
- Test form validation

### Integration Tests
- Test full onboarding flow
- Test OAuth → onboarding flow
- Test email → verification → onboarding flow
- Test skip scenarios

### Manual Testing Checklist
- [ ] New user sign-up with email
- [ ] New user sign-up with Apple
- [ ] New user sign-up with Google
- [ ] Email verification code entry
- [ ] Email verification magic link
- [ ] All skip buttons work
- [ ] Progress persists if app closes mid-onboarding
- [ ] Returning user skips onboarding
- [ ] OAuth users skip email verification
- [ ] All form validations work
- [ ] Error states display correctly
- [ ] Loading states display correctly

### Expo Go Testing Notes
- Email auth: ✅ Fully testable
- OAuth: ⚠️ May have limitations, test on dev build
- Deep links: ⚠️ Configure scheme in `app.json`, test on device
- Notifications: ✅ Testable with `expo-notifications`

---

## Key Implementation Details

### 1. Onboarding State Persistence
- Store current step in database
- If user closes app, resume from last step
- Use `onboarding_data.current_step` to determine which screen to show

### 2. OAuth vs Email Flow
- **OAuth users**: Skip Screens 2-3 (email entry/verification)
- **Email users**: Complete all screens
- Both converge at Screen 4 (Account Basics)

### 3. Skip Functionality
- All optional screens have skip buttons
- Skipping still saves progress
- Default values applied when skipped

### 4. Terms & Privacy
- Single line of text on Screen 1
- Links to full Terms/Privacy pages (can be web views or separate screens)
- Required acknowledgment (checkbox or implicit by continuing)

### 5. Error Handling
- Network errors: Show retry button
- Invalid email: Show inline error
- Verification code expired: Show "Resend" option
- OAuth errors: Fallback to email option

### 6. Loading States
- Show loading spinner during API calls
- Disable buttons during submission
- Show success states briefly before navigation

---

## Can I Build This?

**Yes, absolutely!** 

This is a well-defined, standard onboarding flow that I can implement:
- ✅ All screens are straightforward UI components
- ✅ Backend integration uses existing Supabase patterns
- ✅ Navigation follows Expo Router conventions
- ✅ State management is clear and trackable
- ✅ OAuth integration already exists in codebase
- ✅ Email verification is standard Supabase feature

**Estimated Timeline**: 2-3 weeks for full implementation and testing

**Complexity**: Medium
- Most complexity is in state management and flow control
- Backend is straightforward database operations
- UI follows existing design patterns from settings screens

---

## Next Steps

1. **Review this plan** - Confirm approach and make any adjustments
2. **Create database migration** - Start with Phase 1
3. **Build screens incrementally** - Start with Screen 1, test, then move to next
4. **Test frequently** - Don't wait until end to test full flow
5. **Iterate based on feedback** - Adjust as needed during development

---

## Questions to Consider

1. **Password vs Passwordless**: Do email users need passwords, or just magic links/OTP?
   - Recommendation: Start with passwordless (OTP codes) for simpler UX

2. **Age vs Birth Year**: Store age (changes yearly) or birth year (static)?
   - Recommendation: Store birth year, calculate age in app

3. **Training Intent**: Required or optional?
   - Recommendation: Optional (skip-able) but encourage selection

4. **Premium Offer Timing**: Show immediately or after some usage?
   - Recommendation: Show in onboarding, but make it easy to skip

5. **Onboarding Resumption**: If user closes app mid-onboarding, resume or restart?
   - Recommendation: Resume from last completed step

---

## Additional Recommendations

### Micro-copy Examples
- **Sport Selection**: "We use this to customize your training insights."
- **Notifications**: "We'll only notify you when it matters."
- **Training Intent**: "This helps us personalize your experience."
- **Premium**: "Unlock deeper insights and advanced features."

### Default Values
- **Sports**: `['workout']` if none selected
- **Training Intent**: `null` if skipped
- **Notifications**: `false` if skipped
- **Premium**: `false` if skipped

### Analytics Events (Future)
Track these events for optimization:
- `onboarding_started`
- `onboarding_step_completed` (with step name)
- `onboarding_skipped` (with step name)
- `onboarding_completed`
- `onboarding_abandoned` (with last step)

---

**Ready to proceed?** Let me know if you'd like any adjustments to this plan before we start implementation!
