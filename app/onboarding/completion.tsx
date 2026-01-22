// app/onboarding/completion.tsx
// Completion Screen - Final onboarding screen with confetti
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withRepeat,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { theme } from '../../constants/theme';
import { completeOnboarding } from '../../lib/api/onboarding';
import { useAuth } from '../../providers/AuthProvider';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Confetti colors: green, blue, purple
const CONFETTI_COLORS = [
  theme.colors.primary600, // Green
  theme.colors.secondary500, // Blue
  theme.colors.purple, // Purple
];

interface ConfettiPiece {
  id: number;
  color: string;
  startX: number;
  startY: number;
  rotation: number;
  size: number;
}

// Confetti Component
function ConfettiAnimation({ active }: { active: boolean }) {
  const pieces: ConfettiPiece[] = React.useMemo(() => {
    return Array.from({ length: 100 }, (_, i) => ({
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      startX: Math.random() * SCREEN_WIDTH,
      startY: -20 - Math.random() * 20,
      rotation: Math.random() * 360,
      size: 12 + Math.random() * 12, // Bigger confetti (was 8 + random 8, now 12 + random 12)
    }));
  }, []);

  const opacity = useSharedValue(0);

  useEffect(() => {
    if (active) {
      opacity.value = withTiming(1, { duration: 200 });
      const timer = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 1000 });
      }, 8000); // Longer duration: 8 seconds (was 4 seconds)
      return () => clearTimeout(timer);
    }
  }, [active, opacity]);

  if (!active) return null;

  return (
    <View style={styles.confettiContainer} pointerEvents="none">
      {pieces.map((piece) => (
        <ConfettiPiece key={piece.id} piece={piece} opacity={opacity} />
      ))}
    </View>
  );
}

interface ConfettiPieceProps {
  piece: ConfettiPiece;
  opacity: Animated.SharedValue<number>;
}

