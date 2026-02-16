# Testing rate limits and input validation

Quick reference to verify rate limiting and strict input validation on Edge Functions.

## Confirmation: what’s in place

- **All 6 Edge Functions** use `checkRateLimit` and return 429 via `rateLimitResponse` when over limit.
- **All** use `readJsonWithMaxSize` with fixed limits (1 KB small, 50 KB Loops, 64 KB webhook, 100 KB AI).
- **Validation:** body type, required fields, allowlists (e.g. Loops action, event types), UUIDs, sanitized text, conversation history shape and length, AI output sanitized.

Limits (from `_shared/validation.ts` and `_shared/rate-limit.ts`):

| Function            | Rate limit (per minute) | Body size | Key validation                          |
|---------------------|--------------------------|-----------|----------------------------------------|
| ai-trainer          | 30 (per user)            | 100 KB    | message length, conversationHistory    |
| revenuecat-webhook  | 60 (per IP)              | 64 KB     | event type allowlist                    |
| sync-subscription   | 15 (per user)            | 1 KB      | JWT required                            |
| loops               | 30 (per IP)              | 50 KB     | action allowlist, email, string lengths  |
| delete-auth-user    | 5 (per IP)               | 1 KB      | userId required, UUID                   |
| trial-ending-soon   | 10 (per IP)              | 1 KB      | optional CRON_SECRET header             |

---

## How to test

### 1. Rate limiting (expect 429)

Use a tool that can send many requests in a short time (curl in a loop, or a small script).

**Example: AI Trainer (30/min per user)**

- From the app: send 31+ AI Trainer messages within 1 minute (same logged-in user). The 31st (or next over limit) should get **429** and a body like `{"error":"Too many requests","retry_after":60}`.
- Or call the function directly with a valid JWT (same token 31+ times in 1 minute):

```bash
# Replace PROJECT_REF and JWT with real values; run 35 times quickly
for i in $(seq 1 35); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST "https://PROJECT_REF.supabase.co/functions/v1/ai-trainer" \
    -H "Authorization: Bearer YOUR_JWT" \
    -H "Content-Type: application/json" \
    -d '{"message":"hi","conversationHistory":[]}'
done
```

You should see `200` for the first 30 and **429** for the rest (until the 1‑minute window resets).

**Example: delete-auth-user (5/min per IP)**

- Send 6 POSTs with valid body (and valid JWT) from the same IP within 1 minute. The 6th should be **429**.

**Example: Loops (30/min per IP)**

- Send 31+ POSTs to the Loops function from the same IP; the 31st should be **429**.

---

### 2. Input validation (expect 400 or 413)

**Oversized body (413)**

- Send a body larger than the function’s limit. You should get **413** (or a 400 with an error message about size), not 200.

```bash
# AI Trainer allows 100 KB; send 101 KB
dd if=/dev/zero bs=1024 count=101 | base64 | head -c 110000 > /tmp/big.json
# Then send as body with {"message":"...", "conversationHistory":[]} where message is the big string, or similar
```

Or use a script to POST a body slightly over the limit for that function.

**Invalid / missing fields (400)**

- **delete-auth-user:** POST `{}` (no userId) → **400** “userId is required”. POST `{"userId":"not-a-uuid"}` → **400** “userId must be a valid UUID”.
- **ai-trainer:** POST `{"message":""}` or missing `message` → **400**. POST invalid `conversationHistory` (e.g. wrong shape or too many items) → **400**.
- **revenuecat-webhook:** POST body with unknown `event.type` → **400** (after auth).

**Allowlist (400)**

- **loops:** POST `{"action":"evil"}` → **400** “Missing or invalid action…”. Only `createOrUpdateContact`, `sendTransactional`, `trackEvent`, `deleteContact` are allowed.

---

### 3. Sanity check in the app

- Use the app normally: send a few AI Trainer messages, restore purchases, delete account flow. All should work.
- Then trigger rate limit from the app (e.g. send 31+ AI messages in a minute) and confirm you see a “Too many requests” or similar and **429** in network tab.

---

## Summary

| Test              | How                                      | Expected result   |
|-------------------|-------------------------------------------|-------------------|
| Rate limit        | Exceed N requests in 1 min for that fn   | 429, retry_after  |
| Body too big      | POST body > function’s max size          | 413 or 400        |
| Missing/invalid   | Wrong or missing required fields          | 400 + message     |
| Allowlist         | Disallowed action/type/value             | 400                |

If any of these return 200 when they should not, that function’s validation or rate limit needs a second look.
