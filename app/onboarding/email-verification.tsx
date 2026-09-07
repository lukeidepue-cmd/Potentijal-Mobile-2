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
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../providers/AuthProvider';
import { theme } from '../../constants/theme';
import { updateOnboardingStep, updateProfileFromOnboarding } from '../../lib/api/onboarding';
import { saveCompleteWorkout } from '../../lib/api/workouts';
import { useOnboardingData } from '../../providers/OnboardingDataContext';

const TOTAL_STEPS = 5;
const CURRENT_STEP = 4;

export default function EmailVerificationScreen() {
  const insets = useSafeAreaInsets();
  const { user, signInWithOtp, verifyOtp } = useAuth();
  const { data: onboardingData, clearOnboardingData } = useOnboardingData();
  const params = useLocalSearchParams();
  const [email, setEmail] = useState<string>('');
  // Supabase OTP codes are 6 digits by default
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const oneTimeCodeInputRef = useRef<TextInput>(null);

  // Get email from params
  useEffect(() => {
    const emailParam = params.email as string;
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [params]);

  // No auto-focus: user taps a line to focus and bring up the keyboard

  const isCodeComplete = code.join('').length === 6;

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
      // No auto-submit: user taps Continue to verify
    } else {
      // Single digit input
      const newCode = [...code];
      newCode[index] = digit;
      setCode(newCode);
      // Auto-advance to next input
      if (digit && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
      // No auto-submit: user taps Continue to verify
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    // Handle backspace - move to previous input
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // When keyboard/OS suggests the OTP (e.g. "From Gmail: 123456"), it often fills
  // an input with textContentType="oneTimeCode". This hidden input captures that.
  const handleOneTimeCode = (value: string) => {
    const digits = value.replace(/[^0-9]/g, '').substring(0, 6).split('');
    if (digits.length === 0) return;
    const newCode = [...code];
    digits.forEach((d, i) => {
      if (i < 6) newCode[i] = d;
    });
    setCode(newCode);
    // User taps Continue to verify (no auto-submit)
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
        // Sync pre-auth onboarding data to Supabase now that user is authenticated
        try {
          if (onboardingData.selectedSports.length > 0) {
            await updateProfileFromOnboarding({
              sports: onboardingData.selectedSports,
              primary_sport: onboardingData.primarySport || onboardingData.selectedSports[0],
            });
          }

          if (onboardingData.firstExercise) {
            const ex = onboardingData.firstExercise;
            await saveCompleteWorkout({
              mode: ex.mode,
              name: 'First Session',
              items: [{
                kind: ex.kind,
                name: ex.name,
                sets: [{ [ex.field1]: String(ex.value1), [ex.field2]: String(ex.value2) }],
              }],
            });
          }

          await clearOnboardingData();
        } catch {
          // Don't block navigation on sync failure
        }

        try {
          await updateOnboardingStep('email_verification');
        } catch {
          // Don't block navigation on progress save failure
        }
        // Navigation is handled by useEffect when `user` state updates
      }
    } catch (error: any) {
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
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>
          We sent a verification code to {email || 'your email'}. Enter it below to verify your account.
        </Text>

        {/* Hidden input to receive OTP from keyboard/OS suggestion (oneTimeCode) */}
        <TextInput
          ref={oneTimeCodeInputRef}
          style={styles.oneTimeCodeInput}
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          keyboardType="number-pad"
          onChangeText={handleOneTimeCode}
          maxLength={6}
          editable={!loading}
        />

        {/* Code Input - 6 horizontal white lines, one per digit */}
        <View style={styles.codeContainer}>
          {code.map((digit, index) => (
            <View key={index} style={styles.codeInputCell}>
              <TextInput
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={[
                  styles.codeInput,
                  loading && styles.codeInputDisabled,
                ]}
                value={digit}
                onChangeText={(value) => handleCodeChange(value, index)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                keyboardType="number-pad"
                maxLength={index === 0 ? 6 : 1}
                textContentType={index === 0 ? 'oneTimeCode' : undefined}
                autoComplete={index === 0 ? 'one-time-code' : undefined}
                selectTextOnFocus
                editable={!loading}
              />
              <View style={[styles.codeInputLine, digit && styles.codeInputLineFilled]} />
            </View>
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
      </View>

      {/* Continue button - same style as other Next buttons, enabled only when 6 digits entered */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20, zIndex: 10 }]}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            isCodeComplete && !loading && styles.continueButtonEnabled,
            (!isCodeComplete || loading) && styles.continueButtonDisabled,
          ]}
          onPress={() => handleVerify()}
          disabled={!isCodeComplete || loading}
          activeOpacity={0.85}
        >
          {(!isCodeComplete || loading) && (
            <>
              <BlurView intensity={Platform.OS === 'ios' ? 32 : 24} tint="dark" style={StyleSheet.absoluteFill} />
              <LinearGradient
                colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.06)']}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
            </>
          )}
          <Text
            style={[
              styles.continueButtonText,
              (!isCodeComplete || loading) && styles.continueButtonTextDisabled,
            ]}
          >
            {loading ? 'Verifying...' : 'Continue'}
          </Text>
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
    ...StyleSheet.absoluteFill,
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
    paddingBottom: 100,
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
    fontSize: 14,
    fontWeight: '500',
    fontStyle: 'italic',
    color: theme.colors.textLo,
    lineHeight: 20,
    marginBottom: 40,
  },
  oneTimeCodeInput: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 1,
    height: 1,
    opacity: 0,
    zIndex: 1,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 8,
  },
  codeInputCell: {
    flex: 1,
    alignItems: 'center',
  },
  codeInput: {
    width: '100%',
    height: 44,
    backgroundColor: 'transparent',
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textHi,
    paddingVertical: 0,
    paddingHorizontal: 4,
  },
  codeInputLine: {
    width: '100%',
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginTop: 4,
  },
  codeInputLineFilled: {
    backgroundColor: 'rgba(255,255,255,0.9)',
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
  },
  resendTextDisabled: {
    opacity: 0.5,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  continueButton: {
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
  continueButtonEnabled: {
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: { shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  continueButtonDisabled: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  continueButtonText: {
    color: '#1C1C1E',
    fontSize: 17,
    fontWeight: '700',
  },
  continueButtonTextDisabled: {
    color: 'rgba(255,255,255,0.6)',
  },
});
