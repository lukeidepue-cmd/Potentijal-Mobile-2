# RLS Audit Checklist (C2 – BOLA/IDOR)

Use this checklist to confirm that every table storing user-owned data has RLS enabled and policies that use `auth.uid()` (or equivalent) so users cannot access or modify other users’ data.

## 1. Quick check: tables with RLS

In Supabase SQL Editor (or `psql`), run:

```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Ensure `rowsecurity = true` for all tables that hold user-scoped data.

## 2. Key tables to verify

For each table below, confirm:

- **RLS is enabled** (see query above).
- **SELECT / UPDATE / DELETE policies** exist and use `auth.uid()` (or equivalent, e.g. `(select auth.uid()) = user_id`).
- **INSERT policies** restrict creation to the current user where applicable (e.g. `user_id = auth.uid()`).

| Table | Expected ownership column | Notes |
|-------|----------------------------|--------|
| `profiles` | `id` (matches `auth.uid()`) | User can read/update own profile; creators may have special rules. |
| `workouts` | `user_id` | RLS may allow read for “creator” workouts; write only owner. |
| `practices` | `user_id` | Owner-only access. |
| `games` | `user_id` | Owner-only access. |
| `ai_trainer_settings` | `user_id` | Owner-only. |
| `workout_exercises` / `workout_exercises_sets` | Via `workouts.user_id` or explicit | Often via FK to workouts; policies should prevent cross-user access. |
| `follows` | `follower_id` / `followed_id` | Both columns are user IDs; policies should use `auth.uid()`. |
| Settings tables (e.g. onboarding, privacy) | `user_id` | Owner-only. |

## 3. List policies on a table

To inspect policies for a given table:

```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'workouts';
```

- `qual` = condition for SELECT/UPDATE/DELETE.
- `with_check` = condition for INSERT/UPDATE.
- Ensure each references `auth.uid()` (or a column tied to the current user).

## 4. Manual RLS test (optional)

1. Create two test users (or use existing).
2. As User A, create a workout/practice/game and note the ID.
3. As User B, call the client (or Supabase client) with User B’s JWT and try to fetch or update that same ID.
4. **Expected:** User B gets no row (or 404). If User B can read or update User A’s row, RLS or app logic is missing.

## 5. Migrations that define RLS

Relevant migrations in this project (for reference):

- `001_initial_schema.sql`
- `012_storage_policies.sql`
- `013_fix_follows_rls.sql`
- `014_fix_workouts_rls_for_creators.sql`, `015_fix_workout_exercises_sets_rls_for_creators.sql`
- `016_settings_tables.sql`, `017_rollback_settings.sql`, `019_fix_privacy_settings_rls.sql`
- `024_onboarding_data.sql`
- `034_rls_auth_uid_performance.sql`, `035_rls_auth_uid_performance_batch2.sql`

After any schema change, re-run the checklist for new or modified tables.
