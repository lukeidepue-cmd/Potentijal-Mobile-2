# Testing Plan - Phase 7 Fixes Round 3

## Overview
This testing plan covers the remaining issues from Phase 7 that still need to be fixed and tested after the latest round of fixes.

## Pre-Testing Setup

### 1. Storage Buckets
**IMPORTANT:** Ensure these buckets exist in Supabase:
- `profiles` bucket (public access) ✅ (Confirmed from screenshot)
- `highlights` bucket (public access) ✅ (Confirmed from screenshot)

### 2. Test Users
- You should have at least 2-3 test user accounts
- At least one should be set as `is_creator = true` for testing
- See `CREATE_TEST_USERS.md` for instructions

---

## Fix 1: Profile Picture Upload (7.1.2)

### Issue
"Failed to upload profile picture: Cannot read property 'Base64' of undefined"

### Fix Applied
- Removed `expo-file-system` Base64 encoding approach
- Now using file URI directly with Supabase storage (React Native compatible)
- File object with `uri`, `type`, and `name` properties

### Test Steps
1. Go to Profile tab
2. Tap profile picture (or plus icon)
3. Select a photo from camera roll
4. Crop/adjust if prompted
5. Tap "Choose" or "Save"
6. **Expected:** Photo uploads successfully without error
7. **Expected:** Photo appears as profile picture immediately
8. Check console logs for:
   - `📤 [Profile Image] Starting upload`
   - `✅ [Profile Image] Upload successful`
   - `✅ [Profile Image] Public URL`
9. Check Supabase Storage → `profiles` bucket to confirm file exists
10. Check `profiles` table to confirm `profile_image_url` was updated
11. Reload app and verify photo persists

**Pass Criteria:** Profile picture uploads without errors and displays correctly.

**If Still Failing:**
- Check console logs for specific error messages
- Verify storage bucket permissions
- Check network connectivity

---

## Fix 2: Highlights Upload (7.2.1)

### Issue
"Cannot read property 'Base64' of undefined" error when uploading highlights

### Fix Applied
- Removed `expo-file-system` Base64 encoding approach
- Now using file URI directly with Supabase storage (React Native compatible)
- File object with `uri`, `type`, and `name` properties

### Test Steps
1. Go to Profile tab
2. Tap "Add Highlights" button
3. Select 2-3 videos from camera roll
4. Tap "Choose" or "Add"
5. **Expected:** Videos upload successfully without error
6. Check console logs for:
   - `📤 [Highlights] Starting upload` (for each video)
   - `✅ [Highlights] Upload successful` (for each video)
   - `✅ [Highlights] Insert successful` (for each video)
7. Verify highlights count increases on profile tab
8. Verify most recent highlight appears as preview
9. Check Supabase Storage → `highlights` bucket to confirm files exist
10. Check `highlights` table to confirm records were created

**Pass Criteria:** Highlights upload without errors and appear in profile.

**If Still Failing:**
- Check console logs for specific error messages
- Verify storage bucket permissions
- Check network connectivity

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
"No recommendations available" even when other users exist (including creators)

### Fix Applied
- Improved recommendation algorithm with mutual followers detection
- Profiles with mutual followers appear first (sorted by mutual count)
- Creators appear next (if no mutuals)
- Others appear last
- Always shows creators even without mutuals

### Test Steps
1. Ensure you have at least 2-3 test user accounts
2. Ensure at least one account is set as `is_creator = true`
3. Go to Profile tab
4. Tap "Find Friends and Creators"
5. **Expected:** List of recommended profiles appears
6. **Expected:** Order should be:
   - Profiles with mutual followers first (highest mutual count first)
   - Creators next (if no mutuals)
   - Other profiles last
7. **Expected:** Each profile shows:
   - Profile picture (or placeholder)
   - Display name
   - Username
   - Follow/Following button
8. **Expected:** Creators have golden glow around profile picture
9. **Expected:** Current user is NOT in the list
10. Check console logs for:
    - `👥 [Recommended Profiles] Found X total profiles`
    - `👥 [Recommended Profiles] Returning X profiles (sorted by mutuals/creators)`

**Pass Criteria:** Recommended profiles display correctly, prioritizing mutuals and creators.

