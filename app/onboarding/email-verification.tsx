// app/onboarding/email-verification.tsx
// Email Verification Screen - OTP code verification
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../providers/AuthProvider';
import { theme } from '../../constants/theme';
import { updateOnboardingStep } from '../../lib/api/onboarding';

const TOTAL_STEPS = 10; // Total number of onboarding steps
const CURRENT_STEP = 3; // This is step 3

export default function EmailVerificationScreen() {
  const insets = useSafeAreaInsets();
  const { user, signInWithOtp, verifyOtp } = useAuth();
  const params = useLocalSearchParams();
  const [email, setEmail] = useState<string>('');
  // Supabase OTP codes are 6 digits by default
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Get email from params
  useEffect(() => {
    const emailParam = params.email as string;
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [params]);

  // Auto-focus first input on mount
  useEffect(() => {
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
  }, []);

  // Monitor auth state - when user becomes authenticated, navigate to next screen
  useEffect(() => {
    if (user) {
      console.log('✅ [EmailVerification] User authenticated');
      // User is authenticated - navigate to account basics screen
      // Use push instead of replace to ensure proper navigation
      router.push('/onboarding/account-basics');
    }
  }, [user]);

  const handleCodeChange = (value: string, index: number) => {
    // Only allow digits
    const digit = value.replace(/[^0-9]/g, '');
    
    if (digit.length > 1) {
      // Handle paste - fill multiple inputs (6 digits)
      const digits = digit.substring(0, 6).split('');
      const newCode = [...code];
      digits.forEach((d, i) => {
        if (index + i < 6) {
          newCode[index + i] = d;
        }
      });
      setCode(newCode);
      
      // Focus next empty input or last input
      const nextIndex = Math.min(index + digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
      
      // Auto-submit when full 6-digit code is entered
      const fullCode = newCode.join('').substring(0, 6);
      if (fullCode.length === 6) {
        handleVerify(fullCode);
      }
    } else {
      // Single digit input
      const newCode = [...code];
      newCode[index] = digit;
      setCode(newCode);
      
      // Auto-advance to next input
      if (digit && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
      
      // Auto-submit when 6 digits are entered (Supabase default is 6 digits)
      if (digit && index === 5) {
        const fullCode = newCode.join('');
        if (fullCode.length === 6) {
          handleVerify(fullCode);
        }
      }
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    // Handle backspace - move to previous input
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (verificationCode?: string) => {
    const codeToVerify = verificationCode || code.join('');
    
    // Supabase OTP codes are 6 digits by default
    if (codeToVerify.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter a 6-digit code');
      return;
    }

    if (!email) {
      Alert.alert('Error', 'Email address not found. Please go back and enter your email again.');
      return;
    }

    setLoading(true);
    Keyboard.dismiss();

    try {
      const { data, error } = await verifyOtp(email, codeToVerify);
      
      if (error) {
        console.error('❌ [EmailVerification] Verification failed:', error);
        
        // Check for network errors
        const isNetworkError = error.message?.toLowerCase().includes('network') || 
                              error.message?.toLowerCase().includes('fetch') ||
                              error.message?.toLowerCase().includes('connection');
        
        // Check for invalid code errors
        const isInvalidCode = error.message?.toLowerCase().includes('invalid') ||
                             error.message?.toLowerCase().includes('expired') ||
                             error.message?.toLowerCase().includes('code');
        
        if (isNetworkError) {
          Alert.alert(
            'Connection Error',
            'Unable to verify code. Please check your internet connection and try again.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Retry', onPress: () => handleVerify() },
            ]
          );
        } else if (isInvalidCode) {
          Alert.alert(
            'Invalid Code',
            error.message || 'The code you entered is incorrect or has expired. Please try again.',
            [
              { text: 'OK', onPress: () => {
                setCode(['', '', '', '', '', '']);
                inputRefs.current[0]?.focus();
              }},
            ]
          );
        } else {
          Alert.alert('Verification Failed', error.message || 'Invalid code. Please try again.');
        }
        
        // Clear code on error
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        setLoading(false);
        return;
      } else if (data?.session) {
        // Success - user is now authenticated
        console.log('✅ [EmailVerification] Code verified successfully');
        
        // Save progress: mark email_entry and email_verification steps as completed
        // User is now authenticated, so we can save progress
        try {
          const { error: progressError } = await updateOnboardingStep('email_verification');
          if (progressError) {
            console.warn('⚠️ [EmailVerification] Failed to save progress:', progressError);
            // Don't block navigation on progress save failure, but log it
          } else {
            console.log('✅ [EmailVerification] Progress saved: email_entry and email_verification');
          }
        } catch (progressErr: any) {
          console.error('❌ [EmailVerification] Exception saving progress:', progressErr);
          // Don't block navigation on progress save failure
        }
        // Navigation is handled by useEffect when `user` state updates
      }
    } catch (error: any) {
      console.error('❌ [EmailVerification] Exception:', error);
      const isNetworkError = error.message?.toLowerCase().includes('network') || 
                            error.message?.toLowerCase().includes('fetch') ||
                            error.message?.toLowerCase().includes('connection');
      
      if (isNetworkError) {
        Alert.alert(
          'Connection Error',
          'Unable to verify code. Please check your internet connection and try again.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Retry', onPress: () => handleVerify() },
          ]
        );
      } else {
        Alert.alert('Error', error.message || 'Something went wrong. Please try again.');
      }
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      Alert.alert('Error', 'Email address not found. Please go back and enter your email again.');
      return;
    }

    setResending(true);
    try {
      const { error } = await signInWithOtp(email);
      if (error) {
        Alert.alert('Error', error.message || 'Failed to resend code');
      } else {
        Alert.alert('Success', 'Verification code sent!');
        // Clear code
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Something went wrong');
    } finally {
      setResending(false);
    }
  };

  const progressPercentage = (CURRENT_STEP / TOTAL_STEPS) * 100;

  return (
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
        {/* Hero Text */}
        <Text style={styles.heroText}>Check your email</Text>

        {/* Description Text */}
        <Text style={styles.descriptionText}>
          We sent a verification code to {email || 'your email'}. Enter it below to verify your account.
        </Text>

        {/* Code Input Fields - 6 digits for OTP */}
        <View style={styles.codeContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[
                styles.codeInput,
                digit && styles.codeInputFilled,
                loading && styles.codeInputDisabled,
              ]}
              value={digit}
              onChangeText={(value) => handleCodeChange(value, index)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              editable={!loading}
              autoFocus={index === 0}
            />
          ))}
        </View>

        {/* Resend Code Link */}
        <TouchableOpacity
          onPress={handleResendCode}
          disabled={resending || loading}
          style={styles.resendContainer}
        >
          <Text style={[styles.resendText, (resending || loading) && styles.resendTextDisabled]}>
            {resending ? 'Sending...' : 'Resend Code'}
          </Text>
        </TouchableOpacity>

        {/* Verify Button (optional - auto-submits on 6 digits) */}
        {code.join('').length === 6 && (
          <TouchableOpacity
            style={[styles.verifyButton, loading && styles.verifyButtonDisabled]}
            onPress={() => handleVerify()}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <Text style={styles.verifyButtonText}>Verifying...</Text>
            ) : (
              <Text style={styles.verifyButtonText}>Verify</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
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
  heroText: {
    fontSize: 28,
    fontWeight: '900',
    color: theme.colors.textHi,
    marginBottom: 16,
    letterSpacing: -0.5,
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
  descriptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textLo,
    lineHeight: 24,
    marginBottom: 40,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 12,
  },
  codeInput: {
    flex: 1,
    height: 64,
    backgroundColor: theme.colors.surface1,
    borderRadius: theme.radii.md,
    borderWidth: 2,
    borderColor: theme.colors.strokeSoft,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textHi,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 4,
      },
    }),
  },
  codeInputFilled: {
    borderColor: theme.colors.primary600,
    backgroundColor: theme.colors.surface1,
  },
  codeInputDisabled: {
    opacity: 0.5,
  },
  resendContainer: {
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  resendText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary600,
    textDecorationLine: 'underline',
  },
  resendTextDisabled: {
    opacity: 0.5,
  },
  verifyButton: {
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
  verifyButtonDisabled: {
    opacity: 0.5,
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
