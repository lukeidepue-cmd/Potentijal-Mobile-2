# Settings Section Testing Plan

## 🔴 CRITICAL: What YOU Need to Do First

Before testing any of the settings screens, you MUST complete these steps:

### Step 1: Run the Database Migration
**ACTION REQUIRED:** You need to apply the new database migration to create all the settings tables.

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open the file: `my-first-app/supabase/migrations/016_settings_tables.sql`
4. Copy the entire SQL content
5. Paste it into the SQL Editor in Supabase
6. Click **Run** to execute the migration
7. **VERIFY** that the following tables were created:
   - `user_preferences`
   - `user_privacy_settings`
   - `blocked_users`
   - `ai_trainer_settings`
   - `nutrition_settings`

**If you see any errors**, check:
- That you have the correct permissions in Supabase
- That the `update_updated_at_column()` function exists (it should from previous migrations)
- That there are no naming conflicts

### Step 2: Verify API Functions
**ACTION REQUIRED:** Test that the API functions can connect to the database.

1. Open the app in your development environment
2. Navigate to Settings (you may need to add a button/link to access it)
3. Try to open any settings screen
4. **Check the console/logs** for any API errors
5. If you see errors like "relation does not exist", the migration didn't run successfully

### Step 3: Test Authentication
**ACTION REQUIRED:** Make sure you're logged in before testing settings.

- Settings require authentication
- If you're not logged in, you'll see errors
- Log in with a test account before proceeding

---

## ✅ Connected Features (Fully Functional)

These features are **fully connected** and should work immediately after the migration:

### 1. Account Settings
- ✅ **Edit Profile** - Links to existing profile edit screen
- ✅ **Email & Password** - Can update email and password
  - Test: Change email, verify email update works
  - Test: Change password, verify password update works
  - Test: Password validation (min 6 characters)
  - Test: Email validation (must contain @)
- ✅ **Delete Account** - Can delete account with confirmation
  - Test: Type "DELETE" to confirm
  - Test: Warning message displays correctly
  - Test: Account deletion works (WARNING: This is permanent!)

### 2. App Preferences
- ✅ **Theme** - Can change between Light/Dark/System
  - Test: Select each theme option
  - Test: Theme persists after app restart
  - Test: System theme follows device settings
- ✅ **Units** - Can change weight (lbs/kg) and distance (miles/km)
  - Test: Change weight units, verify it saves
  - Test: Change distance units, verify it saves
  - Test: Units persist after app restart

### 3. Privacy & Security
- ✅ **Privacy Settings** - All privacy toggles work
  - Test: Toggle "Private Account"
  - Test: Change "Who can see profile" (Everyone/Followers/None)
  - Test: Change "Who can see highlights"
  - Test: Change "Who can find me"
  - Test: Change "Who can follow me"
  - Test: Toggle "Suggest me to others"
  - Test: Change "Email Visibility"
- ✅ **Blocked Users** - Can view and unblock users
  - Test: View list of blocked users (if any)
  - Test: Unblock a user
  - Test: Verify user is unblocked

### 4. Notifications
- ✅ **Notification Preferences** - All notification toggles work
  - Test: Toggle "Push Notifications" (master switch)
  - Test: When push is off, other toggles should be disabled
  - Test: Toggle "Workout Reminders"
  - Test: Toggle "Practice Reminders"
  - Test: Toggle "Goal Reminders"
  - Test: Toggle "New Follower"
  - Test: Toggle "Highlight Views"
  - Test: Toggle "AI Trainer Insights"
  - Test: All settings persist after app restart

### 5. Sports & Training
- ✅ **My Sports** - Can view current sports
  - Test: View list of your sports
  - Test: See which sport is marked as "Primary"
  - Test: Set a different sport as primary
- ✅ **Add Sports** - Premium feature, properly gated
  - Test: If not premium, see lock screen
  - Test: If premium, can add sports
  - Test: Adding a sport works correctly

### 6. Nutrition Settings
- ✅ **Units** - Can change nutrition units
  - Test: Change between Imperial/Metric
  - Test: Settings persist
- ✅ **Reset Time** - Can set reset time
  - Test: Change between Midnight/Custom
  - Test: Set custom reset time
  - Test: Settings persist

---

## ⏳ Placeholder Features (Not Fully Connected)

These features have UI but are **not fully connected** to backend functionality:

### 1. Goals & Progress Settings
- ⏳ **Weekly Goals** - Screen exists but needs connection to goals system
- ⏳ **Graph Defaults** - Screen exists but needs connection to graph preferences
- ⏳ **History Settings** - Screen exists but needs connection to history preferences

### 2. Sports & Training (Partial)
- ⏳ **Weekly Schedule** - Screen exists but needs connection to schedule system
- ⏳ **Progress Preferences** - Screen exists but needs connection to progress graph

### 3. AI Trainer Settings (Premium)
- ⏳ **AI Trainer Settings** - Screen exists but needs connection to AI trainer
- ⏳ **Personality** - Can change but may not affect AI behavior yet
- ⏳ **Data Access** - Can toggle but may not affect AI access yet
- ⏳ **Memory Controls** - Can clear memory but needs AI integration

