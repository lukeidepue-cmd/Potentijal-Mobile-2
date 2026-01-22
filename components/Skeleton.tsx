// components/Skeleton.tsx
// Reusable skeleton loader component with shimmer animation
import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) {
  const shimmerTranslate = useSharedValue(-200);

  useEffect(() => {
    shimmerTranslate.value = withRepeat(
      withTiming(400, {
        duration: 1500,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerTranslate.value }],
  }));

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, shimmerStyle]}>
        <LinearGradient
          colors={[
            'transparent',
            'rgba(255, 255, 255, 0.08)',
            'rgba(255, 255, 255, 0.12)',
            'rgba(255, 255, 255, 0.08)',
            'transparent',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            width: '50%',
            height: '100%',
          }}
        />
      </Animated.View>
    </View>
  );
}

// Pre-built skeleton components for common use cases
export function SkeletonCard({ style }: { style?: ViewStyle }) {
  return (
    <View
      style={[
        {
          width: '100%',
          height: 140,
          borderRadius: 20,
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          overflow: 'hidden',
          marginBottom: 12,
        },
        style,
      ]}
    >
      <Skeleton width="100%" height="100%" borderRadius={20} />
    </View>
  );
}

export function SkeletonText({ width = '60%', style }: { width?: number | string; style?: ViewStyle }) {
  return <Skeleton width={width} height={16} borderRadius={4} style={style} />;
}

export function SkeletonCircle({ size = 40, style }: { size?: number; style?: ViewStyle }) {
  return <Skeleton width={size} height={size} borderRadius={size / 2} style={style} />;
}
