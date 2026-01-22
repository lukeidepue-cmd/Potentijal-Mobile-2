# Loops Quick Start Guide

**Status**: ✅ API Key added | ⏳ Need to create welcome email Journey

---

## ⚠️ Important: Use Journeys, NOT Transactional!

Welcome emails are **marketing emails**, not transactional. Using transactional emails for welcome messages can get your Loops account banned.

---

## What You Need to Do Right Now

### 1. Create Welcome Journey in Loops (5 minutes)

1. Go to [Loops Dashboard](https://app.loops.so) > **Journeys** (NOT Transactional!)
2. Click **"+ Create Journey"**
3. **Trigger**: Select **"When contact is added"**
4. **Add Step**: Choose **"Send Email"**
5. **Design your email**:
   - **Subject**: `Welcome to Potentijal!`
   - **Body**: 
     ```
     Hi {{firstName}},
     
     Welcome to Potentijal! 🎉
     
     We're excited to have you join our community.
     
     Happy training!
     ```
6. **Save** and **Activate** the journey

### 2. Test It (2 minutes)

1. Create a test account in your app
2. Check your email inbox
3. Check Loops Dashboard > **Journeys** > Your journey > **Activity**

**That's it!** No code changes needed - the app is already set up correctly.

---

## What's Already Working

✅ **User Sync**: Users are automatically added to Loops when they sign up  
✅ **Welcome Email**: Code is ready - Loop will send automatically when contact is added  
✅ **Account Deletion**: Users are removed from Loops when they delete their account  

---

## What's Optional

⏳ **Email Verification**: Currently using Supabase (recommended to keep)  
⏳ **Email Update Confirmation**: Currently using Supabase  
⏳ **Password Reset**: Not implemented yet  

**Recommendation**: Start with just the welcome email. Add others later if needed.

---

## Need More Details?

See `docs/LOOPS_EMAIL_SETUP_GUIDE.md` for the complete step-by-step guide.

---

## Troubleshooting

**Can't find "Loops" tab?**
- Look for the **"Loops"** tab in the sidebar (it's there in your dashboard!)
- It might be called "Automated Sequences" or "Workflows" in some versions
- **Alternative**: Use **Campaigns** tab to create a one-off welcome email campaign

**Loop not triggering?**
- Make sure loop is **Active** (toggle switch)
- Check trigger is set to **"When contact is added"**
- Verify contact was added (Loops Dashboard > **Audience** > **Contacts**)
- Check console logs for `✅ [Loops] User synced successfully`

**Email not sending?**
- Check Loops Dashboard > **Loops** > Your loop > **Activity** or **Logs**
- Check Loops Dashboard > **Logs** (general) for errors
- Verify email template is saved and published
- Make sure loop step is configured correctly

**Using Campaigns instead?**
- Go to **Campaigns** tab
- Create a campaign for welcome emails
- You can send it manually or set up automation if available

