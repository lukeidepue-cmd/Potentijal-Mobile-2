# How to Create Test Users

## Method 1: Using the App (Recommended)

The easiest way to create test users is through the app's authentication system:

1. **Sign Out** of your current account (if you're logged in)
2. Go to the **test-auth** screen (or sign up screen if implemented)
3. **Sign Up** with a new email and password
4. The system will automatically:
   - Create an auth user in Supabase
   - Create a profile row in the `profiles` table (via trigger)
   - Set default values for the profile

## Method 2: Using Supabase Dashboard

If you need to create users manually:

### Step 1: Create Auth User

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Click **"Add user"** → **"Create new user"**
3. Enter:
   - **Email**: `testuser2@example.com` (or any email)
   - **Password**: Choose a secure password
   - **Auto Confirm User**: ✅ (check this box)
4. Click **"Create user"**
5. **Copy the User ID** that appears (you'll need this for Step 2)

### Step 2: Create Profile Row

1. Go to **Supabase Dashboard** → **Database** → **Table Editor** → **profiles**
2. Click **"Insert row"**
3. Fill in:
   - **id**: Paste the User ID from Step 1 (this is the auth user's ID)
   - **username**: `testuser2` (must be unique)
   - **display_name**: `Test User 2`
   - **bio**: `Test bio` (optional)
   - **sports**: `["workout", "basketball"]` (array of sport modes)
   - **is_premium**: `false` (or `true` for premium testing)
   - **is_creator**: `false` (or `true` for creator testing)
   - **plan**: `free` (or `premium` or `creator`)
4. Click **"Save"**

### Step 3: Test the User

1. In your app, go to the **test-auth** screen
2. Sign in with the email and password you created
3. Verify the profile loads correctly

## Method 3: Using SQL (Advanced)

If you want to create users via SQL:

```sql
-- Step 1: Create auth user (this must be done through Supabase Auth API or Dashboard)
-- You cannot create auth users directly via SQL for security reasons

-- Step 2: After creating the auth user, get their ID and insert profile
-- Replace 'USER_ID_FROM_AUTH' with the actual auth user ID
INSERT INTO public.profiles (
  id,
  username,
  display_name,
  bio,
  sports,
  is_premium,
  is_creator,
  plan
) VALUES (
  'USER_ID_FROM_AUTH'::uuid,  -- Must match auth.users.id
  'testuser3',                 -- Must be unique
  'Test User 3',
  'Test bio',
  ARRAY['workout', 'basketball']::text[],
  false,
  false,
  'free'
);
```

## Important Notes

1. **The `id` in `profiles` table MUST match the `id` in `auth.users` table**
   - This is enforced by the foreign key constraint
   - The trigger `on_auth_user_created` automatically creates a profile when a user signs up

2. **Username must be unique**
   - If you get a "username already exists" error, choose a different username

3. **For Creator Testing**
   - Set `is_creator = true` in the profiles table
   - The user will see the "View Creator Workouts" button

4. **For Premium Testing**
   - Set `is_premium = true` OR `plan = 'premium'` in the profiles table
   - The user will have access to premium features

## Quick Test User Creation Script

If you want to create multiple test users quickly, you can:

1. Use the app's sign-up flow multiple times with different emails
2. Or use the Supabase Dashboard method for each user
3. Then update their profiles in the Table Editor to set `is_creator` or `is_premium` as needed

## Example: Creating a Creator User

1. Create auth user: `creator@example.com` / `password123`
2. Get the user ID from Authentication → Users
3. Insert profile with:
   - `id`: (the auth user ID)
   - `username`: `creator`
   - `display_name`: `Creator Account`
   - `is_creator`: `true`
   - `is_premium`: `true` (creators get free premium)
   - `plan`: `creator`

## Troubleshooting

**Error: "duplicate key value violates unique constraint"**
- The username is already taken. Choose a different username.

**Error: "insert or update on table 'profiles' violates foreign key constraint"**
- The `id` doesn't exist in `auth.users`. Make sure you create the auth user first.

**Profile not appearing after sign up**
- Check if the trigger `on_auth_user_created` exists and is enabled
- Manually create the profile row if needed

