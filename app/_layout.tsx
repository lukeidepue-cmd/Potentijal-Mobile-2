// app/_layout.tsx
import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, StyleSheet, Image, AppState, Platform } from 'react-native';
import {
  getTrackingPermissionsAsync,
  requestTrackingPermissionsAsync,
} from 'expo-tracking-transparency';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';

// these paths match what I see in your tree
import { AuthProvider, useAuth } from '../providers/AuthProvider';
import { ModeProvider } from '../providers/ModeContext';
import { ProfileRefreshProvider, useProfileRefresh } from '../providers/ProfileRefreshContext';
import { SettingsProvider } from '../providers/SettingsContext';
import { PostHogProvider } from '../providers/PostHogProvider';
import { usePostHogUserTracking } from '../lib/posthog/user-tracking';
import { usePostHog } from 'posthog-react-native';
import { setupDeepLinkListener } from '../lib/deep-links';
import { getOnboardingState } from '../lib/api/onboarding';
import { scheduleAllWorkoutNotifications, scheduleConsistencyScoreNotification } from '../lib/notifications/notifications';
import Constants from 'expo-constants';

// Keep splash screen visible while we check auth/onboarding status
if (SplashScreen.preventAutoHideAsync) {
  SplashScreen.preventAutoHideAsync();
}

/**
 * Inner component that handles routing based on auth/onboarding status
 * Must be inside AuthProvider to access auth context
 */
