# Testing Plan - Phase 7: Profile, Social, Highlights, Creator Workouts

## Overview
Phase 7 implements the Profile tab with social features, highlights, and creator workouts functionality.

## Pre-Testing Setup

### 1. Supabase Storage Buckets
**IMPORTANT:** Before testing, you must create the following storage buckets in Supabase:
1. Go to Supabase Dashboard → Storage
2. Create a bucket named `profiles` (public access)
3. Create a bucket named `highlights` (public access)

### 2. Test Data Setup
- Ensure you have at least one test user account
- For creator workouts testing, you may want to manually set `is_creator = true` in the `profiles` table for a test user
- For premium testing, you may want to manually set `is_premium = true` or `plan = 'premium'` in the `profiles` table

---

## Step 7.1: Profile Basics - Display & Edit

### 7.1.1: Profile Display
**Expected:** Profile tab displays current user's profile data from database.

**Test:**
1. Open the Profile tab (5th tab, rightmost)
2. Verify the following displays correctly:
   - Profile picture (or placeholder with plus icon)
   - Display name (from database)
   - Username with @ symbol (from database)
   - Bio text (from database)
   - Followers count (from database)
   - Following count (from database)
   - Highlights count (from database)
3. Check that all data matches what's in the Supabase `profiles` table

**Pass Criteria:** All profile data displays correctly from database.

### 7.1.2: Profile Picture Upload
**Expected:** User can select and upload a profile picture.

**Test:**
1. Tap the profile picture (or plus icon)
2. Select a photo from camera roll
3. Crop/adjust the photo if prompted
4. Verify the photo appears as profile picture
5. Check Supabase Storage → `profiles` bucket to confirm file was uploaded
6. Check `profiles` table to confirm `profile_image_url` was updated
7. Reload the app and verify profile picture persists

**Pass Criteria:** Profile picture uploads and displays correctly.

### 7.1.3: Edit Profile Screen
**Expected:** User can edit display name, username, and bio.

**Test:**
1. Tap "Edit Profile" button
2. Verify all fields are pre-filled with current values
3. Edit the bio text
4. Edit the display name
5. Edit the username
6. Tap "Save"
7. Verify success message appears
8. Verify you're taken back to profile tab
9. Verify all changes are reflected on the profile tab
10. Check Supabase `profiles` table to confirm changes were saved

**Pass Criteria:** Profile edits save and display correctly.

### 7.1.4: Unique Username Validation
**Expected:** System prevents duplicate usernames.

**Test:**
1. Go to Edit Profile
2. Change username to an existing username (from another test account)
3. Tap "Save"
4. Verify error message appears: "Username is already taken. Please choose a different username."
5. Change to a unique username
6. Verify save succeeds

**Pass Criteria:** Duplicate username is rejected with clear error message.

---

## Step 7.2: Highlights - Upload, View, Delete

### 7.2.1: Upload Highlights
**Expected:** User can select multiple videos and upload them as highlights.

**Test:**
1. Tap "Add Highlights" button
2. Select 2-3 videos from camera roll
3. Verify videos are uploaded (may take a moment)
4. Verify success (no error messages)
5. Check Supabase Storage → `highlights` bucket to confirm files were uploaded
6. Check `highlights` table to confirm records were created
7. Verify highlights count increases on profile tab
8. Verify most recent highlight appears as preview below "Highlights" heading

**Pass Criteria:** Multiple highlights upload successfully.

### 7.2.2: View Highlights Full-Screen
**Expected:** User can view highlights in full-screen with vertical scroll.

**Test:**
1. Tap the highlight preview (video thumbnail)
2. Verify full-screen video viewer opens
3. Verify current video plays automatically
4. Scroll down to see next highlight
5. Verify video switches to next highlight
6. Continue scrolling through all highlights
7. Verify back arrow button is visible in top-left
8. Verify trash can button is visible in top-right (for own profile)

**Pass Criteria:** Highlights display in full-screen with smooth scrolling.

### 7.2.3: Delete Highlight
**Expected:** User can delete highlights from full-screen viewer.

**Test:**
1. Open highlights full-screen viewer
2. Navigate to a highlight you want to delete
3. Tap the trash can button (top-right)
4. Verify highlight is removed from the list
5. If it was the last highlight, verify viewer closes
6. Verify highlights count decreases on profile tab
7. Check Supabase Storage to confirm file was deleted
8. Check `highlights` table to confirm record was deleted

**Pass Criteria:** Highlights can be deleted successfully.

---

## Step 7.3: Find Friends & Creators

### 7.3.1: Find Friends Screen Access
**Expected:** "Find Friends and Creators" button navigates to search screen.

**Test:**
1. On Profile tab, tap "Find Friends and Creators" button
2. Verify new screen opens with:
   - Back arrow button
   - "Find Friends and Creators" title
   - Search bar at top
   - List of recommended profiles below

**Pass Criteria:** Screen opens correctly.

### 7.3.2: Recommended Profiles
**Expected:** Screen shows recommended profiles on load.

**Test:**
1. Open Find Friends screen
2. Verify list of profiles appears (if other users exist)
3. Each profile should show:
   - Profile picture (or placeholder)
   - Display name
   - Username
   - Follow/Following button
4. Verify creators have golden glow around profile picture
5. Verify current user is not in the list

**Pass Criteria:** Recommended profiles display correctly.

### 7.3.3: Search Profiles
**Expected:** User can search for profiles by username or display name.

