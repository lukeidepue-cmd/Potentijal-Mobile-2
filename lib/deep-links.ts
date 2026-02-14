/**
 * Deep Link Handler
 * Handles deep links for email verification and OAuth callbacks
 */

import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { supabase } from './supabase';

/**
 * Parse deep link URL and extract parameters
 */
export function parseDeepLink(url: string): {
  path: string;
  params: Record<string, string>;
} {
  const parsed = Linking.parse(url);
  const path = parsed.path || '';
  
  // Extract query params
  const queryParams = (parsed.queryParams || {}) as Record<string, string>;
  
  // Extract hash fragment params (Supabase uses hash fragments for tokens)
  const hashParams: Record<string, string> = {};
  if (parsed.hostname && url.includes('#')) {
    const hashPart = url.split('#')[1];
    if (hashPart) {
      const hashPairs = hashPart.split('&');
      hashPairs.forEach(pair => {
        const [key, value] = pair.split('=');
        if (key && value) {
          hashParams[decodeURIComponent(key)] = decodeURIComponent(value);
        }
      });
    }
  }
  
  // Combine query params and hash params (hash takes precedence)
  const params = { ...queryParams, ...hashParams };

  return { path, params };
}

/**
 * Handle email verification deep link
 * Format: myfirstapp://verify?token=CODE&type=email
 * Or: myfirstapp://auth/callback#access_token=...&type=...
 */
export async function handleEmailVerificationLink(url: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { params } = parseDeepLink(url);
    
    // Supabase magic links include tokens in the URL hash or query params
    // The format can vary, so we check multiple possible formats
    const token = params.token || params.access_token || params.token_hash;
    const type = params.type || 'email';

    // For magic links, Supabase handles verification automatically via onAuthStateChange
    // We just need to check if a session was created
    // Don't auto-navigate - let the verification screen detect the auth state change
    
    // Check if we have a session (Supabase may have already handled it)
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      return { success: true };
    }

    // If no session yet, try to verify with token if provided
    if (token) {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: type as any,
      });

      if (error) {
        const { data: { session: retrySession } } = await supabase.auth.getSession();
        if (retrySession) return { success: true };
        return { success: false, error: error.message };
      }

      if (data?.session) return { success: true };
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
    const { data: { session: finalSession } } = await supabase.auth.getSession();
    if (finalSession) return { success: true };

    return { success: false, error: 'No verification token found and no session created' };
  } catch (error: any) {
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Handle OAuth callback deep link
 * Format: myfirstapp://
 */
export async function handleOAuthCallback(url: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Supabase handles OAuth callbacks automatically via onAuthStateChange
    // This function is here for future use if needed
    const { path, params } = parseDeepLink(url);

    // The AuthProvider's onAuthStateChange will handle the session
    // We just need to ensure we're on the right screen
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Initialize deep link listener
 * Should be called in root layout or AuthProvider
 */
export function setupDeepLinkListener() {
  Linking.getInitialURL().then((url) => {
    if (url) handleDeepLink(url);
  }).catch(() => {});

  const subscription = Linking.addEventListener('url', (event) => {
    handleDeepLink(event.url);
  });

  return subscription;
}

/**
 * Main deep link handler - routes to appropriate handler
 */
async function handleDeepLink(url: string) {
  if (url.includes('supabase.co/auth/v1/callback') || url.includes('supabase.co/auth/v1/verify')) {
    await handleEmailVerificationLink(url);
    return;
  }

  const { path, params } = parseDeepLink(url);

  if (path.includes('verify') || path.includes('--/verify') || params.token || params.access_token || params.token_hash || params.type === 'email') {
    await handleEmailVerificationLink(url);
    return;
  }

  if (path === '/' || path === '' || !path || path === '--') {
    await handleOAuthCallback(url);
    return;
  }
}
