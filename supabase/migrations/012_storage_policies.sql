-- Migration 012: Storage RLS Policies
-- Allows authenticated users to upload and manage their own files in storage buckets

-- Enable RLS on storage.objects (if not already enabled)
-- Note: This is typically enabled by default in Supabase

-- Drop existing policies if they exist (to avoid conflicts)
drop policy if exists "Users can upload their own profile pictures" on storage.objects;
drop policy if exists "Users can update their own profile pictures" on storage.objects;
drop policy if exists "Users can delete their own profile pictures" on storage.objects;
drop policy if exists "Anyone can view profile pictures" on storage.objects;
drop policy if exists "Users can upload their own highlights" on storage.objects;
drop policy if exists "Users can update their own highlights" on storage.objects;
drop policy if exists "Users can delete their own highlights" on storage.objects;
drop policy if exists "Anyone can view highlights" on storage.objects;

-- Policy for profiles bucket: Users can upload their own profile pictures
create policy "Users can upload their own profile pictures"
on storage.objects
for insert
with check (
  bucket_id = 'profiles' and
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy for profiles bucket: Users can update their own profile pictures
create policy "Users can update their own profile pictures"
on storage.objects
for update
using (
  bucket_id = 'profiles' and
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy for profiles bucket: Users can delete their own profile pictures
create policy "Users can delete their own profile pictures"
on storage.objects
for delete
using (
  bucket_id = 'profiles' and
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy for profiles bucket: Anyone can view profile pictures (public bucket)
create policy "Anyone can view profile pictures"
on storage.objects
for select
using (bucket_id = 'profiles');

-- Policy for highlights bucket: Users can upload their own highlights
create policy "Users can upload their own highlights"
on storage.objects
for insert
with check (
  bucket_id = 'highlights' and
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy for highlights bucket: Users can update their own highlights
create policy "Users can update their own highlights"
on storage.objects
for update
using (
  bucket_id = 'highlights' and
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy for highlights bucket: Users can delete their own highlights
create policy "Users can delete their own highlights"
on storage.objects
for delete
using (
  bucket_id = 'highlights' and
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy for highlights bucket: Anyone can view highlights (public bucket)
create policy "Anyone can view highlights"
on storage.objects
for select
using (bucket_id = 'highlights');

