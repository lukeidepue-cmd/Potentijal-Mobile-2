// app/onboarding/account-basics.tsx
// Account Basics Screen - Name and Age
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../providers/AuthProvider';
import { theme } from '../../constants/theme';
import { updateProfileFromOnboarding, updateOnboardingStep } from '../../lib/api/onboarding';

const TOTAL_STEPS = 10; // Total number of onboarding steps
const CURRENT_STEP = 4; // This is step 4

export default function AccountBasicsScreen() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');

  const progressPercentage = (CURRENT_STEP / TOTAL_STEPS) * 100;

  // Check if both fields are filled
  const isFormValid = name.trim().length > 0 && age.trim().length > 0;
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    if (!isFormValid) return;

    setLoading(true);
    try {
      // Parse birth year directly from input
      const birthYear = parseInt(age.trim(), 10);
      
      // Validate birth year
      const currentYear = new Date().getFullYear();
      if (isNaN(birthYear) || birthYear < 1900 || birthYear > currentYear) {
        Alert.alert('Invalid Birth Year', `Please enter a valid birth year between 1900 and ${currentYear}.`);
        setLoading(false);
        return;
      }

      // Save name and birth year to profile
      const { error: profileError } = await updateProfileFromOnboarding({
        display_name: name.trim(),
        birth_year: birthYear,
      });

      if (profileError) {
        console.error('❌ [AccountBasics] Failed to save profile:', profileError);
        const isNetworkError = profileError.message?.toLowerCase().includes('network') || 
                              profileError.message?.toLowerCase().includes('fetch') ||
                              profileError.message?.toLowerCase().includes('connection');
        
        if (isNetworkError) {
          Alert.alert(
            'Connection Error',
            'Unable to save your information. Please check your internet connection and try again.',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => setLoading(false) },
              { text: 'Retry', onPress: () => handleNext() },
            ]
          );
          return;
        } else {
          Alert.alert('Error', profileError.message || 'Failed to save your information. Please try again.');
          setLoading(false);
          return;
        }
      } else {
        console.log('✅ [AccountBasics] Profile saved successfully');
      }

      // Save progress: mark account_basics step as completed
      const { error: progressError } = await updateOnboardingStep('account_basics');
      if (progressError) {
        console.warn('⚠️ [AccountBasics] Failed to save progress:', progressError);
        // Don't block navigation on progress save failure, but log it
      } else {
        console.log('✅ [AccountBasics] Progress saved: account_basics');
      }

      // Navigate to next screen
      router.push('/onboarding/sport-selection');
    } catch (error: any) {
      console.error('❌ [AccountBasics] Exception:', error);
      const isNetworkError = error.message?.toLowerCase().includes('network') || 
                            error.message?.toLowerCase().includes('fetch') ||
                            error.message?.toLowerCase().includes('connection');
      
      if (isNetworkError) {
        Alert.alert(
          'Connection Error',
          'Unable to save your information. Please check your internet connection and try again.',
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

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Layer A: Base gradient - Blue version */}
      <LinearGradient
        colors={['#0B0F1A', '#0F1A2E', '#0F2A4A', '#070B10']}
        locations={[0, 0.3, 0.6, 1]}
        style={styles.backgroundGradient}
      />

      {/* Layer B: Vignette overlay - EXACT same as workout tab */}
      <LinearGradient
        colors={['rgba(0,0,0,0.4)', 'transparent', 'transparent', 'rgba(0,0,0,0.5)']}
        locations={[0, 0.15, 0.85, 1]}
        style={styles.vignetteOverlay}
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
      <View style={[styles.content, { paddingBottom: insets.bottom, zIndex: 10 }]}>
        {/* Heading */}
        <Text style={styles.heading}>
          Account Info
        </Text>

        {/* Description Text */}
        <Text style={styles.descriptionText}>
          Tell us a little bit about yourself
        </Text>

        {/* Name Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Name"
            placeholderTextColor={theme.colors.textLo}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoCorrect={false}
            textContentType="name"
          />
        </View>

        {/* Birth Year Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Birth Year"
            placeholderTextColor={theme.colors.textLo}
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
            textContentType="none"
            maxLength={4}
          />
        </View>
      </View>

      {/* Next Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20, zIndex: 10 }]}>
        <TouchableOpacity
          style={[
            styles.nextButton,
            !isFormValid && styles.nextButtonDisabled,
            isFormValid && styles.nextButtonEnabled,
          ]}
          onPress={handleNext}
          disabled={!isFormValid}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.nextButtonText,
            !isFormValid && styles.nextButtonTextDisabled,
          ]}>
            Next
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
    backgroundColor: theme.colors.bg0,
    position: 'relative',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  vignetteOverlay: {
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
    backgroundColor: theme.colors.secondary500, // Blue instead of green
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
    fontSize: 28,
    fontWeight: '900',
    color: theme.colors.textHi,
    marginBottom: 12,
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
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: theme.colors.surface1,
    color: theme.colors.textHi,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: theme.radii.md,
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.colors.strokeSoft,
    ...theme.shadow.soft,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  nextButton: {
    width: '100%',
    backgroundColor: theme.colors.strokeSoft,
    paddingVertical: 18,
    borderRadius: theme.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  nextButtonDisabled: {
    opacity: 0.8,
  },
  nextButtonEnabled: {
    backgroundColor: theme.colors.secondary500, // Light blue instead of green
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.secondary500,
        shadowOpacity: 0.4,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
      },
      android: {
        elevation: 12,
      },
    }),
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  nextButtonTextDisabled: {
    color: theme.colors.textLo,
  },
});
