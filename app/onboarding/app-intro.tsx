// app/onboarding/app-intro.tsx
// App Introduction Screen - Informative screen about the app
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../constants/theme';
import { updateOnboardingStep } from '../../lib/api/onboarding';

const TOTAL_STEPS = 10; // Total number of onboarding steps
const CURRENT_STEP = 7; // This is step 7

export default function AppIntroScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = React.useState(false);

  const progressPercentage = (CURRENT_STEP / TOTAL_STEPS) * 100;

  const handleNext = async () => {
    setLoading(true);
    try {
      // Mark intro as completed
      const { error: progressError } = await updateOnboardingStep('app_intro', {
        intro_completed: true,
      });

      if (progressError) {
        console.warn('⚠️ [AppIntro] Failed to save progress:', progressError);
        const isNetworkError = progressError.message?.toLowerCase().includes('network') || 
                              progressError.message?.toLowerCase().includes('fetch') ||
                              progressError.message?.toLowerCase().includes('connection');
        
        if (isNetworkError) {
          Alert.alert(
            'Connection Error',
            'Unable to save progress. Please check your internet connection and try again.',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => setLoading(false) },
              { text: 'Retry', onPress: () => handleNext() },
            ]
          );
          return;
        }
        // Don't block navigation on progress save failure, but log it
      } else {
        console.log('✅ [AppIntro] Progress saved: app_intro, intro_completed = true');
      }

      // Navigate to next screen
      router.push('/onboarding/notifications');
    } catch (error: any) {
      console.error('❌ [AppIntro] Exception:', error);
      const isNetworkError = error.message?.toLowerCase().includes('network') || 
                            error.message?.toLowerCase().includes('fetch') ||
                            error.message?.toLowerCase().includes('connection');
      
      if (isNetworkError) {
        Alert.alert(
          'Connection Error',
          'Unable to save progress. Please check your internet connection and try again.',
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Layer A: Base gradient - Green version */}
      <LinearGradient
        colors={['#0B1513', '#0F2A22', '#0F3B2E', '#070B0A']}
        locations={[0, 0.3, 0.6, 1]}
        style={styles.baseGradient}
      />
      
      {/* Layer B: Vignette overlay - EXACT same as email-entry screen */}
      <LinearGradient
        colors={['rgba(0,0,0,0.4)', 'transparent', 'transparent', 'rgba(0,0,0,0.5)']}
        locations={[0, 0.15, 0.85, 1]}
        style={styles.vignetteGradient}
        pointerEvents="none"
      />
      
      {/* Layer C: Subtle grain - EXACT same as email-entry screen */}
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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.content, { zIndex: 10 }]}>
          {/* Heading */}
          <Text style={styles.heading}>Quick Introduction</Text>

          {/* Description Text */}
          <Text style={styles.descriptionText}>
            You have the potential to be great, but it all relies on you. This app will feed you your training, statistics, progress, and insights for improvement, but it all relies on you to log workouts on a consistent basis, in order for you to see real progress. Almost all of the information given to you about your training comes from what you log in the app, so everything is in your hands.
          </Text>
        </View>
      </ScrollView>

      {/* Next Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20, zIndex: 10 }]}>
        <TouchableOpacity
          style={[styles.nextButton, loading && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <Text style={styles.nextButtonText}>Saving...</Text>
          ) : (
            <Text style={styles.nextButtonText}>Next</Text>
          )}
        </TouchableOpacity>
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
    backgroundColor: theme.colors.primary600, // Green
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textLo,
    minWidth: 30,
    textAlign: 'right',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
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
    marginBottom: 20,
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
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  nextButton: {
    width: '100%',
    backgroundColor: theme.colors.primary600, // Green
    paddingVertical: 18,
    borderRadius: theme.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary600,
        shadowOpacity: 0.4,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
      },
      android: {
        elevation: 12,
      },
    }),
  },
  nextButtonDisabled: {
    opacity: 0.7,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
