// app/onboarding/welcome.tsx
// Welcome/Auth Selection Screen - First screen in onboarding flow
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { theme } from '../../constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Image carousel - Add your images here
// You can add more images to the onboarding folder and add them to this array
const BACKGROUND_IMAGES = [
  require('../../assets/images/onboarding/soccer-welcome.png'),
  require('../../assets/images/onboarding/football-welcome.png'),
  require('../../assets/images/onboarding/lifting-welcome.png'),
  require('../../assets/images/onboarding/baseball-welcome.png'),
  require('../../assets/images/onboarding/hockey-welcome.png'),
];

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const [imageIndex1, setImageIndex1] = useState(0);
  const [imageIndex2, setImageIndex2] = useState(1);
  const fadeOpacity1 = useSharedValue(1);
  const fadeOpacity2 = useSharedValue(0);
  const currentIndexRef = useRef(0);
  const currentActiveRef = useRef<1 | 2>(1);
  const layer1ImageRef = useRef(0);
  const layer2ImageRef = useRef(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleEmailContinue = () => {
    // Navigate to email entry - it will handle both sign-up and sign-in automatically
    router.push('/onboarding/email-entry');
  };

  // Image carousel effect - cross-fade between images every 2 seconds
  useEffect(() => {
    // Only run if we have more than one image
    if (BACKGROUND_IMAGES.length <= 1) return;

    // Initialize: Start with first image visible on layer 1, layer 2 hidden
    currentIndexRef.current = 0;
    currentActiveRef.current = 1;
    layer1ImageRef.current = 0;
    layer2ImageRef.current = 1;
    setImageIndex1(0);
    setImageIndex2(1); // Pre-load next image on hidden layer
    fadeOpacity1.value = 1;
    fadeOpacity2.value = 0;

    const changeImage = () => {
      const currentIndex = currentIndexRef.current;
      const currentActive = currentActiveRef.current;
      
      // Calculate next image index - loop back to first after last
      const nextIndex = (currentIndex + 1) % BACKGROUND_IMAGES.length;
      
      // Update current index
      currentIndexRef.current = nextIndex;
      
      if (currentActive === 1) {
        // Currently showing layer 1, prepare layer 2 with next image
        // Only update if layer 2 doesn't already have the correct image
        if (layer2ImageRef.current !== nextIndex) {
          layer2ImageRef.current = nextIndex;
          setImageIndex2(nextIndex);
        }
        
        // Wait a bit longer to ensure image is fully rendered before fading
        setTimeout(() => {
          // Fade out layer 1, fade in layer 2
          fadeOpacity1.value = withTiming(0, {
            duration: 800,
            easing: Easing.ease,
          });
          fadeOpacity2.value = withTiming(1, {
            duration: 800,
            easing: Easing.ease,
          });
        }, 300);
        
        currentActiveRef.current = 2;
      } else {
        // Currently showing layer 2, prepare layer 1 with next image
        // Only update if layer 1 doesn't already have the correct image
        if (layer1ImageRef.current !== nextIndex) {
          layer1ImageRef.current = nextIndex;
          setImageIndex1(nextIndex);
        }
        
        // Wait a bit longer to ensure image is fully rendered before fading
        setTimeout(() => {
          // Fade out layer 2, fade in layer 1
          fadeOpacity2.value = withTiming(0, {
            duration: 800,
            easing: Easing.ease,
          });
          fadeOpacity1.value = withTiming(1, {
            duration: 800,
            easing: Easing.ease,
          });
        }, 300);
        
        currentActiveRef.current = 1;
      }
    };

    // Change image every 2 seconds
    intervalRef.current = setInterval(changeImage, 2000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fadeOpacity1, fadeOpacity2]);

  // Animated styles for cross-fade effect
  const animatedImageStyle1 = useAnimatedStyle(() => {
    return {
      opacity: fadeOpacity1.value,
    };
  });

  const animatedImageStyle2 = useAnimatedStyle(() => {
    return {
      opacity: fadeOpacity2.value,
    };
  });

  return (
    <View style={styles.container}>
      {/* Background Images - Cross-fade between two layers */}
      <Animated.View style={[styles.backgroundImageContainer, animatedImageStyle1]} pointerEvents="none">
        <ImageBackground
          source={BACKGROUND_IMAGES[imageIndex1]}
          style={styles.backgroundImage}
          resizeMode="cover"
          key={`img1-${imageIndex1}`}
        />
      </Animated.View>
      <Animated.View style={[styles.backgroundImageContainer, animatedImageStyle2]} pointerEvents="none">
        <ImageBackground
          source={BACKGROUND_IMAGES[imageIndex2]}
          style={styles.backgroundImage}
          resizeMode="cover"
          key={`img2-${imageIndex2}`}
        />
      </Animated.View>

      {/* Overlays and Content - Always visible, don't fade */}
      <View style={styles.overlayContainer}>
        {/* Dark Overlay - Lighter at top, darker at bottom for image brightness */}
        <LinearGradient
          colors={['rgba(0, 0, 0, 0.15)', 'rgba(0, 0, 0, 0.25)', 'rgba(0, 0, 0, 0.4)', 'rgba(0, 0, 0, 0.6)']}
          locations={[0, 0.3, 0.7, 1]}
          style={styles.darkOverlay}
        />

        {/* Gradient Fade - Fades image into buttons area with stronger fade */}
        <LinearGradient
          colors={['transparent', 'rgba(7, 11, 16, 0.4)', 'rgba(7, 11, 16, 0.75)', 'rgba(7, 11, 16, 0.95)']}
          locations={[0.3, 0.6, 0.85, 1]}
          style={styles.fadeGradient}
        />

        {/* Content - Full height to ensure image reaches bottom */}
        <View style={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          {/* Top Spacing - Image takes up most of the screen */}
          <View style={styles.imageSpace} />

          {/* Buttons Section - Positioned at bottom */}
          <View style={styles.buttonsSection}>
            {/* Email Option */}
            <TouchableOpacity
              style={[styles.authButton, styles.emailButton]}
              onPress={handleEmailContinue}
              activeOpacity={0.8}
            >
              <View style={styles.iconContainer}>
                <Ionicons name="mail-outline" size={20} color={theme.colors.textHi} />
              </View>
              <Text style={[styles.authButtonText, { color: theme.colors.textHi }]}>
                Continue with Email
              </Text>
            </TouchableOpacity>

            {/* Terms & Privacy */}
            <View style={styles.termsSection}>
              <Text style={styles.termsText}>
                By continuing, you agree to our{' '}
                <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  backgroundImageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    // Gradient overlay - lighter at top, darker at bottom
  },
  fadeGradient: {
    ...StyleSheet.absoluteFillObject,
    // This gradient fades the image into the dark background at the bottom
    // Stronger fade with multiple stops for smoother transition
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    width: '100%',
    height: '100%',
  },
  imageSpace: {
    flex: 1,
    minHeight: 0, // Ensure it can shrink if needed
    // This space allows the image to be visible in the top portion
  },
  buttonsSection: {
    paddingHorizontal: 24,
    paddingBottom: -10,
    gap: 12,
  },
  authButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: theme.radii.md,
    // Floating effect with depth
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.4,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
      },
      android: {
        elevation: 12,
      },
    }),
  },
  appleButton: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#1A1A1A',
    // Glow effect for Apple button
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOpacity: 0.6,
        shadowRadius: 25,
        shadowOffset: { width: 0, height: 10 },
      },
      android: {
        elevation: 15,
      },
    }),
  },
  googleButton: {
    backgroundColor: theme.colors.surface1,
    borderWidth: 1,
    borderColor: theme.colors.strokeSoft,
  },
  emailButton: {
    backgroundColor: theme.colors.surface1,
    borderWidth: 1,
    borderColor: theme.colors.strokeSoft,
  },
  iconContainer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  termsSection: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  termsText: {
    fontSize: 12,
    color: theme.colors.textLo,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: theme.colors.primary600,
    fontWeight: '600',
  },
});
