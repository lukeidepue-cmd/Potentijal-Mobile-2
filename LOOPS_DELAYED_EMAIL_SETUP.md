# Loops Delayed Email Setup Guide

## 🎯 Goal: Send Email 48 Hours After Signup

**Good News**: You don't need any code! Loops has a built-in "Wait" step that handles delays automatically.

---

## 📋 Setup Steps in Loops Dashboard

### Step 1: Create a New Loop

1. Go to [Loops Dashboard](https://app.loops.so) > **Loops**
2. Click **"+ Create Loop"** or **"New"**

### Step 2: Set the Trigger

1. **Trigger**: Select **"Contact added to audience"**
   - This will trigger for every new user who signs up

### Step 3: Add Wait Step

1. Click **"+ Add Step"** or **"Add Action"**
2. Select **"Wait"** or **"Delay"**
3. Set the delay to **48 hours**
   - You can choose: hours, days, or specific date/time
   - Select **48 hours** (or **2 days**)

### Step 4: Add Email Step

1. Click **"+ Add Step"** again
2. Select **"Send Email"**
3. Design your email:
   - **Subject**: Something like "How's your training going?"
   - **Body**: Your message to users 48 hours after signup
   - Use variables like `{{firstName}}` for personalization

### Step 5: Activate the Loop

1. Click **"Activate"** or **"Start"** (toggle switch)
2. The loop is now live!

---

## 📊 Your Loop Structure Should Look Like:

```
Trigger: Contact added to audience
  ↓
Step 1: Wait 48 hours
  ↓
Step 2: Send Email
  ↓
Loop completed
```

---

## ✅ That's It!

**No code changes needed!** The Loop will automatically:
1. Trigger when a new contact is added (when they sign up)
2. Wait 48 hours
3. Send your email
4. Mark the loop as completed

---

## 🧪 Testing

To test this:

1. **Option A: Use a test email**
   - Create a test account with your email
   - Wait 48 hours (or use Loops' test mode if available)

2. **Option B: Temporarily reduce delay**
   - Set the wait to 5 minutes for testing
   - Create a test account
   - Verify the email sends after 5 minutes
   - Change it back to 48 hours

---

## 💡 Pro Tips

### Multiple Delayed Emails

You can create multiple Loops with different delays:
- **Loop 1**: Welcome email (immediate) - "Contact added" → "Send Email"
- **Loop 2**: 48-hour check-in - "Contact added" → "Wait 48h" → "Send Email"
- **Loop 3**: 7-day follow-up - "Contact added" → "Wait 7 days" → "Send Email"

### Conditional Logic

You can also add conditions:
- Only send to users who haven't completed onboarding
- Only send to free users (not premium)
- Only send if they haven't logged in

Use **"Add Condition"** or **"Branch"** in your Loop to add logic.

---

## 📝 Example Email Ideas for 48-Hour Follow-up

- "How's your training going?"
- "Tips to get started"
- "Have you tried [feature] yet?"
- "We're here to help!"
- "Check out these resources"

---

## 🎉 Summary

**What You Need to Do**:
1. ✅ Create Loop in Loops Dashboard
2. ✅ Set trigger: "Contact added to audience"
3. ✅ Add Wait step: 48 hours
4. ✅ Add Send Email step
5. ✅ Activate

**What You DON'T Need**:
- ❌ No code changes
- ❌ No events to track
- ❌ No scheduled functions
- ❌ No API calls

**Loops handles everything automatically!** 🚀