### 4. Premium Section
- ⏳ **Manage Subscription** - Placeholder (needs payment integration)
- ⏳ **Restore Purchases** - Placeholder (needs payment integration)
- ⏳ **Redeem Code** - Partially works (can redeem creator codes, but premium discount codes need payment system)

### 5. Support & Legal
- ⏳ **Help** - Static content screen (can add help content)
- ⏳ **Contact Support** - Placeholder (needs email/helpdesk integration)
- ⏳ **Privacy Policy** - Static content screen (can add privacy policy text)
- ⏳ **Terms of Service** - Static content screen (can add terms text)

### 6. About
- ⏳ **App Version** - Displays version correctly
- ⏳ **Credits** - Static content screen (can add credits)

---

## 🧪 Testing Checklist

### Phase 1: Database & API (Do This First!)
- [ ] Migration ran successfully
- [ ] All 5 tables created in Supabase
- [ ] Can access settings screen without errors
- [ ] No console errors when loading settings

### Phase 2: Account Settings
- [ ] Can navigate to Edit Profile
- [ ] Can navigate to Email & Password
- [ ] Can update email successfully
- [ ] Can update password successfully
- [ ] Can navigate to Delete Account
- [ ] Delete account confirmation works
- [ ] Logout works correctly

### Phase 3: App Preferences
- [ ] Theme settings work (Light/Dark/System)
- [ ] Theme persists after restart
- [ ] Weight units work (lbs/kg)
- [ ] Distance units work (miles/km)
- [ ] Units persist after restart

### Phase 4: Privacy & Security
- [ ] All privacy toggles work
- [ ] Privacy settings persist
- [ ] Can view blocked users list
- [ ] Can unblock users
- [ ] Blocked users list updates correctly

### Phase 5: Notifications
- [ ] Master push notification toggle works
- [ ] Individual notification toggles work
- [ ] Settings persist after restart
- [ ] Toggles are disabled when master is off

### Phase 6: Sports & Training
- [ ] Can view my sports
- [ ] Can set primary sport
- [ ] Add sports shows lock if not premium
- [ ] Add sports works if premium
- [ ] Sports list updates correctly

### Phase 7: Nutrition
- [ ] Can change nutrition units
- [ ] Can change reset time
- [ ] Settings persist

### Phase 8: Premium Features
- [ ] AI Trainer settings visible if premium
- [ ] AI Trainer settings hidden if not premium
- [ ] Premium status displays correctly
- [ ] Redeem code works for creator codes

### Phase 9: Navigation
- [ ] All settings screens are accessible
- [ ] Back buttons work correctly
- [ ] Navigation flow is smooth
- [ ] No broken links

---

## 🐛 Known Issues & Limitations

1. **Account Deletion**: May require admin privileges in Supabase. If it fails, you may need to implement a backend function or contact support.

2. **Session Management**: "Logout All Devices" currently just logs out the current session. Full implementation requires backend support to invalidate all tokens.

3. **Payment Integration**: Premium subscription management, restore purchases, and payment-related features are placeholders until payment system is integrated.

4. **AI Trainer Integration**: AI Trainer settings exist but need to be connected to the actual AI trainer system to have full effect.

5. **Data Export**: "Download my data" feature is not implemented yet.

6. **Cache Clearing**: "Clear local cache" feature is not implemented yet.

7. **Support Contact**: Contact support screen is a placeholder until email/helpdesk system is set up.

---

## 📝 Notes for Future Development

### High Priority
1. Connect Goals & Progress settings to actual goal system
2. Connect Graph Defaults to progress graph component
3. Integrate AI Trainer settings with AI trainer functionality
4. Implement payment/subscription management
5. Add data export functionality

### Medium Priority
1. Add drag-to-reorder for sports list
2. Implement session management (logout all devices)
3. Add support contact form/email integration
4. Add help content to Help screen
5. Add Privacy Policy and Terms content

### Low Priority
1. Add language selection functionality
2. Add date format customization
3. Add cache clearing functionality
4. Add acknowledgements/licenses screen content

---

## ✅ Success Criteria

The Settings section is considered **complete and working** when:

1. ✅ All database tables exist and are accessible
2. ✅ All connected features work without errors
3. ✅ Settings persist after app restart
4. ✅ Navigation works smoothly between all screens
5. ✅ Premium features are properly gated
6. ✅ Account management (email, password, delete) works
7. ✅ Privacy settings can be changed and persist
8. ✅ Notification preferences work and persist
9. ✅ No console errors when using settings

---

## 🚨 If Something Doesn't Work

1. **Check the console/logs** for error messages
2. **Verify the migration ran** - check Supabase dashboard
3. **Check authentication** - make sure you're logged in
4. **Check network connection** - API calls need internet
5. **Restart the app** - sometimes state needs to refresh
6. **Clear app cache** - if settings aren't persisting

---

## 📞 Next Steps After Testing

Once you've completed testing:

1. **Report any bugs** you find
2. **Note which placeholder features** you'd like prioritized
3. **Confirm which features** are working correctly
4. **Request any changes** to the UI/UX

