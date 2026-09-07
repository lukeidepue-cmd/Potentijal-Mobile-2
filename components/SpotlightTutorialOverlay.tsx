// components/SpotlightTutorialOverlay.tsx
//
// App-level tutorial overlay rendered ABOVE the tab bar (in the tabs layout) so
// it can spotlight BOTH screen content and a real tab button at once. It dims
// the whole screen except up to two holes — an optional content rect (reported
// by the active screen via TutorialContext) and an optional tab rect (computed
// here from the step). Touches inside a hole fall through to the real UI; the
// dim panels swallow everything else.
//
// Holes are assumed vertically ordered: content (upper) above tab (lower).

import React from "react";
import { View, Text, StyleSheet, Dimensions, Platform, Pressable, Keyboard } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { TutorialStep, Rect } from "../lib/tutorial";

const SCRIM = "rgba(0, 0, 0, 0.82)";
const VISIBLE_TAB_COUNT = 4; // Home, Workouts, Progress, History

// Which tab (if any) each step spotlights, by visible-tab index.
const TAB_INDEX_FOR_STEP: Partial<Record<TutorialStep, number>> = {
  home_workout_tab: 1, // Workouts
  workouts_progress_tab: 2, // Progress
};

// Caption shown below the content hole for each step (null = no caption).
const CONTENT_CAPTION: Partial<Record<TutorialStep, string>> = {
  workouts_preset:
    "Here is where you’ll log your workouts. Just tap one of your presets to add an exercise box.",
  workouts_exercise_box:
    "This is an exercise box. You can name your exercise and then add the statistics from the performed exercise. Exercise boxes with the same name collect data for the same exercise, so you can see your progress on that exercise over time.",
};

// Full-screen "intro" steps: a centered caption over a full dim, tap to advance.
const INTRO_CAPTION: Partial<Record<TutorialStep, string>> = {
  progress_graph_intro:
    "This is where you’ll be able to visually see your progress on any exercise. To see the data you want, you’ll need to create a View.",
  view_intro:
    "With Views you choose how your data from your exercises is displayed on the graph — and you can always switch between Views.",
};

// A small hint pinned near the spotlighted tab.
const TAB_HINT: Partial<Record<TutorialStep, string>> = {
  home_workout_tab: "Tap the Workouts tab",
  workouts_progress_tab: "Now tap the Progress tab",
};

// An up-arrow + caption shown BELOW the spotlighted content (arrow points up at it).
const BELOW_HINT: Partial<Record<TutorialStep, string>> = {
  progress_build_view_button: "Click Here to Continue",
};

function band(W: number, y1: number, y2: number): Rect | null {
  return y2 > y1 ? { x: 0, y: y1, width: W, height: y2 - y1 } : null;
}

/** Build dim panels covering everything except the (vertically ordered) holes. */
function buildPanels(W: number, H: number, holes: Rect[]): Rect[] {
  const panels: Rect[] = [];
  let cursorY = 0;
  for (const hole of holes) {
    const top = band(W, cursorY, hole.y);
    if (top) panels.push(top);
    if (hole.x > 0) panels.push({ x: 0, y: hole.y, width: hole.x, height: hole.height });
    const rx = hole.x + hole.width;
    if (rx < W) panels.push({ x: rx, y: hole.y, width: W - rx, height: hole.height });
    cursorY = hole.y + hole.height;
  }
  const bottom = band(W, cursorY, H);
  if (bottom) panels.push(bottom);
  return panels;
}

