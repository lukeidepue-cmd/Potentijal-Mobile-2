// components/Button.tsx
import React from "react";
import { Pressable, Text, ViewStyle, StyleProp } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "@/constants/theme";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
  iconLeft?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

function PrimaryButton({
  label,
  onPress,
  disabled,
  variant = "primary",
  iconLeft,
  style,
}: Props) {
  const isSecondary = variant === "secondary";
  
  // Animation values
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  
  if (isSecondary) {
    return (
      <AnimatedPressable
        onPress={() => {
          if (!disabled) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPress();
          }
        }}
        disabled={disabled}
        onPressIn={() => {
          if (!disabled) {
            scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
          }
        }}
        onPressOut={() => {
          if (!disabled) {
            scale.value = withSpring(1, { damping: 15, stiffness: 300 });
          }
        }}
        style={[
          {
            paddingVertical: theme.layout.lg,
            paddingHorizontal: theme.layout.xl,
            borderRadius: theme.radii.pill,
            borderWidth: 1,
            borderColor: theme.colors.primary600,
            backgroundColor: "transparent",
            opacity: disabled ? 0.6 : 1,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: theme.layout.sm,
            shadowColor: theme.colors.primary600,
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 4,
          },
          animatedStyle,
          style,
        ]}
      >
        {iconLeft}
        <Text
          style={{
            color: theme.colors.textHi,
            ...theme.text.label,
          }}
        >
          {label}
        </Text>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      onPress={() => {
        if (!disabled) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }
      }}
      disabled={disabled}
      onPressIn={() => {
        if (!disabled) {
          scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
        }
      }}
      onPressOut={() => {
        if (!disabled) {
          scale.value = withSpring(1, { damping: 15, stiffness: 300 });
        }
      }}
      style={[
        {
          borderRadius: theme.radii.pill,
          opacity: disabled ? 0.6 : 1,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: theme.layout.sm,
          shadowColor: theme.colors.primary600,
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 8,
        },
        animatedStyle,
        style,
      ]}
    >
      <LinearGradient
        colors={theme.gradients.brand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          paddingVertical: theme.layout.lg,
          paddingHorizontal: theme.layout.xl,
          borderRadius: theme.radii.pill,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: theme.layout.sm,
        }}
      >
        {iconLeft}
        <Text
          style={{
            color: "#FFFFFF",
            ...theme.text.label,
          }}
        >
          {label}
        </Text>
      </LinearGradient>
    </AnimatedPressable>
  );
}

export default PrimaryButton;
export { PrimaryButton };


