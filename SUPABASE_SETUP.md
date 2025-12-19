# Supabase Setup Instructions

## Step 1: Get Your Supabase Credentials

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Navigate to **Settings** → **API**
3. Copy the following:
   - **Project URL** (this is your `EXPO_PUBLIC_SUPABASE_URL`)
   - **anon/public key** (this is your `EXPO_PUBLIC_SUPABASE_ANON_KEY`)

## Step 2: Create Your .env File

1. In the `my-first-app` folder, create a file named `.env` (not `.env.example`)
2. Copy the contents from `.env.example` and fill in your actual values:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 3: Restart Expo

After creating/updating your `.env` file:
1. Stop your Expo dev server (Ctrl+C)
2. Restart it with: `npx expo start --clear`

The `--clear` flag ensures the new environment variables are loaded.

## Verification

Once you've added your keys and restarted, the app should connect to Supabase without errors. You can verify this by checking the console for any Supabase connection errors.

## Important Notes

- **Never commit your `.env` file to git** - it's already in `.gitignore`
- The `.env.example` file is a template and is safe to commit
- Environment variables starting with `EXPO_PUBLIC_` are exposed to your app bundle


