# Security Remediation Plan – Potentijal

**Purpose:** Eliminate or mitigate every risk from the security guide (BOLA/IDOR, cost DoS, secrets, IAP fraud, AI injection, misconfiguration, SSRF, storage, supply chain). This plan is based on a close read of that guide and a direct mapping to this codebase.

**Status:** Plan only. No changes have been applied yet. Execute in priority order.

---

## Top 3 stakeholder priorities (non‑negotiable)

These three items are the most important and must be reflected in implementation order and acceptance criteria:

1. **API keys and secrets – zero exposure (biggest fear: hackers getting keys and running up cost)**  
   We must **absolutely** ensure that **no API keys are exposed anywhere**, especially **not in frontend code**. All privileged keys (OpenAI, Loops, Supabase service role, RevenueCat secret, etc.) must be **100% server-side only**, never in the client bundle, never in repo history, never in logs. Secret scanning and webhook verification (fail closed) are mandatory.

2. **Rate limiting on all public endpoints**  
   **Every** public or semi-public endpoint (Edge Functions, webhooks that accept external callers, any API that can be hit without full auth or that does cost-bearing work) must have **rate limiting** (per user and/or per IP). No exceptions. This prevents cost DoS and abuse.

3. **Strict input validation and sanitization on all user inputs**  
   **Every** user-controlled input (body, query, headers, message content, conversation history, etc.) must be **validated** (type, length, format) and **sanitized** before use. Allowlists and size limits everywhere. This prevents injection, overflow, and abuse.

The rest of this document maps these priorities into concrete tasks and orders them accordingly.

---

## 1. Executive summary

| Category | Current state (summary) | Action |
|----------|-------------------------|--------|
| **BOLA/IDOR** | RLS on workouts, practices, games; history detail APIs rely on RLS. Optional `userId` in list APIs is still protected by RLS but increases surface. | Harden: remove optional `userId` from “my” history APIs; verify every object-ID path has RLS; add server-side premium check to AI Trainer. |
| **Cost DoS (OTP + AI)** | Supabase Auth for login (they rate-limit). AI Trainer Edge Function has **no** rate limit, **no** request/body size limit. | Add per-user (and optionally per-IP) rate limits and max body size for AI Trainer; document OTP/Auth reliance on Supabase. |
| **Secrets** | OpenAI/Loops only in Edge Functions (env). Client uses anon key + PostHog + RevenueCat public key (OK). **RevenueCat webhook:** if `REVENUECAT_WEBHOOK_SECRET` is unset, verification is skipped (`return true`). | Require webhook secret in production (fail closed); add pre-commit/CI secret scanning; no privileged keys in client. |
| **IAP / entitlements** | Server-authoritative: webhook + `sync-subscription` update `profiles`. Client reads `profile.is_premium` / `plan`. | Keep; add **server-side premium check** in AI Trainer (and any other premium backend) so tampered clients cannot abuse. |
| **AI (injection / leakage / output)** | AI Trainer: user message and `conversationHistory` are client-controlled; no output schema validation; no explicit “refuse other users’ data” in system prompt; PII in logs. | System prompt boundaries; cap history size; validate/sanitize output; redact PII in logs. |
| **Misconfiguration** | AI Trainer and RevenueCat webhook use `Access-Control-Allow-Origin: "*"`. No ATS/cleartext overrides found (defaults OK). | Restrict CORS to app origin(s); ensure no stack traces in API responses. |
| **SSRF** | No URL fetchers found. | When adding “import from URL” or link preview: allowlist domains; block private IPs; timeouts. |
| **Mobile storage** | Auth: SecureStore on iOS, AsyncStorage on Android/web (per 3.3). Premium cache: **SecureStore on native**, AsyncStorage on web (4.2). | Auth migration to full SecureStore where feasible; supply chain (4.3). |
| **Supply chain** | Dependabot + CI (secret scan, npm audit, CodeQL, SBOM) in place (4.3). | Review Dependabot PRs; pin critical deps per docs/SUPPLY_CHAIN.md. |

---

## 2. Critical (do first – before scaling users)

Execution order within Critical: **2.1 (API keys) → 2.2 (rate limiting) → 2.3 (input validation)** first, then 2.4–2.6. This order matches the top three stakeholder priorities.

