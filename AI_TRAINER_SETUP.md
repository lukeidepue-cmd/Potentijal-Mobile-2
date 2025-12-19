# AI Trainer Setup Guide

## ⚠️ Security Update

**The OpenAI API key is now stored securely in Supabase, NOT in your frontend code.**

This is the correct and secure approach. The API key is never exposed to users.

## Quick Setup

### Step 1: Deploy the Edge Function

1. Install Supabase CLI as a project dependency (permanent for this project):
   ```bash
   npm install --save-dev supabase
   ```
   
   This installs Supabase CLI locally in your project, so it will always be available when you work on this app.
   
   **Alternative:** If you prefer a global installation, you can download the binary:
   - Visit: https://github.com/supabase/cli/releases/latest
   - Download `supabase_windows_amd64.zip` (or the appropriate version for your system)
   - Extract it and add the folder to your Windows PATH
   - Then you can use `supabase` commands directly

2. Link to your Supabase project:
   ```bash
   cd my-first-app
   npx supabase link --project-ref your-project-ref
   ```
   (You can find your project ref in your Supabase dashboard URL)
   
   **Note:** Since we installed it as a dev dependency, use `npx supabase` for all commands. This ensures it uses the version installed in your project.

3. Deploy the Edge Function:
   ```bash
   npx supabase functions deploy ai-trainer
   ```

### Step 2: Set Your OpenAI API Key as a Secret

**Option A: Using Supabase CLI (Recommended)**
```bash
npx supabase secrets set OPENAI_API_KEY=your_openai_api_key_here
```

**Option B: Using Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Edge Functions** → **Secrets**
3. Click **Add Secret**
4. Enter:
   - **Name**: `OPENAI_API_KEY`
   - **Value**: Your OpenAI API key
5. Click **Save**

### Step 3: Verify It Works

1. Open your app
2. Navigate to the Home tab
3. Tap the AI Trainer button (sparkles icon in bottom left)
4. Send a test message
5. You should receive a response from the AI

## How It Works Now

1. **Frontend** → Sends message to Supabase Edge Function
2. **Edge Function** → Fetches user data from database
3. **Edge Function** → Calls OpenAI API (with secret key)
4. **Edge Function** → Returns AI response to frontend

**The API key never leaves Supabase's secure environment.**

## Troubleshooting

### "AI service not configured" error
- Make sure you've set the `OPENAI_API_KEY` secret in Supabase
- Verify the secret name is exactly `OPENAI_API_KEY` (case-sensitive)
- Try redeploying the function: `supabase functions deploy ai-trainer`

### "Function not found" error
- Make sure the function is deployed
- Check your Supabase project URL is correct in `.env`

### Authentication errors
- Make sure you're logged in to the app
- Check that your Supabase auth is working

## Files Changed

- ✅ `supabase/functions/ai-trainer/index.ts` - New Edge Function (secure backend)
- ✅ `lib/api/ai-trainer.ts` - Updated to call Edge Function instead of OpenAI directly
- ✅ Removed all references to `EXPO_PUBLIC_OPENAI_API_KEY` from frontend

## Security Benefits

✅ API key is stored in Supabase secrets (encrypted, not in code)
✅ API key never sent to client devices
✅ API key cannot be extracted from the app bundle
✅ All API calls go through authenticated Supabase Edge Function
✅ User data is fetched server-side for privacy

## Next Steps

1. Deploy the Edge Function (Step 1 above)
2. Set your API key as a secret (Step 2 above)
3. Test the feature (Step 3 above)
4. Monitor usage in your OpenAI dashboard

You're all set! 🎉

