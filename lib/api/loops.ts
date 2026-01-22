// lib/api/loops.ts
// Loops email service integration
// Documentation: https://loops.so/docs
// 
// ⚠️ SECURITY: This file calls a Supabase Edge Function, NOT Loops directly.
// The Loops API key is stored securely in Supabase secrets and never exposed to the client.
// According to Loops docs: "Your Loops API key should never be used client side or exposed to your end users."

import { supabase } from '../supabase';

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
 * Calls the secure Supabase Edge Function (API key is stored server-side)
 */
export async function createOrUpdateContact(contact: LoopsContact): Promise<{ data: any | null; error: any }> {
  try {
    // Get the current user's session token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      console.error('❌ [Loops] Failed to get session:', sessionError);
      return { data: null, error: { message: 'User not authenticated' } };
    }

    // Get the Supabase URL from the client
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      console.error('❌ [Loops] Supabase URL not configured');
      return { data: null, error: { message: 'Service not configured' } };
    }

    // Call the Supabase Edge Function
    console.log('🔵 [Loops] Calling Edge Function to create/update contact:', contact.email);
    const response = await fetch(`${supabaseUrl}/functions/v1/loops`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
      },
      body: JSON.stringify({
        action: 'createOrUpdateContact',
        ...contact,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ [Loops] Edge Function error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });
      return { data: null, error: errorData.error || { message: 'Failed to create/update contact' } };
    }

    const result = await response.json();
    console.log('✅ [Loops] Edge Function response:', result);
    return { data: result.data, error: result.error };
  } catch (error: any) {
    console.error('❌ [Loops] Error creating/updating contact:', error);
    return { data: null, error };
  }
}

/**
 * Send a transactional email via Loops
 * Calls the secure Supabase Edge Function (API key is stored server-side)
 */
export async function sendTransactionalEmail(params: LoopsTransactionalEmail): Promise<{ data: any | null; error: any }> {
  try {
    // Get the current user's session token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      console.error('❌ [Loops] Failed to get session:', sessionError);
      return { data: null, error: { message: 'User not authenticated' } };
    }

    // Get the Supabase URL from the client
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      console.error('❌ [Loops] Supabase URL not configured');
      return { data: null, error: { message: 'Service not configured' } };
    }

    // Call the Supabase Edge Function
    const response = await fetch(`${supabaseUrl}/functions/v1/loops`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
      },
      body: JSON.stringify({
        action: 'sendTransactional',
        transactionalId: params.transactionalId,
        email: params.email,
        dataVariables: params.dataVariables || {},
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ [Loops] Edge Function error:', errorData);
      return { data: null, error: errorData.error || { message: 'Failed to send email' } };
    }

    const result = await response.json();
    return { data: result.data, error: result.error };
  } catch (error: any) {
    console.error('❌ [Loops] Error sending transactional email:', error);
    return { data: null, error };
  }
}

/**
 * Track an event in Loops
 * Calls the secure Supabase Edge Function (API key is stored server-side)
 */
export async function trackEvent(event: LoopsEvent): Promise<{ data: any | null; error: any }> {
  try {
    // Get the current user's session token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      console.error('❌ [Loops] Failed to get session:', sessionError);
      return { data: null, error: { message: 'User not authenticated' } };
    }

    // Get the Supabase URL from the client
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      console.error('❌ [Loops] Supabase URL not configured');
      return { data: null, error: { message: 'Service not configured' } };
    }

    // Call the Supabase Edge Function
    const response = await fetch(`${supabaseUrl}/functions/v1/loops`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
      },
      body: JSON.stringify({
        action: 'trackEvent',
        ...event,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ [Loops] Edge Function error:', errorData);
      return { data: null, error: errorData.error || { message: 'Failed to track event' } };
    }

    const result = await response.json();
    return { data: result.data, error: result.error };
  } catch (error: any) {
    console.error('❌ [Loops] Error tracking event:', error);
    return { data: null, error };
  }
}

/**
 * Delete a contact from Loops
 * Calls the secure Supabase Edge Function (API key is stored server-side)
 */
export async function deleteContact(email: string): Promise<{ data: any | null; error: any }> {
  try {
    // Get the current user's session token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      console.error('❌ [Loops] Failed to get session:', sessionError);
      return { data: null, error: { message: 'User not authenticated' } };
    }

    // Get the Supabase URL from the client
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      console.error('❌ [Loops] Supabase URL not configured');
      return { data: null, error: { message: 'Service not configured' } };
    }

    // Call the Supabase Edge Function
    const response = await fetch(`${supabaseUrl}/functions/v1/loops`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
      },
      body: JSON.stringify({
        action: 'deleteContact',
        email,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ [Loops] Edge Function error:', errorData);
      return { data: null, error: errorData.error || { message: 'Failed to delete contact' } };
    }

    const result = await response.json();
    return { data: result.data, error: result.error };
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