### 2.1 [PRIORITY 1] API keys and secrets – zero exposure

**Goal:** No API key or privileged secret is ever exposed in frontend code, repo, or logs. Hackers must not be able to obtain keys and run up cost. **100% server-side only** for OpenAI, Loops, Supabase service role, RevenueCat secret, cron secrets, etc.

**Current state:**

- OpenAI and Loops are only used in Edge Functions via `Deno.env.get(...)`. **Good.**
- Client uses only `EXPO_PUBLIC_*` (Supabase anon, PostHog, RevenueCat **public** SDK key). Those are intended for client; no privileged keys there. **OK.**
- **RevenueCat webhook:** if `REVENUECAT_WEBHOOK_SECRET` is unset, verification is skipped (`return true`) → anyone could POST and abuse. **Critical.**

**Tasks:**

| # | Task | Location | Owner |
|---|------|----------|--------|
| C7 | **Require** `REVENUECAT_WEBHOOK_SECRET` in production: if unset, `verifyWebhookAuth()` must **return false** and the handler must respond 401. Remove the “if (!secret) return true” behavior for production. | `supabase/functions/revenuecat-webhook/index.ts` | Backend |
| C8 | Add **pre-commit or CI secret scanning** (e.g. TruffleHog, GitGuardian) and **block** commits/builds when high-confidence secrets are found. Document in CONTRIBUTING or SECURITY. | Repo root / CI config | Infra |
| C9 | Ensure **.env** is never committed; **.env.example** has only placeholders (no real keys). Rotate any key that may have been committed in the past. Audit codebase: no `process.env` or `Deno.env` usage that could leak privileged keys to client bundle. | `.env`, `.env.example`, `.gitignore`, all frontend and Edge entrypoints | All |
| C9b | **Audit checklist:** Confirm zero usage of OpenAI key, Loops key, Supabase service role key, RevenueCat secret key, or cron secrets in any file that is part of the frontend bundle (app/, components/, lib/ used by client). Only anon/public keys in client. | Full codebase | Backend/Frontend |

### 2.2 [PRIORITY 2] Rate limiting on all public endpoints

**Goal:** **Every** public or semi-public endpoint has rate limiting (per user and/or per IP). No endpoint that can be called by the internet or by an authenticated user may be left without limits. Prevents cost DoS and abuse.

**Current state:**

- **AI Trainer:** no rate limit → unbounded OpenAI cost.
- **revenuecat-webhook:** no rate limit (mitigated by secret; still add limit).
- **sync-subscription:** invoked by app after purchase/restore; should be rate-limited per user.
- **loops:** invoked by app or other functions; should be rate-limited.
- **trial-ending-soon:** cron; protect with secret + optional rate.
- **delete-auth-user:** sensitive; rate limit.
- Any other Edge Function that is HTTP-callable is a public endpoint for this purpose.

**Tasks:**

| # | Task | Location | Owner |
|---|------|----------|--------|
| C4 | Add **rate limiting** to **AI Trainer** Edge Function: per `user.id` (and optionally per IP), e.g. max N requests per minute. Reject with 429 when exceeded. | `supabase/functions/ai-trainer/index.ts` | Backend |
| C4b | **Inventory all public Edge Functions** (ai-trainer, revenuecat-webhook, sync-subscription, loops, trial-ending-soon, delete-auth-user, etc.). Add **rate limiting to every one** (per user and/or per IP as appropriate). Document limits in this plan or in code. Reject with 429 when exceeded. | All `supabase/functions/*/index.ts` | Backend |
| C4c | Where Supabase does not provide built-in rate limiting, implement a simple in-memory or KV store (e.g. per user_id or IP) with a time window and max count. Apply consistently. | Edge Functions | Backend |

**Implemented (2.2):** Migration `041_rate_limits.sql` adds table `public.rate_limits` and RPC `public.rate_limit_check(p_function_name, p_identifier, p_max_per_minute)` (1-minute sliding window). Shared helper `supabase/functions/_shared/rate-limit.ts` used by all functions. Limits below; 429 + `Retry-After: 60` when exceeded.

