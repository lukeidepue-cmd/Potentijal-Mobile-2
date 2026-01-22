// lib/posthog/user-tracking.ts
// PostHog user identification and tracking utilities

import { usePostHog } from 'posthog-react-native';
import { useEffect } from 'react';
import { useAuth } from '../../providers/AuthProvider';
import { getMyProfile } from '../api/profile';

/**
 * Hook to automatically identify users in PostHog when they log in
 * Use this in a component that's inside both PostHogProvider and AuthProvider
 */
export function usePostHogUserTracking() {
  const posthog = usePostHog();
  const { user } = useAuth();

  useEffect(() => {
    if (user && posthog) {
      // Load user profile to get additional properties
      getMyProfile().then(({ data: profile }) => {
        posthog.identify(user.id, {
          email: user.email,
          username: profile?.username,
          display_name: profile?.display_name,
          is_premium: profile?.is_premium,
          plan: profile?.plan,
          primary_sport: profile?.primary_sport,
        });
        console.log('✅ [PostHog] User identified:', user.id);
      });
    } else if (!user && posthog) {
      // Reset user when they log out
      posthog.reset();
      console.log('✅ [PostHog] User reset');
    }
  }, [user?.id, posthog]);
}
