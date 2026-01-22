# Enable OTP Signups in Supabase

## The Problem

You're getting the error: **"Signups not allowed for otp"**

This means Supabase has a project-level setting that prevents new users from signing up via OTP codes.

## Solution: Enable OTP Signups in Supabase Dashboard

### Step 1: Go to Authentication Settings

1. Open your Supabase project dashboard
2. Go to **Authentication** → **Settings** (or **Configuration**)
3. Look for **"Auth Settings"** or **"Email Auth Settings"**

### Step 2: Enable Signups

Look for these settings and make sure they're enabled:

1. **"Enable email signups"** or **"Allow email signups"**
   - This should be **ENABLED** (ON)
   - This allows new users to sign up with email

2. **"Enable OTP signups"** or **"Allow OTP signups"**
   - This should be **ENABLED** (ON)
   - This specifically allows signups via OTP codes

3. **"Disable signups"** or **"Prevent new signups"**
   - This should be **DISABLED** (OFF)
   - If this is ON, it blocks all new signups

### Step 3: Check Email Provider Settings

1. Go to **Authentication** → **Providers**
2. Click on **"Email"** provider
3. Look for:
   - **"Enable email provider"** - Should be **ENABLED** (ON)
   - **"Allow signups"** - Should be **ENABLED** (ON)
   - **"Disable signups"** - Should be **DISABLED** (OFF)

### Step 4: Save Changes

Click **"Save"** or **"Update"** to save your changes.

### Step 5: Test

1. Try entering your email again in the app
2. You should receive an OTP code without the "Signups not allowed" error

## Alternative: If Settings Don't Exist

If you can't find these settings in your Supabase dashboard:

1. **Check Supabase Version** - Newer versions might have different settings
2. **Check Project Settings** - Look in **Settings** → **General** or **API**
3. **Contact Supabase Support** - They can help enable OTP signups for your project

## Code Configuration

The code is already configured correctly:
- ✅ `shouldCreateUser: true` - Allows creating new users
- ✅ No `emailRedirectTo` - Forces OTP codes instead of magic links

The issue is a Supabase project-level setting that needs to be changed in the dashboard.
