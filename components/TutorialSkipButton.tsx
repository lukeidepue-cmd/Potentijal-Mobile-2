// components/TutorialSkipButton.tsx
//
// A "Skip" CTA pinned to the top-right corner while the tutorial is running.
// Rendered from the tabs layout ABOVE every tutorial overlay (which sit at
// zIndex 99999), so it stays reachable on every step — including the ones that
// dim the screen and block all four tabs.
//
// This is the tutorial's only guaranteed escape hatch. If a future step can't
// find its spotlight target, this is what stops that from trapping the user.
//
// Styling matches the "Start Workout" CTA on the Workouts tab (the shared
// PremiumShimmerCTASurface — mint → sky → lavender), just narrower.

import React from "react";
import { Pressable, Text, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useFonts as useGeist, Geist_600SemiBold } from "@expo-google-fonts/geist";
import { PremiumShimmerCTASurface } from "./PremiumShimmerCTASurface";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function TutorialSkipButton({ onSkip }: { onSkip: () => void }) {
  const insets = useSafeAreaInsets();
  // Loaded here rather than assumed: this renders from the tabs layout, which
  // doesn't load fonts itself. Falls back to the system face until ready.
  const [geistLoaded] = useGeist({ Geist_600SemiBold });

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        scale.value = 1;
        onSkip();
      }}
      onPressIn={() => {
        scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      }}
      hitSlop={10}
      style={[styles.wrapper, { top: insets.top + 58 }, animatedStyle]}
    >
      <PremiumShimmerCTASurface style={styles.surface}>
        <Text style={[styles.label, geistLoaded && styles.labelGeist]}>Skip</Text>
      </PremiumShimmerCTASurface>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    right: 16,
    // Must beat the tutorial overlays' 99999 so it stays tappable over the dim.
    zIndex: 100000,
    elevation: 100000,
  },
  // Overrides PremiumShimmerCTASurface's default 88%-wide block: same shape and
  // gradient as Start Workout, sized for a one-word label.
  surface: {
    width: 104,
    maxWidth: 104,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  label: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.15,
    includeFontPadding: false,
    textShadowColor: "rgba(0, 0, 0, 0.25)",
    textShadowOffset: { width: 0, height: 1.2 },
    textShadowRadius: 2.5,
    ...Platform.select({ android: { textAlignVertical: "center" as const } }),
  },
  labelGeist: {
    fontFamily: "Geist_600SemiBold",
  },
});
