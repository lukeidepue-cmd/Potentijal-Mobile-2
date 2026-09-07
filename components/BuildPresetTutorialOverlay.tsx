// components/BuildPresetTutorialOverlay.tsx
//
// First step of the post-onboarding tutorial. Dims the entire Home screen and
// forces the user to tap "Build New Preset" — every other tap is swallowed by
// the full-screen scrim, so this highlighted button is the only thing they can
// interact with. A big neon "Welcome to AthleteCraft" sits in the center, with a
// "Click Here to Continue" hint + arrow pointing down at the button.
//
// Rendered as the LAST child of the Home root view with a very high zIndex so it
// covers the header, sticky CTA, and everything else.

import React, { useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
} from "react-native-reanimated";

// Wordmark images. Each is trimmed to its artwork (no transparent padding), so
// the gaps below are literal and the intrinsic ratios are exact.
const WELCOME_TO_SRC = require("../assets/tutorial/WelcomeTo.png");
const ATHLETE_SRC = require("../assets/tutorial/Athlete.png");
const CRAFT_SRC = require("../assets/tutorial/Craft.png");

// Source pixel sizes after trimming. Scaled by one factor so the lockup keeps
// the proportions the artwork was drawn at.
const SRC = {
  welcome: { w: 830, h: 106 },
  athlete: { w: 925, h: 192 },
  craft: { w: 1048, h: 453 },
};
const SCALE = 0.239; // widest piece (Craft) lands ~250pt on a standard iPhone

const SIZE = {
  welcome: { width: SRC.welcome.w * SCALE, height: SRC.welcome.h * SCALE },
  athlete: { width: SRC.athlete.w * SCALE, height: SRC.athlete.h * SCALE },
  craft: { width: SRC.craft.w * SCALE, height: SRC.craft.h * SCALE },
};

/** Horizontal nudge off center — Athlete sits left, Craft sits right. */
const OFFSET_X = 22;

/** Fast, slightly springy settle. Snappier than the Training Stats rows, which
 *  use damping 35 / stiffness 100 and are deliberately leisurely. */
const SPRING = { damping: 20, stiffness: 240 } as const;

export function BuildPresetTutorialOverlay({
  onPressBuildPreset,
}: {
  /** Fired when the user taps the highlighted Build New Preset button. Should
   *  complete the tutorial step and navigate to the builder. */
  onPressBuildPreset: () => void;
}) {
  const { width: screenW, height: screenH } = Dimensions.get("window");

  // Off-screen start positions: "Welcome to..." drops in from above, ATHLETE
  // comes in from the left edge, Craft from the right.
  const welcomeY = useSharedValue(-screenH * 0.4);
  const athleteX = useSharedValue(-screenW);
  const craftX = useSharedValue(screenW);

  useEffect(() => {
    // Short stagger so the three read as a sequence but the whole thing is done
    // in well under half a second.
    welcomeY.value = withSpring(0, SPRING);
    athleteX.value = withDelay(80, withSpring(0, SPRING));
    craftX.value = withDelay(160, withSpring(0, SPRING));
  }, []);

  const welcomeStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: welcomeY.value }],
  }));
  const athleteStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: athleteX.value }],
  }));
  const craftStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: craftX.value }],
  }));

  return (
    // The scrim is a plain (touch-opaque) View, so any tap that lands on it is
    // absorbed and never reaches the Home content behind it.
    <View style={styles.scrim}>
      <View style={styles.centerColumn} pointerEvents="box-none">
        {/* Hero lockup — "Welcome to..." centered, ATHLETE nudged left, Craft
            nudged right. Each slides in from the edge it's offset toward. */}
        <View style={styles.lockup} pointerEvents="none">
          <Animated.Image
            source={WELCOME_TO_SRC}
            style={[styles.welcomeImg, welcomeStyle]}
            resizeMode="contain"
          />
          <Animated.Image
            source={ATHLETE_SRC}
            style={[styles.athleteImg, athleteStyle]}
            resizeMode="contain"
          />
          <Animated.Image
            source={CRAFT_SRC}
            style={[styles.craftImg, craftStyle]}
            resizeMode="contain"
          />
        </View>

        {/* Hint + arrow pointing down at the button. */}
        <View style={styles.hintWrap} pointerEvents="none">
          <Text style={styles.hintText}>Click Here to Continue</Text>
          <Ionicons name="arrow-down" size={26} color="#4ADE80" style={styles.hintArrow} />
        </View>

        {/* Highlighted clone of the Home "Build New Preset" row — the only
            tappable element while the tutorial is active. */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onPressBuildPreset();
          }}
          style={({ pressed }) => [
            styles.buildPresetBtn,
            pressed && styles.buildPresetBtnPressed,
          ]}
        >
          <View style={styles.buildPresetIconWrap}>
            <Ionicons name="add" size={18} color="#22C55E" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.buildPresetText}>Build New Preset</Text>
            <Text style={styles.buildPresetSubtext}>Save a custom exercise type</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.55)" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.86)",
    zIndex: 99999,
    elevation: 99999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  centerColumn: {
    width: "100%",
    alignItems: "center",
  },

  /* Hero lockup. Boxes match each image's trimmed aspect ratio exactly, so
     `contain` adds no letterboxing and the margins below are true gaps. */
  lockup: {
    alignItems: "center",
    marginBottom: 44,
  },
  welcomeImg: {
    width: SIZE.welcome.width,
    height: SIZE.welcome.height,
    marginBottom: 14, // gap to ATHLETE
  },
  athleteImg: {
    width: SIZE.athlete.width,
    height: SIZE.athlete.height,
    marginLeft: -OFFSET_X * 2, // nudge left of center
    marginBottom: 4, // gap to Craft
  },
  craftImg: {
    width: SIZE.craft.width,
    height: SIZE.craft.height,
    marginLeft: OFFSET_X * 2, // nudge right of center
  },

  /* Hint + arrow */
  hintWrap: {
    alignItems: "center",
    marginBottom: 14,
  },
  hintText: {
    fontSize: 15,
    fontWeight: "700",
    color: "rgba(255,255,255,0.9)",
    letterSpacing: 0.2,
  },
  hintArrow: {
    marginTop: 2,
    textShadowColor: "rgba(74, 222, 128, 0.8)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },

  // Brighter, glowing version of the Home button so it clearly stands out
  // against the dimmed screen.
  buildPresetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(34, 197, 94, 0.55)",
    backgroundColor: "#141A1F",
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  buildPresetBtnPressed: {
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    borderColor: "rgba(34, 197, 94, 0.8)",
  },
  buildPresetIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(34, 197, 94, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  buildPresetText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  buildPresetSubtext: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.5)",
    marginTop: 1,
    letterSpacing: 0.05,
  },
});
