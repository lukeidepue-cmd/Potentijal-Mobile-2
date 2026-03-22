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
import { BlurView } from 'expo-blur';
import { useAuth } from '../../providers/AuthProvider';
import { theme } from '../../constants/theme';

const TOTAL_STEPS = 7;
const CURRENT_STEP = 5;

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
      {/* Same background as previous onboarding screens */}
      <View style={styles.background} />

      {/* Header - same as previous screens */}
      <View style={[styles.header, { zIndex: 10 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.textHi} />
        </TouchableOpacity>
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} />
          </View>
          <Text style={styles.progressText}>{CURRENT_STEP}/{TOTAL_STEPS}</Text>
        </View>
      </View>

      {/* Content - same heading style as previous screens */}
      <View style={[styles.content, { zIndex: 10 }]}>
        <Text style={styles.title}>Unlock your full Potentijal</Text>
        <Text style={styles.subtitle}>Create an account to start your training journey</Text>

        {/* Email input - liquid glass */}
        <View style={styles.inputContainer}>
          <View style={[styles.inputGlass, error && styles.inputGlassError]}>
            <BlurView
              intensity={Platform.OS === 'ios' ? 36 : 28}
              tint="dark"
              style={styles.inputGlassBlur}
            />
            <LinearGradient
              colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.08)']}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <TextInput
              style={styles.input}
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
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      </View>

      {/* Next button - same style as sport-selection / first-win */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20, zIndex: 10 }]}>
        <TouchableOpacity
          style={[
            styles.nextButton,
            !loading && styles.nextButtonEnabled,
            loading && styles.nextButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading && (
            <>
              <BlurView intensity={Platform.OS === 'ios' ? 32 : 24} tint="dark" style={StyleSheet.absoluteFill} />
              <LinearGradient
                colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.06)']}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
            </>
          )}
          {loading ? (
            <View style={styles.loadingContainer}>
              <Animated.View style={[styles.bouncingDot, dot1Style]} />
              <Animated.View style={[styles.bouncingDot, dot2Style]} />
              <Animated.View style={[styles.bouncingDot, dot3Style]} />
            </View>
          ) : (
            <Text style={styles.nextButtonText}>Continue</Text>
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
    position: 'relative',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1C1C1E',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginLeft: 20,
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
    paddingTop: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 32,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textLo,
    lineHeight: 24,
    marginBottom: 28,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputGlass: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    position: 'relative',
    minHeight: 52,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  inputGlassError: {
    borderColor: theme.colors.danger,
  },
  inputGlassBlur: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
  input: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: theme.colors.textHi,
    zIndex: 1,
  },
  errorText: {
    fontSize: 12,
    color: theme.colors.danger,
    marginTop: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  nextButton: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
    }),
  },
  nextButtonEnabled: {
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: { shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  nextButtonDisabled: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  nextButtonText: {
    color: '#1C1C1E',
    fontSize: 17,
    fontWeight: '700',
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
