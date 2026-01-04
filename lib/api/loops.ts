// lib/api/loops.ts
// Loops email service integration
// Documentation: https://loops.so/docs

const LOOPS_API_KEY = process.env.EXPO_PUBLIC_LOOPS_API_KEY || '';
const LOOPS_API_URL = 'https://app.loops.so/api/v1';

export interface LoopsContact {
  email: string;
  firstName?: string;
  lastName?: string;
  source?: string;
  subscribed?: boolean;
  userGroup?: string;
  userId?: string;
}

export interface LoopsEvent {
  email: string;
  eventName: string;
  eventProperties?: Record<string, any>;
}

export interface LoopsTransactionalEmail {
  transactionalId: string;
  email: string;
  dataVariables?: Record<string, any>;
}

/**
 * Create or update a contact in Loops
 */
export async function createOrUpdateContact(contact: LoopsContact): Promise<{ data: any | null; error: any }> {
  try {
    if (!LOOPS_API_KEY) {
      console.warn('⚠️ [Loops] API key not configured. Skipping contact creation.');
      return { data: null, error: { message: 'Loops API key not configured' } };
    }

    const response = await fetch(`${LOOPS_API_URL}/contacts/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOOPS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(contact),
    });

    const data = await response.json();

    if (!response.ok) {
      return { data: null, error: { message: data.message || 'Failed to create/update contact' } };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('❌ [Loops] Error creating/updating contact:', error);
    return { data: null, error };
  }
}

/**
 * Send a transactional email via Loops
 */
export async function sendTransactionalEmail(params: LoopsTransactionalEmail): Promise<{ data: any | null; error: any }> {
  try {
    if (!LOOPS_API_KEY) {
      console.warn('⚠️ [Loops] API key not configured. Skipping email send.');
      return { data: null, error: { message: 'Loops API key not configured' } };
    }

    const response = await fetch(`${LOOPS_API_URL}/transactional`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOOPS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transactionalId: params.transactionalId,
        email: params.email,
        dataVariables: params.dataVariables || {},
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { data: null, error: { message: data.message || 'Failed to send email' } };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('❌ [Loops] Error sending transactional email:', error);
    return { data: null, error };
  }
}

/**
 * Track an event in Loops
 */
export async function trackEvent(event: LoopsEvent): Promise<{ data: any | null; error: any }> {
  try {
    if (!LOOPS_API_KEY) {
      console.warn('⚠️ [Loops] API key not configured. Skipping event tracking.');
      return { data: null, error: { message: 'Loops API key not configured' } };
    }

    const response = await fetch(`${LOOPS_API_URL}/events/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOOPS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    const data = await response.json();

    if (!response.ok) {
      return { data: null, error: { message: data.message || 'Failed to track event' } };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('❌ [Loops] Error tracking event:', error);
    return { data: null, error };
  }
}

/**
 * Delete a contact from Loops
 */
export async function deleteContact(email: string): Promise<{ data: any | null; error: any }> {
  try {
    if (!LOOPS_API_KEY) {
      console.warn('⚠️ [Loops] API key not configured. Skipping contact deletion.');
      return { data: null, error: { message: 'Loops API key not configured' } };
    }

    const response = await fetch(`${LOOPS_API_URL}/contacts/delete`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOOPS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { data: null, error: { message: data.message || 'Failed to delete contact' } };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('❌ [Loops] Error deleting contact:', error);
    return { data: null, error };
  }
}

/**
 * Helper: Sync user to Loops when they sign up
 */
export async function syncUserToLoops(params: {
  email: string;
  firstName?: string;
  lastName?: string;
  userId?: string;
}): Promise<{ error: any }> {
  const { error } = await createOrUpdateContact({
    email: params.email,
    firstName: params.firstName,
    lastName: params.lastName,
    userId: params.userId,
    source: 'app_signup',
    subscribed: true,
  });

  return { error };
}

/**
 * Helper: Send welcome email via Loops
 * 
 * IMPORTANT: Welcome emails are MARKETING emails, not transactional!
 * Use Loops Journeys (automated sequences) instead of transactional emails.
 * 
 * SETUP:
 * 1. Go to Loops Dashboard > Journeys
 * 2. Create a "Welcome Journey" that triggers when a contact is added
 * 3. The journey will automatically send when syncUserToLoops() is called
 * 
 * OR use Loops Campaigns for one-off welcome emails.
 * 
 * See docs/LOOPS_EMAIL_SETUP_GUIDE.md for detailed instructions
 */
export async function sendWelcomeEmail(email: string, firstName?: string): Promise<{ error: any }> {
  // Welcome emails should be sent via Loops Journeys, not transactional API
  // When syncUserToLoops() is called, it adds the contact to Loops
  // If you have a Journey set up to trigger on contact creation, it will send automatically
  // 
  // If you need to manually trigger a welcome email, use Loops Campaigns API instead
  // For now, we'll just log that the contact was added (Journey will handle the email)
  
  console.log('✅ [Loops] Contact added - Welcome email will be sent via Journey if configured');
  return { error: null };
}

/**
 * Helper: Send email update confirmation via Loops
 * 
 * ✅ THIS IS TRANSACTIONAL - Email verification requires user action
 * 
 * NOTE: Currently not used - Supabase handles email updates.
 * This is here if you want to switch to Loops for email confirmations later.
 * 
 * SETUP (if you want to use this):
 * 1. Create an "Email Update Confirmation" transactional template in Loops
 * 2. Copy the transactional ID from Loops
 * 3. Replace 'email-update-confirmation' below with your actual transactional ID
 */
export async function sendEmailUpdateConfirmation(email: string, confirmationLink: string): Promise<{ error: any }> {
  const { error } = await sendTransactionalEmail({
    transactionalId: 'email-update-confirmation', // ⚠️ REPLACE THIS if you want to use this feature
    email,
    dataVariables: {
      confirmationLink,
    },
  });

  return { error };
}

