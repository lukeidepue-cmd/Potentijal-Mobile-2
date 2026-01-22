# Setting Up Welcome Email in Loops (Correct Way)

## ✅ Use Loops Automated Sequences, NOT Transactional Emails

Welcome emails are **marketing/onboarding** emails, not transactional. Using transactional emails for welcome messages can get your Loops account banned.

---

## Step-by-Step: Create Welcome Email Sequence

### Step 1: Access Loops (Automated Sequences)

1. Go to [Loops Dashboard](https://app.loops.so)
2. Click **"Loops"** in the left sidebar (this is where automated sequences are)
3. Click **"+ Create Loop"** or **"+ New Loop"**

### Step 2: Set Up the Trigger

1. **Trigger Type**: Select **"When contact is added"** or **"When contact is created"**
   - This will automatically trigger when `syncUserToLoops()` is called in your app
2. Alternative: You can also use **"When contact subscribes"** if that's available

### Step 3: Add "Send Email" Node

**IMPORTANT**: The modal you saw mentioned you need to add a "Send email" node. Do this first!

1. In your loop builder, click **"+ Add Step"** or **"+ Add Node"**
2. Select **"Send Email"** from the options
3. This adds the email sending action to your loop

### Step 4: Design Your Welcome Email

1. Click on the **"Send Email"** node you just added
2. **Design your email**:
   - **Subject**: `Welcome to Potentijal!`
   - **Body**: 
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
   - Use `{{firstName}}` for personalization (automatically available from contact data)

### Step 5: Set Up Domain (Required Before Starting)

**⚠️ You cannot start the loop until your domain is verified!**

Before you can start sending emails, you need to:
1. **Purchase a domain** (if you don't have one) - See `docs/LOOPS_DOMAIN_SETUP.md`
2. **Add domain to Loops**: Settings > Domain > Add your domain (e.g., `mail.potential.com`)
3. **Get DNS records** from Loops
4. **Add DNS records** to your domain registrar
5. **Verify domain** in Loops (takes 5-15 minutes)

**See `docs/LOOPS_DOMAIN_SETUP.md` for complete domain setup instructions.**

### Step 6: Save and Activate

1. **Name your loop**: `Welcome Email` or `Onboarding`
2. Click **"Save"** or **"Publish"**
3. Once domain is verified, click **"Start"** to activate the loop
4. Make sure the loop is **"Active"** (toggle switch)

---

## Alternative: Use Campaigns for One-Off Welcome Emails

If you can't find the automated sequence feature, you can also use **Campaigns**:

1. Go to **Campaigns** in the sidebar
2. Click **"+ Create Campaign"**
3. Design your welcome email
4. Set it to send to **"New contacts"** or trigger it manually via API

However, automated sequences (Loops) are better because they send automatically when contacts are added.

---

## How It Works

1. User signs up in your app
2. `syncUserToLoops()` is called automatically (already integrated)
3. Contact is added to Loops
4. **Loop automatically triggers** (because trigger is "when contact is added")
5. Welcome email is sent automatically
6. **No code changes needed!**

---

## Optional: Multi-Step Welcome Sequence

You can add multiple emails to your loop:

- **Day 0**: Welcome email (immediate)
- **Day 1**: Getting started tips
- **Day 3**: Feature highlights
- **Day 7**: Check-in email

Just add more steps to your loop with delays between them!

---

## Testing

1. **Create a test account** in your app
2. **Check Loops Dashboard** > **Loops** > Your loop > **Activity** or **Logs**
3. You should see the loop triggered and email sent
4. **Check your email inbox**

---

## Troubleshooting

### Loop Not Triggering?

- ✅ Make sure loop is **Active**
- ✅ Check trigger is set to **"When contact is added"**
- ✅ Verify `syncUserToLoops()` is being called (check console logs)
- ✅ Check Loops Dashboard > **Audience** > **Contacts** to see if contact was added

### Email Not Sending?

- ✅ Check Loops Dashboard > **Loops** > Your loop > **Activity** or **Logs**
- ✅ Check Loops Dashboard > **Logs** (general) for errors
- ✅ Verify email template is saved and published
- ✅ Make sure loop step is configured correctly

### Variables Not Working?

- ✅ Use `{{firstName}}` (double curly braces)
- ✅ Make sure `syncUserToLoops()` is passing firstName
- ✅ Check contact data in Loops Dashboard > **Audience** > **Contacts**

### Can't Find "Loops" Tab?

- The automated sequences might be called "Loops" in your dashboard
- Look for any tab related to automation, sequences, or workflows
- If you still can't find it, use **Campaigns** instead (see alternative above)

---

## Current App Status

✅ **User Sync**: Working - automatically adds contacts to Loops  
✅ **Loop Ready**: Just needs to be created in Loops dashboard  
✅ **No Code Changes**: Everything is already set up!  

---

## Domain Note

Your sending domain: `mail.potential.com` (no 'j' in potential)

Make sure this is verified in Loops Dashboard > **Settings** > **Domain** before sending emails.

---

## Summary

**What to do:**
1. Go to **Loops** tab in dashboard (automated sequences)
2. Create a new loop with trigger "when contact is added"
3. Design your welcome email
4. Activate the loop
5. Test by creating a new account

**That's it!** No code changes needed - the app is already set up correctly.
