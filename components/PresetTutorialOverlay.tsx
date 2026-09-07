// components/PresetTutorialOverlay.tsx
//
// Tutorial overlay for the New Preset screen. Two modes:
//
//  'intro' — full-screen dim with a centered caption. Tapping anywhere advances.
//  'stats' — dims everything EXCEPT a measured rectangle around the Stats boxes
//            (drawn as four panels so the real inputs inside the hole stay
//            tappable), with a highlight ring and an explanatory caption below.
//
// The hole is achieved without native masking: the four dim panels are
// touch-opaque (they swallow taps), while the hole has no panel over it, so
// touches there fall through to the real Stat inputs underneath.

import React from "react";
import { View, Text, Pressable, StyleSheet, Dimensions } from "react-native";

const { width: SCREEN_W } = Dimensions.get("window");
// Keep the highlight box fully on-screen with a margin on each side.
const RING_MARGIN = 2;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const SCRIM = "rgba(0, 0, 0, 0.82)";

const INTRO_TEXT =
  "This is where you choose what statistics you track for your exercises.";

const STATS_TEXT =
  'The most popular preset tracks "Weight" and "Reps" and people use this for Bench Press, Squats, Curls, you get the idea. You can build a preset that tracks anything you want, just type in your statistics, and then you\'ll be able to log any exercises in your new preset.';

export function PresetTutorialOverlay({
  mode,
  statsRect,
  onIntroAdvance,
}: {
  mode: "intro" | "stats";
  /** Window-space rectangle of the Stats section (required for 'stats' mode). */
  statsRect: Rect | null;
  /** Called when the user taps anywhere during 'intro' mode. */
  onIntroAdvance: () => void;
}) {
  if (mode === "intro") {
    return (
      <Pressable style={[styles.fill, styles.introScrim]} onPress={onIntroAdvance}>
        <View style={styles.introTextWrap} pointerEvents="none">
          <Text style={styles.introText}>{INTRO_TEXT}</Text>
          <Text style={styles.tapHint}>Tap anywhere to continue</Text>
        </View>
      </Pressable>
    );
  }

  // 'stats' mode — before we have a measurement, fall back to a full dim so the
  // screen is never briefly interactive.
  if (!statsRect) {
    return <View style={[styles.fill, styles.introScrim]} />;
  }

  const { x, y, width, height } = statsRect;

  // Clamp the highlight ring horizontally so its left/right edges are visible
  // even when the measured stats section spans the full screen width.
  const ringLeft = Math.max(RING_MARGIN, x - 6);
  const ringRight = Math.min(SCREEN_W - RING_MARGIN, x + width + 6);
  const ringWidth = Math.max(0, ringRight - ringLeft);

  return (
    // box-none: the container itself isn't a touch target; only the dim panels
    // (its children) are. The hole has no child, so taps pass to the inputs.
    <View style={styles.fill} pointerEvents="box-none">
      {/* Top panel */}
      <View style={[styles.panel, { top: 0, left: 0, right: 0, height: Math.max(0, y) }]} />
      {/* Left panel (beside the hole) */}
      <View style={[styles.panel, { top: y, height, left: 0, width: Math.max(0, x) }]} />
      {/* Right panel (beside the hole) */}
      <View style={[styles.panel, { top: y, height, left: x + width, right: 0 }]} />
      {/* Bottom panel */}
      <View style={[styles.panel, { top: y + height, left: 0, right: 0, bottom: 0 }]} />

      {/* Highlight ring around the Stats boxes (non-interactive). */}
      <View
        pointerEvents="none"
        style={[styles.highlightRing, { top: y - 4, left: ringLeft, width: ringWidth, height: height + 8 }]}
      />

      {/* Explanatory caption sits just below the highlighted boxes. */}
      <View pointerEvents="none" style={[styles.statsTextWrap, { top: y + height + 24 }]}>
        <Text style={styles.statsText}>{STATS_TEXT}</Text>
        <Text style={styles.tapHint}>Tap a stat box to start typing</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFill,
    zIndex: 99999,
    elevation: 99999,
  },
  introScrim: {
    backgroundColor: SCRIM,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  introTextWrap: {
    alignItems: "center",
  },
  introText: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  tapHint: {
    marginTop: 18,
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.55)",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  panel: {
    position: "absolute",
    backgroundColor: SCRIM,
  },
  highlightRing: {
    position: "absolute",
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
  },
  statsTextWrap: {
    position: "absolute",
    left: 24,
    right: 24,
    alignItems: "center",
  },
  statsText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: -0.1,
    // Narrower column → the text wraps into more lines (taller, less wide).
    maxWidth: 250,
  },
});
