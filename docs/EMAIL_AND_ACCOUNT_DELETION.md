# Email Update & Account Deletion Guide

## Email Update Issues

### 1. Current Email Display Not Updating

**Issue:** After updating email, the settings screen still shows the old email.

**Fix Applied:** The app now refreshes the user data from Supabase after email update. The email should update immediately in the UI.

**Note:** If email confirmation is required by Supabase, the email might be in a "pending" state until confirmed. The UI will show the new email address even if it's pending confirmation.

### 2. Email Confirmation Link Not Working & Email Display

**Issue:** When updating email, Supabase sends a confirmation email, but clicking the link shows "site can't be reached" (like `localhost:3000` or connection errors). 

**Solution:** We've implemented a system where:
- ✅ The "current email" display shows the **old email** until the confirmation link is clicked
- ✅ Once the confirmation link is clicked and Supabase updates the email, the display automatically updates
- ✅ The confirmation link redirects properly to the app

**How to Fix the Confirmation Link:**

The issue is that your **"Site URL"** is set to `http://localhost:3000` which doesn't exist. Here's how to fix it:

1. Go to Supabase Dashboard > **Authentication** > **URL Configuration**

2. **Fix the Site URL:**
   - Change **"Site URL"** from `http://localhost:3000` to: `myfirstapp://`
   - This is your app's deep link scheme that will open the app
   - Click **"Save changes"** button (green button on the right)

3. **Verify Redirect URLs** (you already have these, but double-check):
   - `myfirstapp://` ✅ (your app scheme - for deep linking back to app)
   - `exp://localhost:8081` ✅ (Expo development)
   - `exp://192.168.*.*:8081` ✅ (Expo on local network)
   - `https://oskbdhiidjsndtzfzxrh.supabase.co/auth/v1/callback` ✅ (Supabase callback - must end with `/auth/v1/callback`)

4. Click **"Save changes"** if you made any changes

**How It Works:**
- When user updates email → Old email stays displayed
- Confirmation email is sent → User clicks link
- Link redirects to `myfirstapp://` → Opens your app
- Supabase updates email → App detects the update
- "Current email" display updates automatically → Shows new email

**After fixing the Site URL:**
- The confirmation link will redirect to `myfirstapp://` instead of `localhost:3000`
- This will open your app instead of showing an error
- The email will update in Supabase and the app will detect it

### 3. Disable Email Confirmation (RECOMMENDED - Fixes All Email Update Issues)

**CRITICAL:** Supabase requires email confirmation by default before the email actually updates in the database. **You MUST disable this** for email updates to work immediately and avoid the confirmation link issues.

**Why Disable Email Confirmation:**
- ✅ Email updates **immediately** in Supabase (no waiting for confirmation)
- ✅ No confirmation email sent (no broken links)
- ✅ "Current email" in app always matches Supabase
- ✅ Users don't need to click any links
- ✅ Simpler user experience
- ⚠️ Less secure (users can change email without verification, but this is acceptable for most apps)

**How to Disable Email Confirmation:**

**Method 1: Via Supabase Dashboard (Recommended)**

**IMPORTANT:** You need to disable **TWO** settings:

1. Go to Supabase Dashboard > **Authentication** > **Providers**
2. Click on **"Email"** provider
3. Look for these **TWO** settings and disable BOTH:
   - **"Confirm email"** - This controls email confirmation for sign-ups (disable this)
   - **"Secure email change"** - This controls email confirmation for email changes (disable this)
4. **DISABLE BOTH** settings (turn them OFF)
5. Click **"Save"** or **"Update"**

**Note:** If you only see one of these settings, disable whichever one is available. Some Supabase versions combine these into a single setting.

**Method 2: Alternative Locations**

If you can't find it in Providers, check these locations:
- **Authentication** > **Settings** > Look for "Email change confirmation" or "Secure email change"
- **Authentication** > **Email Templates** > Check for email change confirmation settings
- **Authentication** > **Policies** > Look for email confirmation policies
- **Authentication** > **Configuration** > Search for "email change" or "confirmation"

**Method 3: Verify Settings Are Actually Disabled**

If you've disabled the settings but still get confirmation emails, verify they're actually disabled:

1. Go to Supabase Dashboard > **Authentication** > **Providers** > **Email**
2. Take a screenshot of the settings page
3. Make sure BOTH toggles are OFF (gray/disabled, not green/enabled)
4. Click **"Save"** again even if they appear disabled
5. Wait 2-3 minutes for changes to propagate
6. Try updating an email again

**Common Issues:**
- Settings might appear disabled but not actually saved
- Browser cache might show old settings
- Changes might take a few minutes to take effect

**Method 4: Check Project Settings (Alternative Location)**

Some Supabase versions store this in a different location:

1. Go to Supabase Dashboard > **Project Settings** (gear icon in bottom left)
2. Click on **"Auth"** tab
3. Look for **"Email Auth"** section
4. Find **"Enable email confirmations"** or **"Secure email change"**
5. Disable it if it's enabled
6. Save changes

**Method 5: Contact Supabase Support**

If none of the above work:
- The setting might be controlled at a different level
- Your Supabase version might have a bug
- Contact Supabase support with:
  - Your project URL
  - Screenshot of your Email provider settings
  - Description that you've disabled both settings but still get confirmation emails

**After running the SQL:**
- Wait a few seconds for the changes to take effect
- Try updating an email in your app
- The email should update immediately without confirmation

