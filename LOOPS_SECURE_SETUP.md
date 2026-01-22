# Loops Secure Setup Guide

## ⚠️ Important Security Update

**According to Loops official documentation: "Your Loops API key should never be used client side or exposed to your end users."**

This guide shows you how to set up Loops securely using Supabase Edge Functions, following the same pattern as the AI Trainer feature.

## What Changed

✅ **Before**: API key was exposed in client code (INSECURE)  
✅ **After**: API key is stored securely in Supabase secrets (SECURE)

## Setup Steps

### Step 1: Deploy the Loops Edge Function

1. Make sure you have Supabase CLI installed:
   ```bash
   npm install --save-dev supabase
   ```

2. Link to your Supabase project (if not already linked):
   ```bash
   npx supabase link --project-ref your-project-ref
   ```
   (Find your project ref in your Supabase dashboard URL)

3. Deploy the Loops Edge Function:
   ```bash
   npx supabase functions deploy loops
   ```

### Step 2: Set Your Loops API Key as a Secret

**Option A: Using Supabase CLI (Recommended)**
```bash
npx supabase secrets set LOOPS_API_KEY=your_loops_api_key_here
```

**Option B: Using Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Edge Functions** → **Secrets**
3. Click **Add Secret**
4. Enter:
   - **Name**: `LOOPS_API_KEY`
   - **Value**: Your Loops API key (from Loops Dashboard > Settings > API Keys)
5. Click **Save**

### Step 3: Remove Old Environment Variable (If You Had One)

If you previously added `EXPO_PUBLIC_LOOPS_API_KEY` to your `.env` file, you can **remove it now**. The API key is now stored securely in Supabase secrets.

**Note**: The `.env` file should NOT contain the Loops API key anymore.

### Step 4: Test the Integration

1. Restart your development server:
   ```bash
   npm start
   ```

2. Create a test user account in your app
3. Check the console logs - you should see:
   - `✅ [Loops] User synced successfully`
4. Check your Loops dashboard:
   - Go to **Audience** → **Contacts**
   - You should see the new user listed

## How It Works Now

1. **Frontend** (`lib/api/loops.ts`):
   - Calls Supabase Edge Function with user authentication
   - No API keys are exposed to the client

2. **Edge Function** (`supabase/functions/loops/index.ts`):
   - Receives the request with user authentication
   - Calls Loops API with the secret API key stored in Supabase
   - Returns the response to the frontend

**The API key never leaves Supabase's secure environment.**

## Security Benefits

✅ API key is stored in Supabase secrets (encrypted, not in code)  
✅ API key never sent to client devices  
✅ API key cannot be extracted from the app bundle  
✅ All API calls go through authenticated Supabase Edge Function  
✅ Follows Loops official security guidelines

## Troubleshooting

### "Loops service not configured" error
- Make sure you've set the `LOOPS_API_KEY` secret in Supabase
- Verify the secret name is exactly `LOOPS_API_KEY` (case-sensitive)
- Try redeploying the function: `npx supabase functions deploy loops`

### "Function not found" error
- Make sure the function is deployed
- Check your Supabase project URL is correct in `.env` (should have `EXPO_PUBLIC_SUPABASE_URL`)

### Authentication errors
- Make sure you're logged in to the app
- Check that your Supabase auth is working

### User sync not working
- Check console logs for error messages
- Verify the Edge Function is deployed and the secret is set
- Check Loops dashboard > Logs for any API errors

## Next Steps

1. ✅ Deploy the Edge Function (Step 1)
2. ✅ Set your API key as a secret (Step 2)
3. ✅ Test the integration (Step 4)
4. ⏳ Set up a Welcome Journey in Loops Dashboard (see `docs/LOOPS_QUICK_START.md`)

## Files Changed

- ✅ `supabase/functions/loops/index.ts` - New Edge Function (secure backend)
- ✅ `lib/api/loops.ts` - Updated to call Edge Function instead of Loops directly
- ✅ Removed all references to `EXPO_PUBLIC_LOOPS_API_KEY` from frontend

You're all set! 🎉
