-- Allow authenticated users to insert their own code use when redeeming a promoter code.
-- Without this, redeemCode() in the app fails with: new row violates row-level security policy for table 'profile_code_uses'
create policy "Users can insert own code uses"
  on public.profile_code_uses
  for insert
  with check (auth.uid() = profile_id);
