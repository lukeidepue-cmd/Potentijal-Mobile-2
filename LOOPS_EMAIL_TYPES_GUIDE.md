# Loops Email Types Guide

## ✅ What's Already Working

- **User Sync**: New signups automatically sync to Loops
- **Edge Function**: Secure API calls (API key stored in Supabase secrets)
- **Contact Management**: Users appear in Loops dashboard

---

## 📧 Types of Emails You Can Send

### 1. **Journeys** (Automated Sequences) ⭐ Recommended for Welcome

**What**: Automated email sequences triggered by events (like "contact added")

**When to Use**:
- Welcome emails
- Onboarding sequences
- Re-engagement campaigns
- Abandoned cart reminders

**How to Set Up**:
1. Go to Loops Dashboard > **Journeys**
2. Click **"+ Create Journey"**
3. Choose trigger: **"When contact is added"** (for welcome emails)
4. Add email step(s)
5. **Activate** the journey

**Code Required**: None! It's automatic when contacts are added.

**Example**: Welcome email that sends automatically when a new user signs up.

---

### 2. **Transactional Emails** (One-off, Action-Required)

**What**: Single emails sent via API for specific user actions

**When to Use**:
- Password reset links
- Email verification confirmations
- Order confirmations
- Account deletion confirmations
- Two-factor authentication codes

**How to Set Up**:
1. Go to Loops Dashboard > **Create** > **Transactional**
2. Design your email template
3. Add data variables (like `{{resetLink}}`)
4. **Publish** the template
5. Copy the **Transactional ID**

**Code Required**: Use `sendTransactionalEmail()` function

**Example**:
```typescript
import { sendTransactionalEmail } from '@/lib/api/loops';

// Send password reset email
await sendTransactionalEmail({
  transactionalId: 'password-reset-xyz123', // From Loops dashboard
  email: user.email,
  dataVariables: {
    resetLink: 'https://yourapp.com/reset?token=abc123',
    name: user.firstName,
  },
});
```

**Current Status**: Functions are ready, but you need to:
1. Create transactional templates in Loops Dashboard
2. Update the transactional IDs in your code

---

### 3. **Campaigns** (One-off Marketing Emails)

**What**: Single marketing emails sent to a segment of your audience

**When to Use**:
- Product updates
- Newsletters
- Announcements
- Promotional emails

**How to Set Up**:
1. Go to Loops Dashboard > **Campaigns**
2. Click **"+ Create Campaign"**
3. Design your email
4. Select audience segment
5. Schedule or send immediately

**Code Required**: None! Managed entirely in Loops Dashboard.

---

### 4. **Event Tracking** (Trigger Automated Emails)

**What**: Track user actions to trigger Journeys or segment your audience

**When to Use**:
- Track when users complete workouts
- Track when users upgrade to premium
- Track when users achieve milestones
- Trigger automated emails based on behavior

**How to Set Up**:
1. Create a Journey in Loops Dashboard
2. Set trigger to **"Event"** (e.g., "workout_completed")
3. Design your email
4. **Activate** the journey

**Code Required**: Use `trackEvent()` function

**Example**:
```typescript
import { trackEvent } from '@/lib/api/loops';

// Track when user completes a workout
await trackEvent({
  email: user.email,
  eventName: 'workout_completed',
  eventProperties: {
    workoutType: 'lifting',
    duration: 45,
    exercises: 5,
  },
});
```

This will trigger any Journeys that listen for the `workout_completed` event.

---

## 🚀 Quick Start: What to Do Next

### Priority 1: Welcome Email Journey (5 minutes)

1. Go to [Loops Dashboard](https://app.loops.so) > **Journeys**
2. Click **"+ Create Journey"**
3. **Trigger**: **"When contact is added"**
4. **Add Step**: **"Send Email"**
5. Design your welcome email
6. **Activate**

**That's it!** New signups will automatically receive the welcome email.

---

### Priority 2: Event Tracking (When You're Ready)

Add event tracking throughout your app to trigger automated emails:

**Example Locations**:
- After workout completion → `trackEvent({ eventName: 'workout_completed' })`
- After premium upgrade → `trackEvent({ eventName: 'premium_upgraded' })`
- After 7 days of activity → `trackEvent({ eventName: 'streak_7_days' })`

Then create Journeys in Loops that trigger on these events.

---

### Priority 3: Transactional Emails (If Needed)

Only if you want to replace Supabase's email system:

1. **Password Reset**:
   - Create transactional template in Loops
   - Update your password reset flow to use `sendTransactionalEmail()`

2. **Email Update Confirmation**:
   - Create transactional template in Loops
   - Update your email update flow to use `sendTransactionalEmail()`

**Note**: Supabase already handles these well, so this is optional.

---

## 📝 Available Functions in Your Code

All functions are already set up and ready to use:

```typescript
import {
  syncUserToLoops,        // ✅ Already used in signup
  createOrUpdateContact,  // ✅ Used by syncUserToLoops
  sendTransactionalEmail, // ⏳ Ready, needs templates
  trackEvent,             // ⏳ Ready, needs Journeys
  deleteContact,          // ✅ Used in account deletion
} from '@/lib/api/loops';
```

---

## 🎯 Recommended Email Strategy

1. **Start Simple**: 
   - ✅ Set up Welcome Journey (automatic)
   - ✅ Let it run for a while

2. **Add Event Tracking**:
   - Track key user actions (workouts, upgrades, etc.)
   - Create Journeys that trigger on these events

3. **Add Transactional Emails** (if needed):
   - Only if you want to customize beyond Supabase defaults
   - Password resets, email confirmations, etc.

4. **Send Campaigns** (when needed):
   - Product updates
   - Announcements
   - Promotional emails

---

## 📚 Resources

- **Loops Dashboard**: https://app.loops.so
- **Loops Documentation**: https://loops.so/docs
- **Quick Start Guide**: `docs/LOOPS_QUICK_START.md`
- **Email Setup Guide**: `docs/LOOPS_EMAIL_SETUP_GUIDE.md`

---

## ✅ Summary

**What's Working**:
- ✅ User sync to Loops
- ✅ Secure Edge Function
- ✅ All API functions ready

**What to Do Next**:
1. ⏳ Create Welcome Journey in Loops Dashboard (5 min)
2. ⏳ Add event tracking throughout your app (when ready)
3. ⏳ Create transactional templates (if needed)

**You're all set!** The infrastructure is ready. Now just configure the emails in Loops Dashboard. 🎉