export function SpotlightTutorialOverlay({
  step,
  contentRect,
  onIntroAdvance,
}: {
  step: TutorialStep;
  /** Window-space rect of the spotlighted screen element, or null. */
  contentRect: Rect | null;
  /** Called when the user taps anywhere during a full-screen intro step. */
  onIntroAdvance?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = Dimensions.get("window");

  // Full-screen intro step: centered caption, tap anywhere to continue.
  const introCaption = INTRO_CAPTION[step];
  if (introCaption) {
    return (
      <Pressable style={[styles.fill, styles.introScrim]} onPress={onIntroAdvance}>
        <View style={styles.introTextWrap} pointerEvents="none">
          <Text style={styles.introText}>{introCaption}</Text>
          <Text style={styles.introHint}>Tap anywhere to continue</Text>
        </View>
      </Pressable>
    );
  }

  // Compute the tab hole from the step (geometry: equal-width tabs at bottom).
  const tabIndex = TAB_INDEX_FOR_STEP[step];
  let tabRect: Rect | null = null;
  if (tabIndex != null) {
    const tabW = W / VISIBLE_TAB_COUNT;
    // Fixed (shorter) height that hugs the tab icon + label; not tied to the
    // bottom inset so it doesn't balloon on notched phones. Width = one tab.
    const holeH = Platform.OS === "ios" ? 70 : 58;
    tabRect = { x: tabIndex * tabW, y: H - holeH, width: tabW, height: holeH };
  }

  // Per-step box insets (positive = shrink in, negative = grow out).
  //  - exercise-box steps: pull the sides in a little, the bottom in a lot.
  //  - progress-graph card: grow out slightly (the card renders scaled up 1.08
  //    but is measured at its base size, so the box reads small).
  const isExerciseBox =
    step === "workouts_exercise_box" || step === "workouts_progress_tab";
  const isGraphCard = step === "progress_graph_button";
  const insetX = isExerciseBox ? 12 : isGraphCard ? 0 : 0; // both sides
  const insetTop = isGraphCard ? -10 : 0;
  const insetBottom = isExerciseBox ? 36 : isGraphCard ? -10 : 0;

  // The bright hole (and the dim panels around it) use the inset rect, so the
  // dim area AND the white ring move together — not just the ring.
  const holeRect: Rect | null = contentRect
    ? {
        x: contentRect.x + insetX,
        y: contentRect.y + insetTop,
        width: Math.max(0, contentRect.width - 2 * insetX),
        height: Math.max(0, contentRect.height - insetTop - insetBottom),
      }
    : null;

  const holes = [holeRect, tabRect].filter(Boolean) as Rect[];

  // SAFETY: with no holes, buildPanels() returns a single panel covering the
  // whole screen — a fully opaque scrim whose only handler is Keyboard.dismiss(),
  // with no caption (captions are gated on holeRect). Combined with the tab
  // gating in (tabs)/_layout.tsx, which blocks every tab that isn't the current
  // step's target, that locks the user out of the entire app with no way to
  // advance, go back, or escape.
  //
  // It happens whenever a content step's owning screen isn't mounted to publish
  // its rect — most easily by relaunching the app mid-tutorial, which restores
  // the step but lands the user on Home. Never render a blocking scrim we can't
  // give the user a way out of; the layout re-routes to the owning screen so the
  // step can resume properly.
  if (holes.length === 0) return null;

  const panels = buildPanels(W, H, holes);

  // Ring hugs the hole with a small halo, clamped so its edges stay on-screen.
  const RING_MARGIN = 0;
  let contentRingLeft = 0;
  let contentRingWidth = 0;
  let contentRingTop = 0;
  let contentRingHeight = 0;
  if (holeRect) {
    contentRingLeft = Math.max(RING_MARGIN, holeRect.x - 6);
    const right = Math.min(W - RING_MARGIN, holeRect.x + holeRect.width + 6);
    contentRingWidth = Math.max(0, right - contentRingLeft);
    contentRingTop = holeRect.y - 4;
    contentRingHeight = holeRect.height + 8;
  }

  const contentCaption = CONTENT_CAPTION[step];
  const tabHint = TAB_HINT[step];
  const belowHint = BELOW_HINT[step];

  return (
    // box-none: only the dim panels are touch targets; holes pass touches down.
    <View style={styles.fill} pointerEvents="box-none">
      {panels.map((p, i) => (
        // Tapping the dim area dismisses the keyboard (so a keyboard opened while
        // editing the exercise box doesn't hide the highlighted Progress tab).
        <Pressable
          key={i}
          onPress={() => Keyboard.dismiss()}
          style={{ position: "absolute", left: p.x, top: p.y, width: p.width, height: p.height, backgroundColor: SCRIM }}
        />
      ))}

      {/* Highlight rings (non-interactive). */}
      {contentRect && (
        <View
          pointerEvents="none"
          style={[
            styles.ring,
            { top: contentRingTop, left: contentRingLeft, width: contentRingWidth, height: contentRingHeight },
          ]}
        />
      )}
      {tabRect && (
        <View
          pointerEvents="none"
          style={[
            styles.tabRing,
            { top: tabRect.y, left: tabRect.x, width: tabRect.width, height: tabRect.height },
          ]}
        />
      )}

      {/* Caption below the content hole. */}
      {holeRect && contentCaption && (
        <View pointerEvents="none" style={[styles.captionWrap, { top: holeRect.y + holeRect.height + 28 }]}>
          <Text style={styles.captionText}>{contentCaption}</Text>
        </View>
      )}

      {/* Up-arrow + "Click Here to Continue" below the spotlighted button,
          centered horizontally on the button itself. */}
      {holeRect && belowHint && (
        <View
          pointerEvents="none"
          style={[
            styles.belowHintWrap,
            {
              top: holeRect.y + holeRect.height + 12,
              transform: [{ translateX: holeRect.x + holeRect.width / 2 - W / 2 }],
            },
          ]}
        >
          <Ionicons name="arrow-up" size={26} color="#4ADE80" style={styles.belowHintArrow} />
          <Text style={styles.belowHintText}>{belowHint}</Text>
        </View>
      )}

      {/* Hint above the spotlighted tab — styled like the welcome screen's
          "Click Here to Continue", with an arrow pointing down at the tab. */}
      {tabRect && tabHint && (
        <View
          pointerEvents="none"
          style={[
            styles.tabHintWrap,
            {
              top: tabRect.y - 54,
              // Shift the screen-centered group so it's centered on the tab itself.
              transform: [{ translateX: tabRect.x + tabRect.width / 2 - W / 2 }],
            },
          ]}
        >
          <Text style={styles.tabHintText}>{tabHint}</Text>
          <Ionicons name="arrow-down" size={26} color="#4ADE80" style={styles.tabHintArrow} />
        </View>
      )}
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
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  introHint: {
    marginTop: 18,
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.55)",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  ring: {
    position: "absolute",
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  tabRing: {
    position: "absolute",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  captionWrap: {
    position: "absolute",
    left: 24,
    right: 24,
    alignItems: "center",
  },
  captionText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: -0.1,
  },
  tabHintWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    alignItems: "center",
  },
  tabHintText: {
    fontSize: 15,
    fontWeight: "700",
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  tabHintArrow: {
    marginTop: 2,
    textShadowColor: "rgba(74, 222, 128, 0.8)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  belowHintWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    alignItems: "center",
  },
  belowHintArrow: {
    marginBottom: 2,
    textShadowColor: "rgba(74, 222, 128, 0.8)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  belowHintText: {
    fontSize: 15,
    fontWeight: "700",
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    letterSpacing: 0.2,
    // Nudge just the text right (arrow stays put).
    transform: [{ translateX: 12 }],
  },
});
