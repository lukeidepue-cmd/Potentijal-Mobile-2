# Codebase audit – bugs fixed

**Date:** February 2025  
**Scope:** Full pass over app/, lib/, providers/, supabase/functions/, scripts/.

## Fixes applied

### 1. **lib/api/workouts.ts**
- **Bug:** Unused import `useAuth` from AuthProvider (API module must not use React hooks).
- **Fix:** Removed the unused import.

### 2. **providers/AuthProvider.tsx**
- **Bug:** `getSession().then(({ data: { session }, error }) => ...)` could throw if `data` were ever undefined (e.g. edge cases or API change).
- **Fix:** Destructure `{ data, error }` and use `const session = data?.session ?? null` before setting state.

### 3. **lib/deep-links.ts**
- **Bug:** Same fragile `getSession()` destructuring in three places (`data.session` without guarding `data`).
- **Fix:** Use `const { data } = await supabase.auth.getSession(); const session = data?.session` (and equivalent for retry/final checks).

### 4. **lib/api/loops.ts**
- **Bug:** Same `getSession()` pattern in four functions (createOrUpdateContact, sendTransactionalEmail, trackEvent, deleteContact).
- **Fix:** Replaced with safe destructuring: `const { data, error: sessionError } = ...; const session = data?.session`.

### 5. **lib/api/ai-trainer.ts**
- **Bug:** Same `getSession()` pattern in `sendMessageToAI`; `formatUserContextForAI` could throw if `context.profile.sports` or `recentWorkouts`/`recentGames`/`recentPractices` were undefined.
- **Fix:** Safe getSession + nullish coalescing for arrays: `(context.profile.sports ?? []).join(...)`, `(context.recentWorkouts ?? []).length`, etc.

### 6. **app/_layout.tsx**
- **Bug:** Unused state `resumeStep` and `setResumeStep` (never read or set).
- **Fix:** Removed the dead state.

### 7. **supabase/functions/sync-subscription/index.ts**
- **Bug:** Variable shadowing: `const body` declared twice in the same handler (request body from `readJsonWithMaxSize`, then RevenueCat response body). Second declaration would cause a duplicate-identifier error in strict mode.
- **Fix:** Renamed the second variable to `rcBody` and updated references when parsing the RevenueCat response.

## Not changed (reviewed, no bug found)

- **history.ts:** Pagination uses `if (params.offset)` before calling `.range()`; when `offset` is 0 we rely on `.limit()` only. Behavior is consistent (first page = limit only; later pages = range). No change.
- **Edge Functions (ai-trainer, delete-auth-user, revenuecat-webhook, trial-ending-soon):** Error handling, auth, and validation reviewed; no logic bugs identified.
- **scripts/reset-project.js:** Uses only `process.cwd()` and fixed array `oldDirs` for paths; no user-controlled path input.
- **scripts/scan-secrets.js:** Already fixed earlier (path traversal validation for `SCAN_DIR`).

## Recommendation

- Run the test suite and a quick smoke test (auth, onboarding, AI trainer, purchase flow) after pulling these changes.
- Consider adding a unit test for `formatUserContextForAI` with minimal/missing data to lock in the null-safe behavior.
