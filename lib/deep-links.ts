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
  console.log('🔍 [parseDeepLink] Parsing URL:', url);
  
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
  
  console.log('🔍 [parseDeepLink] Parsed:', { path, params });
  
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
      console.log('✅ [Deep Link] Session active (handled by Supabase onAuthStateChange)');
      // Don't navigate - let the verification screen detect user state and enable button
      return { success: true };
    }

    // If no session yet, try to verify with token if provided
    if (token) {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: type as any,
      });

      if (error) {
        // Check again if session was created via onAuthStateChange
        const { data: { session: retrySession } } = await supabase.auth.getSession();
        if (retrySession) {
          console.log('✅ [Deep Link] Session created via onAuthStateChange after retry');
          return { success: true };
        }
        
        console.error('❌ [Deep Link] Email verification failed:', error);
        return { success: false, error: error.message };
      }

      if (data?.session) {
        console.log('✅ [Deep Link] Email verified successfully via verifyOtp');
        // Don't navigate - let the verification screen detect user state and enable button
        return { success: true };
      }
    }

    // If no token, Supabase might handle it via onAuthStateChange
    // Wait a moment and check for session
    console.log('⏳ [Deep Link] No token found, waiting for onAuthStateChange...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    
    const { data: { session: finalSession } } = await supabase.auth.getSession();
    if (finalSession) {
      console.log('✅ [Deep Link] Session created via onAuthStateChange');
      return { success: true };
    }

    console.log('⚠️ [Deep Link] No session found after waiting');
    return { success: false, error: 'No verification token found and no session created' };
  } catch (error: any) {
    console.error('❌ [Deep Link] Error handling email verification:', error);
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
    
    console.log('🔵 [Deep Link] OAuth callback received:', { path, params });
    
    // The AuthProvider's onAuthStateChange will handle the session
    // We just need to ensure we're on the right screen
    return { success: true };
  } catch (error: any) {
    console.error('❌ [Deep Link] Error handling OAuth callback:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Initialize deep link listener
 * Should be called in root layout or AuthProvider
 */
export function setupDeepLinkListener() {
  console.log('🔵 [setupDeepLinkListener] Setting up deep link listener');
  
  // Handle initial URL (if app was opened via deep link)
  Linking.getInitialURL().then((url) => {
    if (url) {
      console.log('🔵 [setupDeepLinkListener] Initial URL:', url);
      handleDeepLink(url);
    } else {
      console.log('🔵 [setupDeepLinkListener] No initial URL');
    }
  }).catch((error) => {
    console.error('❌ [setupDeepLinkListener] Error getting initial URL:', error);
  });

  // Listen for deep links while app is running
  const subscription = Linking.addEventListener('url', (event) => {
    console.log('🔵 [setupDeepLinkListener] Deep link received:', event.url);
    handleDeepLink(event.url);
  });

  return subscription;
}

/**
 * Main deep link handler - routes to appropriate handler
 */
async function handleDeepLink(url: string) {
  console.log('🔗 [Deep Link] Received:', url);

  // Check if this is a Supabase callback URL (contains supabase.co/auth/v1/callback)
  if (url.includes('supabase.co/auth/v1/callback') || url.includes('supabase.co/auth/v1/verify')) {
    console.log('🔵 [Deep Link] Detected Supabase callback URL');
    // Extract tokens from Supabase callback URL
    const result = await handleEmailVerificationLink(url);
    if (!result.success) {
      console.error('❌ [Deep Link] Supabase callback verification failed:', result.error);
    }
    return;
  }

  const { path, params } = parseDeepLink(url);

  // Handle email verification (check for token in params or path)
  // Also check for Expo Router path format: /--/verify
  if (path.includes('verify') || path.includes('--/verify') || params.token || params.access_token || params.token_hash || params.type === 'email') {
    console.log('🔵 [Deep Link] Detected email verification link');
    const result = await handleEmailVerificationLink(url);
    if (!result.success) {
      console.error('❌ [Deep Link] Verification failed:', result.error);
    }
    return;
  }

  // Handle OAuth callback (default case for empty path)
  if (path === '/' || path === '' || !path || path === '--') {
    console.log('🔵 [Deep Link] OAuth callback (empty path)');
    await handleOAuthCallback(url);
    return;
  }

  console.log('⚠️ [Deep Link] Unhandled deep link:', url);
}
