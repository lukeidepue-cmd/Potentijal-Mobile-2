// components/AnimatedInput.tsx
// Reusable animated input component with focus animations
import React, { useState, useRef } from 'react';
import { TextInput, TextInputProps, View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface AnimatedInputProps extends TextInputProps {
  containerStyle?: ViewStyle;
  inputStyle?: ViewStyle;
  focusedBorderColor?: string;
  defaultBorderColor?: string;
}

export function AnimatedInput({
  containerStyle,
  inputStyle,
  focusedBorderColor = 'rgba(34, 197, 94, 0.4)', // Brand green with opacity
  defaultBorderColor = 'rgba(255, 255, 255, 0.1)',
  ...textInputProps
}: AnimatedInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const scale = useSharedValue(1);
  const borderColor = useSharedValue(defaultBorderColor);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: borderColor.value,
  }));

  const handleFocus = (e: any) => {
    setIsFocused(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withTiming(1.02, { duration: 250 });
    borderColor.value = withTiming(focusedBorderColor, { duration: 250 });
    textInputProps.onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    scale.value = withTiming(1, { duration: 250 });
    borderColor.value = withTiming(defaultBorderColor, { duration: 250 });
    textInputProps.onBlur?.(e);
  };

  return (
    <Animated.View style={[styles.container, containerStyle, animatedContainerStyle]}>
      <TextInput
        {...textInputProps}
        style={[styles.input, inputStyle]}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
});
