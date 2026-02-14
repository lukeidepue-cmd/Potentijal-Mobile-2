# Supabase Auth security

## Leaked password protection (HaveIBeenPwned)

Supabase can block sign-ups and password changes when the password is in the HaveIBeenPwned.org leaked-passwords list.

**Enable in the Dashboard (no code change):**

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. Go to **Authentication** → **Providers** → **Email** (or **Auth** → **Providers** and select Email).
3. Under **Password security**, turn on **“Prevent the use of leaked passwords”** (or equivalent wording in your dashboard).
4. Save.

**Note:** This option is available on the **Pro plan and above**. If you don’t see it, your plan may not include it.

- [Password security docs](https://supabase.com/docs/guides/auth/password-security)
