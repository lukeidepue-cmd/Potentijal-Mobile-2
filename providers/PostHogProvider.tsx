// providers/PostHogProvider.tsx
// PostHog analytics provider

import React from 'react';
import { PostHogProvider as PostHogProviderBase } from 'posthog-react-native';

interface PostHogProviderProps {
  children: React.ReactNode;
  apiKey: string;
  host?: string;
}

export function PostHogProvider({ children, apiKey, host }: PostHogProviderProps) {
  return (
    <PostHogProviderBase
      apiKey={apiKey}
      options={{
        host: host || 'https://us.i.posthog.com',
        recordScreenViews: true,
        captureApplicationLifecycleEvents: true,
        captureDeepLinks: true,
        debug: __DEV__,
        flushAt: 1, // Flush after 1 event for faster testing (change to 20 for production)
        flushInterval: 10, // Flush every 10 seconds for faster testing (change to 30 for production)
        maxBatchSize: 50,
        maxQueueSize: 1000,
      }}
    >
      {children}
    </PostHogProviderBase>
  );
}
