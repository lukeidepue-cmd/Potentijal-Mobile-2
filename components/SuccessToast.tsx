// components/SuccessToast.tsx
// Success feedback component with checkmark animation
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';

interface SuccessToastProps {
  message: string;
  visible: boolean;
  onHide?: () => void;
  duration?: number;
}

export function SuccessToast({
  message,
  visible,
  onHide,
  duration = 2000,
}: SuccessToastProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const translateY = useSharedValue(-20);
  const checkmarkScale = useSharedValue(0);
  const checkmarkOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Animate in
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withSpring(1, { damping: 15, stiffness: 200 });
      translateY.value = withSpring(0, { damping: 15, stiffness: 200 });
      
      // Animate checkmark with delay
      checkmarkScale.value = withDelay(
        200,
        withSequence(
          withSpring(1.2, { damping: 10, stiffness: 300 }),
          withSpring(1, { damping: 10, stiffness: 300 })
        )
      );
      checkmarkOpacity.value = withDelay(200, withTiming(1, { duration: 200 }));

      // Auto hide after duration
      const timer = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 300 });
        scale.value = withTiming(0.8, { duration: 300 });
        translateY.value = withTiming(-20, { duration: 300 });
        checkmarkOpacity.value = withTiming(0, { duration: 300 });
        
        if (onHide) {
          setTimeout(() => runOnJS(onHide)(), 300);
        }
      }, duration);

      return () => clearTimeout(timer);
    } else {
      // Reset when hidden
      opacity.value = 0;
      scale.value = 0.8;
      translateY.value = -20;
      checkmarkScale.value = 0;
      checkmarkOpacity.value = 0;
    }
  }, [visible]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
  }));

  const checkmarkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkmarkScale.value }],
    opacity: checkmarkOpacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <Animated.View style={[styles.checkmarkContainer, checkmarkStyle]}>
        <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
      </Animated.View>
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 1000,
    ...Platform.select({
      ios: {
        shadowColor: '#22C55E',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  checkmarkContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    flex: 1,
    color: theme.colors.textHi,
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Geist_600SemiBold',
  },
});
