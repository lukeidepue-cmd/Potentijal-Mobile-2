# SSRF safeguards (4.1)

**Goal:** When the backend fetches user-supplied URLs (link preview, import from URL, AI that fetches URLs), prevent Server-Side Request Forgery: no hitting internal/private IPs, metadata endpoints, or arbitrary internet hosts.

## Current state

- **No user-supplied URL fetching today.** All Edge Function `fetch` calls use fixed URLs (OpenAI, RevenueCat, Loops). No link preview or “import from URL” feature yet.
- **When you add such a feature,** use the shared helper so it’s safe by default.

## Shared helper: `_shared/ssrf.ts`

**`safeFetch(input: string, options: SafeFetchOptions, init?: RequestInit): Promise<Response>`**

- **Allowlist:** Only requests hostnames in `options.allowedHosts` (exact or suffix, e.g. `".example.com"` for `*.example.com`). No IP addresses or `localhost` (all IP hosts rejected).
- **Redirects:** Uses `redirect: "manual"` and re-validates the `Location` URL against the allowlist before following (one level).
- **Timeout:** `options.timeoutMs` (default 10s).
- **Body limit:** `options.maxBodyBytes` (default 512 KB) to cap response size.

### Example (future link preview)

```ts
import { safeFetch } from "../_shared/ssrf.ts";

const ALLOWED_PREVIEW_HOSTS = ["potentijal.com", "www.potentijal.com", "cdn.potentijal.com"];

const url = userSuppliedUrl; // from request body
const res = await safeFetch(url, {
  allowedHosts: ALLOWED_PREVIEW_HOSTS,
  timeoutMs: 5000,
  maxBodyBytes: 100 * 1024,
});
// use res for metadata/image only; don’t echo full body to client without sanitization
```

### Rules to follow

1. **Allowlist** outbound hostnames; do not allow `*` or arbitrary domains.
2. **Block** RFC1918, link-local, metadata (e.g. 169.254.169.254), loopback; the helper rejects all IP hosts and localhost.
3. **Redirects:** Validate `Location` against the same allowlist (helper does one level).
4. **Timeouts and size limits** on every outbound request (helper supports both).

## Where to use

- Any new Edge Function (or new code path) that fetches a URL derived from the user (link preview, import from URL, AI tool that fetches a URL). Do **not** use raw `fetch(userUrl)`.
