# Supabase OTP Code Setup

## The Problem

Supabase is still sending magic link emails instead of 6-digit OTP codes. This is because Supabase has a project-level setting that controls the default behavior.

## Solution: Configure Supabase to Send OTP Codes

### Step 1: Go to Supabase Dashboard

1. Open your Supabase project dashboard
2. Go to **Authentication** → **Providers**
3. Click on **"Email"** provider

### Step 2: Check Email Template Settings

Look for these settings:

1. **"Confirm email"** - This should be **DISABLED** (OFF)
   - When enabled, Supabase sends confirmation links instead of OTP codes
   
2. **"Enable email confirmations"** - This should be **DISABLED** (OFF)
   - This forces magic links instead of OTP codes

### Step 3: Check Email Templates

1. Go to **Authentication** → **Email Templates**
2. Look for the **"Magic Link"** template
3. You should see a **"OTP"** template as well

**Important:** The code is already configured to NOT use `emailRedirectTo`, which should force OTP codes. But if Supabase is still sending magic links, you may need to:

### Step 4: Alternative - Use OTP Template Directly

If the above doesn't work, you can try explicitly using the OTP flow:

The code already calls `signInWithOtp()` without `emailRedirectTo`, which should send OTP codes. But Supabase might have a default setting.

### Step 5: Verify the Email

After making changes:
1. Send yourself a new OTP code (enter email again)
2. Check your email - you should see a **6-digit code** in the email body
3. The email subject should say something like "Your verification code" or "OTP Code"

## What the Email Should Look Like

**OTP Code Email:**
- Subject: "Your verification code" or similar
- Body: Contains a **6-digit code** like "123456"
- No clickable links (just the code)

**Magic Link Email (OLD - what you're getting now):**
- Subject: "Magic Link"
- Body: Contains a clickable "Log In" link
- No 6-digit code

## If It Still Doesn't Work

If Supabase continues to send magic links:

1. **Check Supabase version** - Older versions might not support OTP codes
2. **Check project settings** - There might be a "Default auth method" setting
3. **Try using `signInWithPassword` with a temporary password** (not recommended)
4. **Contact Supabase support** - They can help configure OTP codes for your project

## Code Configuration

The code is already correctly configured:
- ✅ `signInWithOtp()` is called without `emailRedirectTo`
- ✅ This should force OTP codes instead of magic links
- ✅ The verification screen is ready for 6-digit codes

The issue is likely a Supabase project setting that needs to be changed in the dashboard.
