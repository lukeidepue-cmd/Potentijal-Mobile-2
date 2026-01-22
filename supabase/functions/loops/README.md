# Loops Edge Function

This Supabase Edge Function securely handles Loops API calls for email management.

## ⚠️ Security Note

According to Loops documentation: **"Your Loops API key should never be used client side or exposed to your end users."**

This Edge Function ensures the API key is stored securely in Supabase secrets and never exposed to the client.

## Setup Instructions

### 1. Deploy the Edge Function

From your project root, run:

```bash
# Make sure you have Supabase CLI installed
# If not: npm install --save-dev supabase

# Link to your Supabase project (if not already linked)
npx supabase link --project-ref your-project-ref

# Deploy the function
npx supabase functions deploy loops
```

### 2. Set the Loops API Key as a Secret

**IMPORTANT**: Never commit your Loops API key to version control!

Set the secret in Supabase:

```bash
# Set the Loops API key as a secret
npx supabase secrets set LOOPS_API_KEY=your_loops_api_key_here
```

Or via Supabase Dashboard:
1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Edge Functions** → **Secrets**
3. Add a new secret:
   - **Name**: `LOOPS_API_KEY`
   - **Value**: Your Loops API key (from Loops Dashboard > Settings > API Keys)
4. Click **Save**

### 3. Verify the Function is Working

The function should automatically be available at:
```
https://your-project-ref.supabase.co/functions/v1/loops
```

## How It Works

1. **Frontend** (`lib/api/loops.ts`):
   - Calls the Edge Function with the user's auth token
   - No API keys are exposed to the client

2. **Edge Function** (`supabase/functions/loops/index.ts`):
   - Receives the request with user authentication
   - Calls Loops API with the secret API key
   - Returns the response to the frontend

## Supported Actions

The Edge Function supports the following actions:

- `createOrUpdateContact` - Create or update a contact in Loops
- `sendTransactional` - Send a transactional email
- `trackEvent` - Track an event in Loops
- `deleteContact` - Delete a contact from Loops

## Security

✅ **API key is stored securely** in Supabase secrets (not in client code)
✅ **API key never sent to client devices**
✅ **API key cannot be extracted from the app bundle**
✅ **All API calls go through authenticated Supabase Edge Function**

## Troubleshooting

### "Loops service not configured" error
- Make sure you've set the `LOOPS_API_KEY` secret in Supabase
- Verify the secret name is exactly `LOOPS_API_KEY` (case-sensitive)
- Try redeploying the function: `npx supabase functions deploy loops`

### "Function not found" error
- Make sure the function is deployed
- Check your Supabase project URL is correct in `.env`

### Authentication errors
- Make sure you're logged in to the app
- Check that your Supabase auth is working

## Next Steps

1. Deploy the Edge Function (Step 1 above)
2. Set your API key as a secret (Step 2 above)
3. Update the frontend to use the Edge Function (see `lib/api/loops.ts`)
4. Test the integration by creating a test user account
