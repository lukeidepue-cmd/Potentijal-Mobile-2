// app/(tabs)/(home)/build-preset.tsx
// User-defined exercise preset builder.
// Reached from Home (+Build New Preset) and Workouts (+Add Preset).
//
// Redesign 2026-05-29 — Things-3 calm + Linear precision (see
// docs/DESIGN_RESEARCH_2026.md). Generous spacing, one bold action, a
// live preview card so users feel the preset before saving.
import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
} from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Layout,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";

import { theme } from "../../../constants/theme";
import { createPreset } from "../../../lib/api/presets";
import {
  PRESET_ICON_CHOICES,
  PRESET_COLOR_ORDER,
  PRESET_COLOR_TOKENS,
  DEFAULT_PRESET_COLOR,
  getPresetColorTokens,
  type PresetColorKey,
} from "../../../constants/preset-cosmetics";
import { SuccessToast } from "../../../components/SuccessToast";
import { ErrorToast } from "../../../components/ErrorToast";
import { HelpOverlay } from "../../../components/HelpOverlay";
import { PresetTutorialOverlay, type Rect } from "../../../components/PresetTutorialOverlay";
import { useTutorial } from "../../../providers/TutorialContext";

import {
  useFonts as useGeist,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
  Geist_800ExtraBold,
} from "@expo-google-fonts/geist";
import {
  useFonts as useSpaceGrotesk,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";

const MIN_STATS = 2;
const MAX_STATS = 5;

const EXAMPLE_NAMES = ["Drill", "Vertical Jump", "3-Point Shot", "40-yd Sprint"];

export default function BuildPresetScreen() {
  const [geistLoaded] = useGeist({
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    Geist_800ExtraBold,
  });
  const [sgLoaded] = useSpaceGrotesk({ SpaceGrotesk_700Bold });
  const insets = useSafeAreaInsets();

  const [exerciseName, setExerciseName] = useState("");
  const [stats, setStats] = useState<string[]>(["", ""]);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [nameFocused, setNameFocused] = useState(false);
  const [focusedStatIdx, setFocusedStatIdx] = useState<number | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  // Icon + color are required; we pre-select sensible defaults so the user
  // can ship a preset with one tap if they don't care about cosmetics.
  // (Index 0 = dumbbell, DEFAULT_PRESET_COLOR = green — matches the
  // historical visual identity of preset cards.)
  const [iconIndex, setIconIndex] = useState<number>(0);
  const [color, setColor] = useState<PresetColorKey>(DEFAULT_PRESET_COLOR);

  // ---- Tutorial wiring -----------------------------------------------------
  const { step: tutorialStep, setStep: setTutorialStep } = useTutorial();
  // The user is mid-tutorial on this screen (and must not leave) for these steps.
  const presetTutorialActive =
    tutorialStep === "preset_intro" ||
    tutorialStep === "preset_stats" ||
    tutorialStep === "preset_build";

  // Measured window-space rect of the Stats section, used to cut the spotlight
  // hole during the 'preset_stats' step.
  const statsSectionRef = useRef<View>(null);
  const [statsRect, setStatsRect] = useState<Rect | null>(null);

  const measureStats = useCallback(() => {
    statsSectionRef.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) setStatsRect({ x, y, width, height });
    });
  }, []);

  // Re-measure when we enter the stats step (layout has settled by then).
  useEffect(() => {
    if (tutorialStep === "preset_stats") {
      const t = setTimeout(measureStats, 60);
      return () => clearTimeout(t);
    }
  }, [tutorialStep, measureStats]);

  // Block hardware back (Android) until a preset is actually created.
  useEffect(() => {
    if (!presetTutorialActive) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, [presetTutorialActive]);

  // Called when a Stat box gains focus — clears the dim by advancing the step.
  const handleStatFocusForTutorial = useCallback(() => {
    if (tutorialStep === "preset_stats") {
      setTutorialStep("preset_build");
    }
  }, [tutorialStep, setTutorialStep]);

  const selectedIcon = PRESET_ICON_CHOICES[iconIndex];
  const colorTokens = getPresetColorTokens(color);

  const buttonScale = useSharedValue(1);
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const nameUnderlineProgress = useSharedValue(0);
  const nameUnderlineStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + nameUnderlineProgress.value * 0.65,
    transform: [{ scaleX: 0.85 + nameUnderlineProgress.value * 0.15 }],
  }));

  const updateStat = (index: number, value: string) => {
    setStats(prev => prev.map((s, i) => (i === index ? value : s)));
  };

  const addStatistic = () => {
    if (stats.length >= MAX_STATS) return;
    Haptics.selectionAsync();
    setStats(prev => [...prev, ""]);
  };

  const removeStatistic = (index: number) => {
    if (stats.length <= MIN_STATS) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStats(prev => prev.filter((_, i) => i !== index));
  };

  const canCreate =
    exerciseName.trim().length > 0 &&
    stats.length >= MIN_STATS &&
    stats.every(s => s.trim().length > 0);

  // Live preview values — keep one placeholder example rotating until the user types.
  const previewName = exerciseName.trim() || "Your preset";
  const previewStats = useMemo(
    () =>
      stats.map((s, i) => (s.trim().length > 0 ? s.trim() : `Stat ${i + 1}`)),
    [stats],
  );
  // Pick a stable example for the helper based on name length
  const exampleHelper = useMemo(() => {
    const i = exerciseName.length % EXAMPLE_NAMES.length;
    return EXAMPLE_NAMES[i];
  }, [exerciseName]);

  const save = async () => {
    if (!canCreate || saving) return;

    setSaving(true);
    Haptics.selectionAsync();

    const { error } = await createPreset({
      name: exerciseName,
      statNames: stats,
      iconSet: selectedIcon.set,
      iconName: selectedIcon.name,
      color,
    });

    setSaving(false);

    if (error) {
      setErrorMessage(error.message || "Failed to create preset. Please try again.");
      setShowError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setShowSuccess(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Creating a preset is the exit condition for the New Preset tutorial steps.
    // Instead of finishing, advance to the next phase: back on Home, highlight
    // the Workouts tab. (This also lifts the back-blocking on this screen.)
    if (presetTutorialActive) setTutorialStep("home_workout_tab");
    setTimeout(() => router.back(), 1000);
  };

  if (!geistLoaded || !sgLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={theme.semantic.accent.solid} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <SuccessToast message="Preset created!" visible={showSuccess} onHide={() => setShowSuccess(false)} />
      <ErrorToast message={errorMessage} visible={showError} onHide={() => setShowError(false)} />

      {/* Compact header — keeps the green identity but cedes hero space to content */}
      <LinearGradient
        colors={["#1F5C42", "#16432F", theme.semantic.bg.canvas]}
        locations={[0, 0.55, 1]}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => {
              // During the tutorial the user can't leave until they create a
              // preset — swallow the back tap.
              if (presetTutorialActive) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                return;
              }
              Haptics.selectionAsync();
              router.back();
            }}
            hitSlop={12}
            style={({ pressed }) => [
              styles.backBtn,
              presetTutorialActive && { opacity: 0.35 },
              pressed && !presetTutorialActive && { opacity: 0.6 },
            ]}
          >
            <Ionicons name="chevron-back" size={22} color={theme.semantic.text.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>New Preset</Text>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setShowHelp(true);
            }}
            hitSlop={12}
            style={({ pressed }) => [styles.helpBtn, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="help-circle" size={22} color={theme.semantic.text.primary} />
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 160 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* — Section 1: Name —
            Caption above + large but well-anchored input + animated underline.
            (Replaces the 32pt floating placeholder that took up a third of the screen.) */}
        <View style={styles.section}>
          <Text style={styles.sectionKicker}>NAME</Text>
          <TextInput
            value={exerciseName}
            onChangeText={setExerciseName}
            placeholder={`e.g., ${exampleHelper}`}
            placeholderTextColor={theme.semantic.text.tertiary}
            style={styles.nameInput}
            onFocus={() => {
              setNameFocused(true);
              nameUnderlineProgress.value = withSpring(1, theme.spring.snappy);
            }}
            onBlur={() => {
              setNameFocused(false);
              nameUnderlineProgress.value = withSpring(0, theme.spring.smooth);
            }}
            autoCorrect={false}
            autoCapitalize="words"
            returnKeyType="next"
          />
          <Animated.View
            style={[
              styles.nameUnderline,
              { backgroundColor: nameFocused ? theme.semantic.accent.solid : theme.semantic.border.subtle },
              nameUnderlineStyle,
            ]}
          />
        </View>

        {/* — Section 2: Stats —
            Indexed inputs with a chip badge so users see how many they've added. */}
        <View ref={statsSectionRef} onLayout={measureStats} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionKicker}>STATS</Text>
            <Text style={styles.sectionCount}>
              {stats.length} <Text style={styles.sectionCountDim}>/ {MAX_STATS}</Text>
            </Text>
          </View>

          {stats.map((value, index) => (
            <Animated.View
              key={index}
              layout={Layout.springify().damping(20).stiffness(170)}
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(150)}
              style={[
                styles.statRow,
                focusedStatIdx === index && styles.statRowFocused,
              ]}
            >
              <View style={styles.statIndex}>
                <Text style={styles.statIndexText}>{index + 1}</Text>
              </View>
              <TextInput
                value={value}
                onChangeText={(t) => updateStat(index, t)}
                placeholder={index === 0 ? "Reps" : index === 1 ? "Weight" : `Stat ${index + 1}`}
                placeholderTextColor={theme.semantic.text.tertiary}
                style={styles.statInput}
                returnKeyType={index === stats.length - 1 ? "done" : "next"}
                autoCapitalize="words"
                autoCorrect={false}
                onFocus={() => {
                  setFocusedStatIdx(index);
                  handleStatFocusForTutorial();
                }}
                onBlur={() => setFocusedStatIdx(null)}
              />
              {stats.length > MIN_STATS && (
                <Pressable
                  onPress={() => removeStatistic(index)}
                  hitSlop={10}
                  style={({ pressed }) => [styles.statRemove, pressed && { opacity: 0.5 }]}
                >
                  <Ionicons name="close" size={16} color={theme.semantic.text.tertiary} />
                </Pressable>
              )}
            </Animated.View>
          ))}

          {stats.length < MAX_STATS && (
            <Pressable
              onPress={addStatistic}
              style={({ pressed }) => [styles.addStatBtn, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="add" size={16} color={theme.semantic.text.secondary} />
              <Text style={styles.addStatText}>Add stat</Text>
            </Pressable>
          )}
          <Text style={styles.sectionHelp}>
            Each stat becomes an input on every set.
          </Text>
        </View>

        {/* — Section 3: Live preview —
            Mirrors how the preset will render in the Workouts builder.
            Borrowed from Things 3 / Linear: confidence before commit. */}
        <View style={styles.section}>
          <Text style={styles.sectionKicker}>PREVIEW</Text>

          <View style={[styles.previewCard, { borderColor: colorTokens.border }]}>
            <LinearGradient
              colors={[colorTokens.wash, colorTokens.subtle]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.previewHeader}
            >
              <View
                style={[
                  styles.previewIconCircle,
                  { borderColor: colorTokens.border, backgroundColor: colorTokens.subtle },
                ]}
              >
                {selectedIcon.set === "mci" ? (
                  <MaterialCommunityIcons
                    name={selectedIcon.name as any}
                    size={20}
                    color={colorTokens.solid}
                  />
                ) : (
                  <Ionicons
                    name={selectedIcon.name as any}
                    size={20}
                    color={colorTokens.solid}
                  />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.previewName} numberOfLines={1}>
                  {previewName}
                </Text>
                <Text style={styles.previewSub}>Set 1</Text>
              </View>
            </LinearGradient>

            <View style={styles.previewBody}>
              {previewStats.map((statName, i) => (
                <View key={i} style={styles.previewStatChip}>
                  <Text style={styles.previewStatLabel}>{statName}</Text>
                  <View style={styles.previewStatField}>
                    <Text style={styles.previewStatPlaceholder}>—</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* — Section 4: Icon —
            Single-select grid. Pre-selected to dumbbell so users can ship
            without touching it. Selection drives the preview above. */}
        <View style={styles.section}>
          <Text style={styles.sectionKicker}>ICON</Text>
          <View style={styles.iconGrid}>
            {PRESET_ICON_CHOICES.map((choice, idx) => {
              const selected = idx === iconIndex;
              return (
                <Pressable
                  key={`${choice.set}-${choice.name}`}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setIconIndex(idx);
                  }}
                  accessibilityLabel={choice.label}
                  style={({ pressed }) => [
                    styles.iconTile,
                    selected && {
                      borderColor: colorTokens.solid,
                      backgroundColor: colorTokens.subtle,
                    },
                    pressed && !selected && { opacity: 0.7 },
                  ]}
                >
                  {choice.set === "mci" ? (
                    <MaterialCommunityIcons
                      name={choice.name as any}
                      size={22}
                      color={selected ? colorTokens.solid : theme.semantic.text.secondary}
                    />
                  ) : (
                    <Ionicons
                      name={choice.name as any}
                      size={22}
                      color={selected ? colorTokens.solid : theme.semantic.text.secondary}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.sectionHelp}>
            Shown on the preset chip in the Workouts tab.
          </Text>
        </View>

        {/* — Section 5: Color —
            7 swatches. Drives the exercise card header in Workouts and the
            workout card in History. */}
        <View style={styles.section}>
          <Text style={styles.sectionKicker}>COLOR</Text>
          <View style={styles.colorRow}>
            {PRESET_COLOR_ORDER.map((key) => {
              const tokens = PRESET_COLOR_TOKENS[key];
              const selected = key === color;
              return (
                <Pressable
                  key={key}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setColor(key);
                  }}
                  accessibilityLabel={`${key} color`}
                  style={({ pressed }) => [
                    styles.colorSwatch,
                    { borderColor: selected ? "#FFFFFF" : tokens.border },
                    selected && styles.colorSwatchSelected,
                    pressed && !selected && { opacity: 0.8 },
                  ]}
                >
                  <View style={[styles.colorSwatchFill, { backgroundColor: tokens.solid }]} />
                  {selected && (
                    <View style={styles.colorSwatchCheck}>
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.sectionHelp}>
            Used by this preset's exercise cards and history entries.
          </Text>
        </View>
      </ScrollView>

      {/* Sticky Create CTA — semantic accent, never pure white shadow.
          Bottom padding is set so the Create button sits at the same
          screen-Y position as Edit Schedule on Home (~78pt from screen
          bottom). Home's tab bar adds its own 80pt of bottom inset; this
          screen has no tab bar, so we add the offset manually. */}
      <LinearGradient
        colors={["rgba(10,14,18,0)", "rgba(10,14,18,0.92)"]}
        style={[styles.footerScrim, { paddingBottom: insets.bottom + 46 }]}
        pointerEvents="box-none"
      >
        <Animated.View style={buttonAnimatedStyle}>
          <Pressable
            onPress={save}
            disabled={!canCreate || saving}
            onPressIn={() => {
              if (!canCreate || saving) return;
              buttonScale.value = withSpring(0.97, theme.spring.snappy);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            onPressOut={() => {
              buttonScale.value = withSpring(1, theme.spring.snappy);
            }}
            style={({ pressed }) => [
              styles.createBtn,
              !canCreate && styles.createBtnDisabled,
              saving && { opacity: 0.7 },
            ]}
          >
            {saving ? (
              <ActivityIndicator color={theme.semantic.text.inverse} />
            ) : (
              <>
                <Text
                  style={[
                    styles.createBtnText,
                    !canCreate && styles.createBtnTextDisabled,
                  ]}
                >
                  Create preset
                </Text>
                {canCreate && (
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={theme.semantic.text.inverse}
                    style={{ marginLeft: 8 }}
                  />
                )}
              </>
            )}
          </Pressable>
        </Animated.View>
      </LinearGradient>

      {/* Help overlay — same pattern as Progress Graph / Skill Map */}
      <HelpOverlay
        visible={showHelp}
        onClose={() => setShowHelp(false)}
        title="Preset Builder Guide"
      >
        <View style={helpStyles.section}>
          <Text style={helpStyles.heading}>What A Preset Is</Text>
          <Text style={helpStyles.text}>
            A preset is a reusable <Text style={helpStyles.bold}>template</Text> for the kind of thing you want to track. It doesn't have to be a traditional exercise — build one for lifts, shooting drills, sprints, sleep, anything. A preset defines two things: an exercise name to start from, and the <Text style={helpStyles.bold}>statistics</Text> you'll fill in every time you log it.
          </Text>
        </View>

        <View style={helpStyles.section}>
          <Text style={helpStyles.heading}>Preset vs. Exercise</Text>
          <Text style={helpStyles.text}>
            The preset is the template; the exercises are the things you log under it. Once a preset exists, you can log many differently-named exercises with it (e.g. an "Exercise" preset holds "Bench Press", "Squat", "Deadlift"). Every set you log in a box with the same name counts as the same exercise over time.
          </Text>
        </View>

        <View style={helpStyles.section}>
          <Text style={helpStyles.heading}>How To Build One</Text>
          <Text style={helpStyles.bullet}>1. <Text style={helpStyles.bold}>Name it.</Text> Type the exercise name this preset starts with (e.g. "Bench Press").</Text>
          <Text style={helpStyles.bullet}>2. <Text style={helpStyles.bold}>Add statistics.</Text> These are the values you'll enter for each set (e.g. "Reps" and "Weight"). You need at least two; tap "+Add Statistic" for more, up to five.</Text>
          <Text style={helpStyles.bullet}>3. <Text style={helpStyles.bold}>Pick an icon and color.</Text> Purely cosmetic — they make the preset easy to spot in Workouts and tint its exercise boxes in your history.</Text>
          <Text style={helpStyles.bullet}>4. <Text style={helpStyles.bold}>Create preset.</Text> It's saved to your account and appears as a button in the Workouts tab.</Text>
        </View>

        <View style={helpStyles.section}>
          <Text style={helpStyles.heading}>Choosing Good Statistics</Text>
          <Text style={helpStyles.text}>
            Statistics are the raw numbers you record per set — keep them simple and measurable. Examples: "Reps" + "Weight" for lifting, "Made" + "Attempted" for shooting, "Distance" + "Time" for sprints. Whatever you choose becomes the input fields on the exercise card when you log a workout.
          </Text>
          <Text style={helpStyles.text}>
            Order matters a little: the stats show up in your logging fields and history in the order you add them, so put the one you fill in first at the top.
          </Text>
        </View>

        <View style={helpStyles.section}>
          <Text style={helpStyles.heading}>Why The Statistics Matter Later</Text>
          <Text style={helpStyles.text}>
            The stats you define here are what powers the <Text style={helpStyles.bold}>Progress Graph</Text> and <Text style={helpStyles.bold}>Skill Map</Text>. There you build "Views" that combine these stat names into a single number (e.g. Reps × Weight) and aggregate them (Highest, Total, or Average). So pick stat names you'll actually want to chart — they're the vocabulary every view is built from.
          </Text>
        </View>

        <View style={helpStyles.section}>
          <Text style={helpStyles.heading}>The Preview Card</Text>
          <Text style={helpStyles.text}>
            The card near the bottom updates live as you type — it's exactly how the preset will look in the Workouts tab, with your chosen name, icon, color, and stat fields. Use it to sanity-check before you hit Create.
          </Text>
        </View>
      </HelpOverlay>

      {/* Tutorial overlays for the New Preset screen. 'preset_intro' dims the
          whole screen with a caption; 'preset_stats' spotlights the Stats boxes
          and lets the user tap into them to continue. */}
      {(tutorialStep === "preset_intro" || tutorialStep === "preset_stats") && (
        <PresetTutorialOverlay
          mode={tutorialStep === "preset_intro" ? "intro" : "stats"}
          statsRect={statsRect}
          onIntroAdvance={() => setTutorialStep("preset_stats")}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.semantic.bg.canvas },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.semantic.bg.canvas,
    alignItems: "center",
    justifyContent: "center",
  },

  header: { paddingBottom: 28 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.space.px16,
    paddingTop: 6,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.20)",
  },
  helpBtn: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.20)",
  },
  headerTitle: {
    ...theme.type.preset.titleM,
    color: theme.semantic.text.primary,
    fontFamily: "Geist_600SemiBold",
  },

  section: {
    paddingHorizontal: theme.space.px24,
    paddingTop: theme.space.px24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: theme.space.px12,
  },
  sectionKicker: {
    ...theme.type.preset.micro,
    color: theme.semantic.text.tertiary,
    marginBottom: theme.space.px12,
    fontFamily: "Geist_700Bold",
  },
  sectionCount: {
    ...theme.type.preset.caption,
    color: theme.semantic.text.secondary,
    fontFamily: "Geist_600SemiBold",
    fontVariant: ["tabular-nums"],
  },
  sectionCountDim: {
    color: theme.semantic.text.tertiary,
  },
  sectionHelp: {
    ...theme.type.preset.caption,
    color: theme.semantic.text.tertiary,
    marginTop: theme.space.px12,
    lineHeight: 18,
  },

  /* Name input — looks like a clean editorial heading with an underline accent. */
  nameInput: {
    fontSize: 30,
    lineHeight: 36,
    fontFamily: "SpaceGrotesk_700Bold",
    fontWeight: "700",
    letterSpacing: -0.6,
    color: theme.semantic.text.primary,
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  nameUnderline: {
    height: 1.5,
    borderRadius: 1,
    marginTop: 4,
  },

  /* Stat rows — indexed pill + input + optional remove. */
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space.px12,
    paddingHorizontal: theme.space.px16,
    height: 56,
    backgroundColor: theme.semantic.bg.surface,
    borderWidth: 1,
    borderColor: theme.semantic.border.subtle,
    borderRadius: theme.radius.lg,
    marginBottom: theme.space.px8,
  },
  statRowFocused: {
    borderColor: theme.semantic.accent.solid,
    backgroundColor: theme.semantic.bg.surfaceElevated,
  },
  statIndex: {
    width: 24,
    height: 24,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.semantic.accent.subtle,
    alignItems: "center",
    justifyContent: "center",
  },
  statIndexText: {
    fontSize: 12,
    fontFamily: "Geist_700Bold",
    fontWeight: "700",
    color: theme.semantic.accent.solid,
    fontVariant: ["tabular-nums"],
  },
  statInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Geist_500Medium",
    color: theme.semantic.text.primary,
    padding: 0,
  },
  statRemove: {
    width: 24,
    height: 24,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.semantic.bg.subtle,
  },
  addStatBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 44,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.semantic.border.subtle,
    borderStyle: "dashed",
    backgroundColor: "transparent",
    marginTop: 4,
  },
  addStatText: {
    fontSize: 13,
    fontFamily: "Geist_600SemiBold",
    fontWeight: "600",
    color: theme.semantic.text.secondary,
  },

  /* Live preview — looks like an actual exercise card in the Workouts tab. */
  previewCard: {
    borderRadius: theme.radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.semantic.border.subtle,
    backgroundColor: theme.semantic.bg.surface,
    ...(theme.elevation.e1 as object),
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space.px12,
    paddingHorizontal: theme.space.px16,
    paddingVertical: theme.space.px16,
  },
  previewIconCircle: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.semantic.bg.canvas,
    borderWidth: 1,
    borderColor: theme.semantic.accent.subtle,
  },
  previewName: {
    fontSize: 17,
    lineHeight: 22,
    fontFamily: "Geist_700Bold",
    fontWeight: "700",
    color: theme.semantic.text.primary,
    letterSpacing: -0.2,
  },
  previewSub: {
    fontSize: 12,
    fontFamily: "Geist_500Medium",
    color: theme.semantic.text.tertiary,
    marginTop: 2,
  },
  previewBody: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.space.px8,
    padding: theme.space.px16,
    paddingTop: theme.space.px12,
  },
  previewStatChip: {
    flexGrow: 1,
    flexBasis: "30%",
    minWidth: 90,
  },
  previewStatLabel: {
    fontSize: 11,
    fontFamily: "Geist_600SemiBold",
    fontWeight: "600",
    color: theme.semantic.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  previewStatField: {
    height: 36,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.semantic.bg.canvas,
    borderWidth: 1,
    borderColor: theme.semantic.border.hairline,
    alignItems: "center",
    justifyContent: "center",
  },
  previewStatPlaceholder: {
    fontSize: 18,
    fontFamily: "Geist_500Medium",
    color: theme.semantic.text.muted,
  },

  /* Icon picker — 4-column grid of tappable tiles. */
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.space.px8,
  },
  iconTile: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.md,
    backgroundColor: theme.semantic.bg.surface,
    borderWidth: 1.5,
    borderColor: theme.semantic.border.subtle,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Color picker — single row of round swatches. */
  colorRow: {
    flexDirection: "row",
    gap: theme.space.px8,
    alignItems: "center",
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.pill,
    borderWidth: 2,
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  colorSwatchSelected: {
    transform: [{ scale: 1.08 }],
  },
  colorSwatchFill: {
    width: "100%",
    height: "100%",
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  colorSwatchCheck: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Sticky footer */
  footerScrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: theme.space.px16,
    paddingTop: theme.space.px24,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.semantic.accent.solid,
    borderRadius: theme.radius.lg,
    height: 56,
    paddingHorizontal: theme.space.px24,
    shadowColor: theme.semantic.accent.solid,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  createBtnDisabled: {
    backgroundColor: theme.semantic.bg.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.semantic.border.subtle,
    shadowOpacity: 0,
    elevation: 0,
  },
  createBtnText: {
    fontSize: 16,
    fontFamily: "Geist_700Bold",
    fontWeight: "700",
    color: theme.semantic.text.inverse,
    letterSpacing: -0.1,
  },
  createBtnTextDisabled: {
    color: theme.semantic.text.tertiary,
  },
});

// Help overlay content styling — mirrors the Progress Graph / Skill Map guides.
const helpStyles = StyleSheet.create({
  section: {
    gap: 12,
  },
  heading: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(255, 255, 255, 0.9)",
  },
  bullet: {
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(255, 255, 255, 0.8)",
    marginLeft: 8,
    marginTop: 4,
  },
  bold: {
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
