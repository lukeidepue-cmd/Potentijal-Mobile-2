# Testing Plan - Phase 7 Fixes Round 2

## Overview
This testing plan covers the remaining issues from Phase 7 that need to be fixed and tested.

## Pre-Testing Setup

### 1. Storage Buckets
**IMPORTANT:** Ensure these buckets exist in Supabase:
- `profiles` bucket (public access)
- `highlights` bucket (public access)

### 2. Test Users
- You should have at least 2-3 test user accounts
- At least one should be set as `is_creator = true` for testing
- See `CREATE_TEST_USERS.md` for instructions

---

## Fix 1: Profile Picture Upload (7.1.2)

### Issue
"Failed to upload profile picture: Property 'blob' doesn't exist"

### Fix Applied
- Switched from `fetch().blob()` to `expo-file-system` for React Native compatibility
- Files are now read as base64 and converted to ArrayBuffer

### Test Steps
1. Go to Profile tab
2. Tap profile picture (or plus icon)
3. Select a photo from camera roll
4. Crop/adjust if prompted
5. Tap "Choose" or "Save"
6. **Expected:** Photo uploads successfully without error
7. **Expected:** Photo appears as profile picture immediately
8. Check console logs for:
   - `✅ [Profile Image] Upload successful`
   - `✅ [Profile Image] Public URL`
9. Check Supabase Storage → `profiles` bucket to confirm file exists
10. Check `profiles` table to confirm `profile_image_url` was updated
11. Reload app and verify photo persists

**Pass Criteria:** Profile picture uploads without errors and displays correctly.

---

## Fix 2: Highlights Upload (7.2.1)

### Issue
"Property 'blob' doesn't exist" error when uploading highlights

### Fix Applied
- Switched from `fetch().blob()` to `expo-file-system` for React Native compatibility
- Videos are now read as base64 and converted to ArrayBuffer

### Test Steps
1. Go to Profile tab
2. Tap "Add Highlights" button
3. Select 2-3 videos from camera roll
4. Tap "Choose" or "Add"
5. **Expected:** Videos upload successfully without error
6. Check console logs for:
   - `✅ [Highlights] Upload successful` (for each video)
   - `✅ [Highlights] Insert successful` (for each video)
7. Verify highlights count increases on profile tab
8. Verify most recent highlight appears as preview
9. Check Supabase Storage → `highlights` bucket to confirm files exist
10. Check `highlights` table to confirm records were created

**Pass Criteria:** Highlights upload without errors and appear in profile.

---

## Fix 3: Highlights View & Delete (7.2.2 & 7.2.3)

### Test Steps (After 7.2.1 works)

#### 7.2.2: View Highlights Full-Screen
1. Tap the highlight preview (video thumbnail)
2. **Expected:** Full-screen video viewer opens
3. **Expected:** Current video plays automatically
4. Scroll down to see next highlight
5. **Expected:** Video switches to next highlight smoothly
6. Continue scrolling through all highlights
7. **Expected:** Back arrow button visible (top-left)
8. **Expected:** Trash can button visible (top-right)

**Pass Criteria:** Highlights display in full-screen with smooth scrolling.

#### 7.2.3: Delete Highlight
1. Open highlights full-screen viewer
2. Navigate to a highlight you want to delete
3. Tap trash can button (top-right)
4. **Expected:** Highlight is removed from list
5. **Expected:** If last highlight, viewer closes
6. **Expected:** Highlights count decreases on profile tab
7. Check Supabase Storage to confirm file was deleted
8. Check `highlights` table to confirm record was deleted

**Pass Criteria:** Highlights can be deleted successfully.

---

## Fix 4: Recommended Profiles (7.3.2)

### Issue
"No recommendations available" even when other users exist

### Fix Applied
- Improved query logic to show profiles even without mutual friends
- Prioritizes creators, then shows newest profiles

### Test Steps
1. Ensure you have at least 2-3 test user accounts
2. Go to Profile tab
3. Tap "Find Friends and Creators"
4. **Expected:** List of recommended profiles appears (if other users exist)
5. **Expected:** Creators appear first in the list
6. **Expected:** Each profile shows:
   - Profile picture (or placeholder)
   - Display name
   - Username
   - Follow/Following button
7. **Expected:** Creators have golden glow around profile picture
8. **Expected:** Current user is NOT in the list

**Pass Criteria:** Recommended profiles display correctly, prioritizing creators.

**Note:** If you only have 1-2 users total, you might still see "No recommendations available" if you're following all other users. This is expected behavior.

---

## Fix 5: Creator Workouts Display (7.4.2)

### Issue
Creator workouts not showing when viewing own profile as creator

### Fix Applied
- Improved query with better error handling for `is_finalized` column
- Added detailed logging to debug issues
- Fixed filtering logic

