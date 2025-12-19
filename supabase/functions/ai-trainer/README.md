# AI Trainer Edge Function

This Supabase Edge Function securely handles OpenAI API calls for the AI Trainer feature.

## Setup Instructions

### 1. Deploy the Edge Function

From your project root, run:

```bash
# Make sure you have Supabase CLI installed
# If not: npm install -g supabase

# Link to your Supabase project (if not already linked)
supabase link --project-ref your-project-ref

# Deploy the function
supabase functions deploy ai-trainer
```

### 2. Set the OpenAI API Key as a Secret

**IMPORTANT**: Never commit your OpenAI API key to version control!

Set the secret in Supabase:

```bash
# Set the OpenAI API key as a secret
supabase secrets set OPENAI_API_KEY=your_openai_api_key_here
```

Or via Supabase Dashboard:
1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Edge Functions** → **Secrets**
3. Add a new secret:
   - **Name**: `OPENAI_API_KEY`
   - **Value**: Your OpenAI API key

### 3. Verify the Function is Working

The function should automatically be available at:
```
https://your-project-ref.supabase.co/functions/v1/ai-trainer
```

## How It Works

1. **Frontend** (`lib/api/ai-trainer.ts`):
   - User sends a message through the chat UI
   - Frontend calls the Edge Function with the user's auth token
   - No API keys are exposed to the client

2. **Edge Function** (`supabase/functions/ai-trainer/index.ts`):
   - Receives the request with user authentication
   - Fetches user context from the database (workouts, games, practices, meals)
   - Formats the context into a prompt for OpenAI
   - Calls OpenAI API with the secret API key
   - Returns the AI response to the frontend

## Security

✅ **API key is stored securely** in Supabase secrets (not in client code)
✅ **User authentication** is verified before processing requests
✅ **User context** is fetched server-side, ensuring data privacy
✅ **CORS headers** are properly configured

## Troubleshooting

### Function not found (404)
- Make sure the function is deployed: `supabase functions deploy ai-trainer`
- Check that you're using the correct URL format

### Authentication errors (401)
- Verify the user is logged in
- Check that the auth token is being sent correctly

### API key errors (500)
- Verify the secret is set: `supabase secrets list`
- Make sure the secret name is exactly `OPENAI_API_KEY`
- Check that your OpenAI API key is valid

### Database query errors
- Ensure RLS policies allow the service role to read user data
- Check that all required tables exist

## Cost Considerations

- Each message uses OpenAI API credits
- Current model: `gpt-4o-mini` (cost-effective)
- Monitor usage in your OpenAI dashboard
- Consider rate limiting for production use

