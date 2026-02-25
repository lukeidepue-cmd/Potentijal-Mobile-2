-- Remove promoter code tables and their RLS policies (promo codes no longer used per App Store guidelines).
-- Drop profile_code_uses first (it has a foreign key to promoter_codes).

drop policy if exists "Anyone can view active promoter codes" on public.promoter_codes;
drop policy if exists "Users can view own code uses" on public.profile_code_uses;
drop policy if exists "Users can insert own code uses" on public.profile_code_uses;

drop table if exists public.profile_code_uses;
drop table if exists public.promoter_codes;
