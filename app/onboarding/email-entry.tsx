// app/onboarding/email-entry.tsx
// Email Entry Screen - Collect email for email-based signup
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../providers/AuthProvider';
import { theme } from '../../constants/theme';

const TOTAL_STEPS = 10; // Total number of onboarding steps
const CURRENT_STEP = 2; // This is step 2

export default function EmailEntryScreen() {
  const insets = useSafeAreaInsets();
  const { signInWithOtp } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Bouncing dots animation for loading
  const dot1Opacity = useSharedValue(1);
  const dot2Opacity = useSharedValue(1);
  const dot3Opacity = useSharedValue(1);

  React.useEffect(() => {
    if (loading) {
      // Animate dots in sequence - each dot bounces with a delay
      const bounceAnimation = (delay: number) => {
        return withRepeat(
          withSequence(
            withTiming(1, { duration: 0, easing: Easing.ease }), // Start at full opacity
            withTiming(0.3, { duration: 300, easing: Easing.ease }), // Fade down
            withTiming(1, { duration: 300, easing: Easing.ease }) // Bounce back up
          ),
          -1,
          false
        );
      };

      // Start animations with delays for sequential bounce effect
      dot1Opacity.value = withDelay(0, bounceAnimation(0));
      dot2Opacity.value = withDelay(200, bounceAnimation(200));
      dot3Opacity.value = withDelay(400, bounceAnimation(400));
    } else {
      dot1Opacity.value = withTiming(1, { duration: 200 });
      dot2Opacity.value = withTiming(1, { duration: 200 });
      dot3Opacity.value = withTiming(1, { duration: 200 });
    }
  }, [loading]);

  const dot1Style = useAnimatedStyle(() => ({
    opacity: dot1Opacity.value,
  }));

  const dot2Style = useAnimatedStyle(() => ({
    opacity: dot2Opacity.value,
  }));

  const dot3Style = useAnimatedStyle(() => ({
    opacity: dot3Opacity.value,
  }));

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleNext = async () => {
    // Validate email
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!validateEmail(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Send OTP code to email
      const { error: otpError } = await signInWithOtp(email.trim());
      
      if (otpError) {
        console.error('❌ [EmailEntry] Failed to send OTP:', otpError);
        
        // Check for network errors
        const isNetworkError = otpError.message?.toLowerCase().includes('network') || 
                              otpError.message?.toLowerCase().includes('fetch') ||
                              otpError.message?.toLowerCase().includes('connection');
        
        if (isNetworkError) {
          Alert.alert(
            'Connection Error',
            'Unable to connect to the server. Please check your internet connection and try again.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Retry', onPress: () => handleNext() },
            ]
          );
        } else {
          // User-friendly error message
          const errorMessage = otpError.message || 'Failed to send verification code. Please try again.';
          Alert.alert('Error', errorMessage);
        }
        setLoading(false);
        return;
      }

      // Note: We don't save progress here because user isn't authenticated yet
      // Progress will be saved after email verification when user is authenticated

      // Navigate to email verification screen with email
      router.push({
        pathname: '/onboarding/email-verification',
        params: { email: email.trim() },
      });
      setLoading(false);
    } catch (error: any) {
      console.error('❌ [EmailEntry] Exception:', error);
      const isNetworkError = error.message?.toLowerCase().includes('network') || 
                            error.message?.toLowerCase().includes('fetch') ||
                            error.message?.toLowerCase().includes('connection');
      
      if (isNetworkError) {
        Alert.alert(
          'Connection Error',
          'Unable to connect to the server. Please check your internet connection and try again.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Retry', onPress: () => handleNext() },
          ]
        );
      } else {
        Alert.alert('Error', error.message || 'Something went wrong. Please try again.');
      }
      setLoading(false);
    }
  };

  const progressPercentage = (CURRENT_STEP / TOTAL_STEPS) * 100;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Layer A: Base gradient - EXACT same as workout tab */}
      <LinearGradient
        colors={['#0B1513', '#0F2A22', '#0F3B2E', '#070B0A']}
        locations={[0, 0.3, 0.6, 1]}
        style={styles.baseGradient}
      />
      
      {/* Layer B: Vignette overlay - EXACT same as workout tab */}
      <LinearGradient
        colors={['rgba(0,0,0,0.4)', 'transparent', 'transparent', 'rgba(0,0,0,0.5)']}
        locations={[0, 0.15, 0.85, 1]}
        style={styles.vignetteGradient}
        pointerEvents="none"
      />
      
      {/* Layer C: Subtle grain - EXACT same as workout tab */}
      <View style={styles.grainOverlay} pointerEvents="none" />

      {/* Header with Back Button and Progress Bar */}
      <View style={[styles.header, { zIndex: 10 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.textHi} />
        </TouchableOpacity>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} />
          </View>
          <Text style={styles.progressText}>{CURRENT_STEP}/{TOTAL_STEPS}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={[styles.content, { zIndex: 10 }]}>
        {/* Heading */}
        <Text style={styles.heading}>
          Get started with <Text style={styles.headingAccent}>Potential</Text>
        </Text>
        
        {/* Log in text */}
        <Text style={styles.loginText}>or Log in</Text>

        {/* Email Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Email address</Text>
          <TextInput
            style={[styles.input, error && styles.inputError]}
            placeholder="Enter your email"
            placeholderTextColor={theme.colors.textLo}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setError('');
            }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            editable={!loading}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      </View>

      {/* Next Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20, zIndex: 10 }]}>
        <TouchableOpacity
          style={[styles.nextButton, loading && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <Animated.View style={[styles.bouncingDot, dot1Style]} />
              <Animated.View style={[styles.bouncingDot, dot2Style]} />
              <Animated.View style={[styles.bouncingDot, dot3Style]} />
            </View>
          ) : (
            <Text style={styles.nextButtonText}>Next</Text>
          )}
        </TouchableOpacity>
      </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg0,
    position: 'relative',
  },
  baseGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  vignetteGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  grainOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.02)',
    opacity: 0.06,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backButton: {
    marginBottom: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBarBackground: {
    flex: 1,
    height: 4,
    backgroundColor: theme.colors.strokeSoft,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary600,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textLo,
    minWidth: 30,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  heading: {
    fontSize: 22,
    fontWeight: '900',
    color: theme.colors.textHi,
    marginBottom: 32,
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.5,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 8,
      },
    }),
  },
  headingAccent: {
    color: theme.colors.primary600,
  },
  loginText: {
    fontSize: 14,
    fontWeight: '400',
    color: theme.colors.textLo,
    marginTop: -24,
    marginBottom: 32,
    letterSpacing: 0.2,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textLo,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: theme.colors.surface1,
    borderWidth: 1,
    borderColor: theme.colors.strokeSoft,
    borderRadius: theme.radii.md,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: theme.colors.textHi,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      },
      android: {
        elevation: 2,
      },
    }),
  },
  inputError: {
    borderColor: theme.colors.danger,
  },
  errorText: {
    fontSize: 12,
    color: theme.colors.danger,
    marginTop: 8,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  nextButton: {
    backgroundColor: theme.colors.primary600,
    borderRadius: theme.radii.pill,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary600,
        shadowOpacity: 0.4,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
      },
      android: {
        elevation: 8,
      },
    }),
  },
  nextButtonDisabled: {
    opacity: 0.7,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  bouncingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
});