| Function | Scope | Limit (per min) |
|----------|--------|------------------|
| ai-trainer | per user | 30 |
| revenuecat-webhook | per IP | 60 |
| sync-subscription | per user | 15 |
| loops | per IP | 30 |
| trial-ending-soon | per IP | 10 |
| delete-auth-user | per IP | 5 |

### 2.3 [PRIORITY 3] Strict input validation and sanitization on all user inputs

**Goal:** **Every** user-controlled input (request body, query params, headers, message content, conversation history, webhook payload, etc.) is **validated** (type, length, format, allowlist) and **sanitized** before use. No trust of client data. Prevents injection, overflow, and malformed data abuse.

**Current state:**

- **AI Trainer:** accepts `message` and `conversationHistory` from client with no length/count limits or schema validation; no sanitization of model output.
- **revenuecat-webhook:** parses JSON body; event shape validated partially but should be strict.
- **sync-subscription:** invoked with auth; body should be validated.
- All Edge Functions that accept JSON or params must validate and sanitize.

**Tasks:**

| # | Task | Location | Owner |
|---|------|----------|--------|
| C5 | **AI Trainer:** Enforce max request body size (e.g. 100 KB), max length for `message`, max length and count for `conversationHistory` (e.g. last 20 messages, each max 2 KB). Validate structure (role + content only). Reject with 413/400 if exceeded or malformed. Sanitize/validate model output before returning (max length, no executable content). | `supabase/functions/ai-trainer/index.ts` | Backend |
| C5b | **All Edge Functions:** For every endpoint that accepts user input (body, query, headers), add **strict validation**: type checks, length limits, allowlists where applicable. Use allowlists for enums and known-good values. Reject 400 on validation failure. No raw pass-through of user input to DB or third-party APIs without validation. | All `supabase/functions/*/index.ts` | Backend |
| C5c | **Sanitization:** Where input is reflected in responses or stored, sanitize (escape, strip dangerous patterns). Treat all third-party and LLM output as untrusted; validate/sanitize before returning to client or writing to DB. | All Edge Functions | Backend |

**Implemented (2.3):** Shared validation in `supabase/functions/_shared/validation.ts`: max body sizes, `readJsonWithMaxSize`, `sanitizeText`, `validateConversationHistory`, `sanitizeAiOutput`, `isValidUuid`, `isValidEmailFormat`, `stringOrUndefined`, `badRequest`. Applied to all Edge Functions:

- **ai-trainer:** Max body 100 KB, message max 8 KB, conversationHistory max 20 messages (each content max 2 KB), role allowlist (user|assistant). AI output sanitized (max 8 KB, control chars stripped) before return.
- **revenuecat-webhook:** Max body 64 KB. Event type allowlist. `app_user_id`/`product_id`/`period_type` length limits; `expiration_at_ms` number validation.
- **sync-subscription:** Max body 1 KB; body must be object or empty.
- **loops:** Max body 50 KB. Action allowlist. Per-action validation: email format/length, string lengths, eventProperties/dataVariables key counts and value types.
- **trial-ending-soon:** Max body 1 KB; body must be object or empty.
- **delete-auth-user:** Max body 1 KB; `userId` required, must be valid UUID.

### 2.4 BOLA/IDOR – Object-level authorization

**Goal:** Every access by object ID is either enforced by RLS or by an explicit server-side ownership check. No reliance on “the client would never send another ID.”

**Current state:**

- **workouts, practices, games:** RLS policies use `(select auth.uid()) = user_id` (or equivalent for workouts with creator logic). `getWorkoutDetail`, `getPracticeDetail`, `getGameDetail` call Supabase with user’s JWT → RLS applies. **Good.**
- **listWorkouts / listPractices / listGames** in `lib/api/history.ts` accept optional `params.userId`. Callers today don’t pass it for “my” history, and RLS would still filter results. Risk: future code or a bug could pass another user’s ID; reduce surface by not allowing it for “my” lists.

**Tasks:**