function ConfettiPiece({ piece, opacity }: ConfettiPieceProps) {
  const translateY = useSharedValue(piece.startY);
  const translateX = useSharedValue(piece.startX);
  const rotation = useSharedValue(piece.rotation);
  const scale = useSharedValue(1);

  useEffect(() => {
    const drift = (Math.random() - 0.5) * 200;
    const finalX = piece.startX + drift;
    const finalY = SCREEN_HEIGHT + 100;
    const finalRotation = piece.rotation + (Math.random() * 720 - 360);

    translateX.value = withSpring(finalX, {
      damping: 10,
      stiffness: 50,
    });
    translateY.value = withTiming(finalY, {
      duration: 6000 + Math.random() * 2000, // Longer fall: 6-8 seconds (was 3.5-5 seconds)
      easing: Easing.out(Easing.quad),
    });
    rotation.value = withTiming(finalRotation, {
      duration: 6000 + Math.random() * 2000, // Longer rotation: 6-8 seconds
      easing: Easing.linear,
    });
    scale.value = withSequence(
      withTiming(1.2, { duration: 200 }),
      withTiming(0.8, { duration: 5800 }), // Extended to match longer fall
      withTiming(0, { duration: 300 })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotation.value}deg` },
        { scale: scale.value },
      ],
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View style={[styles.confettiPiece, animatedStyle]}>
      <View
        style={[
          styles.confettiShape,
          {
            backgroundColor: piece.color,
            width: piece.size,
            height: piece.size,
            borderRadius: piece.size / 4,
          },
        ]}
      />
    </Animated.View>
  );
}

export default function CompletionScreen() {
  const insets = useSafeAreaInsets();
  const { refreshOnboardingStatus } = useAuth();
  const [confettiActive, setConfettiActive] = useState(false);
  const [loading, setLoading] = useState(false);

  // Bouncing dots animation for loading
  const dot1Opacity = useSharedValue(1);
  const dot2Opacity = useSharedValue(1);
  const dot3Opacity = useSharedValue(1);

  React.useEffect(() => {
    if (loading) {
      // Animate dots in sequence - each dot bounces with a delay
      const bounceAnimation = () => {
        return withRepeat(
          withSequence(
            withTiming(0.5, { duration: 300, easing: Easing.ease }),
            withTiming(1, { duration: 300, easing: Easing.ease }),
          ),
          -1, // Infinite loop
          true // Reverse animation
        );
      };

      // Start animations with delays for sequential bounce effect
      dot1Opacity.value = withDelay(0, bounceAnimation());
      dot2Opacity.value = withDelay(200, bounceAnimation());
      dot3Opacity.value = withDelay(400, bounceAnimation());
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

  // Trigger confetti when screen loads
  useEffect(() => {
    setConfettiActive(true);
  }, []);

  const handleFinish = async () => {
    console.log('🔵 [Completion] ===== FINISH BUTTON PRESSED =====');
    setLoading(true);
    
    try {
      console.log('🔵 [Completion] Step 1: Marking onboarding as complete...');
      
      // Mark onboarding as complete
      const { data: completed, error } = await completeOnboarding();
      
      if (error || !completed) {
        console.error('❌ [Completion] Failed to complete onboarding:', error);
        console.error('❌ [Completion] Error details:', JSON.stringify(error, null, 2));
        
        const isNetworkError = error?.message?.toLowerCase().includes('network') || 
                              error?.message?.toLowerCase().includes('fetch') ||
                              error?.message?.toLowerCase().includes('connection');
        
        if (isNetworkError) {
          Alert.alert(
            'Connection Error',
            'Unable to complete onboarding. Please check your internet connection and try again.',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => setLoading(false) },
              { text: 'Retry', onPress: () => handleFinish() },
            ]
          );
          return;
        } else {
          Alert.alert(
            'Error',
            error?.message || 'Failed to complete onboarding. Please try again.',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => setLoading(false) },
              { text: 'Retry', onPress: () => handleFinish() },
            ]
          );
          return;
        }
      } else {
        console.log('✅ [Completion] Step 1 complete: Onboarding marked complete in database');
      }

      // Wait for database to update
      console.log('🔵 [Completion] Step 2: Waiting for database to update...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Refresh onboarding status once to ensure it updates
      console.log('🔵 [Completion] Step 3: Refreshing onboarding status...');
      await refreshOnboardingStatus();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Wait longer to ensure app is fully ready and loaded (18 seconds total)
      console.log('🔵 [Completion] Step 4: Waiting for app to fully load and be ready...');
      await new Promise(resolve => setTimeout(resolve, 15000));

      // Navigate to main app only after all processing is complete
      console.log('🔵 [Completion] Step 7: Navigating to main app...');
      router.replace('/(tabs)');
      
    } catch (error) {
      console.error('❌ [Completion] Exception:', error);
      // Still navigate to main app even on error, but wait longer
      await new Promise(resolve => setTimeout(resolve, 5000));
      router.replace('/(tabs)');
    }
    // Don't set loading to false - keep the animation going until navigation happens
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Confetti Animation */}
      <ConfettiAnimation active={confettiActive} />

      {/* Layer A: Base gradient - Green version */}
      <LinearGradient
        colors={['#0B1513', '#0F2A22', '#0F3B2E', '#070B0A']}
        locations={[0, 0.3, 0.6, 1]}
        style={styles.baseGradient}
      />
      
      {/* Layer B: Vignette overlay */}
      <LinearGradient
        colors={['rgba(0,0,0,0.4)', 'transparent', 'transparent', 'rgba(0,0,0,0.5)']}
        locations={[0, 0.15, 0.85, 1]}
        style={styles.vignetteGradient}
        pointerEvents="none"
      />
      
      {/* Layer C: Subtle grain */}
      <View style={styles.grainOverlay} pointerEvents="none" />

      {/* Content - Centered */}
      <View style={[styles.content, { paddingBottom: insets.bottom + 100 }]}>
        {/* Heading - Centered */}
        <Text style={styles.heading}>Welcome to the Potential Team</Text>

        {/* Description Text - Centered */}
        <Text style={styles.descriptionText}>
          You are officially on your way to becoming a better athlete and reaching your full Potential
        </Text>
      </View>

      {/* Finish Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20, zIndex: 10000 }]}>
        <TouchableOpacity
          style={[styles.finishButton, loading && styles.finishButtonDisabled]}
          onPress={handleFinish}
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
            <Text style={styles.finishButtonText}>Finish</Text>
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
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1, // Lower z-index so it doesn't block buttons
    elevation: 1,
  },
  confettiPiece: {
    position: 'absolute',
  },
  confettiShape: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 10,
  },
  heading: {
    fontSize: 32,
    fontWeight: '900',
    color: theme.colors.textHi,
    textAlign: 'center',
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
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    zIndex: 10000, // Higher than confetti to ensure button is clickable
    elevation: 10000,
  },
  finishButton: {
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
  finishButtonDisabled: {
    opacity: 0.7,
  },
  finishButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  loadingContainer: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bouncingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
});
