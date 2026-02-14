-- Migration 035: RLS performance batch 2 – evaluate auth.uid() / auth.role() once per query
-- Same pattern as 034: replace auth.uid() with (select auth.uid()) and auth.role() with (select auth.role()).

-- 1. games: Users can manage own games
drop policy if exists "Users can manage own games" on public.games;
create policy "Users can manage own games"
  on public.games for all
  using ((select auth.uid()) = user_id);

-- 2. practices: Users can manage own practices
drop policy if exists "Users can manage own practices" on public.practices;
create policy "Users can manage own practices"
  on public.practices for all
  using ((select auth.uid()) = user_id);

-- 3. follows: Users can manage own follows
drop policy if exists "Users can manage own follows" on public.follows;
create policy "Users can manage own follows"
  on public.follows for all
  using ((select auth.uid()) = follower_id);

-- 4. follows: Users can see who they follow
drop policy if exists "Users can see who they follow" on public.follows;
create policy "Users can see who they follow"
  on public.follows for select
  using ((select auth.uid()) = follower_id);

-- 5. follows: Users can see their followers
drop policy if exists "Users can see their followers" on public.follows;
create policy "Users can see their followers"
  on public.follows for select
  using ((select auth.uid()) = following_id);

-- 6. user_preferences: Users can manage own preferences
drop policy if exists "Users can manage own preferences" on public.user_preferences;
create policy "Users can manage own preferences"
  on public.user_preferences for all
  using ((select auth.uid()) = user_id);

-- 7. user_privacy_settings: Users can manage own privacy settings
drop policy if exists "Users can manage own privacy settings" on public.user_privacy_settings;
create policy "Users can manage own privacy settings"
  on public.user_privacy_settings for all
  using ((select auth.uid()) = user_id);

-- 8. blocked_users: Users can manage own blocked users
drop policy if exists "Users can manage own blocked users" on public.blocked_users;
create policy "Users can manage own blocked users"
  on public.blocked_users for all
  using ((select auth.uid()) = blocker_id);

-- 9. blocked_users: Users can see if they are blocked
drop policy if exists "Users can see if they are blocked" on public.blocked_users;
create policy "Users can see if they are blocked"
  on public.blocked_users for select
  using ((select auth.uid()) = blocked_id);

-- 10. ai_trainer_settings: Users can manage own AI trainer settings
drop policy if exists "Users can manage own AI trainer settings" on public.ai_trainer_settings;
create policy "Users can manage own AI trainer settings"
  on public.ai_trainer_settings for all
  using ((select auth.uid()) = user_id);

-- 11. onboarding_data: Users can view own onboarding data
drop policy if exists "Users can view own onboarding data" on public.onboarding_data;
create policy "Users can view own onboarding data"
  on public.onboarding_data for select
  using ((select auth.uid()) = user_id);

-- 12. onboarding_data: Users can update own onboarding data
drop policy if exists "Users can update own onboarding data" on public.onboarding_data;
create policy "Users can update own onboarding data"
  on public.onboarding_data for update
  using ((select auth.uid()) = user_id);

-- 13. onboarding_data: Users can insert own onboarding data
drop policy if exists "Users can insert own onboarding data" on public.onboarding_data;
create policy "Users can insert own onboarding data"
  on public.onboarding_data for insert
  with check ((select auth.uid()) = user_id);

-- 14. profile_code_uses: Users can insert own code uses
drop policy if exists "Users can insert own code uses" on public.profile_code_uses;
create policy "Users can insert own code uses"
  on public.profile_code_uses for insert
  with check ((select auth.uid()) = profile_id);

-- 15. paywall_codes: Service role can read paywall_codes (uses auth.role())
drop policy if exists "Service role can read paywall_codes" on public.paywall_codes;
create policy "Service role can read paywall_codes"
  on public.paywall_codes for select
  using ((select auth.role()) = 'service_role');