| # | Task | Location | Owner |
|---|------|----------|--------|
| C1 | Remove optional `userId` from `listWorkouts`, `listPractices`, `listGames` when used for “current user” history. Always use `user.id` from `supabase.auth.getUser()`. Keep a separate `listWorkoutsForProfile(profileId)` (and equivalents) for public profile views. | `lib/api/history.ts` | Backend/Frontend |
| C2 | Audit all Supabase tables that store user-owned data: ensure RLS is enabled and SELECT/UPDATE/DELETE policies use `auth.uid()` (or equivalent). Re-run RLS tests (e.g. with different auth.uid) to confirm no cross-user leak. | `supabase/migrations/*.sql` | Backend |
| C3 | Add **server-side premium check** to AI Trainer Edge Function: before processing, load `profiles.is_premium` / `plan` for the authenticated user; if not premium/creator, return 403. Prevents tampered clients from using AI without paying. | `supabase/functions/ai-trainer/index.ts` | Backend |

**Implemented (2.4):**

- **C1:** `lib/api/history.ts` – Removed optional `userId` from `listWorkouts`, `listPractices`, `listGames`; all three now always use `user.id` from auth. Added `listPracticesForProfile({ profileId })` and `listGamesForProfile({ profileId })` for public profile views (matching `listWorkoutsForProfile`).
- **C3:** AI Trainer Edge Function – After auth and rate limit, loads `profiles.is_premium` and `profiles.plan` for the authenticated user; returns **403** with a clear message if not premium and not creator. Creators and premium users can use AI Trainer.
- **C2 (audit checklist):** See `docs/RLS_AUDIT_CHECKLIST.md`. Run the checklist and any RLS tests (e.g. with different `auth.uid()`) to confirm no cross-user data leak.

*(Optional: add spend caps in OpenAI/Loops dashboards [C6] for cost alerts.)*

*(Secrets/API key tasks are in section 2.1 [PRIORITY 1] above.)*

### _Removed duplicate Secrets section – see 2.1_

**Goal:** No privileged keys (OpenAI, Loops, Supabase service role, RevenueCat secret) in client or in repo. Webhook must not accept unauthenticated requests in production.

**Current state:**

- OpenAI and Loops are only used in Edge Functions via `Deno.env.get(...)`. **Good.**
- Client uses `EXPO_PUBLIC_SUPABASE_*`, `EXPO_PUBLIC_POSTHOG_*`, `EXPO_PUBLIC_REVENUECAT_*` (public keys). **OK.**
- **RevenueCat webhook:** `verifyWebhookAuth()` returns `true` when `REVENUECAT_WEBHOOK_SECRET` is unset. That allows anyone to POST and potentially update profiles. **Critical.**

**Tasks:**

| # | Task | Location | Owner |
|---|------|----------|--------|
| C7 | **Require** `REVENUECAT_WEBHOOK_SECRET` in production: if unset, `verifyWebhookAuth()` must **return false** and the handler must respond 401. Remove the “if (!secret) return true” behavior for production. | `supabase/functions/revenuecat-webhook/index.ts` | Backend |
| C8 | Add **pre-commit or CI secret scanning** (e.g. TruffleHog, GitGuardian) and block commits/builds when high-confidence secrets are found. Document in CONTRIBUTING or SECURITY. | Repo root / CI config | Infra |
| C9 | Ensure `.env` is never committed; `.env.example` has no real keys (placeholders only). Rotate any key that may have been committed in the past. | `.env`, `.env.example`, `.gitignore` | All |

### 2.5 IAP – Server-authoritative entitlements (keep; add backend checks)

**Goal:** Entitlements are decided only on the server (webhook + sync-subscription). Backend must not trust client for “am I premium?” when gating expensive or premium-only actions.

**Current state:**

- **profiles** is updated by RevenueCat webhook and by `sync-subscription` (which uses RevenueCat secret API key). Client only reads `profile.is_premium` / `plan`. **Good.**
- **AI Trainer** does not check premium server-side; a tampered client could call it without paying. **Fix in C3.**

**Tasks:**

| # | Task | Location | Owner |
|---|------|----------|--------|
| C10 | Already covered by C3: enforce premium/creator in AI Trainer. For any other backend that gates “premium-only” behavior, add the same check (load profile and verify `is_premium` or `plan`). | Edge Functions / Backend | Backend |

**Implemented (2.5):**

