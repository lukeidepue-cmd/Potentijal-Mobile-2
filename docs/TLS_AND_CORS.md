# TLS and CORS (3.2 – H5, H7)

## CORS (H5)

AI Trainer and RevenueCat webhook use configurable CORS via **`ALLOWED_ORIGINS`** (Supabase Edge Function secret).

- **Set in Supabase:** Dashboard → Project Settings → Edge Functions → Secrets → add `ALLOWED_ORIGINS`.
- **Value:** Comma-separated list of origins, e.g.:
  - `https://potentijal.com`
  - `https://www.potentijal.com`
  - For Expo dev: `exp://192.168.1.1:8081` (use your machine’s LAN IP).
- **Behavior:** If `ALLOWED_ORIGINS` is set, only those origins are allowed; the request `Origin` header is echoed when it’s in the list. If unset, `Access-Control-Allow-Origin: *` is used (set the secret in production).

## TLS (H7)

- **Supabase / Edge Functions:** Served over HTTPS by default. No action needed.
- **iOS:** Expo/React Native use the system default. Do **not** add `NSAllowsArbitraryLoads: true` (or similar) to `infoPlist` in `app.json` unless you have a documented need; leaving it unset keeps App Transport Security requiring HTTPS.
- **Android:** Android 9+ blocks cleartext by default. Do **not** set `android.usesCleartextTraffic: true` in `app.json` unless required and documented.
- **This project:** `app.json` does not enable arbitrary loads or cleartext; API calls go to Supabase (HTTPS). Confirm after any future native config changes.
