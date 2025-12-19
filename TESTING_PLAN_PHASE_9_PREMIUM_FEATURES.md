# Testing Plan: Phase 9 - Premium Features

## Overview
This testing plan covers all premium feature gating functionality implemented in Section 8 of the app documentation. Premium features are locked for free users and unlocked for premium/creator users.

---

## Prerequisites

### Test Accounts Setup
1. **Free Account**: Create or use an account with `is_premium = false` and `plan = 'free'`
2. **Premium Account**: Create or use an account with `is_premium = true` OR `plan = 'premium'`
3. **Creator Account**: Create or use an account with `is_creator = true` OR `plan = 'creator'`

### Database Setup
To test premium features, you can manually update the user's profile in Supabase:
```sql
-- Make user premium
UPDATE profiles SET is_premium = true, plan = 'premium' WHERE id = 'user-id-here';

-- Make user free
UPDATE profiles SET is_premium = false, plan = 'free' WHERE id = 'user-id-here';

-- Make user creator
UPDATE profiles SET is_creator = true, plan = 'creator' WHERE id = 'user-id-here';
```

---

## Test Cases

### 9.1 Log Game & Log Practice Features

#### Test 9.1.1: Free User - Log Game Card
**Steps:**
1. Log in as a free user
2. Navigate to any sport home screen (Basketball, Football, Baseball, Soccer, Hockey, Tennis)
3. Locate the "Log Game" card

**Expected Results:**
- ✅ Card should be grayed out (opacity ~0.5)
- ✅ Lock icon should be visible in the center overlay
- ✅ Button should be grayed out (not green gradient)
- ✅ Card image should be dimmed

#### Test 9.1.2: Free User - Log Practice Card
**Steps:**
1. Log in as a free user
2. Navigate to any sport home screen
3. Locate the "Log Team Practices" card

**Expected Results:**
- ✅ Card should be grayed out (opacity ~0.5)
- ✅ Lock icon should be visible in the center overlay
- ✅ Button should be grayed out (not green gradient)
- ✅ Card image should be dimmed

#### Test 9.1.3: Free User - Clicking Locked Game/Practice Cards
**Steps:**
1. Log in as a free user
2. Click on a grayed-out "Log Game" or "Log Practice" card

**Expected Results:**
- ✅ Upgrade modal should appear
- ✅ Modal should show "Purchase Premium to unlock [feature name]"
- ✅ Modal should list all premium benefits
- ✅ "Upgrade to Premium" button should navigate to purchase screen
- ✅ "Maybe Later" button should close the modal

#### Test 9.1.4: Premium User - Log Game & Practice Cards
**Steps:**
1. Log in as a premium or creator user
2. Navigate to any sport home screen
3. Check both "Log Game" and "Log Team Practices" cards

**Expected Results:**
- ✅ Cards should NOT be grayed out (full opacity)
- ✅ NO lock icons should be visible
- ✅ Buttons should have green gradient
- ✅ Clicking cards should navigate to add-game/add-practice screens

**Test on all sport screens:**
- ✅ Basketball (`/(tabs)/(home)/basketball`)
- ✅ Football (`/(tabs)/(home)/football`)
- ✅ Baseball (`/(tabs)/(home)/baseball`)
- ✅ Soccer (`/(tabs)/(home)/soccer`)
- ✅ Hockey (`/(tabs)/(home)/hockey`)
- ✅ Tennis (`/(tabs)/(home)/tennis`)

---

### 9.2 AI Trainer Feature

#### Test 9.2.1: Free User - AI Trainer Button
**Steps:**
1. Log in as a free user
2. Navigate to Home tab (main home screen)
3. Locate the AI Trainer button (sparkles icon) in bottom-left corner

**Expected Results:**
- ✅ Button should be grayed out (dark gray, not green)
- ✅ Lock icon should be visible instead of sparkles icon
- ✅ Button should have reduced opacity (~0.6)

#### Test 9.2.2: Free User - Clicking AI Trainer Button
**Steps:**
1. Log in as a free user
2. Click the AI Trainer button

**Expected Results:**
- ✅ Upgrade modal should appear
- ✅ Modal should show "Purchase Premium to unlock AI Trainer"
- ✅ "Upgrade to Premium" button should navigate to purchase screen

