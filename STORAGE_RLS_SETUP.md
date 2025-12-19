# Storage RLS Policies Setup

## IMPORTANT: Run This Migration

You need to run the storage RLS policies migration in Supabase to allow file uploads.

### Steps:

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Click **New Query**
3. Copy the **entire contents** of `supabase/migrations/012_storage_policies.sql`
4. Paste it into the SQL Editor
5. Click **Run** (or press Ctrl+Enter)

### What This Does:

This migration creates Row Level Security (RLS) policies for the storage buckets that allow:
- ✅ Authenticated users to upload their own files (profile pictures and highlights)
- ✅ Anyone to view files (since buckets are public)
- ✅ Users to update/delete their own files

### Why This Is Needed:

Without these policies, you'll get the error:
```
StorageApiError: new row violates row-level security policy
```

This is because Supabase storage requires RLS policies to be explicitly defined for security.

### After Running:

Once you run this migration, profile picture and highlights uploads should work!