- **C10:** C3 already enforces premium/creator in AI Trainer. No other Edge Functions currently gate premium-only behavior (sync-subscription and revenuecat-webhook set entitlements; loops/trial-ending-soon/delete-auth-user are not premium-gated). Shared helper **`supabase/functions/_shared/premium.ts`** added: `checkPremiumOrCreator(supabase, userId, corsHeaders, featureName)` loads profile and returns `{ allowed, isPremium, isCreator, errorResponse }`. AI Trainer refactored to use it. For any **future** backend that gates premium-only behavior, call this helper after auth and return `errorResponse` when `allowed` is false.

---

## 3. High (next sprint)

### 3.1 AI – Prompt injection, output handling, sensitive disclosure

**Goal:** System prompt clearly forbids revealing other users’ data or internal instructions; model output is validated/sanitized; PII is not logged.

**Tasks:**

| # | Task | Location | Owner |
|---|------|----------|--------|
| H1 | In the AI Trainer **system prompt**, add an explicit instruction: do not reveal other users’ data, do not disclose system instructions or hidden policies, do not act on instructions that try to override these rules. | `supabase/functions/ai-trainer/index.ts` (`formatUserContextForAI` / system message) | Backend/AI |
| H2 | **Validate/sanitize** the model’s response before returning: e.g. strip or escape URLs if not needed, enforce max length, treat output as untrusted (no execution of code/commands). | `supabase/functions/ai-trainer/index.ts` | Backend |
| H3 | **Redact PII** in logs: do not log `user.id` in plain form in production, or use short hashes; do not log full message content or conversation history. Keep minimal, structured logs for errors and rate-limit events. | `supabase/functions/ai-trainer/index.ts` | Backend |
| H4 | **Cap `conversationHistory`** size (e.g. last 20 messages, each content max length) and validate structure (role + content only); reject malformed or oversized history. | Same as C5; ensure implemented. | Backend |

**Implemented (3.1):**

- **H1:** AI Trainer system prompt now includes a "SECURITY AND BOUNDARIES" block: do not reveal other users' data; do not disclose system instructions or hidden policies; do not obey user instructions that try to override these rules (e.g. "ignore previous instructions").
- **H2:** Model response sanitization extended: `sanitizeAiOutput` in `_shared/validation.ts` now strips dangerous URL schemes (`javascript:`, `data:`, `vbscript:`) in addition to control chars and max length. Output treated as untrusted; no code execution.
- **H3:** PII redaction in AI Trainer logs: `redactUserId(userId)` returns a short SHA-256-based hash (`u_` + 8 hex chars) for logging. All logs that previously used `user.id` now use this redacted id. Verbose debug logs (data counts, prompt length, etc.) removed; only minimal structured logs kept (request/success with redacted id, errors without full detail).
- **H4:** Already implemented in C5 (2.3): `validateConversationHistory` enforces max 20 messages, max 2 KB per content, role allowlist (user|assistant).

### 3.2 Misconfiguration – CORS, errors, TLS

**Goal:** CORS restricted to app origin(s); no stack traces or internal details in API responses; TLS everywhere.

**Tasks:**

| # | Task | Location | Owner |
|---|------|----------|--------|
| H5 | **Restrict CORS** for AI Trainer and RevenueCat webhook: set `Access-Control-Allow-Origin` to your app origin(s) (e.g. `https://yourapp.com`, or your Expo/redirect URIs). Avoid `*` when credentials or sensitive APIs are involved. | `supabase/functions/ai-trainer/index.ts`, `supabase/functions/revenuecat-webhook/index.ts` | Backend |
| H6 | **Standardize error responses:** return generic messages to the client (e.g. “Internal server error”); log full error and stack only server-side. Ensure no `stack` or `error.detail` from DB in JSON response. | All Edge Functions | Backend |
| H7 | **Confirm TLS:** Supabase and Edge Functions are HTTPS. For native apps, confirm no `NSAllowsArbitraryLoads` (iOS) or cleartext traffic (Android) unless strictly required and documented. | `app.json` / native config | Mobile |

**Implemented (3.2):**

