# Security audit findings (codebase review)

This document records findings from an independent pass over the **entire app codebase** (app/, lib/, supabase/functions/, migrations, config), including issues not covered by the original remediation plan. Items are ordered by severity.

---

## Critical (fixed)

### 1. delete-auth-user: IDOR – any caller could delete any user’s auth account

**Issue:** The Edge Function accepted `userId` in the request body and deleted that user via the Admin API. It did **not** verify that the request was from that user. Anyone who could hit the function URL (with or without a valid JWT) could delete any user’s auth account.

**Fix applied:** The function now:
- Requires an `Authorization: Bearer <jwt>` header.
- Resolves the caller with `auth.getUser(token)` (Supabase anon key + token).
- Returns 401 if the token is missing or invalid.
- Returns 403 if `body.userId !== caller.id` (caller may only delete their own account).
- Then uses the service role to delete that user.

**Action:** Redeploy the `delete-auth-user` Edge Function. Ensure `SUPABASE_ANON_KEY` is set in Edge Function secrets (it is usually present; required for the JWT check).

---

## High (recommended)

### 2. app.json contains Supabase URL and anon key (and RevenueCat public key)

**Issue:** `app.json` → `expo.extra` contains:
- `supabaseUrl`
- `supabaseAnonKey`
- `revenueCatPublicApiKey`

If this file is committed to git, anyone with repo access (or a leaked clone) gets your Supabase project URL and anon key. The anon key is intended for client use but should not live in source control; same project ref in the open can aid targeted abuse.

**Recommendation:**
- Prefer **.env** (gitignored) with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` for local dev, and **EAS Secrets** for production builds, so real values are not in the repo.
- In `app.json` → `extra`, either remove these keys or use **placeholders** (e.g. `https://your-project.supabase.co`, `your-anon-key`) and document that real values come from env/EAS at build time.
- RevenueCat public API key is designed to be public; moving it to env is still cleaner than committing it in app.json.

**Note:** Removing or changing these in app.json can affect builds that rely on `expo.extra`; test and migrate to env/EAS secrets, then strip real values from the committed file.

---

## Medium (hardening)

### 3. revenuecat-webhook: avoid logging header/secret length on 401

**Issue:** On 401 Unauthorized, the handler logged header length and secret length, which could aid enumeration or timing.

**Fix applied:** Log line changed to: `"[revenuecat-webhook] Unauthorized: missing or invalid Authorization"` with no lengths.

### 4. Loops Edge Function: no authentication

**Issue:** The Loops function is rate-limited by IP only; it does not require a valid user JWT. So in theory anyone could call it (e.g. `createOrUpdateContact`, `deleteContact`) for arbitrary emails, within rate limits.

**Mitigation:** The Loops API key is server-side only; only the app is expected to call this function. Rate limiting and the fact that the key is not exposed reduce impact.

**Optional hardening:** Require a valid Supabase JWT and (if needed) restrict actions to the caller’s own email (e.g. for `deleteContact` / contact updates). Document that the endpoint is “app-only” and not for untrusted callers.

---

## Low / notes (no code change required)

### 5. No eval / innerHTML / dangerouslySetInnerHTML

Searched the app and lib: no `eval`, `new Function`, `innerHTML`, or `dangerouslySetInnerHTML`. Good.

### 6. No user-controlled fetch URLs (SSRF)

No code was found that passes user-supplied URLs to `fetch`. When you add features that do (e.g. link preview, import-from-URL), use the existing `_shared/ssrf.ts` helper and allowlist.

### 7. Env usage

- Client code uses only `EXPO_PUBLIC_*` and `expo.extra`; no privileged keys in the bundle.
- Edge Functions use `Deno.env.get(...)` for secrets; no leakage found.

### 8. Storage (profiles, highlights)

RLS on storage.objects scopes insert/update/delete to `auth.uid()` matching the first path segment. Profile and highlight paths use `user.id`; “anyone can view” is intentional for public profile/highlights. No path traversal or cross-user write found.

### 9. History / profile APIs

History APIs use the authenticated user’s id for “my” data; profile-scoped reads (e.g. `listWorkoutsForProfile(profileId)`) are read-only and rely on RLS. BOLA/IDOR patterns addressed in the remediation plan are not reintroduced here.

### 10. Deep links / Linking

`Linking.openURL` is used only with fixed constants (privacy policy, terms, Apple subscriptions). No user-controlled URLs passed to open.

---

## Summary

| Severity   | Item                          | Status / action                          |
|-----------|-------------------------------|------------------------------------------|
| Critical  | delete-auth-user IDOR         | **Fixed** – verify JWT, body.userId === caller.id; redeploy function |
| High      | app.json Supabase/RC keys     | **Recommend** – move to env/EAS, remove or placeholder in repo      |
| Medium    | Webhook log header/secret len | **Fixed** – generic Unauthorized message only                        |
| Medium    | Loops function no auth        | **Optional** – add JWT and/or restrict to caller email               |
| Low       | Other (eval, SSRF, env, storage, APIs, links) | **Noted** – no issues found              |

When you add new features (e.g. URL fetching, new Edge Functions, new auth flows), re-check this list and the main [SECURITY_REMEDIATION_PLAN.md](SECURITY_REMEDIATION_PLAN.md).
