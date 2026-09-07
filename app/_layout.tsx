// app/_layout.tsx
import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, StyleSheet, Image, ImageBackground, AppState, Platform } from 'react-native';
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
import { FeaturesProvider } from '../providers/FeaturesContext';
import { SettingsProvider } from '../providers/SettingsContext';
import { PostHogProvider } from '../providers/PostHogProvider';
import { OnboardingDataProvider } from '../providers/OnboardingDataContext';
import { TutorialProvider } from '../providers/TutorialContext';
import { usePostHogUserTracking } from '../lib/posthog/user-tracking';
import { usePostHog } from 'posthog-react-native';
import { setupDeepLinkListener } from '../lib/deep-links';
import { scheduleAllWorkoutNotifications, scheduleConsistencyScoreNotification } from '../lib/notifications/notifications';
import { isExpoGo } from '../lib/expo-env';
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
  // Steps 18–19: RevenueCat — configure at launch (extra or .env so dev builds work).
  // Skipped in Expo Go: the native module isn't bundled, so any Purchases.* call throws.
  useEffect(() => {
    if (isExpoGo()) return;
    const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
    const apiKey = (extra?.revenueCatPublicApiKey ?? process.env.EXPO_PUBLIC_REVENUECAT_API_KEY) as string | undefined;
    if (!apiKey?.trim()) return;
    try {
      const Purchases = require('react-native-purchases').default;
      Purchases.configure({ apiKey, appUserID: user?.id ?? 'anonymous' });
    } catch (_e) {}
  }, []);

  useEffect(() => {
    if (isExpoGo()) return;
    const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
    const apiKey = (extra?.revenueCatPublicApiKey ?? process.env.EXPO_PUBLIC_REVENUECAT_API_KEY) as string | undefined;
    if (!apiKey?.trim()) return;
    try {
      const Purchases = require('react-native-purchases').default;
      // .catch on the returned promise: without it a rejection bubbles up as
      // "Uncaught (in promise)" even though we're wrapped in try/catch.
      if (user?.id) Purchases.logIn(user.id).catch(() => {});
      else Purchases.logOut().catch(() => {});
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

  // Animation for spinning star loading (same speed on both loading screens)
  const starRotation = useSharedValue(0);
  const STAR_SPIN_DURATION_MS = 400;

  useEffect(() => {
    const isLoading = authLoading || onboardingLoading || (!user && segments[0] !== 'onboarding');
    if (isLoading) {
      starRotation.value = withRepeat(
        withTiming(360, {
          duration: STAR_SPIN_DURATION_MS,
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

  // The post-onboarding tutorial is armed exactly once, the moment onboarding
  // completes (see app/onboarding/name-entry.tsx, which sets the 'build_preset'
  // step before routing into the tabs). We deliberately do NOT re-arm it on
  // subsequent logins or app launches — a returning, already-onboarded user
  // should never see the tutorial again.

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
        router.replace('/onboarding/identity');
      }
    } else if (needsOnboarding === true) {
      // Authenticated but needs onboarding — only post-auth step is name-entry
      if (!inOnboardingGroup) {
        router.replace('/onboarding/name-entry' as any);
      } else if (segments[1] === 'email-verification') {
        // User just verified OTP; navigate to name-entry from root to avoid "PUSH not handled" / brief tabs flash
        router.replace('/onboarding/name-entry' as any);
      }
    } else if (needsOnboarding === false) {
      if (!inTabsGroup) {
        router.replace('/(tabs)' as import('expo-router').Href);
      }
      scheduleAllWorkoutNotifications().catch(() => {});
      scheduleConsistencyScoreNotification().catch(() => {});
    }
    // When needsOnboarding is null (unknown), do NOT navigate to tabs — prevents brief home-tab flash
    // while onboarding status is being fetched after OTP verification.
  }, [user, authLoading, needsOnboarding, onboardingLoading, segments]);

  // Shared loading screen UI: background image fills screen + centered spinning star (same size/position/speed on both)
  const LoadingScreen = () => (
    <View style={styles.loadingScreenWrapper}>
      <ImageBackground
        source={require('../assets/images/loading-background.png')}
        style={styles.loadingBackground}
        resizeMode="cover"
      >
        <Animated.View style={starAnimatedStyle}>
          <Image
            source={require('../assets/star.png')}
            style={styles.loadingStar}
            resizeMode="contain"
          />
        </Animated.View>
      </ImageBackground>
    </View>
  );

  // Show loading screen while checking auth/onboarding status
  if (authLoading || onboardingLoading) {
    return <LoadingScreen />;
  }

  // If no user and we're not in onboarding, show loading (same screen, star spins) before routing to welcome
  if (!user && segments[0] !== 'onboarding') {
    return <LoadingScreen />;
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
      <OnboardingDataProvider>
        <AuthProvider>
          <SettingsProvider>
            <ProfileRefreshProvider>
              <FeaturesProvider>
                <ModeProvider>
                  <TutorialProvider>
                    <RootLayoutNav />
                  </TutorialProvider>
                </ModeProvider>
              </FeaturesProvider>
            </ProfileRefreshProvider>
          </SettingsProvider>
        </AuthProvider>
      </OnboardingDataProvider>
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
  loadingScreenWrapper: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0B1513',
  },
  loadingBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B1513',
  },
  loadingStar: {
    width: 220,
    height: 220,
  },
});





