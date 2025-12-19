# Deploy AI Trainer for Production

## Quick Deployment Steps

### Step 1: Link to Your Supabase Project

```bash
npx supabase link --project-ref oskbdhiidjsndtzfzxrh
```

This will ask you to authenticate. Follow the prompts.

### Step 2: Deploy the Edge Function

```bash
npx supabase functions deploy ai-trainer
```

This uploads the function to Supabase so it's available for all users.

### Step 3: Set Your OpenAI API Key

**Option A: Using CLI (Easiest)**
```bash
npx supabase secrets set OPENAI_API_KEY=your_openai_api_key_here
```

**Option B: Using Dashboard**
1. Go to https://app.supabase.com/project/oskbdhiidjsndtzfzxrh
2. Navigate to **Settings** → **Edge Functions** → **Secrets**
3. Click **Add Secret**
4. Name: `OPENAI_API_KEY`
5. Value: Your OpenAI API key
6. Click **Save**

## ✅ Once Complete

After these 3 steps, the AI Trainer will work for **ALL users** who download your app from the App Store!

The Edge Function runs on Supabase's servers, so:
- ✅ No additional setup needed for users
- ✅ Works automatically when they use the feature
- ✅ API key stays secure (never sent to users)
- ✅ Scales automatically with usage

## Verify It Works

1. Open your app
2. Go to Home tab
3. Tap the AI Trainer button (sparkles icon)
4. Send a test message
5. You should get a response!

## Important Notes

- **One-time setup**: You only need to do this once
- **Cost**: Each message uses OpenAI API credits (you pay for usage)
- **Monitoring**: Check your OpenAI dashboard to monitor usage
- **Rate limiting**: Consider adding rate limits in production to control costs