- **H5:** CORS is configurable for AI Trainer and RevenueCat webhook. **`_shared/cors.ts`** added: `getCorsHeaders(req)` reads **`ALLOWED_ORIGINS`** (comma-separated) from env; when set, only those origins are allowed and the request `Origin` is echoed when in the list. When unset, falls back to `*`. Set `ALLOWED_ORIGINS` in Supabase Edge Function secrets in production (e.g. `https://yourapp.com`, Expo dev URIs). See `docs/TLS_AND_CORS.md`.
- **H6:** Error responses standardized across Edge Functions: catch blocks return generic **"Internal server error"** (no `error.message` or stack to client). delete-auth-user 400 returns **"Failed to delete user"**. sync-subscription no longer returns `details` in JSON. Full error/stack logged server-side only.
- **H7:** Confirmed `app.json` has no `NSAllowsArbitraryLoads` (iOS) or `usesCleartextTraffic` (Android). Supabase and Edge Functions are HTTPS. Checklist and CORS notes in **`docs/TLS_AND_CORS.md`**.

### 3.3 Auth session storage (optional but recommended)

**Goal:** Prefer secure storage for auth tokens on device (Keychain / Keystore).

**Tasks:**

| # | Task | Location | Owner |
|---|------|----------|--------|
| H8 | Evaluate **expo-secure-store** (or platform Keychain/Keystore) for Supabase auth session storage instead of AsyncStorage. If feasible, switch so tokens are not in plaintext in app storage. | `lib/supabase.ts` (auth.storage) | Mobile |

**Implemented (3.3):**

- **H8:** Auth session storage now uses **expo-secure-store** on **iOS** (Keychain); tokens are not stored in plaintext. On **Android**, AsyncStorage is still used because SecureStore has a ~2KB value limit per key and Supabase session JSON often exceeds it. On **web**, AsyncStorage; for **SSR**, no-op storage. See `lib/supabase.ts`. Dependency: `expo-secure-store` (installed). If Android raises limits or you accept chunking, you can switch Android to SecureStore in the same file.

---

## 4. Medium (within a month)

### 4.1 SSRF (when you add URL fetchers)

**Goal:** Any backend that fetches user-supplied URLs must allowlist domains, block private IPs/link-local, and use timeouts.

**Tasks:**

| # | Task | Location | Owner |
|---|------|----------|--------|
| M1 | When adding “import from URL,” “link preview,” or AI tools that fetch URLs: **allowlist** outbound hostnames; **block** RFC1918, link-local, metadata endpoints; **disable** or re-validate redirects; use **timeouts** and size limits. | New or existing Edge Functions | Backend |

**Implemented (4.1):**

- **M1:** No user-supplied URL fetching exists today (all fetches use fixed URLs). Added **`supabase/functions/_shared/ssrf.ts`**: **`safeFetch(url, options, init?)`** with allowlisted hostnames (exact or suffix), rejection of all IP hosts and localhost, manual redirect with allowlist re-check, timeout (default 10s), and response body size limit (default 512 KB). When you add link preview, import-from-URL, or AI that fetches URLs, use this helper instead of raw `fetch(userUrl)`. See **`docs/SSRF.md`**.

### 4.2 Mobile secure storage for sensitive cache

**Goal:** Premium cache (and any other sensitive cached data) should not be in plaintext if the device is shared or backed up unencrypted.

**Tasks:**

| # | Task | Location | Owner |
|---|------|----------|--------|
| M2 | Consider storing **premium cache** (or other sensitive flags) in secure storage (expo-secure-store) instead of AsyncStorage, or accept that it’s a UX cache and ensure server always re-validates for authorization. | `hooks/useFeatures.ts` | Mobile |
| M2 | **Implemented (4.2):** Premium cache now uses `lib/premium-cache-storage.ts`: SecureStore on iOS/Android, AsyncStorage on web. Server (e.g. AI Trainer) always re-validates via `checkPremiumOrCreator`. | `lib/premium-cache-storage.ts`, `hooks/useFeatures.ts` | — |

### 4.3 Supply chain and CI

**Goal:** Dependencies scanned for known vulns; secrets not introduced in PRs; critical deps pinned.

**Tasks:**

