# Security

## API keys and secrets (Priority 1)

- **Never commit `.env`.** It is in `.gitignore`. Use `.env.example` as a template with placeholders only.
- **No privileged keys in frontend.** Only public/client-safe values may be used in the app bundle (e.g. `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_POSTHOG_*`, `EXPO_PUBLIC_REVENUECAT_*`). OpenAI, Loops, Supabase service role, RevenueCat secret, and cron secrets must **only** be used in Supabase Edge Functions or server-side, via environment/secrets.
- **RevenueCat webhook:** Set `REVENUECAT_WEBHOOK_SECRET` in Supabase secrets. If unset, the webhook rejects all requests (fail closed).
- **Rotate keys** immediately if a key may have been committed or leaked.
- **Frontend audit:** `app/`, `components/`, and `lib/` must not reference OpenAI, Loops API key, Supabase service role, RevenueCat secret, or cron secrets. Only `EXPO_PUBLIC_*` (Supabase URL/anon, PostHog, RevenueCat public SDK key) are allowed in client code. Re-check when adding new client code.

## Secret scanning

- **Before pushing:** Run `npm run security:scan-secrets`. It checks for high-confidence secret patterns in the repo. If it exits with code 1, fix or remove the finding before pushing.
- **CI:** The GitHub Actions workflow (`.github/workflows/ci.yml`) runs secret scanning and **blocks** on failure. It also runs `npm audit --audit-level=high` and CodeQL (SAST). See [docs/SUPPLY_CHAIN.md](docs/SUPPLY_CHAIN.md).
- **Pre-commit (optional):** Use Husky or pre-commit to run `npm run security:scan-secrets` on commit.

## Supply chain (dependencies, SAST, SBOM)

- **Dependabot** is enabled (`.github/dependabot.yml`) for npm and GitHub Actions.
- **CI** runs secret scan, `npm audit` (block on high/critical), lint, CodeQL (SAST), and generates an SBOM artifact. See [docs/SUPPLY_CHAIN.md](docs/SUPPLY_CHAIN.md).

## Full security plan

See [docs/SECURITY_REMEDIATION_PLAN.md](docs/SECURITY_REMEDIATION_PLAN.md) for the full remediation plan (rate limiting, input validation, RLS, etc.).