**Test:**
1. Type a partial username in search bar
2. Verify results update in real-time (after brief delay)
3. Type a full username
4. Verify exact match appears
5. Type a display name
6. Verify matching profiles appear
7. Clear search
8. Verify recommended profiles reappear

**Pass Criteria:** Search filters profiles correctly.

### 7.3.4: Follow/Unfollow
**Expected:** User can follow and unfollow other users.

**Test:**
1. Find a profile in the list
2. Tap "Follow" button
3. Verify button changes to "Following"
4. Check Supabase `follows` table to confirm relationship was created
5. Go back to Profile tab
6. Verify "Following" count increased
7. Return to Find Friends screen
8. Find the same profile
9. Tap "Following" button
10. Verify button changes back to "Follow"
11. Check Supabase `follows` table to confirm relationship was deleted
12. Verify "Following" count decreased on Profile tab

**Pass Criteria:** Follow/unfollow works correctly and updates counts.

### 7.3.5: Creator Golden Glow
**Expected:** Creator accounts have golden glow around profile picture.

**Test:**
1. In Supabase, set `is_creator = true` for a test profile
2. Open Find Friends screen
3. Find that creator profile
4. Verify golden glowing circle around their profile picture
5. Verify non-creators do not have the glow

**Pass Criteria:** Creators display with golden glow.

---

## Step 7.4: Creator Workouts

### 7.4.1: View Creator Workouts Button
**Expected:** "View Creator Workouts" button appears for creators.

**Test:**
1. In Supabase, set `is_creator = true` for your test profile
2. Reload the app
3. Go to Profile tab
4. Verify golden "View Creator Workouts" button appears below "Find Friends and Creators" button
5. Set `is_creator = false`
6. Reload the app
7. Verify button disappears

**Pass Criteria:** Button only appears for creators.

### 7.4.2: Creator Workouts List
**Expected:** User can view a creator's workout history.

**Test:**
1. Ensure you have `is_creator = true` and some finalized workouts
2. Tap "View Creator Workouts" button
3. Verify screen opens with:
   - Back arrow button
   - "Creator Workouts" title
   - List of workouts (most recent first)
4. Each workout should show:
   - Date (MM/DD/YY format)
   - Workout name
   - Sport mode icon
5. Verify only finalized workouts appear

**Pass Criteria:** Creator workouts list displays correctly.

### 7.4.3: View Creator Workout Detail
**Expected:** User can view details of a creator workout.

**Test:**
1. Tap a workout in the creator workouts list
2. Verify workout detail screen opens
3. Verify all exercises and sets are displayed (read-only)
4. Verify "Copy" button appears at top-right (if not running mode)
5. Verify back button works

**Pass Criteria:** Workout details display correctly.

### 7.4.4: Copy Workout - Success
**Expected:** User can copy a creator workout to their own workout tab.

**Test:**
1. Ensure you have the same sport mode as the creator workout (e.g., both have "basketball")
2. View a creator workout (not running mode)
3. Verify "Copy" button is enabled (not grayed out)
4. Tap "Copy" button
5. Verify success message appears
6. Verify you're taken to Workouts tab
7. Verify new workout appears with:
   - Name includes "(Copied)" suffix
   - Same exercises as creator workout
   - Same exercise types
   - NO sets (empty sets)
8. Verify you can add your own sets and complete the workout

**Pass Criteria:** Workout copies successfully with exercises but no sets.

### 7.4.5: Copy Workout - Mode Mismatch
**Expected:** User cannot copy workout if they don't have the required sport mode.

**Test:**
1. Ensure your profile has different sports than the creator (e.g., you have "workout" and "basketball", creator has "hockey")
2. View a creator workout from a mode you don't have (e.g., "hockey")
3. Verify "Copy" button is disabled/grayed out
4. Verify error message appears: "Cannot copy workout because it was logged in Hockey mode"
5. Verify you cannot copy the workout

**Pass Criteria:** Mode mismatch is detected and copy is prevented.

### 7.4.6: Copy Workout - Running Mode
**Expected:** Running mode workouts cannot be copied.

**Test:**
1. View a creator workout that is in "running" mode
2. Verify "Copy" button does NOT appear
3. Verify no copy functionality is available

**Pass Criteria:** Running mode workouts cannot be copied.

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
1. Make changes to profile (edit, upload picture, add highlights)
2. Close and reopen the app
3. Verify all changes persist

**Pass Criteria:** All data persists after app restart.

### Error Handling
**Test:**
1. Try to upload a very large video file
2. Try to search with special characters
3. Try to follow yourself (should be prevented)
4. Try to edit profile while offline (if possible)

**Pass Criteria:** Errors are handled gracefully with user-friendly messages.

---

## Known Issues / Notes

- Storage buckets must be created manually in Supabase Dashboard
- Profile picture and highlights require proper storage permissions
- Creator status must be set manually in database for testing
- Premium status must be set manually in database for testing (Phase 8 will add UI for this)
- Copy workout validates sport mode availability
- Running mode workouts cannot be copied (by design)

---

## Next Steps

After confirming all tests pass, Phase 7 is complete! The Profile tab now has:
- ✅ Profile display and editing
- ✅ Profile picture upload
- ✅ Highlights upload, view, and delete
- ✅ Find Friends and Creators with search
- ✅ Follow/unfollow functionality
- ✅ Creator workouts viewing and copying
- ✅ Golden glow for creators
- ✅ Proper validation and error handling

Phase 8 will add premium feature gating and code system.

