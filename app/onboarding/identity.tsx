import { router } from 'expo-router';
import React, { useEffect } from 'react';
import {
  Dimensions,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Animation timing — slowed down significantly
const SLIDE_IN_DURATION = 1200;
const MOVE_UP_DELAY = 1600;
const MOVE_UP_DURATION = 1000;
const CONTENT_DELAY = 3000;
const CONTENT_DURATION = 800;

export default function IdentityScreen() {
  const insets = useSafeAreaInsets();

  const imageTranslateX = useSharedValue(-SCREEN_WIDTH);
  const imageTranslateY = useSharedValue(0);
  const imageScale = useSharedValue(1);
  const contentTranslateY = useSharedValue(80);
  const contentOpacity = useSharedValue(0);

  useEffect(() => {
    // Phase 1: Image slides in from the left (centered vertically)
    imageTranslateX.value = withTiming(0, {
      duration: SLIDE_IN_DURATION,
      easing: Easing.out(Easing.cubic),
    });

    // Phase 2: Image moves straight up (stays centered horizontally) and shrinks
    imageTranslateY.value = withDelay(
      MOVE_UP_DELAY,
      withTiming(-SCREEN_HEIGHT * 0.32, {
        duration: MOVE_UP_DURATION,
        easing: Easing.out(Easing.cubic),
      })
    );
    imageScale.value = withDelay(
      MOVE_UP_DELAY,
      // Shrink less so the image still ends noticeably larger
      withTiming(0.5, {
        duration: MOVE_UP_DURATION,
        easing: Easing.out(Easing.cubic),
      })
    );

    // Phase 3: Text and button slide up from bottom
    contentTranslateY.value = withDelay(
      CONTENT_DELAY,
      withTiming(0, {
        duration: CONTENT_DURATION,
        easing: Easing.out(Easing.cubic),
      })
    );
    contentOpacity.value = withDelay(
      CONTENT_DELAY,
      withTiming(1, { duration: CONTENT_DURATION, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: imageTranslateX.value },
      { translateY: imageTranslateY.value },
      { scale: imageScale.value },
    ],
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: contentTranslateY.value }],
    opacity: contentOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Black background */}
      <View style={styles.background} />

      {/* Image: slides in from left (vertically centered), then moves up centered and shrinks */}
      <Animated.View
        style={[styles.imageWrapper, imageAnimatedStyle]}
        pointerEvents="none"
      >
        <Image
          source={require('../../assets/test-image1.png')}
          style={styles.image}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Circle + text + button: slide up from bottom together */}
      <Animated.View
        style={[
          styles.content,
          {
            paddingBottom: insets.bottom + 20,
          },
          contentAnimatedStyle,
        ]}
      >
        <View style={styles.heroCircle}>
          <Image
            source={require('../../assets/intro-image.png')}
            style={styles.heroCircleImage}
            resizeMode="cover"
            accessibilityRole="image"
            accessibilityLabel="Intro illustration"
          />
        </View>
        <View style={styles.textContainer}>
          <Image
            source={require('../../assets/opening-text.png')}
            style={styles.openingTextImage}
            resizeMode="contain"
            accessibilityRole="image"
            accessibilityLabel="For athletes who put in the real work"
          />
          <Text style={styles.subtitle}>
            Track any exercise. View personalized progress. See proof that you're improving.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.continueButton}
          onPress={() => router.push('/onboarding/sport-selection')}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
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
  imageWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: SCREEN_WIDTH * 0.85,
    height: SCREEN_HEIGHT * 0.4,
    maxHeight: 320,
  },
  content: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 28,
    paddingTop: 24,
    alignItems: 'center',
  },
  heroCircle: {
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#EAE1C6',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: -10,
    alignSelf: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  heroCircleImage: {
    width: 196,
    height: 196,
    borderRadius: 98,
    marginLeft: -14,
  },
  textContainer: {
    marginBottom: 32,
    width: '100%',
  },
  /** Add `assets/opening-text.png` (your graphic for the headline) */
  openingTextImage: {
    width: '100%',
    height: 200,
    marginBottom: -48,
    alignSelf: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    fontStyle: 'italic',
    color: theme.colors.textLo,
    lineHeight: 22,
    textAlign: 'center',
  },
  continueButton: {
    width: '100%',
    backgroundColor: '#EAE1C6',
    paddingVertical: 18,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  continueButtonText: {
    color: '#1C1C1E',
    fontSize: 17,
    fontWeight: '700',
  },
});