#### Test 9.2.3: Premium User - AI Trainer Button
**Steps:**
1. Log in as a premium or creator user
2. Navigate to Home tab
3. Check the AI Trainer button

**Expected Results:**
- ✅ Button should be green (primary color)
- ✅ Sparkles icon should be visible (not lock icon)
- ✅ Full opacity
- ✅ Clicking should open the AI Trainer chat modal

---

### 9.3 Add Highlights Feature

#### Test 9.3.1: Free User - Add Highlights Button
**Steps:**
1. Log in as a free user
2. Navigate to Profile tab
3. Locate the "Add Highlights" button

**Expected Results:**
- ✅ Button should be grayed out (opacity ~0.5)
- ✅ Lock icon should be visible next to the text
- ✅ Button text should still be readable

#### Test 9.3.2: Free User - Clicking Add Highlights
**Steps:**
1. Log in as a free user
2. Click the "Add Highlights" button

**Expected Results:**
- ✅ Upgrade modal should appear
- ✅ Modal should show "Purchase Premium to unlock Add Highlights"
- ✅ Image picker should NOT open

#### Test 9.3.3: Premium User - Add Highlights
**Steps:**
1. Log in as a premium or creator user
2. Navigate to Profile tab
3. Click "Add Highlights"

**Expected Results:**
- ✅ Button should NOT be grayed out
- ✅ NO lock icon should be visible
- ✅ Clicking should open image/video picker
- ✅ User should be able to upload highlights

