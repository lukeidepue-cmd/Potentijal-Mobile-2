# Update Supabase Magic Link Template for OTP Codes

## The Problem

Supabase doesn't have a separate OTP template, so it's using the Magic Link template. We need to modify it to show the 6-digit code instead of a clickable link.

## Solution: Update the Magic Link Template

### Step 1: Go to the Template

1. In Supabase Dashboard, go to **Authentication** → **Email Templates**
2. Click on **"Magic link"** template (the one you showed me)

### Step 2: Update the Subject

Change the subject from:
```
Your Magic Link
```

To:
```
Your Verification Code
```

### Step 3: Update the Body

Replace the current HTML body with this:

```html
<h2>Your Verification Code</h2>

<p>Enter this 6-digit code in the app to verify your email:</p>

<p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #22C55E; text-align: center; padding: 20px; background-color: #f0f0f0; border-radius: 8px; margin: 20px 0;">
{{ .Token }}
</p>

<p>This code will expire in 1 hour.</p>

<p style="color: #666; font-size: 12px; margin-top: 20px;">
You're receiving this email because you signed up for an application powered by Supabase. ⚡
</p>
```

### Step 4: What This Does

- **`{{ .Token }}`** - This is the 6-digit OTP code that Supabase generates
- The code is displayed in large, bold text so it's easy to read
- No clickable link - just the code to enter in the app
- Clear instructions for the user

### Step 5: Save Changes

Click the green **"Save changes"** button at the bottom right.

### Step 6: Test

1. Send yourself a new verification code (enter your email again in the app)
2. Check your email - you should now see a 6-digit code instead of a magic link
3. Enter the code in the app's verification screen

## Important Notes

- **`{{ .Token }}`** is the variable that contains the 6-digit code
- **`{{ .ConfirmationURL }}`** is the magic link (we're NOT using this anymore)
- The template will work for both magic links and OTP codes, but since we're not using `emailRedirectTo`, Supabase will send the token as a code

## Alternative: Simpler Template

If you want a simpler version:

```html
<h2>Your Verification Code</h2>

<p>Your 6-digit verification code is:</p>

<h1 style="text-align: center; color: #22C55E;">{{ .Token }}</h1>

<p>Enter this code in the app to continue.</p>
```

Either template will work - choose whichever you prefer!
