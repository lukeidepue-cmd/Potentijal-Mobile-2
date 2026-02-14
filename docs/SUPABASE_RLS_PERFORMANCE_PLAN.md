# Supabase RLS Performance Plan (First 10 Issues)

**Status:** Fix implemented in `supabase/migrations/034_rls_auth_uid_performance.sql`. Run that migration against your Supabase project to clear the 10 advisories.

**Purpose:** Plan to fix the first 10 performance issues reported by Supabase: RLS policies that re-evaluate `auth.uid()` (or `current_setting()` / other `auth.*` functions) **per row**, which hurts query performance at scale. The fix is to evaluate the function **once per statement** by wrapping it in a subquery: `(select auth.uid())`.

**No code or migrations are applied in this doc—planning only.**

---

## What “public” means

In PostgreSQL (and Supabase), **`public`** is the default **schema** name. Tables are grouped into schemas; your app tables live in `public`. So:

- **`public.profiles`** = the table `profiles` in the schema `public`
- **`public.workouts`** = the table `workouts` in the schema `public`

“Public” does **not** mean “publicly visible” or “not secure.” It’s just the schema. RLS still applies to these tables. All 10 issues refer to tables in this default `public` schema.

---

## Do we need to fix tables the app doesn’t use?

You mentioned that **Weekly Goals, Runs, Profiles, Highlights, and Profile Code uses** are not used in the app right now (or are behind flags).

**Recommendation: fix all 10 anyway.**

1. **Supabase will keep flagging them** until the policies are updated.
2. **Same fix everywhere:** every issue is “replace `auth.uid()` with `(select auth.uid())`” (and same idea for any other `auth.*` in the policy). One new migration can fix all 10.
3. **Future-proof:** When you re-enable profiles, highlights, weekly goals, or runs, the policies will already be performant.
4. **Low risk:** The change is behaviorally equivalent; it only changes how often the value is computed (once per query instead of per row).

If you prefer to **minimize scope**, you could fix only the tables the app actively uses first (e.g. **profiles**, **workouts**, **workout_exercises**, **workout_sets**, **weekly_schedules**, **weekly_goals** if any of those are still used), and do **highlights**, **profile_code_uses**, **runs** in a later pass. The plan below still covers all 10 so you can do either.

---

## The fix (one pattern for all)

- In every RLS policy expression where you have **`auth.uid()`** (or similar), replace it with **`(select auth.uid())`**.
- In **EXISTS** subqueries, replace e.g. `workouts.user_id = auth.uid()` with `workouts.user_id = (select auth.uid())`.
- Do **not** change policy names, table names, or logic—only this substitution.

PostgreSQL will then treat the result as a **stable** value for the statement and avoid re-evaluating it per row.

---

## Issue-by-issue plan

All of these policies are created in **`supabase/migrations/001_initial_schema.sql`** (with exact names below). Fixing is done by **dropping** the existing policy and **recreating** it with `(select auth.uid())` in place of `auth.uid()`. Use a **new migration** (e.g. `034_rls_auth_uid_performance.sql`) so the change is clear and reversible.

| # | Entity | Policy name | Current pattern | Change |
|---|--------|-------------|-----------------|--------|
| 1 | **public.profiles** | `Users can view own profile` | `using (auth.uid() = id)` | `using ((select auth.uid()) = id)` |
| 2 | **public.profiles** | `Users can update own profile` | `using (auth.uid() = id)` | `using ((select auth.uid()) = id)` |
| 3 | **public.workouts** | `Users can manage own workouts` | `using (auth.uid() = user_id)` | `using ((select auth.uid()) = user_id)` |
| 4 | **public.workout_exercises** | `Users can manage own workout exercises` | `using (exists (... and workouts.user_id = auth.uid()))` | Replace `auth.uid()` with `(select auth.uid())` inside the EXISTS |
| 5 | **public.highlights** | `Users can manage own highlights` | `using (auth.uid() = user_id)` | `using ((select auth.uid()) = user_id)` |
| 6 | **public.profile_code_uses** | `Users can view own code uses` | `using (auth.uid() = profile_id)` | `using ((select auth.uid()) = profile_id)` |
| 7 | **public.workout_sets** | `Users can manage own workout sets` | `using (exists (... and w.user_id = auth.uid()))` | Replace `auth.uid()` with `(select auth.uid())` inside the EXISTS |
| 8 | **public.runs** | `Users can manage own runs` | `using (exists (... and workouts.user_id = auth.uid()))` | Replace `auth.uid()` with `(select auth.uid())` inside the EXISTS |
| 9 | **public.weekly_schedules** | `Users can manage own weekly schedules` | `using (auth.uid() = user_id)` | `using ((select auth.uid()) = user_id)` |
| 10 | **public.weekly_goals** | `Users can manage own weekly goals` | `using (auth.uid() = user_id)` | `using ((select auth.uid()) = user_id)` |

