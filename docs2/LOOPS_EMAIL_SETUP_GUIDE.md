# Complete Loops Email Setup Guide

This guide walks you through creating and connecting all Loops emails to your app.

## Current Setup Status

✅ **API Key**: Added to `.env`  
✅ **Domain**: Set to `https://mail.potentijal.com`  
⏳ **Emails**: Need to create templates  
⏳ **Connection**: Need to link transactional IDs to code  

---

## Which Emails Do You Need?

### **Essential (Start Here):**
1. **Welcome Email** - Sent when users sign up ✅ Already integrated in code
2. **Email Verification** (Optional) - If you want Loops to handle verification instead of Supabase

### **Optional (Add Later):**
3. **Email Update Confirmation** - When users change their email
4. **Password Reset** - For password recovery
5. **Account Deletion Confirmation** - When users delete their account

**Recommendation**: Start with just the **Welcome Email**. It's already integrated and will work immediately once you create it.

---

## Step-by-Step: Creating Emails in Loops

### Step 1: Access Transactional Emails

1. Go to [Loops Dashboard](https://app.loops.so)
2. Click on **"Transactional"** in the left sidebar (or **"Emails"** > **"Transactional"**)
3. Click the **"+ Create Transactional"** button

### Step 2: Create Welcome Email

1. **Name your email**: `Welcome Email` or `Welcome`
2. **Subject Line**: `Welcome to Potentijal!` (or customize)
3. **Design your email**:
   - Use the visual editor or HTML
   - Add a welcome message
   - Include variables like `{{firstName}}` where you want personalization

**Example Welcome Email Template:**
```
Hi {{firstName}},

Welcome to Potentijal! 🎉

We're excited to have you join our community of athletes tracking their progress.

Get started by:
- Logging your first workout
- Setting up your sports preferences
- Exploring your progress graphs

If you have any questions, just reply to this email.

Happy training!
The Potentijal Team
```

4. **Save the email**
5. **Copy the Transactional ID**: 
   - After saving, you'll see an ID like `clx123abc456` or similar
   - This is your **transactional ID** - copy it!

### Step 3: Get Your Transactional ID

After creating the email, you'll see the transactional ID in one of these places:

1. **In the email list**: Look for a column labeled "ID" or "Transactional ID"
2. **In the email editor**: Check the URL - it might be in the path like `/transactional/clx123abc456`
3. **In email settings**: Click on the email, then look for "ID" or "API ID"

**Important**: The transactional ID is different from the email name. You need the **ID**, not the name.

---

## Step 4: Connect Welcome Email to Your App

1. Open `my-first-app/lib/api/loops.ts`
2. Find the `sendWelcomeEmail` function (around line 186)
3. Replace `'welcome'` with your actual transactional ID:

```typescript
export async function sendWelcomeEmail(email: string, firstName?: string): Promise<{ error: any }> {
  const { error } = await sendTransactionalEmail({
    transactionalId: 'YOUR_TRANSACTIONAL_ID_HERE', // ← Replace this!
    email,
    dataVariables: {
      firstName: firstName || 'there',
    },
  });

  return { error };
}
```

**Example**: If your transactional ID is `clx123abc456`, it would look like:
```typescript
transactionalId: 'clx123abc456',
```

---

## Step 5: Test the Welcome Email

1. **Restart your Expo server** (to load the new `.env` variable):
   ```bash
   npx expo start --clear
   ```

2. **Create a test account** in your app
3. **Check Loops Dashboard**:
   - Go to **"Logs"** or **"Activity"**
   - You should see the email being sent
4. **Check your email inbox** (the email you used to sign up)

---

## Optional: Email Verification Email

If you want Loops to handle email verification instead of Supabase:

### Create Verification Email in Loops:

1. Go to **Transactional** > **+ Create Transactional**
2. **Name**: `Email Verification`
3. **Subject**: `Verify your email address`
4. **Template**:
```
Hi {{firstName}},

Please verify your email address by clicking the link below:

{{verificationLink}}

This link will expire in 24 hours.

If you didn't request this, you can safely ignore this email.

Thanks,
The Potentijal Team
```

5. **Save and copy the transactional ID**

### Connect to App (If Needed):

Currently, Supabase handles email verification. If you want to switch to Loops, you'd need to:
1. Update `lib/api/settings.ts` to use Loops instead of Supabase
2. Generate verification links in your app
3. Handle verification in your app

**Recommendation**: Keep using Supabase for verification (it's already set up). Only use Loops for welcome emails and marketing.

---

## Optional: Other Emails

### Email Update Confirmation

1. Create in Loops with variable `{{confirmationLink}}`
2. Update `sendEmailUpdateConfirmation` in `loops.ts` with the transactional ID
3. Currently not used (Supabase handles this), but ready if you want to switch

### Password Reset

1. Create in Loops with variable `{{resetLink}}`
2. Would need to integrate into password reset flow
3. Currently not implemented in the app

---

## Quick Reference: Transactional IDs

After creating emails, update these in `lib/api/loops.ts`:

| Function | Current ID | Replace With |
|----------|-----------|--------------|
| `sendWelcomeEmail` | `'welcome'` | Your welcome email ID |
| `sendEmailUpdateConfirmation` | `'email-update-confirmation'` | Your email update ID (if created) |

---

## Troubleshooting

### Email Not Sending?

1. **Check API Key**: 
   - Verify `EXPO_PUBLIC_LOOPS_API_KEY` is in `.env`
   - Restart Expo after adding it

2. **Check Transactional ID**:
   - Make sure you're using the **ID**, not the name
   - IDs usually look like: `clx123abc456` or `txn_abc123`

3. **Check Loops Logs**:
   - Go to Loops Dashboard > **Logs** or **Activity**
   - Look for errors or failed sends

4. **Check Console**:
   - Look for `⚠️ [Loops]` warnings in your app console
   - These indicate if Loops is being called

### Transactional ID Not Found?

- Make sure the email is **saved** in Loops
- Check that you're looking at the correct project in Loops
- The ID might be in the email's settings page

### Variables Not Working?

- In Loops, use `{{variableName}}` (double curly braces)
- Make sure variable names match what you're sending in `dataVariables`
- Example: `{{firstName}}` in Loops = `firstName: 'John'` in code

---

## Current Integration Status

✅ **Welcome Email**: Integrated - will send automatically on sign-up  
⏳ **Email Verification**: Using Supabase (recommended to keep)  
⏳ **Email Update**: Using Supabase (can switch to Loops later)  
⏳ **Password Reset**: Not implemented yet  
⏳ **Account Deletion**: Integrated - removes from Loops automatically  

---

## Next Steps

1. ✅ Create Welcome Email in Loops
2. ✅ Copy the transactional ID
3. ✅ Update `lib/api/loops.ts` with the ID
4. ✅ Restart Expo
5. ✅ Test by creating a new account
6. ✅ Check Loops logs to verify it's working

Once the welcome email is working, you can add other emails as needed!

---

## Need Help?

- **Loops Docs**: [https://loops.so/docs](https://loops.so/docs)
- **Loops Support**: Check Loops dashboard for support options
- **Check Logs**: Loops Dashboard > Logs shows all email activity