The Settings section is now ready for your testing! 🎉

---

## 📋 Placeholder Information to Replace for Terms of Service, Privacy Policy, and Credits sections in Settings

The following sections contain placeholder information that needs to be replaced with actual values before launch:

### Company / Legal Basics

- **[COMPANY/DEVELOPER LEGAL NAME PLACEHOLDER]** - Replace with your company or developer legal name
- **[SUPPORT EMAIL PLACEHOLDER]** - Replace with your support email address
- **[BUSINESS ADDRESS PLACEHOLDER]** - Replace with your business address
- **[GOVERNING LAW / STATE / COUNTRY PLACEHOLDER]** - Replace with the governing law jurisdiction (e.g., "State of California, United States")
- **[DATE PLACEHOLDER]** - Replace with actual dates (Effective Date and Last Updated)

**Location:** Terms of Service and Privacy Policy screens

### Premium / Payments

- **[PAYMENT SYSTEM PLACEHOLDER INFORMATION]** - Replace with details about your payment system implementation
- **[PAYMENT PROVIDER PLACEHOLDER]** - Replace with your payment provider name (e.g., "Apple App Store / Google Play", "Stripe", etc.)

**Location:** Terms of Service (Section 7) and Credits screen

### Creator System

- **[CREATOR CODE SYSTEM PLACEHOLDER INFORMATION]** - Replace with details about how creator codes are issued and administered

**Location:** Terms of Service (Section 8)

### AI Trainer

- **[AI TRAINER PROVIDER/RETENTION PLACEHOLDER INFORMATION]** - Replace with AI provider name and data retention policy details
- **[AI PROVIDER PLACEHOLDER]** - Replace with your AI provider name (e.g., "OpenAI", "Anthropic", etc.)

**Location:** Privacy Policy (Section 3) and Credits screen

### Food / Barcode

- **[FOOD API PLACEHOLDER]** - Replace with your food database provider name (e.g., "USDA FoodData Central", "Nutritionix", etc.)
- **[BARCODE PROVIDER PLACEHOLDER]** - Replace with your barcode scanning provider name (e.g., "Open Food Facts", "Barcode Lookup API", etc.)

**Location:** Credits screen

### Analytics / Crash Reporting / Providers

- **[ANALYTICS PLACEHOLDER INFORMATION]** - Replace with your analytics tooling information (e.g., "Google Analytics", "Mixpanel", etc.)
- **[THIRD-PARTY PROVIDERS PLACEHOLDER INFORMATION]** - Replace with a comprehensive list of third-party providers used in the app
- **[HOSTING REGION PLACEHOLDER INFORMATION]** - Replace with the region where your servers are hosted (e.g., "United States", "EU", etc.)

**Location:** Privacy Policy (Sections 1 and 10)

### Safety / Moderation / Controls

- **[CONTENT MODERATION PLACEHOLDER INFORMATION]** - Replace with details about your content moderation tooling (e.g., "AWS Rekognition", "Google Cloud Vision API", etc.)
- **[PRIVACY CONTROLS PLACEHOLDER INFORMATION]** - Replace with details about available privacy controls and how they work
- **[DATA DELETION PLACEHOLDER INFORMATION]** - Replace with details about data retention and deletion mechanics

**Location:** Terms of Service (Section 9) and Privacy Policy (Sections 5 and 6)

### Open Source / Credits

- **[Other SDKs/Packages Placeholder]** - Replace with a list of other SDKs and packages used in the app
- **[Icon pack placeholder]** - Replace with your icon pack name and license information (e.g., "Ionicons", "Feather Icons", etc.)
- **[Font licenses placeholder]** - Replace with your font licenses information (e.g., "Geist Font Family", "Google Fonts", etc.)
- **[OPEN-SOURCE LICENSE SCREEN / LINK PLACEHOLDER]** - Replace with a link to a full open-source licenses screen or external page

**Location:** Credits screen

---

## 🔍 How to Replace Placeholders

1. **Open the relevant screen file:**
   - Terms of Service: `app/(tabs)/settings/support-legal/terms.tsx`
   - Privacy Policy: `app/(tabs)/settings/support-legal/privacy-policy.tsx`
   - Credits: `app/(tabs)/settings/about/credits.tsx`

2. **Search for the placeholder text** (e.g., `[COMPANY/DEVELOPER LEGAL NAME PLACEHOLDER]`)

3. **Replace with actual information** - Make sure to keep the same formatting and structure

4. **Test the screens** - Verify that the text displays correctly and is readable

5. **Update dates** - Make sure to update both "Effective Date" and "Last Updated" dates when making changes

---

## ⚠️ Important Notes

- **Legal Review:** Before launch, have a lawyer review the Terms of Service and Privacy Policy
- **Compliance:** Ensure your Privacy Policy complies with GDPR, CCPA, and other applicable privacy laws
- **Accuracy:** Make sure all placeholder information is replaced with accurate, up-to-date information
- **Third-Party Services:** Verify that you have proper agreements and licenses for all third-party services mentioned
- **Open Source Licenses:** Ensure you comply with all open-source license requirements and include proper attributions

---

