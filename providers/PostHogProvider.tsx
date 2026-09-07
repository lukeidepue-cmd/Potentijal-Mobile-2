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
        flushAt: 20, // Batch events rather than one request per event
        flushInterval: 30,
        maxBatchSize: 50,
        maxQueueSize: 1000,
      }}
    >
      {children}
    </PostHogProviderBase>
  );
}
