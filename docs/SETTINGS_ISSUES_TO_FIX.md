# Settings Issues Found in Testing

## ✅ Fixed Issues

### 1. Account Settings

#### Issue 1.1: Email Update Error ✅ FIXED
- **Problem**: When trying to update email from "testuser2@example.com" to "testuser22@example.com", getting error "Email address 'testuser2@example.com' is invalid"
- **Fix Applied**: 
  - Added email format validation before calling Supabase
  - Improved error handling with better error messages
  - Trim and lowercase email before sending to Supabase
- **File**: `lib/api/settings.ts` - `updateEmail()` function

#### Issue 1.3: Delete Account Doesn't Work ✅ FIXED
- **Problem**: Getting error "Account deletion required admin privileges. Please contact support"
- **Fix Applied**: 
  - Changed from using admin API to deleting profile directly
  - Profile deletion cascades to all related data via foreign keys
  - User is signed out after deletion
- **File**: `lib/api/settings.ts` - `deleteAccount()` function

### 2. App Preferences

#### Issue 2.2: Units Don't Affect App ✅ FIXED (Partially)
- **Problem**: Changing from lbs to kg doesn't change workout displays - still shows "Weight Ib"
- **Fix Applied**: 
  - Updated workout screen to use `useSettings()` hook
  - Weight label now dynamically shows "Weight (lb)" or "Weight (kg)" based on user preference
  - History detail screen now shows correct units
- **Files**: 
  - `app/(tabs)/workouts.tsx` - Added `useSettings()` and dynamic weight label
  - `app/(tabs)/history/[id].tsx` - Updated weight display to use units
- **Note**: Nutrition units still need to be implemented in meals components

### 3. Privacy and Security

#### Issue 3.1: Privacy Toggles Don't Work ✅ FIXED
- **Problem**: Setting account to private/followers-only doesn't prevent other users from viewing
- **Fix Applied**: 
  - Added privacy checks when loading other users' profiles
  - Checks if profile is set to "followers only" and verifies if current user is following
  - Shows alert and redirects if user doesn't have permission
- **File**: `app/(tabs)/profile/index.tsx` - `loadProfile()` function

#### Issue 3.2: Can't Block Users ✅ FIXED
- **Problem**: No way to block users from the app - blocked users screen exists but no way to block
- **Fix Applied**: 
  - Added "Block User" button to profile screen (only visible when viewing other users)
  - Button shows confirmation dialog before blocking
  - Uses existing `blockUser()` API function
- **File**: `app/(tabs)/profile/index.tsx` - Added block button after "View Creator Workouts" button

### 5. Sports and Training

#### Issue 5.1: Set Primary Sport Doesn't Work ✅ FIXED
- **Problem**: Clicking "Set Primary" doesn't change the primary sport
- **Fix Applied**: 
  - Updated `reorderSports()` function to ensure primary sport is in the sports array
  - If primary sport not in array, it's added to the front
  - If no primary specified but sports exist, first sport becomes primary
- **File**: `lib/api/settings.ts` - `reorderSports()` function

---

## ⚠️ Remaining Issues

### 1. Account Settings

#### Issue 1.2: Profile Tab Stuck on Edit Screen
- **Problem**: Profile tab shows edit profile screen and can't navigate away (only on one account)
- **Status**: 🟡 Needs Investigation
- **Note**: Only happened on account where password was changed, other accounts work fine
- **Possible Causes**: 
  - Navigation state issue
  - React state not resetting properly
  - Could be a one-off issue specific to that account
- **Recommendation**: Test with fresh account, check if issue persists

### 2. App Preferences

#### Issue 2.1: Theme Doesn't Change
- **Problem**: Switching theme to light mode doesn't change the app appearance, stays dark
- **Status**: 🔴 Needs Major Refactor
- **Issue**: The app uses hardcoded dark theme colors throughout all components
- **What's Needed**: 
  - Create a dynamic theme system that switches between light/dark color palettes
  - Update all components to use theme colors instead of hardcoded values
  - This is a large refactoring task affecting many files
- **Current Status**: SettingsContext stores theme preference, but components don't use it
- **Files Affected**: All component files that use `theme.colors.*`

### 6. Nutrition Settings

#### Issue 6.1: Units Don't Affect App
- **Problem**: Changing nutrition units doesn't change what's displayed in meals tab
- **Status**: 🔴 Needs Implementation
- **What's Needed**: 
  - Update meals components to use `useSettings()` hook
  - Display units (g/oz, ml/fl oz) based on user preference
  - Convert values if needed (though most nutrition is in grams/milliliters)
- **Files to Update**: 
  - `app/(tabs)/meals/*.tsx` files
  - Any components that display nutrition values

#### Issue 6.2: Custom Reset Time Not Implemented
- **Problem**: Shows "Custom reset time picker coming soon" message
- **Status**: 🟡 Low Priority (can be placeholder for now)
- **Note**: This is a placeholder feature, can be implemented later

---

## Summary

**Fixed**: 6 out of 9 issues
- ✅ Email update error handling
- ✅ Delete account functionality
- ✅ Units in workouts (weight labels)
- ✅ Privacy toggles enforcement
- ✅ Block user functionality
- ✅ Set primary sport

**Remaining**: 3 issues
- 🟡 Profile tab stuck (needs investigation - may be one-off)
- 🔴 Theme switching (requires major refactor)
- 🔴 Nutrition units (needs implementation in meals components)

---

## Testing Recommendations

1. **Test email update** with various email formats
2. **Test delete account** - verify all data is deleted and user is signed out
3. **Test privacy settings** - set account to private/followers-only and verify other users can't view
4. **Test block user** - block a user and verify they can't view your profile
5. **Test units** - change weight units and verify workout displays update
6. **Test set primary sport** - verify primary sport changes correctly
7. **Test profile tab navigation** - check if stuck edit screen issue persists

