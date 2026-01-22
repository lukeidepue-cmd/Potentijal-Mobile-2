// lib/posthog/posthog.ts
// PostHog analytics initialization and utilities

import { PostHog } from 'posthog-react-native';
import Constants from 'expo-constants';

// Initialize PostHog instance
let posthogInstance: PostHog | null = null;

/**
 * Initialize PostHog with API key and configuration
 */
export function initializePostHog(apiKey: string, host?: string): PostHog {
  if (posthogInstance) {
    return posthogInstance;
  }

  const posthogHost = host || 'https://us.i.posthog.com';

  posthogInstance = new PostHog(apiKey, {
    host: posthogHost,
    // Enable automatic screen view tracking
    recordScreenViews: true,
    // Capture application lifecycle events (app opened, backgrounded, etc.)
    captureApplicationLifecycleEvents: true,
    // Capture deep links
    captureDeepLinks: true,
    // Enable debug mode in development
    debug: __DEV__,
    // Batch events for better performance
    flushAt: 20,
    flushInterval: 30,
    maxBatchSize: 50,
    maxQueueSize: 1000,
  });

  console.log('✅ [PostHog] Initialized successfully');

  return posthogInstance;
}

/**
 * Get the PostHog instance
 */
export function getPostHog(): PostHog | null {
  return posthogInstance;
}

/**
 * Identify a user in PostHog
 * Call this when a user logs in or when you have their user ID
 */
export function identifyUser(userId: string, properties?: Record<string, any>): void {
  if (!posthogInstance) {
    console.warn('⚠️ [PostHog] Cannot identify user - PostHog not initialized');
    return;
  }

  posthogInstance.identify(userId, properties);
  console.log('✅ [PostHog] User identified:', userId);
}

/**
 * Reset user identification (call on logout)
 */
export function resetUser(): void {
  if (!posthogInstance) {
    console.warn('⚠️ [PostHog] Cannot reset user - PostHog not initialized');
    return;
  }

  posthogInstance.reset();
  console.log('✅ [PostHog] User reset');
}

/**
 * Capture a custom event
 */
export function captureEvent(eventName: string, properties?: Record<string, any>): void {
  if (!posthogInstance) {
    console.warn('⚠️ [PostHog] Cannot capture event - PostHog not initialized');
    return;
  }

  posthogInstance.capture(eventName, properties);
}

/**
 * Set user properties
 */
export function setUserProperties(properties: Record<string, any>): void {
  if (!posthogInstance) {
    console.warn('⚠️ [PostHog] Cannot set user properties - PostHog not initialized');
    return;
  }

  posthogInstance.identify(undefined, properties);
}
