// components/AnimatedProgressBar.tsx
// Animated progress bar with smooth transitions and percentage display
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../constants/theme';

interface AnimatedProgressBarProps {
  progress: number; // 0 to 1
  height?: number;
  showPercentage?: boolean;
  label?: string;
  style?: any;
}

export function AnimatedProgressBar({
  progress,
  height = 8,
  showPercentage = true,
  label,
  style,
}: AnimatedProgressBarProps) {
  const width = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Clamp progress between 0 and 1
    const clampedProgress = Math.max(0, Math.min(1, progress));
    
    // Animate width smoothly
    width.value = withSpring(clampedProgress * 100, {
      damping: 15,
      stiffness: 100,
    });
    
    // Fade in when progress starts
    if (clampedProgress > 0) {
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [progress]);

  const animatedBarStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
    opacity: opacity.value,
  }));

  const percentage = Math.round(progress * 100);

  return (
    <View style={[styles.container, { height: height + 4 }, style]}>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={styles.label}>{label}</Text>
          {showPercentage && (
            <Text style={styles.percentage}>{percentage}%</Text>
          )}
        </View>
      )}
      <View style={[styles.track, { height }]}>
        <Animated.View style={[styles.barContainer, { height }, animatedBarStyle]}>
          <LinearGradient
            colors={theme.gradients.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
      {!label && showPercentage && (
        <Text style={styles.percentageText}>{percentage}%</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textHi,
    fontFamily: 'Geist_600SemiBold',
  },
  percentage: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textLo,
    fontFamily: 'Geist_600SemiBold',
  },
  track: {
    width: '100%',
    backgroundColor: theme.colors.surface2,
    borderRadius: theme.radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.strokeSoft,
  },
  barContainer: {
    height: '100%',
    borderRadius: theme.radii.md,
    overflow: 'hidden',
  },
  percentageText: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.textLo,
    textAlign: 'right',
    fontFamily: 'Geist_500Medium',
  },
});
