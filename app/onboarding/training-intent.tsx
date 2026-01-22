// app/onboarding/training-intent.tsx
// Training Intent Screen - Select one training goal
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../constants/theme';
import { updateOnboardingStep } from '../../lib/api/onboarding';

const TOTAL_STEPS = 10; // Total number of onboarding steps
const CURRENT_STEP = 6; // This is step 6

const TRAINING_INTENTS = [
  { id: 'losing_weight', name: 'Losing Weight' },
  { id: 'getting_stronger', name: 'Getting Stronger' },
  { id: 'better_athlete', name: 'Becoming a better athlete' },
  { id: 'tracking_progress', name: 'Tracking real progress' },
  { id: 'improving_consistency', name: 'Improving Consistency' },
];

// Purple color for this screen
const PURPLE_COLOR = theme.colors.purple; // #A78BFA

// Intent Card Component with Animation
function IntentCard({
  intent,
  isSelected,
  onToggle,
}: {
  intent: { id: string; name: string };
  isSelected: boolean;
  onToggle: () => void;
}) {
  // Animated background color
  const backgroundColor = useSharedValue(
    isSelected ? PURPLE_COLOR : theme.colors.surface1
  );

  // Update animated value when selection changes
  React.useEffect(() => {
    backgroundColor.value = withTiming(
      isSelected ? PURPLE_COLOR : theme.colors.surface1,
      {
        duration: 450,
        easing: Easing.out(Easing.ease),
      }
    );
  }, [isSelected]);

  const animatedCardStyle = useAnimatedStyle(() => ({
    backgroundColor: backgroundColor.value,
  }));

  return (
    <Animated.View style={[styles.intentCard, animatedCardStyle]}>
      {/* Gradient Background for Depth */}
      <LinearGradient
        colors={
          isSelected
            ? ['rgba(255,255,255,0.15)', 'rgba(0,0,0,0.1)']
            : ['rgba(255,255,255,0.08)', 'rgba(0,0,0,0.04)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      
      {/* Top Sheen Highlight */}
      <LinearGradient
        colors={
          isSelected
            ? ['rgba(255,255,255,0.20)', 'transparent']
            : ['rgba(255,255,255,0.10)', 'transparent']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.4 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <TouchableOpacity
        style={styles.cardContent}
        onPress={onToggle}
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.intentName,
            isSelected && styles.intentNameSelected,
          ]}
        >
          {intent.name}
        </Text>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function TrainingIntentScreen() {
  const insets = useSafeAreaInsets();
  const [selectedIntent, setSelectedIntent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const progressPercentage = (CURRENT_STEP / TOTAL_STEPS) * 100;

  const handleIntentToggle = (intentId: string) => {
    // Single selection - toggle if already selected, otherwise select
    if (selectedIntent === intentId) {
      setSelectedIntent(null);
    } else {
      setSelectedIntent(intentId);
    }
  };

  const handleNext = async () => {
    if (!selectedIntent) return;

    setLoading(true);
    try {
      // Map UI intent IDs to database values
      // Database expects: 'getting_stronger', 'consistency', 'progress', 'efficiency'
      // UI has: 'losing_weight', 'getting_stronger', 'better_athlete', 'tracking_progress', 'improving_consistency'
      let dbIntentValue: 'getting_stronger' | 'consistency' | 'progress' | 'efficiency' | null = null;
      
      if (selectedIntent === 'getting_stronger') {
        dbIntentValue = 'getting_stronger';
      } else if (selectedIntent === 'improving_consistency') {
        dbIntentValue = 'consistency';
      } else if (selectedIntent === 'tracking_progress') {
        dbIntentValue = 'progress';
      } else if (selectedIntent === 'losing_weight' || selectedIntent === 'better_athlete') {
        // Map to 'progress' as default for other intents
        dbIntentValue = 'progress';
      }

      // Save training intent to onboarding_data
      const { error: progressError } = await updateOnboardingStep('training_intent', {
        training_intent: dbIntentValue,
      });

      if (progressError) {
        console.warn('⚠️ [TrainingIntent] Failed to save progress:', progressError);
        const isNetworkError = progressError.message?.toLowerCase().includes('network') || 
                              progressError.message?.toLowerCase().includes('fetch') ||
                              progressError.message?.toLowerCase().includes('connection');
        
        if (isNetworkError) {
          Alert.alert(
            'Connection Error',
            'Unable to save your selection. Please check your internet connection and try again.',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => setLoading(false) },
              { text: 'Retry', onPress: () => handleNext() },
            ]
          );
          return;
        }
        // Don't block navigation on progress save failure, but log it
      } else {
        console.log('✅ [TrainingIntent] Progress saved: training_intent =', dbIntentValue);
      }

      // Navigate to next screen
      router.push('/onboarding/app-intro');
    } catch (error: any) {
      console.error('❌ [TrainingIntent] Exception:', error);
      const isNetworkError = error.message?.toLowerCase().includes('network') || 
                            error.message?.toLowerCase().includes('fetch') ||
                            error.message?.toLowerCase().includes('connection');
      
      if (isNetworkError) {
        Alert.alert(
          'Connection Error',
          'Unable to save your selection. Please check your internet connection and try again.',
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

  const isFormValid = selectedIntent !== null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Layer A: Base gradient - Purple version */}
      <LinearGradient
        colors={['#0B0A15', '#1A0F2A', '#2A0F3B', '#070B0A']}
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
      <View style={[styles.content, { zIndex: 10 }]}>
        {/* Heading */}
        <Text style={styles.heading}>Training Intent</Text>

        {/* Description */}
        <Text style={styles.descriptionText}>
          What's most important to you right now?
        </Text>

        {/* Intent List - Scrollable */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {TRAINING_INTENTS.map((intent) => {
            const isSelected = selectedIntent === intent.id;

            return (
              <IntentCard
                key={intent.id}
                intent={intent}
                isSelected={isSelected}
                onToggle={() => handleIntentToggle(intent.id)}
              />
            );
          })}
        </ScrollView>
      </View>

      {/* Next Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20, zIndex: 10 }]}>
        <TouchableOpacity
          style={[
            styles.nextButton,
            (!isFormValid || loading) && styles.nextButtonDisabled,
            isFormValid && !loading && styles.nextButtonEnabled,
          ]}
          onPress={handleNext}
          disabled={!isFormValid || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <Text style={styles.nextButtonText}>Saving...</Text>
          ) : (
            <Text style={[
              styles.nextButtonText,
              !isFormValid && styles.nextButtonTextDisabled,
            ]}>
              Next
            </Text>
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
    backgroundColor: PURPLE_COLOR, // Purple instead of green
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textLo,
    minWidth: 30,
    textAlign: 'right',
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
    marginBottom: 10,
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
    marginBottom: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
  },
  intentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    height: 80,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
    overflow: 'hidden',
    // Enhanced floating effects with depth
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 22,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    zIndex: 10,
  },
  intentName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textHi,
  },
  intentNameSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
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
    backgroundColor: theme.colors.strokeSoft,
    paddingVertical: 18,
    borderRadius: theme.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  nextButtonDisabled: {
    backgroundColor: theme.colors.strokeSoft,
    opacity: 1,
  },
  nextButtonEnabled: {
    backgroundColor: PURPLE_COLOR, // Purple instead of green
    ...Platform.select({
      ios: {
        shadowColor: PURPLE_COLOR,
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
