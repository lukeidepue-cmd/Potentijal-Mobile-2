// components/PresetCircleButton.tsx
//
// A preset chip in the Workouts action row. Tapping it adds an exercise box for
// that preset; swiping UP on it shrinks the circle and reveals a small red trash
// button underneath, which deletes the preset.
//
// The reveal is laid out absolutely over a fixed-height footer slot, so opening
// one chip never reflows the horizontal row.
//
// Gesture note: this lives inside a horizontal ScrollView, so the pan is
// constrained to the vertical axis (activeOffsetY) and bails out as soon as the
// finger moves horizontally (failOffsetX). Without both, the swipe and the
// scroll fight each other.

import React, { useEffect } from "react";
import { Pressable, StyleSheet, View, Platform } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

/** Vertical travel (px) before an upward swipe counts as "reveal". */
const REVEAL_THRESHOLD = 18;

const SPRING = { damping: 16, stiffness: 240 } as const;

export function PresetCircleButton({
  icon,
  label,
  tint,
  revealed,
  onPress,
  onRequestReveal,
  onRequestHide,
  onDelete,
  deleteDisabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  tint: { backgroundColor: string; borderColor: string };
  /** Whether this chip is the one currently showing its delete affordance. */
  revealed: boolean;
  onPress: () => void;
  onRequestReveal: () => void;
  onRequestHide: () => void;
  onDelete: () => void;
  /** Turns off the swipe-to-delete gesture only. Tapping the chip still works —
   *  the tutorial's preset step needs the tap to stay live while suppressing an
   *  unrelated gesture. */
  deleteDisabled?: boolean;
}) {
  // 0 = resting, 1 = fully revealed. Drives every part of the animation.
  const progress = useSharedValue(0);
  const pressScale = useSharedValue(1);

  // The parent owns which chip is open (only one at a time), so follow it.
  useEffect(() => {
    progress.value = withSpring(revealed ? 1 : 0, SPRING);
  }, [revealed, progress]);

  const panGesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .failOffsetX([-14, 14])
    .enabled(!deleteDisabled)
    .onUpdate((e) => {
      // Track the finger while dragging: up opens, down closes.
      const base = revealed ? 1 : 0;
      const delta = -e.translationY / (REVEAL_THRESHOLD * 2);
      progress.value = Math.min(1, Math.max(0, base + delta));
    })
    .onEnd((e) => {
      const openedByFling = e.translationY < -REVEAL_THRESHOLD;
      const closedByFling = e.translationY > REVEAL_THRESHOLD;
      if (!revealed && openedByFling) {
        runOnJS(onRequestReveal)();
      } else if (revealed && closedByFling) {
        runOnJS(onRequestHide)();
      } else {
        // Didn't cross the threshold — settle back where it started.
        progress.value = withSpring(revealed ? 1 : 0, SPRING);
      }
    });

  const circleStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: pressScale.value * interpolate(progress.value, [0, 1], [1, 0.72], Extrapolation.CLAMP) },
      { translateY: interpolate(progress.value, [0, 1], [0, -6], Extrapolation.CLAMP) },
    ],
  }));

  // Label and trash cross-fade in the same fixed-height slot below the circle.
  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5], [1, 0], Extrapolation.CLAMP),
  }));

  const trashStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.35, 1], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [8, 0], Extrapolation.CLAMP) },
      { scale: interpolate(progress.value, [0.35, 1], [0.8, 1], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <View style={styles.slot}>
        <Pressable
          onPress={() => {
            // While the delete affordance is open, a tap dismisses it rather
            // than adding an exercise box — otherwise it's far too easy to log
            // something by accident while reaching for the trash.
            if (revealed) onRequestHide();
            else onPress();
          }}
          onPressIn={() => {
            pressScale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
          }}
          onPressOut={() => {
            pressScale.value = withSpring(1, { damping: 15, stiffness: 300 });
          }}
        >
          <Animated.View
            style={[
              styles.circle,
              {
                backgroundColor: tint.backgroundColor,
                borderColor: tint.borderColor,
              },
              circleStyle,
            ]}
          >
            {icon}
          </Animated.View>
        </Pressable>

        <View style={styles.footer}>
          {/* In normal flow so it defines the chip's width, as before. The
              trash floats over it, centered, without affecting layout. */}
          <Animated.Text
            numberOfLines={1}
            style={[styles.label, labelStyle]}
            pointerEvents="none"
          >
            {label}
          </Animated.Text>

          <Animated.View style={[styles.trashWrap, trashStyle]} pointerEvents={revealed ? "auto" : "none"}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                onDelete();
              }}
              hitSlop={8}
              style={({ pressed }) => [styles.trashBtn, pressed && styles.trashBtnPressed]}
            >
              <Ionicons name="trash" size={14} color="#FFFFFF" />
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  slot: {
    alignItems: "center",
    // Width is left to the label, matching the row's other buttons. Only the
    // footer HEIGHT is fixed — that is what stops the trash reveal reflowing
    // the row.
    minWidth: 56,
  },
  circle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: { elevation: 3 },
    }),
  },
  // Fixed HEIGHT so the label→trash cross-fade can't shift the row vertically.
  // Width is left free, so the label still sizes the chip as it always did.
  footer: {
    marginTop: 4,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  // Matches the original actionLabel in workouts.tsx so preset chips look
  // exactly as they did before the swipe gesture was added.
  label: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    fontFamily: "Geist_500Medium",
    textAlign: "center",
  },
  trashWrap: {
    position: "absolute",
  },
  trashBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },
  trashBtnPressed: {
    backgroundColor: "#B91C1C",
  },
});
