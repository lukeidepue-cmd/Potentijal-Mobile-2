# Enable Email OTP Signups in Supabase

## The Problem

You're getting: **"Signups not allowed for otp"**

This means the Email provider in Supabase has signups disabled.

## Solution: Enable Signups in Email Provider

Based on your Supabase dashboard screenshot, here's where to go:

### Step 1: Go to Email Provider Settings

1. In Supabase Dashboard, go to **Authentication** (you're already there)
2. Under **CONFIGURATION**, click on **"Sign In / Providers"**
3. Find **"Email"** in the list of providers
4. Click on **"Email"** to open its settings

### Step 2: Enable Signups

Look for a toggle or setting that says:
- **"Enable signups"** or **"Allow signups"** 
- **"Disable signups"** (make sure this is OFF)

Enable signups for the Email provider.

### Step 3: Save Changes

Click **"Save"** or **"Update"** to save your changes.

### Step 4: Test

1. Try entering your email again in the app
2. You should receive an OTP code without the "Signups not allowed" error

## Alternative: Check Email Template

Also make sure your Magic Link email template includes `{{ .Token }}` to show the 6-digit code:

1. Go to **Authentication** → **Email Templates** (under NOTIFICATIONS)
2. Click on **"Magic link"** template
3. Make sure the body includes: `{{ .Token }}`
4. Save changes

## Code is Already Correct

The code is already set up correctly:
- ✅ `signInWithOtp()` without `emailRedirectTo` - sends OTP codes
- ✅ `shouldCreateUser: true` - allows new signups
- ✅ `verifyOtp()` - verifies 6-digit codes
- ✅ Verification screen accepts 6 digits

The only issue is the Supabase Email provider setting that needs to be enabled.
