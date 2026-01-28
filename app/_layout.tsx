// app/_layout.tsx
import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, StyleSheet, Image } from 'react-native';
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

  // Track user in PostHog when they log in/out
  usePostHogUserTracking();

  // Get PostHog instance for manual tracking
  const posthog = usePostHog();

  // Track screen views manually (PostHog's automatic tracking may not work with Expo Router)
  useEffect(() => {
    if (posthog && segments.length > 0) {
      const screenName = segments.join('/') || 'root';
      posthog.screen(screenName);
      console.log('📊 [PostHog] Screen viewed:', screenName);
    }
  }, [segments, posthog]);

  // Send a test event when app loads (to verify PostHog is working)
  useEffect(() => {
    if (posthog && user) {
      // Small delay to ensure PostHog is fully initialized
      const timer = setTimeout(() => {
        posthog.capture('app_opened', {
          timestamp: new Date().toISOString(),
        });
        console.log('📊 [PostHog] Test event sent: app_opened');
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

    // Debug logging (only log when routing actually happens)
    const shouldRoute = 
      (!user && !inOnboardingGroup) ||
      (user && needsOnboarding === true && !inOnboardingGroup) ||
      (user && needsOnboarding === false && !inTabsGroup) ||
      (user && needsOnboarding === null && !inTabsGroup && !inOnboardingGroup);

    if (shouldRoute) {
      console.log('🔵 [RootLayout] Routing check:', {
        user: user?.id,
        needsOnboarding,
        segments: segments[0],
        inOnboardingGroup,
        inTabsGroup,
      });
    }

    if (!user) {
      // Not authenticated - show onboarding welcome screen
      if (!inOnboardingGroup) {
        console.log('🔵 [RootLayout] No user - routing to welcome');
        router.replace('/onboarding/welcome');
      }
    } else if (needsOnboarding === true) {
      // Authenticated but needs onboarding - resume from last step
      if (!inOnboardingGroup) {
        // Get onboarding state to determine which screen to show
        getOnboardingState().then(({ data, error }) => {
          if (error) {
            console.warn('⚠️ [RootLayout] Failed to get onboarding state, defaulting to account-basics:', error);
            router.replace('/onboarding/account-basics');
            return;
          }

          const currentStep = data?.current_step;
          console.log('🔵 [RootLayout] User needs onboarding, current_step:', currentStep);

          // Route to appropriate screen based on current_step
          // If user is authenticated, skip email_entry and email_verification (they've already verified)
          // If no current_step or it's 'welcome', start at account-basics
          let targetRoute = '/onboarding/account-basics'; // Default starting point

          if (currentStep) {
            // Map current_step to route
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

            // If user is authenticated, skip email screens (they've already verified)
            if (user && (currentStep === 'email_entry' || currentStep === 'email_verification')) {
              console.log('🔵 [RootLayout] User is authenticated, skipping email screens');
              targetRoute = '/onboarding/account-basics';
            } else {
              targetRoute = stepToRoute[currentStep] || '/onboarding/account-basics';
            }
          }

          console.log('🔵 [RootLayout] Resuming onboarding at:', targetRoute);
          router.replace(targetRoute as any);
        });
      }
    } else if (needsOnboarding === false) {
      // Authenticated and onboarding complete - show main app
      if (!inTabsGroup) {
        console.log('🔵 [RootLayout] Onboarding complete - routing to tabs');
        router.replace('/(tabs)');
      }
      
      // Schedule notifications when user is authenticated and onboarding is complete
      scheduleAllWorkoutNotifications().catch((error) => {
        console.error('❌ [RootLayout] Error scheduling workout notifications:', error);
      });
      
      // Schedule consistency score notification (only for premium/pro users)
      scheduleConsistencyScoreNotification().catch((error) => {
        console.error('❌ [RootLayout] Error scheduling consistency score notification:', error);
      });
    } else {
      // needsOnboarding is null - still loading or error
      // Default to main app if user exists (safer default)
      if (user && !inTabsGroup && !inOnboardingGroup) {
        console.log('🔵 [RootLayout] Onboarding status unknown, defaulting to tabs');
        router.replace('/(tabs)');
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
          <ModeProvider>
            <RootLayoutNav />
          </ModeProvider>
        </SettingsProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );

  if (!posthogApiKey) {
    console.warn('⚠️ [PostHog] API key not found. PostHog analytics will not be initialized.');
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