### Test Steps
1. Ensure you have `is_creator = true` for your test profile
2. Ensure you have at least 2-3 **finalized** workouts (clicked "Finish Workout")
3. Go to Profile tab
4. Verify "View Creator Workouts" button appears
5. Tap "View Creator Workouts" button
6. **Expected:** Screen opens with list of workouts
7. **Expected:** All finalized workouts appear (most recent first)
8. Check console logs for:
   - `📋 [Creator Workouts] Fetching workouts for profile: [ID]`
   - `✅ [Creator Workouts] Found X finalized workouts`
9. Each workout should show:
   - Date (MM/DD/YY format)
   - Workout name
   - Sport mode icon
10. **Expected:** Only finalized workouts appear (drafts excluded)

**Pass Criteria:** Creator workouts list displays all finalized workouts.

**Troubleshooting:**
- If no workouts appear, check console logs for errors
- Verify workouts are finalized (check `is_finalized = true` in Supabase)
- Verify you're viewing the correct profile ID

---

## Fix 6: Creator Workouts - View Detail & Copy (7.4.3 - 7.4.6)

### Test Steps (After 7.4.2 works)

#### 7.4.3: View Creator Workout Detail
1. Tap a workout in the creator workouts list
2. **Expected:** Workout detail screen opens
3. **Expected:** All exercises and sets displayed (read-only)
4. **Expected:** "Copy" button appears at top-right (if not running mode)
5. **Expected:** Back button works

**Pass Criteria:** Workout details display correctly.

#### 7.4.4: Copy Workout - Success
1. Ensure you have the same sport mode as the creator workout
2. View a creator workout (not running mode)
3. **Expected:** "Copy" button is enabled (not grayed out)
4. Tap "Copy" button
5. **Expected:** Success message appears
6. **Expected:** Taken to Workouts tab
7. **Expected:** New workout appears with:
   - Name includes "(Copied)" suffix
   - Same exercises as creator workout
   - Same exercise types
   - **NO sets** (empty sets)
8. Verify you can add your own sets and complete the workout

**Pass Criteria:** Workout copies successfully with exercises but no sets.

#### 7.4.5: Copy Workout - Mode Mismatch
1. Ensure your profile has different sports than the creator
2. View a creator workout from a mode you don't have
3. **Expected:** "Copy" button is disabled/grayed out
4. **Expected:** Error message appears: "Cannot copy workout because it was logged in [Mode] mode"
5. **Expected:** Cannot copy the workout

**Pass Criteria:** Mode mismatch is detected and copy is prevented.

#### 7.4.6: Copy Workout - Running Mode
1. View a creator workout that is in "running" mode
2. **Expected:** "Copy" button does NOT appear
3. **Expected:** No copy functionality available

**Pass Criteria:** Running mode workouts cannot be copied.

---

## Fix 7: Test Auth Screen in Settings (7.4)

### Issue
Need access to test-auth screen for login/logout testing

### Fix Applied
- Settings button (gear icon) on Home tab now navigates to test-auth screen
- Test-auth screen updated with sign out functionality and back button

### Test Steps
1. Go to Home tab
2. Tap the Settings button (gear icon) in top-right
3. **Expected:** Test Authentication screen opens
4. If signed in:
   - **Expected:** Shows email and user ID
   - **Expected:** "Sign Out" button appears
   - Tap "Sign Out"
   - **Expected:** Signed out successfully
   - **Expected:** Sign in form appears
5. If signed out:
   - Enter email and password
   - Tap "Sign In" or "Sign Up"
   - **Expected:** Authentication works
   - **Expected:** Can sign in/out between different accounts
6. **Expected:** Back button works to return to Home tab

**Pass Criteria:** Can easily switch between test accounts for testing.

---

## Cross-Feature Testing

### Profile Stats Updates
**Test:**
1. Follow a user → Verify "Following" count increases
2. Add a highlight → Verify "Highlights" count increases
3. Delete a highlight → Verify "Highlights" count decreases
4. Unfollow a user → Verify "Following" count decreases

**Pass Criteria:** All stats update correctly in real-time.

### Data Persistence
**Test:**
1. Make changes (edit profile, upload picture, add highlights)
2. Close and reopen the app
3. Verify all changes persist

**Pass Criteria:** All data persists after app restart.

---

## Known Issues / Notes

- Storage buckets must be created manually in Supabase Dashboard
- Profile picture and highlights require `expo-file-system` (now installed)
- Creator status must be set manually in database for testing
- Only finalized workouts appear in creator workouts list
- Running mode workouts cannot be copied (by design)
- Recommended profiles may be empty if you're following all other users

---

## Next Steps

After confirming all tests pass, Phase 7 should be fully complete! All features should now work:
- ✅ Profile picture upload (React Native compatible)
- ✅ Highlights upload (React Native compatible)
- ✅ Profile edits with UI refresh
- ✅ Username validation
- ✅ Find Friends with recommendations
- ✅ Follow/unfollow functionality
- ✅ Creator workouts viewing and copying
- ✅ Test auth screen accessible from Settings

