import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface AnimatedTabBarIconProps {
  focused: boolean;
  children: React.ReactNode;
}

/**
 * Animated tab bar icon wrapper that provides:
 * - Scale animation on focus/unfocus
 * - Smooth spring transitions
 * - Haptic feedback on tab change
 */
export default function AnimatedTabBarIcon({ focused, children }: AnimatedTabBarIconProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.7);

  useEffect(() => {
    if (focused) {
      // Animate to focused state
      scale.value = withSpring(1.1, {
        damping: 15,
        stiffness: 300,
      });
      opacity.value = withTiming(1, { duration: 200 });
      
      // Light haptic feedback on tab change
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      // Animate to unfocused state
      scale.value = withSpring(1, {
        damping: 15,
        stiffness: 300,
      });
      opacity.value = withTiming(0.7, { duration: 200 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