function RootLayoutNav() {
  const { user, loading: authLoading, needsOnboarding, onboardingLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [resumeStep, setResumeStep] = React.useState<string | null>(null);

  // Steps 18–19: RevenueCat — configure at launch (extra or .env so dev builds work).
  useEffect(() => {
    const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
    const apiKey = (extra?.revenueCatPublicApiKey ?? process.env.EXPO_PUBLIC_REVENUECAT_API_KEY) as string | undefined;
    if (!apiKey?.trim()) return;
    try {
      const Purchases = require('react-native-purchases').default;
      Purchases.configure({ apiKey, appUserID: user?.id ?? 'anonymous' });
    } catch (_e) {}
  }, []);

  useEffect(() => {
    const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
    const apiKey = (extra?.revenueCatPublicApiKey ?? process.env.EXPO_PUBLIC_REVENUECAT_API_KEY) as string | undefined;
    if (!apiKey?.trim()) return;
    try {
      const Purchases = require('react-native-purchases').default;
      if (user?.id) Purchases.logIn(user.id);
      else Purchases.logOut();
    } catch (_e) {}
  }, [user?.id]);

  // Refetch profile when app comes to foreground so we pick up webhook updates
  // (e.g. purchase completed and webhook set premium; user didn't go through in-app success flow)
  const profileRefresh = useProfileRefresh();
  useEffect(() => {
    if (!profileRefresh?.refreshProfile) return;
    let lastRefetch = 0;
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const now = Date.now();
      if (now - lastRefetch < 15000) return; // throttle: at most once per 15s
      lastRefetch = now;
      profileRefresh.refreshProfile();
    });
    return () => sub.remove();
  }, [profileRefresh]);

  // App Tracking Transparency (ATT) – request on iOS before PostHog is used for tracking
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const run = async () => {
      try {
        const { status } = await getTrackingPermissionsAsync();
        if (status === 'undetermined') {
          await requestTrackingPermissionsAsync();
        }
      } catch (_) {
        // Ignore; app works without ATT
      }
    };
    const t = setTimeout(run, 1500);
    return () => clearTimeout(t);
  }, []);

  // Track user in PostHog when they log in/out
  usePostHogUserTracking();

  // Get PostHog instance for manual tracking
  const posthog = usePostHog();

  // Track screen views manually (PostHog's automatic tracking may not work with Expo Router)
  useEffect(() => {
    if (posthog && segments.length > 0) {
      const screenName = segments.join('/') || 'root';
      posthog.screen(screenName);
    }
  }, [segments, posthog]);

  useEffect(() => {
    if (posthog && user) {
      const timer = setTimeout(() => {
        posthog.capture('app_opened', {
          timestamp: new Date().toISOString(),
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [posthog, user?.id]);

  // Animation for spinning star loading
  const starRotation = useSharedValue(0);
  
  useEffect(() => {
    const isLoading = authLoading || onboardingLoading || (!user && segments[0] !== 'onboarding');
    if (isLoading) {
      starRotation.value = withRepeat(
        withTiming(360, {
          duration: 800,
          easing: Easing.linear,
        }),
        -1,
        false
      );
    } else {
      starRotation.value = 0;
    }
  }, [authLoading, onboardingLoading, user, segments]);

  const starAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${starRotation.value}deg` }],
  }));

  useEffect(() => {
    // Set up deep link listener for email verification and OAuth callbacks
    const subscription = setupDeepLinkListener();
    
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    // Wait for auth and onboarding status to load
    if (authLoading || onboardingLoading) {
      return;
    }

    // Hide splash screen once we know the auth state
    if (SplashScreen.hideAsync) {
      SplashScreen.hideAsync();
    }

    const inOnboardingGroup = segments[0] === 'onboarding';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!user) {
      if (!inOnboardingGroup) {
        router.replace('/onboarding/welcome');
      }
    } else if (needsOnboarding === true) {
      // Authenticated but needs onboarding - resume from last step
      if (!inOnboardingGroup) {
        getOnboardingState().then(({ data, error }) => {
          if (error) {
            router.replace('/onboarding/account-basics');
            return;
          }

          const currentStep = data?.current_step;

          let targetRoute = '/onboarding/account-basics';

          if (currentStep) {
            const stepToRoute: Record<string, string> = {
              'email_entry': '/onboarding/email-entry',
              'email_verification': '/onboarding/email-verification',
              'account_basics': '/onboarding/account-basics',
              'sport_selection': '/onboarding/sport-selection',
              'training_intent': '/onboarding/training-intent',
              'app_intro': '/onboarding/app-intro',
              'notifications': '/onboarding/notifications',
              'premium_offer': '/onboarding/premium-offer',
              'completion': '/onboarding/completion',
            };

            if (user && (currentStep === 'email_entry' || currentStep === 'email_verification')) {
              targetRoute = '/onboarding/account-basics';
            } else {
              targetRoute = stepToRoute[currentStep] || '/onboarding/account-basics';
            }
          }

          router.replace(targetRoute as any);
        });
      }
    } else if (needsOnboarding === false) {
      if (!inTabsGroup) {
        router.replace('/(tabs)' as import('expo-router').Href);
      }
      scheduleAllWorkoutNotifications().catch(() => {});
      scheduleConsistencyScoreNotification().catch(() => {});
    } else {
      if (user && !inTabsGroup && !inOnboardingGroup) {
        router.replace('/(tabs)' as import('expo-router').Href);
      }
    }
  }, [user, authLoading, needsOnboarding, onboardingLoading, segments]);

  // Show loading screen while checking auth/onboarding status
  // This prevents showing the wrong screen (like home) before auth state is determined
  if (authLoading || onboardingLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Animated.View style={starAnimatedStyle}>
          <Image
            source={require('../assets/star.png')}
            style={styles.loadingStar}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    );
  }

  // If no user and we're not in onboarding, show loading to prevent flash of home screen
  // This ensures we don't show home screen before routing to welcome
  if (!user && segments[0] !== 'onboarding') {
    return (
      <View style={styles.loadingContainer}>
        <Animated.View style={starAnimatedStyle}>
          <Image
            source={require('../assets/star.png')}
            style={styles.loadingStar}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    );
  }

  // Always define both screens - expo-router needs all routes defined
  // The routing logic above will navigate to the correct one
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  // Get PostHog API key from environment variables
  const posthogApiKey = Constants.expoConfig?.extra?.posthogApiKey || 
                        process.env.EXPO_PUBLIC_POSTHOG_API_KEY || 
                        '';
  const posthogHost = Constants.expoConfig?.extra?.posthogHost || 
                      process.env.EXPO_PUBLIC_POSTHOG_HOST || 
                      'https://us.i.posthog.com';

  // Wrap with GestureHandlerRootView for swipe gestures
  const appContent = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <SettingsProvider>
          <ProfileRefreshProvider>
            <ModeProvider>
              <RootLayoutNav />
            </ModeProvider>
          </ProfileRefreshProvider>
        </SettingsProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );

  if (!posthogApiKey) {
    return appContent;
  }

  return (
    <PostHogProvider apiKey={posthogApiKey} host={posthogHost}>
      {appContent}
    </PostHogProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0b0b0c',
  },
  loadingStar: {
    width: 150,
    height: 150,
  },
});