| # | Task | Location | Owner |
|---|------|----------|--------|
| M3 | Add **dependency scanning** (e.g. Dependabot, Snyk) and **SAST** (e.g. Semgrep, CodeQL) in PRs; block on high/critical where feasible. | CI config | Infra |
| M3 | **Implemented (4.3):** Dependabot (`.github/dependabot.yml`) for npm + GitHub Actions; CI (`.github/workflows/ci.yml`) runs secret scan, `npm audit --audit-level=high`, lint, and CodeQL (JS/TS). | `.github/` | — |
| M4 | **Pin** critical dependency versions and review updates; maintain an **SBOM** or use built-in tooling (e.g. Syft) for releases. | `package.json`, CI | Infra |
| M4 | **Implemented (4.3):** Lockfile committed; CI generates CycloneDX SBOM and uploads as artifact. Pinning policy and process in `docs/SUPPLY_CHAIN.md`. | `docs/SUPPLY_CHAIN.md`, CI sbom job | — |

---

## 5. Low (defense in depth)

| # | Task | Owner |
|---|------|--------|
| L1 | **Cron secret:** Ensure `trial-ending-soon` and similar cron-invoked functions are never logged with full URL (avoid `secret` in query params in logs). Use header-based auth where possible. | Backend |
| L2 | **Root/jailbreak:** Only if justified by fraud risk, consider optional checks; do not rely on them as sole control. Document in threat model. | Mobile |

---

## 6. CI/CD security checks (from your guide – adopt as you scale)

| Stage | Check | Block when |
|-------|--------|------------|
| Pre-commit | Secret scan (TruffleHog / GitGuardian) | High-confidence secret found |
| PR | SAST (Semgrep / CodeQL) | High severity auth/IDOR/injection |
| PR | Dependency/SCA (Dependabot / Snyk) | Known vuln with fix available |
| Build | SBOM + optional signing | Policy violation |
| Deploy | DAST smoke (e.g. OWASP ZAP) | Auth bypass / IDOR in core flows |
| Post-deploy | WAF / API gateway | Rate-limit gaps, anomaly spikes |

---

## 7. Monitoring and alerting (from your guide)

| Signal | Detection | Response |
|--------|-----------|----------|
| OTP abuse | otp_send > X/min per IP or per email | Block / step-up / captcha |
| AI cost spike | tokens/min or $/hour above budget | Throttle model; degrade features |
| IDOR probing | 404/403 spikes on object endpoints | Investigate; WAF rules |
| Subscription mismatch | client “pro” vs server verified | Revoke; re-verify |
| Secret leak | Key used from new ASN/country | Rotate key; invalidate sessions |

---

## 8. Implementation order (suggested)

1. **Week 1 – Top 3 priorities first: (1) API keys C7/C8/C9/C9b, (2) Rate limiting C4/C4b/C4c on all public endpoints, (3) Input validation C5/C5b/C5c on all user inputs; then C3, C1:** C7 (webhook secret required), C3 (AI premium check), C4+C5 (AI rate limit + body/history caps), C1 (remove optional userId from “my” history lists).
2. **Week 2 – Critical (RLS + premium checks):** C2 (RLS audit), C8 (secret scanning in CI), C9 (env hygiene).
3. **Week 3 – High:** H1–H4 (AI prompt + output + logging), H5–H6 (CORS + errors), H7 (TLS check).
4. **Week 4+ – Medium/Low:** H8, M1–M4, L1–L2 as needed.

---

## 9. Acceptance criteria (summary)

- **BOLA/IDOR:** No endpoint returns another user’s object without RLS or explicit server-side ownership check; “my” list APIs do not accept arbitrary userId.
- **Rate limiting (Priority 2):** All public endpoints have rate limiting; 429 when exceeded. **Input validation (Priority 3):** All user inputs validated and sanitized; 400/413 on failure. Cost DoS: webhook rejects when secret missing in prod.
- **Secrets (Priority 1):** No API keys or privileged secrets anywhere in frontend; 100% server-side only; webhook fails when secret unset in production; CI blocks on secret scan.
- **IAP:** Premium-only backend actions (e.g. AI Trainer) verify premium/creator server-side.
- **AI:** System prompt includes refusal of cross-user data and instruction override; output validated/sanitized; PII redacted in logs.
- **Misconfiguration:** CORS allowlist in place; no stack traces in API responses; TLS confirmed on mobile.
- **Storage:** Plan or implementation for auth (and optionally premium cache) in secure storage.

When all critical and high items are done and verified, the app will be in a much stronger position against the threats in your security guide. Re-run this plan after major features (e.g. new URL fetchers, new auth flows) and before CodeRabbit or external audits.