**After Disabling Email Confirmation:**
- ✅ Email updates will work **immediately** in Supabase
- ✅ The "current email" display will **always** match Supabase
- ✅ No confirmation email will be sent
- ✅ No broken confirmation links
- ✅ Users can update email without clicking any links

**Verification:**
After disabling, test by updating an email. The email should:
1. Update immediately in Supabase (check in Authentication > Users)
2. Show the new email in the app's "current email" field
3. Not send any confirmation email

## Account Deletion & Auth User Cleanup

### Current Behavior

When a user deletes their account:
- ✅ Profile is deleted (via `delete_user_account()` function)
- ✅ All related data is deleted (via CASCADE)
- ❌ Auth user record (`auth.users`) remains in Supabase
- ❌ Email remains in Supabase Auth

This means:
- The email cannot be reused for new accounts
- The auth user record still exists (but user can't access the app)

### Solution: Delete Auth User on Account Deletion

To fully delete the auth user (and free up the email), you have **3 options**:

#### Option 1: Supabase Edge Function (Recommended)

Create a Supabase Edge Function that uses the Admin API to delete the auth user:

**Step 1: Create the Edge Function**

1. In Supabase Dashboard, go to **Edge Functions** (left sidebar)
2. Click **"Deploy a new function"** → Choose **"Via Editor"** (this lets you write and deploy in the browser)
3. Name the function: `delete-auth-user`
4. The code editor will open - paste the TypeScript code below
5. Click **Deploy**

**Step 2: Add the Code**

The code is **TypeScript** (Deno TypeScript, which is what Supabase Edge Functions use). 

**Replace all the code in `index.ts`** with this:

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role key for admin access
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Delete auth user using Admin API
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      console.error('Error deleting auth user:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Auth user deleted successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Exception in delete-auth-user function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

**Step 3: Get Your Service Role Key**

1. In Supabase Dashboard, go to **Settings** (gear icon ⚙️ in left sidebar)
2. Click **API** (under "Project Settings")
3. Scroll down to find **"service_role" key** (it's in the "Project API keys" section)
4. Click the **eye icon** 👁️ or **"Reveal"** button to show the key
5. **Copy the entire key** (it's a long string starting with `eyJ...`)
   - ⚠️ **IMPORTANT:** This key has admin privileges - keep it secret! Never commit it to git or share it publicly.

**Step 4: Set the Environment Variable in the Edge Function**

After deploying the function, you need to add the service role key as a secret:

1. In the Edge Function editor (where you pasted the code), look for tabs at the top or bottom:
   - Look for **"Settings"** tab
   - Or **"Secrets"** tab  
   - Or **"Environment Variables"** section
2. Click on that tab/section
3. You should see a list of secrets/environment variables
4. Click **"Add Secret"** or **"New Secret"** or **"+"** button
5. Enter:
   - **Name/Key:** `SUPABASE_SERVICE_ROLE_KEY` (exactly this, case-sensitive)
   - **Value:** Paste the service role key you copied in Step 3
6. Click **"Save"** or **"Add"** or **"Create"**

**Important Note:** Some Supabase versions automatically provide `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as environment variables. Check the secrets list first - if `SUPABASE_SERVICE_ROLE_KEY` is already there, you don't need to add it manually!

**Step 5: Update Your App Code**

Update `deleteAccount()` function in `lib/api/settings.ts`:
```typescript
export async function deleteAccount(): Promise<{ data: boolean | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    const userId = user.id;

    // Call the database function to delete the profile
    const { error: deleteError } = await supabase.rpc('delete_user_account');

    if (deleteError) {
      console.error('Error deleting account:', deleteError);
      return { data: null, error: { message: deleteError.message || 'Failed to delete account' } };
    }

    // Call Edge Function to delete auth user
    const { error: authDeleteError } = await supabase.functions.invoke('delete-auth-user', {
      body: { userId }
    });

    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError);
      // Don't fail - profile is already deleted
    }

    // Sign out the user
    await supabase.auth.signOut();

    // Clear cached data
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.clear();
    } catch (storageError) {
      console.error('Error clearing storage:', storageError);
    }

    return { data: true, error: null };
  } catch (error: any) {
    console.error('Exception deleting account:', error);
    return { data: null, error: { message: error.message || 'Failed to delete account' } };
  }
}
```

#### Option 2: Database Function with Service Role (Complex)

Use migration `020_delete_auth_user_on_account_deletion.sql` which attempts to call the Admin API from a database function. This requires:
- `pg_net` extension enabled
- Service role key stored in Supabase Vault
- More complex setup

**Not recommended** - Edge Function is simpler and more secure.

#### Option 3: Manual Cleanup (For Development)

For development/testing, you can manually delete auth users from Supabase Dashboard:
1. Go to Supabase Dashboard > Authentication > Users
2. Find the user by email
3. Click "Delete User"

**Note:** This is not practical for production.

## Recommended Approach

**Use Option 1 (Edge Function)** - It's the cleanest, most secure, and easiest to maintain.

The Edge Function:
- ✅ Keeps service role key on the server (secure)
- ✅ Can be called from the client after profile deletion
- ✅ Properly deletes the auth user and frees up the email
- ✅ Easy to test and debug

## Testing

After implementing the Edge Function:
1. Create a test account
2. Delete the account via the app
3. Check Supabase Dashboard:
   - Profile should be deleted ✅
   - Auth user should be deleted ✅
4. Try to create a new account with the same email
5. Should succeed (email is now available) ✅

