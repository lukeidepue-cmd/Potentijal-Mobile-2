# How to set the RevenueCat webhook secret

The webhook **does not** get a secret from RevenueCat. **You** create a secret (a random string) and put the **same value** in two places: RevenueCat (so they send it) and Supabase (so your function can check it).

---

## Step 1: Create a secret value

Create a long, random string that only you know. Examples of how to generate one:

- **PowerShell (Windows):**  
  `[System.Guid]::NewGuid().ToString() + [System.Guid]::NewGuid().ToString()`  
  (or run it a few times and paste together for a longer secret)

- **Node:**  
  `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

- Or use a password generator (e.g. 32+ random letters/numbers).

**Example (do not use this one):** `a1b2c3d4e5f6...`  
Copy the value and keep it handy for the next two steps.

---

## Step 2: Set it in RevenueCat (so they send it with every webhook)

1. Go to [RevenueCat](https://app.revenuecat.com) and open your project.
2. In the left sidebar, go to **Integrations** → **Webhooks** (or **Project** → **Webhooks** depending on the UI).
3. Add a new webhook or edit the one that points to your Supabase function:
   - **URL:** your Supabase Edge Function URL, e.g.  
     `https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook`
   - Find the option for **Authorization header** (or “Header”, “Custom header”, “Webhook secret”).
   - Set the header **value** to your secret. You can use either:
     - The raw secret: `your-generated-secret-here`
     - Or with “Bearer ”: `Bearer your-generated-secret-here`  
     Our code accepts both.
4. Save the webhook configuration.

RevenueCat will now send this value in the `Authorization` header with every webhook POST.

---

## Step 3: Set it in Supabase (so your function can verify it)

Your Edge Function reads the secret from the environment variable **REVENUECAT_WEBHOOK_SECRET**. Set it to the **exact same value** you put in RevenueCat.

### Option A: Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. Open **Edge Functions** (or **Settings** → **Edge Functions**).
3. Find **Secrets** / **Environment variables** for Edge Functions.
4. Add a secret:
   - **Name:** `REVENUECAT_WEBHOOK_SECRET`
   - **Value:** the same secret string you used in RevenueCat (no “Bearer ”, unless you used “Bearer &lt;secret&gt;” in RevenueCat).
5. Save.

### Option B: Supabase CLI

From your project root (where you run Supabase commands):

```bash
supabase secrets set REVENUECAT_WEBHOOK_SECRET=your-generated-secret-here
```

Use the **exact same** string you configured in RevenueCat.

---

## Summary

| Where        | What you do |
|-------------|-------------|
| **RevenueCat** | Webhooks → your webhook → set **Authorization** (or “secret”) header **value** to your secret. |
| **Supabase**   | Edge Function secrets: set **REVENUECAT_WEBHOOK_SECRET** to the **same** secret. |

If they match, the webhook will pass verification. If the secret is missing in Supabase or different from RevenueCat, the function will return 401 and RevenueCat may retry; fix the secret in Supabase (and/or RevenueCat) so they match.
