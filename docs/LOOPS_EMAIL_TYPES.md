# Loops Email Types: Transactional vs Marketing

## ⚠️ Important: Don't Get Banned!

Loops has strict rules about what can be sent as transactional emails. **Only use transactional emails for messages that require action or must be read for continued platform use.**

---

## ✅ Transactional Emails (Use Transactional API)

These are **critical** emails that users need to act on:

1. **Email Verification** ✅
   - User must verify email to continue using the app
   - **Transactional ID needed**: Create in Loops > Transactional

2. **Password Reset** ✅
   - User needs this to regain access to their account
   - **Transactional ID needed**: Create in Loops > Transactional

3. **Email Update Confirmation** ✅
   - User must confirm new email address
   - **Transactional ID needed**: Create in Loops > Transactional

4. **Account Security Alerts** ✅
   - Login from new device, suspicious activity, etc.
   - **Transactional ID needed**: Create in Loops > Transactional

---

## ❌ NOT Transactional (Use Journeys/Campaigns)

These are **marketing/onboarding** emails:

1. **Welcome Email** ❌
   - Nice to have, but not required for platform use
   - **Use**: Loops Journeys (automated sequence)
   - **How**: Create a Journey that triggers when contact is added

2. **Onboarding Emails** ❌
   - Tips, tutorials, getting started guides
   - **Use**: Loops Journeys

3. **Product Updates** ❌
   - New features, announcements
   - **Use**: Loops Campaigns

4. **Newsletters** ❌
   - Regular updates, content
   - **Use**: Loops Campaigns

5. **Promotional Emails** ❌
   - Sales, discounts, special offers
   - **Use**: Loops Campaigns

---

## How to Set Up Welcome Email (Correct Way)

### Option 1: Loops Journeys (Recommended)

1. Go to Loops Dashboard > **Journeys**
2. Click **"+ Create Journey"**
3. **Trigger**: "When contact is added" or "When contact is created"
4. **Action**: Send welcome email
5. **Design**: Create your welcome email template
6. **Save**: The journey will automatically trigger when `syncUserToLoops()` is called

**Benefits**:
- ✅ Automatic - no code changes needed
- ✅ Can add multiple emails in sequence (day 1, day 3, day 7, etc.)
- ✅ Proper categorization (not transactional)

### Option 2: Loops Campaigns

1. Go to Loops Dashboard > **Campaigns**
2. Create a campaign for welcome emails
3. Use the Campaigns API to send (different from transactional API)

---

## Current App Setup

### ✅ Already Correct:
- **User Sync**: `syncUserToLoops()` adds contacts to Loops
- **Account Deletion**: Removes contacts from Loops

### ⚠️ Needs Update:
- **Welcome Email**: Currently tries to use transactional API (WRONG)
- **Solution**: Remove transactional welcome email, use Loops Journey instead

### 📝 Future Transactional Emails (If Needed):
- Email verification (if switching from Supabase)
- Password reset (if implementing)
- Email update confirmation (if switching from Supabase)

---

## Quick Reference

| Email Type | Loops Feature | API Endpoint |
|------------|---------------|--------------|
| Welcome | Journeys | Automatic (no API call needed) |
| Onboarding | Journeys | Automatic |
| Email Verification | Transactional | `/transactional` |
| Password Reset | Transactional | `/transactional` |
| Marketing | Campaigns | Campaigns API |
| Updates | Campaigns | Campaigns API |

---

## Domain Note

Your sending domain is set to: `mail.potential.com` (note: no 'j' in potential)

Make sure this matches your actual domain when you set it up!

---

## Summary

**DO use transactional for:**
- ✅ Email verification
- ✅ Password reset
- ✅ Security alerts
- ✅ Any email requiring action

**DON'T use transactional for:**
- ❌ Welcome emails
- ❌ Marketing emails
- ❌ Newsletters
- ❌ Promotional content

**For welcome emails**: Use Loops Journeys - it's automatic and properly categorized!