#### Test 9.3.4: Viewing Highlights (All Users)
**Steps:**
1. Log in as any user (free, premium, or creator)
2. Navigate to any profile (own or other user's)
3. Check the Highlights section

**Expected Results:**
- ✅ All users should be able to VIEW highlights on any profile
- ✅ Only premium/creator users can ADD highlights to their own profile

---

### 9.4 Meals Progress Graph

#### Test 9.4.1: Free User - Meals Graph
**Steps:**
1. Log in as a free user
2. Navigate to Meals tab
3. Scroll to the Progress Graph section

**Expected Results:**
- ✅ Graph should be grayed out (opacity ~0.5)
- ✅ Lock icon should be visible in the center overlay
- ✅ Graph should still be visible but dimmed

#### Test 9.4.2: Free User - Clicking Meals Graph
**Steps:**
1. Log in as a free user
2. Click on the grayed-out meals graph

**Expected Results:**
- ✅ Upgrade modal should appear
- ✅ Modal should show "Purchase Premium to unlock Meals Progress Graph"

#### Test 9.4.3: Premium User - Meals Graph
**Steps:**
1. Log in as a premium or creator user
2. Navigate to Meals tab
3. Check the Progress Graph

**Expected Results:**
- ✅ Graph should NOT be grayed out (full opacity)
- ✅ NO lock icon should be visible
- ✅ Graph should be fully interactive
- ✅ User should be able to change macro/range dropdowns

---

### 9.5 View Creator Workouts Feature

#### Test 9.5.1: Free User - View Creator Workouts Button
**Steps:**
1. Log in as a free user
2. Navigate to a creator's profile (profile with `is_creator = true`)
3. Locate the "View Creator Workouts" button

**Expected Results:**
- ✅ Button should be grayed out (opacity ~0.5)
- ✅ Lock icon should be visible next to the text
- ✅ Button should still be visible (gold background)

#### Test 9.5.2: Free User - Clicking View Creator Workouts
**Steps:**
1. Log in as a free user
2. Click the "View Creator Workouts" button on a creator's profile

**Expected Results:**
- ✅ Upgrade modal should appear
- ✅ Modal should show "Purchase Premium to unlock View Creator Workouts"
- ✅ Should NOT navigate to creator workouts screen

#### Test 9.5.3: Premium User - View Creator Workouts
**Steps:**
1. Log in as a premium or creator user
2. Navigate to a creator's profile
3. Click "View Creator Workouts"

**Expected Results:**
- ✅ Button should NOT be grayed out
- ✅ NO lock icon should be visible
- ✅ Clicking should navigate to creator workouts screen
- ✅ User should see the creator's logged workouts

---

### 9.6 History Tab Dropdown

#### Test 9.6.1: Free User - History Dropdown Options
**Steps:**
1. Log in as a free user
2. Navigate to History tab
3. Click the dropdown to see history type options

**Expected Results:**
- ✅ "Workouts" option should be normal (no lock icon)
- ✅ "Practices" option should have a lock icon
- ✅ "Games" option should have a lock icon
- ✅ Locked options should be grayed out (opacity ~0.5)

#### Test 9.6.2: Free User - Clicking Locked Options
**Steps:**
1. Log in as a free user
2. Open the history dropdown
3. Try to click "Practices" or "Games"

**Expected Results:**
- ✅ Clicking should NOT change the selected history type
- ✅ Dropdown should remain open
- ✅ NO upgrade modal should appear (per documentation: no modal for dropdown)

#### Test 9.6.3: Premium User - History Dropdown
**Steps:**
1. Log in as a premium or creator user
2. Navigate to History tab
3. Open the dropdown

**Expected Results:**
- ✅ All three options should be available (Workouts, Practices, Games)
- ✅ NO lock icons should be visible
- ✅ User should be able to switch between all three types
- ✅ Each type should load the appropriate data

---

### 9.7 Settings Screen - Add More Sports

#### Test 9.7.1: Free User - Add More Sports Option
**Steps:**
1. Log in as a free user
2. Navigate to Settings (via home screen settings button)
3. Locate "Add More Sports" option

**Expected Results:**
- ✅ Option should be visible
- ✅ Lock icon should be visible next to the text
- ✅ Option should NOT be grayed out (per documentation: no gray out for this feature)
- ✅ Chevron arrow should still be visible

#### Test 9.7.2: Free User - Clicking Add More Sports
**Steps:**
1. Log in as a free user
2. Click "Add More Sports" in Settings

**Expected Results:**
- ✅ NO upgrade modal should appear (per documentation)
- ✅ Option should be disabled (nothing happens)

#### Test 9.7.3: Premium User - Add More Sports
**Steps:**
1. Log in as a premium or creator user
2. Navigate to Settings
3. Check "Add More Sports" option

**Expected Results:**
- ✅ NO lock icon should be visible
- ✅ Option should be clickable
- ✅ Should navigate to Add More Sports screen (when implemented)

---

### 9.8 Purchase Premium Screen

#### Test 9.8.1: Navigation to Purchase Screen
**Steps:**
1. Log in as a free user
2. Click any premium feature (trigger upgrade modal)
3. Click "Upgrade to Premium" button

**Expected Results:**
- ✅ Should navigate to Purchase Premium screen
- ✅ Screen should show premium badge
- ✅ Should list all premium features
- ✅ Should show pricing ($9.99/month)
- ✅ Should show payment placeholder (Stripe not yet integrated)

#### Test 9.8.2: Purchase Screen Content
**Steps:**
1. Navigate to Purchase Premium screen
2. Review all content

**Expected Results:**
- ✅ All 6 premium features should be listed with icons
- ✅ Pricing should be clearly displayed
- ✅ Payment form placeholder should be visible
- ✅ Note about Stripe integration should be visible
- ✅ "Purchase Premium" button should be visible (currently shows placeholder alert)

#### Test 9.8.3: Purchase Button (Placeholder)
**Steps:**
1. Navigate to Purchase Premium screen
2. Click "Purchase Premium" button

**Expected Results:**
- ✅ Should show alert: "Payment integration coming soon! This is a placeholder screen."
- ✅ Button should NOT actually process payment (Stripe not integrated yet)

**Note:** Full payment integration will be implemented when Stripe is set up. This is expected behavior for now.

---

### 9.9 Upgrade Modal

#### Test 9.9.1: Modal Appearance
**Steps:**
1. Log in as a free user
2. Click any premium feature to trigger upgrade modal

**Expected Results:**
- ✅ Modal should appear as overlay (not full screen)
- ✅ Should have lock icon at top
- ✅ Should show "Premium Feature" title
- ✅ Should show "Purchase Premium to unlock [feature name]" message
- ✅ Should list all 6 premium benefits with checkmarks
- ✅ Should have "Maybe Later" and "Upgrade to Premium" buttons

#### Test 9.9.2: Modal Functionality
**Steps:**
1. Open upgrade modal
2. Click "Maybe Later"

**Expected Results:**
- ✅ Modal should close
- ✅ User should return to previous screen

**Steps:**
3. Open upgrade modal again
4. Click "Upgrade to Premium"

**Expected Results:**
- ✅ Modal should close
- ✅ Should navigate to Purchase Premium screen

---

### 9.10 Premium Status Detection

#### Test 9.10.1: Feature Access Logic
**Steps:**
1. Test with free account (`is_premium = false`, `plan = 'free'`)

**Expected Results:**
- ✅ All premium features should be locked
- ✅ `useFeatures()` hook should return `isPremium = false`

**Steps:**
2. Test with premium account (`is_premium = true` OR `plan = 'premium'`)

**Expected Results:**
- ✅ All premium features should be unlocked
- ✅ `useFeatures()` hook should return `isPremium = true`

**Steps:**
3. Test with creator account (`is_creator = true` OR `plan = 'creator'`)

**Expected Results:**
- ✅ All premium features should be unlocked (creators get free premium)
- ✅ `useFeatures()` hook should return `isPremium = true` and `isCreator = true`

---

## Edge Cases & Error Handling

### 9.11 Profile Loading States
**Steps:**
1. Log in and immediately navigate to a screen with premium features
2. Check feature states while profile is loading

**Expected Results:**
- ✅ Features should default to locked state while loading
- ✅ No errors should occur
- ✅ Features should update correctly once profile loads

### 9.12 Network Errors
**Steps:**
1. Disable network connection
2. Try to access premium features

**Expected Results:**
- ✅ Features should remain in locked state if profile fails to load
- ✅ No crashes should occur
- ✅ Error should be handled gracefully

---

## Known Limitations

### Payment Integration
- ⚠️ **Payment processing is NOT yet implemented**
- The Purchase Premium screen is a placeholder
- Stripe integration will be added later
- Users cannot actually purchase premium yet
- This is documented in the testing guide and the purchase screen itself

### Settings Screen
- ⚠️ Some settings options are placeholders (Help & Support, About & Privacy)
- These will be implemented in future phases

---

## Test Completion Checklist

- [ ] 9.1.1 - Free user: Log Game card grayed out
- [ ] 9.1.2 - Free user: Log Practice card grayed out
- [ ] 9.1.3 - Free user: Clicking locked cards shows modal
- [ ] 9.1.4 - Premium user: Cards are unlocked (all sport screens)
- [ ] 9.2.1 - Free user: AI Trainer button locked
- [ ] 9.2.2 - Free user: Clicking AI Trainer shows modal
- [ ] 9.2.3 - Premium user: AI Trainer works
- [ ] 9.3.1 - Free user: Add Highlights button locked
- [ ] 9.3.2 - Free user: Clicking Add Highlights shows modal
- [ ] 9.3.3 - Premium user: Add Highlights works
- [ ] 9.3.4 - All users can view highlights
- [ ] 9.4.1 - Free user: Meals graph locked
- [ ] 9.4.2 - Free user: Clicking graph shows modal
- [ ] 9.4.3 - Premium user: Meals graph works
- [ ] 9.5.1 - Free user: View Creator Workouts locked
- [ ] 9.5.2 - Free user: Clicking shows modal
- [ ] 9.5.3 - Premium user: View Creator Workouts works
- [ ] 9.6.1 - Free user: History dropdown shows locks
- [ ] 9.6.2 - Free user: Locked options don't work
- [ ] 9.6.3 - Premium user: All history types work
- [ ] 9.7.1 - Free user: Add More Sports shows lock
- [ ] 9.7.2 - Free user: Add More Sports disabled
- [ ] 9.7.3 - Premium user: Add More Sports enabled
- [ ] 9.8.1 - Navigation to purchase screen works
- [ ] 9.8.2 - Purchase screen content is correct
- [ ] 9.8.3 - Purchase button shows placeholder
- [ ] 9.9.1 - Upgrade modal appears correctly
- [ ] 9.9.2 - Upgrade modal buttons work
- [ ] 9.10.1 - Premium status detection works for all account types
- [ ] 9.11 - Loading states handled correctly
- [ ] 9.12 - Network errors handled gracefully

---

## Notes

- All premium features should be tested with both `is_premium` flag and `plan` enum
- Creator accounts should have access to all premium features
- The upgrade modal should be consistent across all premium features
- Payment integration is a future task and is not part of this phase

---

**Testing Status:** Ready for testing
**Last Updated:** Phase 9 Implementation
**Next Steps:** Test all cases, then proceed to payment integration when Stripe is set up

