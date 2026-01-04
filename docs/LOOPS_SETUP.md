# Loops Email Service Setup

This guide explains how to set up and use Loops for email management in the app.

## What is Loops?

Loops is an email service that handles transactional emails, marketing emails, and user management. It's designed for mobile apps and provides a simple API for sending emails.

## Setup Instructions

### 1. Create a Loops Account

1. Go to [loops.so](https://loops.so)
2. Sign up for an account
3. Create a new project for your app

### 2. Get Your API Key

1. In your Loops dashboard, go to **Settings** > **API Keys**
2. Copy your API key (it will look like: `sk_live_...` or `sk_test_...`)

### 3. Add API Key to Your App

Add the API key to your environment variables:

**For Expo/React Native:**
- Create a `.env` file in the `my-first-app` directory (if it doesn't exist)
- Add: `EXPO_PUBLIC_LOOPS_API_KEY=your_api_key_here`
- Or add it to your `app.json` under `extra.env.EXPO_PUBLIC_LOOPS_API_KEY`

**Note:** For production, use environment variables in your build system (EAS, etc.)

### 4. Create Transactional Email Templates in Loops

You'll need to create transactional email templates in your Loops dashboard:

1. **Welcome Email** (`welcome`)
   - Template ID: `welcome`
   - Variables: `{{firstName}}`
   - Use this when users sign up

2. **Email Update Confirmation** (`email-update-confirmation`)
   - Template ID: `email-update-confirmation`
   - Variables: `{{confirmationLink}}`
   - Use this when users update their email

3. **Password Reset** (`password-reset`)
   - Template ID: `password-reset`
   - Variables: `{{resetLink}}`
   - Use this for password resets

4. **Account Deletion Confirmation** (`account-deletion`)
   - Template ID: `account-deletion`
   - Variables: `{{userName}}`
   - Use this when users delete their account

### 5. Update Transactional IDs in Code

After creating your templates in Loops, update the transactional IDs in `lib/api/loops.ts`:

```typescript
// Replace these with your actual Loops transactional IDs:
transactionalId: 'welcome', // Your welcome email ID
transactionalId: 'email-update-confirmation', // Your email update ID
// etc.
```

## Usage

### Automatic Integration

The app automatically syncs users to Loops when they:
- Sign up (via `syncUserToLoops` in AuthProvider)
- Update their email
- Delete their account

### Manual Usage

You can also use Loops functions directly:

```typescript
import { 
  createOrUpdateContact, 
  sendTransactionalEmail, 
  trackEvent 
} from '@/lib/api/loops';

// Create/update a contact
await createOrUpdateContact({
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe',
  userId: 'user-id-123',
});

// Send a transactional email
await sendTransactionalEmail({
  transactionalId: 'welcome',
  email: 'user@example.com',
  dataVariables: {
    firstName: 'John',
  },
});

// Track an event
await trackEvent({
  email: 'user@example.com',
  eventName: 'workout_completed',
  eventProperties: {
    workoutType: 'lifting',
    duration: 45,
  },
});
```

## Integration Points

### 1. Sign Up Flow
- Location: `providers/AuthProvider.tsx`
- Function: `syncUserToLoops()` is called after successful sign-up
- Sends: Welcome email

### 2. Email Updates
- Location: `lib/api/settings.ts` (optional - can replace Supabase emails)
- Function: `sendEmailUpdateConfirmation()`
- Sends: Email update confirmation

### 3. Account Deletion
- Location: `lib/api/settings.ts` (optional)
- Function: `deleteContact()`
- Removes: User from Loops

## Testing

1. Use Loops test mode (test API key) during development
2. Check Loops dashboard > **Logs** to see sent emails
3. Verify emails are received in test inboxes

## Troubleshooting

### Emails Not Sending

1. **Check API Key**: Ensure `EXPO_PUBLIC_LOOPS_API_KEY` is set correctly
2. **Check Template IDs**: Verify transactional IDs match your Loops templates
3. **Check Logs**: Look at Loops dashboard > **Logs** for errors
4. **Check Console**: Look for `⚠️ [Loops]` warnings in app console

### API Key Not Working

- Ensure you're using the correct API key (test vs. production)
- Check that the API key has the correct permissions
- Verify the API key is not expired

## Next Steps

1. ✅ Set up Loops account
2. ✅ Add API key to environment variables
3. ✅ Create transactional email templates
4. ✅ Update transactional IDs in code
5. ✅ Test email sending
6. ✅ Monitor Loops dashboard for email delivery

## Resources

- [Loops Documentation](https://loops.so/docs)
- [Loops API Reference](https://loops.so/api)
- [Loops Dashboard](https://app.loops.so)

