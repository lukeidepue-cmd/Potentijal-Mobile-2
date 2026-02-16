# trial-ending-soon

Sends two Loops reminder events when run daily (e.g. Supabase cron or external scheduler):

1. **`trial_one_week_remaining`** — **Paid subscription** renews in ~1 week: `premium_period_type = normal`, `premium_expires_at` 6–8 days away, `trial_one_week_email_sent_at` null. After sending, sets `trial_one_week_email_sent_at`.
2. **`trial_ending_soon`** — **Free trial** ends in 1 day: `premium_period_type = trial`, `premium_expires_at` within the next day, `trial_ending_email_sent_at` null. After sending, sets `trial_ending_email_sent_at`.

See the main plan doc: **Loops — What you need to do for Loops (Steps 49–52)**.

## Secrets

- `LOOPS_API_KEY` (required) — Loops API key for sending events.
- `CRON_SECRET` (optional) — If set, requests must include header `x-cron-secret: <value>` (query params are not accepted; secret must not appear in URLs or logs).

## Invoke

```bash
# No auth (only if CRON_SECRET is not set)
curl -X POST "https://<project-ref>.supabase.co/functions/v1/trial-ending-soon"

# With secret (header only; do not pass secret in URL)
curl -X POST "https://<project-ref>.supabase.co/functions/v1/trial-ending-soon" \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

## Response

```json
{
  "ok": true,
  "trial_one_week_remaining": { "processed": 0, "results": [] },
  "trial_ending_soon": { "processed": 0, "results": [] }
}
```

Each `results` array contains `{ id, email?, sent, error? }`.