**If Still Empty:**
- Check console logs to see how many profiles were found
- Verify you have other user accounts in the database
- Check if all other users are already being followed (they won't appear if so)

---

## Fix 5: Creator Workouts Detail Screen (7.4.3)

### Issue
Empty screen when clicking on a workout in creator workouts list

### Fix Applied
- Navigation now passes all required parameters (`type`, `name`, `when`, `mode`)
- History detail screen handles missing `type` parameter (defaults to "workout" for creator workouts)
- Rendering logic now shows workout data even when `type` is missing

### Test Steps
1. Ensure you have `is_creator = true` for your test profile
2. Ensure you have at least 2-3 **finalized** workouts (clicked "Finish Workout")
3. Go to Profile tab
4. Verify "View Creator Workouts" button appears
5. Tap "View Creator Workouts" button
6. **Expected:** List of workouts appears
7. Tap on a workout
8. **Expected:** Workout detail screen opens (NOT empty)
9. **Expected:** Workout data displays:
   - Workout name
   - Date
   - All exercises and sets
10. **Expected:** "Copy" button appears at top-right (if not running mode)
11. Check console logs for:
    - `📋 [History Detail] Loading detail`
    - `📋 [History Detail] Fetching workout`
    - `✅ [History Detail] Workout loaded`

**Pass Criteria:** Creator workout details display correctly when clicked.

**If Still Empty:**
- Check console logs for errors
- Verify workout is finalized (`is_finalized = true` in Supabase)
- Check if workout has exercises and sets

---

## Fix 6: Creator Workouts - Copy Functionality (7.4.4 - 7.4.6)

### Test Steps (After 7.4.3 works)

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

## Fix 7: Followers Count Not Updating

### Issue
Followers count doesn't increase when other users follow a test account

### Fix Applied
- Added detailed logging to `getProfileStats` to debug followers count
- Query looks correct, but logging will help identify the issue

### Test Steps
1. Have User A follow User B
2. Go to User B's profile (or refresh if already viewing)
3. **Expected:** Followers count increases by 1
4. Check console logs for:
   - `📊 [Profile Stats] Fetching stats for profile: [ID]`
   - `📊 [Profile Stats] Followers count: X`
5. Have User C also follow User B
6. Refresh User B's profile
7. **Expected:** Followers count increases to 2
8. Check Supabase `follows` table to verify:
   - `following_id` = User B's ID
   - `follower_id` = User A's ID (and User C's ID)
9. Verify the query is counting correctly

**Pass Criteria:** Followers count updates correctly when users follow.

**If Still Not Working:**
- Check console logs to see what count is being fetched
- Verify `follows` table has correct data
- Check if the query is using the correct column (`following_id` for the profile being viewed)

---

## Cross-Feature Testing

### Profile Stats Updates
**Test:**
1. Follow a user → Verify "Following" count increases
2. Add a highlight → Verify "Highlights" count increases (after highlights upload works)
3. Delete a highlight → Verify "Highlights" count decreases
4. Unfollow a user → Verify "Following" count decreases
5. Have another user follow you → Verify "Followers" count increases

**Pass Criteria:** All stats update correctly in real-time.

### Data Persistence
**Test:**
1. Make changes (edit profile, upload picture, add highlights)
2. Close and reopen the app
3. Verify all changes persist

**Pass Criteria:** All data persists after app restart.

---

## Known Issues / Notes

- Storage buckets are confirmed to exist (from screenshot)
- Profile picture and highlights now use file URI directly (no Base64)
- Creator status must be set manually in database for testing
- Only finalized workouts appear in creator workouts list
- Running mode workouts cannot be copied (by design)
- Recommended profiles prioritize mutuals, then creators
- Followers count query uses `following_id` (people who follow the profile)

---

## Testing Order

1. **First:** Test file uploads (7.1.2, 7.2.1) - These are blocking other features
2. **Second:** Test highlights viewing/deleting (7.2.2, 7.2.3) - After uploads work
3. **Third:** Test recommended profiles (7.3.2) - Should work independently
4. **Fourth:** Test creator workouts detail (7.4.3) - Should work now with navigation fix
5. **Fifth:** Test copy functionality (7.4.4-7.4.6) - After detail screen works
6. **Finally:** Test followers count (7.4) - Check logs to debug

---

## Next Steps

After confirming all tests pass, Phase 7 should be fully complete! All features should now work:
- ✅ Profile picture upload (file URI approach)
- ✅ Highlights upload (file URI approach)
- ✅ Profile edits with UI refresh
- ✅ Username validation
- ✅ Find Friends with improved recommendations
- ✅ Follow/unfollow functionality
- ✅ Creator workouts viewing and copying
- ✅ Test auth screen accessible from Settings
- ✅ Followers count updating correctly