---

## Implementation steps (done)

1. **Migration created:** `supabase/migrations/034_rls_auth_uid_performance.sql`.

2. **For each of the 10 policies (in order):**
   - `DROP POLICY IF EXISTS "Policy Name" ON public.table_name;`
   - `CREATE POLICY "Policy Name" ... USING ( ... (select auth.uid()) ... );`  
   Use the exact same policy name, command (SELECT/UPDATE/ALL), and logic; only replace `auth.uid()` with `(select auth.uid())` (and same for any other `auth.*` in the expression).

3. **Policies that use EXISTS:**  
   In the inner condition, change e.g.:
   - `workouts.user_id = auth.uid()` → `workouts.user_id = (select auth.uid())`
   - `w.user_id = auth.uid()` → `w.user_id = (select auth.uid())`

4. **Run the migration** (local and/or remote) and re-check the Supabase dashboard; the 10 performance advisories for these policies should clear.

5. **Optional:** Run a quick smoke test (e.g. load a screen that reads from `profiles`, `workouts`, `workout_exercises`, `workout_sets`) to confirm behavior is unchanged.

---

## What you need to do

1. **Apply the migration** to your Supabase project:
   - **Local:** From the project root run `npx supabase db push` (or `supabase migration up`) if you use the Supabase CLI.
   - **Remote / Hosted:** In the Supabase Dashboard go to **SQL Editor**, paste the contents of `supabase/migrations/034_rls_auth_uid_performance.sql`, and run it. Or link your project and run `supabase db push` to apply all pending migrations.
2. **Verify:** In the Supabase Dashboard, check **Reports** or **Advisors** (where you saw the performance issues); the 10 “Auth RLS Initialization Plan” items for these tables should clear after the migration runs.
3. **Other similar issues:** You mentioned other performance issues look the same. Use the same pattern for those: in each affected policy replace `auth.uid()` with `(select auth.uid())` (and any `current_setting()` or other `auth.*` the same way), then add a new migration that drops and recreates those policies.

---

## Multiple SELECT policies (Migration 036)

**Issue:** Tables with multiple permissive policies for the same role and action (e.g. SELECT) cause the database to evaluate every policy for every row, which is suboptimal.

**Fix:** Merge all SELECT policies into **one** policy per table (combine conditions with OR). Where a table had a "for all" policy, split it into: one SELECT policy (merged) plus separate INSERT/UPDATE/DELETE policies so that only one policy applies to SELECT.

**Migration:** `supabase/migrations/036_rls_merge_multiple_select_policies.sql` fixes: blocked_users, follows, highlights, profiles, user_privacy_settings, workout_exercises, workout_sets, workouts. Apply the same way as 034/035.

---

## Summary

- **“public”** = default schema name; all these tables are in `public`. RLS still applies.
- **Fix all 10** in one migration is recommended (clears advisories, same pattern, future-proof); you can do “app-used” tables first if you prefer.
- **Change:** In every affected RLS policy, replace `auth.uid()` with `(select auth.uid())` (and any other `auth.*` the same way). Apply via one new migration that drops and recreates each policy.
