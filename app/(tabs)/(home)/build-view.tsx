// app/(tabs)/(home)/build-view.tsx
// Build a Progress Graph View on top of a user-defined preset.
// Reached from the Progress Graphs screen via +Build New View.
import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  BackHandler,
  Alert,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabOverflow } from "../../../components/ui/TabBarBackground";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

import { theme } from "../../../constants/theme";
import { listPresets, type ExercisePreset } from "../../../lib/api/presets";
import {
  createView,
  listViews,
  deleteView,
  type ExerciseView,
  type ViewOperation,
  type ViewAggregation,
} from "../../../lib/api/views";
import { SuccessToast } from "../../../components/SuccessToast";
import { ErrorToast } from "../../../components/ErrorToast";
import { useTutorial } from "../../../providers/TutorialContext";

import {
  useFonts as useGeist,
  Geist_700Bold,
  Geist_800ExtraBold,
} from "@expo-google-fonts/geist";

export default function BuildViewScreen() {
  const [geistLoaded] = useGeist({ Geist_700Bold, Geist_800ExtraBold });
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabOverflow();
  // Which Progress screen opened this, so saving can return there.
  // Defaults to the Progress Graph when absent.
  const { from } = useLocalSearchParams<{ from?: string }>();

  const [presets, setPresets] = useState<ExercisePreset[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(true);

  // Builder state
  const [viewName, setViewName] = useState("");
  const [presetId, setPresetId] = useState<string | null>(null);
  // Stat names selected from the chosen preset, in tap order.
  const [selectedStats, setSelectedStats] = useState<string[]>([]);
  const [operation, setOperation] = useState<ViewOperation>("multiply");
  const [aggregation, setAggregation] = useState<ViewAggregation>("highest");

  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const buttonScale = useSharedValue(1);
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  useEffect(() => {
    listPresets().then(({ data }) => {
      if (data) setPresets(data);
      setPresetsLoading(false);
    });
  }, []);

  // ---- Existing views + delete-selection mode -------------------------------
  const [views, setViews] = useState<ExerciseView[]>([]);
  const [viewsLoading, setViewsLoading] = useState(true);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedViewIds, setSelectedViewIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  const loadViews = useCallback(() => {
    return listViews().then(({ data }) => {
      if (data) setViews(data);
      setViewsLoading(false);
    });
  }, []);

  useEffect(() => {
    loadViews();
  }, [loadViews]);

  const toggleViewSelected = (id: string) => {
    Haptics.selectionAsync();
    setSelectedViewIds(prev =>
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedViewIds([]);
  };

  const confirmDeleteViews = () => {
    if (selectedViewIds.length === 0) return;
    const count = selectedViewIds.length;
    Alert.alert(
      count === 1 ? "Delete this view?" : `Delete ${count} views?`,
      // Views are only a way of displaying data — deleting one never touches a
      // logged set — so this warning stays deliberately light.
      "This only removes how the data is displayed. None of your logged workouts are affected.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            const results = await Promise.all(selectedViewIds.map(id => deleteView(id)));
            setDeleting(false);
            const failed = results.filter(r => r.error).length;
            if (failed > 0) {
              setErrorMessage(
                failed === count
                  ? "Couldn't delete those views. Please try again."
                  : `Deleted ${count - failed} of ${count}. Please try the rest again.`
              );
              setShowError(true);
            } else {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            }
            exitSelectMode();
            await loadViews();
          },
        },
      ]
    );
  };

  // ---- Tutorial wiring (final phase) --------------------------------------
  const { step: tutorialStep, setStep: setTutorialStep } = useTutorial();
  // The user is in the View tutorial (and can't leave until they create a view).
  const viewTutorialActive =
    tutorialStep === "view_intro" || tutorialStep === "view_build";

  // Arriving from the +Build New View step shows the intro overlay.
  useFocusEffect(
    useCallback(() => {
      if (tutorialStep === "progress_build_view_button") {
        setTutorialStep("view_intro");
      }
    }, [tutorialStep, setTutorialStep])
  );

  // Block Android hardware back until a view is created.
  useEffect(() => {
    if (!viewTutorialActive) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, [viewTutorialActive]);

  const selectedPreset = useMemo(
    () => presets.find(p => p.id === presetId) ?? null,
    [presets, presetId]
  );

  // When the user switches presets, clear any previously selected stats so we
  // don't leave a now-invalid stat name in the formula.
  const choosePreset = (id: string) => {
    Haptics.selectionAsync();
    setPresetId(id);
    setSelectedStats([]);
  };

  const toggleStat = (stat: string) => {
    Haptics.selectionAsync();
    setSelectedStats(prev => {
      if (prev.includes(stat)) return prev.filter(s => s !== stat);
      // For divide, only allow 2; tapping a 3rd replaces the oldest.
      if (operation === "divide" && prev.length >= 2) return [prev[1], stat];
      if (prev.length >= 5) return prev; // multiply caps at 5
      return [...prev, stat];
    });
  };

  // Divide UX: enforce exactly 2 stats. If the user switches to divide with
  // more or fewer than 2 currently selected, trim to first 2 (or clear).
  const switchOperation = (op: ViewOperation) => {
    Haptics.selectionAsync();
    setOperation(op);
    if (op === "divide") {
      setSelectedStats(prev => prev.slice(0, 2));
    }
  };

  const formulaPreview = useMemo(() => {
    if (selectedStats.length === 0) return "Pick stats below";
    if (operation === "multiply") {
      if (selectedStats.length === 1) return selectedStats[0];
      return selectedStats.join(" × ");
    }
    if (operation === "divide") {
      if (selectedStats.length !== 2) return "Pick 2 stats (numerator, then denominator)";
      return `${selectedStats[0]} ÷ ${selectedStats[1]}`;
    }
    return "";
  }, [selectedStats, operation]);

  const canCreate =
    viewName.trim().length > 0 &&
    presetId != null &&
    selectedStats.length >= 1 &&
    (operation === "multiply" || selectedStats.length === 2);

  const save = async () => {
    if (!canCreate || saving || !presetId) return;
    setSaving(true);
    Haptics.selectionAsync();

    const { error } = await createView({
      name: viewName,
      presetId,
      statNames: selectedStats,
      operation,
      aggregation,
    });

    setSaving(false);

    if (error) {
      setErrorMessage(error.message || "Failed to create view. Please try again.");
      setShowError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setShowSuccess(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Creating a view is the final action of the whole tutorial — finish it so
    // the user can go anywhere in the app normally.
    if (viewTutorialActive) setTutorialStep("done");
    // This screen lives in the (home) stack but is only ever opened from the
    // Progress tab, so router.back() dropped the user on Home. Send them to the
    // screen they came from instead, where the new view is waiting.
    setTimeout(() => {
      router.replace(
        from === "skill-map"
          ? "/(tabs)/meals/skill-map"
          : "/(tabs)/meals/progress-graphs"
      );
    }, 1200);
  };

  if (!geistLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SuccessToast message="View created!" visible={showSuccess} onHide={() => setShowSuccess(false)} />
      <ErrorToast message={errorMessage} visible={showError} onHide={() => setShowError(false)} />

      <LinearGradient
        colors={["#2D6A4F", "#1A4A3A", theme.colors.bg0]}
        locations={[0, 0.6, 1]}
        style={[styles.header, { paddingTop: insets.top }]}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => {
              // During the View tutorial the user can't leave until they create a view.
              if (viewTutorialActive) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                return;
              }
              router.back();
            }}
            hitSlop={10}
            style={[styles.backBtn, viewTutorialActive && { opacity: 0.35 }]}
          >
            <Ionicons name="chevron-back" size={22} color={theme.colors.textHi} />
          </Pressable>
          <Text style={styles.headerTitle}>Build a View</Text>
          <View style={{ width: 22 }} />
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* 1 — View name */}
        <View style={styles.card}>
          <StepHeader n={1} label="Name it" />
          <TextInput
            value={viewName}
            onChangeText={setViewName}
            placeholder="e.g. Heaviest set"
            placeholderTextColor={theme.semantic.text.muted}
            style={[styles.nameInput, viewName.trim().length > 0 && styles.nameInputFilled]}
          />
        </View>

        {/* 2 — Preset picker */}
        <View style={styles.card}>
          <StepHeader n={2} label="Which preset?" />
          {presetsLoading ? (
            <ActivityIndicator color={theme.semantic.accent.solid} style={{ alignSelf: "flex-start" }} />
          ) : presets.length === 0 ? (
            <Text style={styles.emptyHint}>
              You need a preset before you can build a view. Build one first from the Home tab.
            </Text>
          ) : (
            <View style={styles.chipWrap}>
              {presets.map(p => {
                const selected = p.id === presetId;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => choosePreset(p.id)}
                    style={({ pressed }) => [
                      styles.chip,
                      selected && styles.chipSelected,
                      pressed && !selected && { opacity: 0.7 },
                    ]}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {p.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* 3 — Operation */}
        <View style={styles.card}>
          <StepHeader n={3} label="Combine stats by" />
          <View style={styles.segmentGroup}>
            <SegmentButton
              label="Multiply"
              selected={operation === "multiply"}
              onPress={() => switchOperation("multiply")}
            />
            <SegmentButton
              label="Divide"
              selected={operation === "divide"}
              onPress={() => switchOperation("divide")}
            />
          </View>
          <Text style={styles.hint}>
            {operation === "multiply"
              ? "Pick 1–5 stats. Their values multiply per set."
              : "Pick exactly 2 stats. First ÷ second per set."}
          </Text>
        </View>

        {/* 4 — Stat picker. Rendered even with no preset chosen (as a locked
            placeholder) so the page doesn't jump when one is selected. */}
        <View style={[styles.card, !selectedPreset && styles.cardLocked]}>
          <StepHeader
            n={4}
            label={selectedPreset ? `Stats from ${selectedPreset.name}` : "Pick your stats"}
            dimmed={!selectedPreset}
          />
          {!selectedPreset ? (
            <Text style={styles.lockedHint}>Choose a preset above to see its stats.</Text>
          ) : (
            <View style={styles.chipWrap}>
              {selectedPreset.statNames.map(stat => {
                const idx = selectedStats.indexOf(stat);
                const selected = idx !== -1;
                return (
                  <Pressable
                    key={stat}
                    onPress={() => toggleStat(stat)}
                    style={({ pressed }) => [
                      styles.chip,
                      selected && styles.chipSelected,
                      pressed && !selected && { opacity: 0.7 },
                    ]}
                  >
                    {selected && operation === "divide" && (
                      <View style={styles.ordinalBadge}>
                        <Text style={styles.ordinalBadgeText}>{idx === 0 ? "1" : "2"}</Text>
                      </View>
                    )}
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {stat}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* 5 — Aggregation */}
        <View style={styles.card}>
          <StepHeader n={5} label="For each time period, show" />
          <View style={styles.segmentGroup}>
            <SegmentButton
              label="Highest"
              selected={aggregation === "highest"}
              onPress={() => { Haptics.selectionAsync(); setAggregation("highest"); }}
            />
            <SegmentButton
              label="Total"
              selected={aggregation === "total"}
              onPress={() => { Haptics.selectionAsync(); setAggregation("total"); }}
            />
            <SegmentButton
              label="Average"
              selected={aggregation === "average"}
              onPress={() => { Haptics.selectionAsync(); setAggregation("average"); }}
            />
          </View>
        </View>

        {/* Live result of the four choices above — the payoff of the screen, so
            it gets accent treatment rather than a footnote. */}
        <View style={[styles.resultCard, canCreate && styles.resultCardReady]}>
          <Text style={styles.resultLabel}>THIS VIEW PLOTS</Text>
          <Text style={[styles.resultFormula, !selectedPreset && styles.resultFormulaMuted]}>
            {selectedStats.length > 0
              ? `${aggregation} of ${formulaPreview}`
              : formulaPreview}
          </Text>
        </View>

        {/* Existing views + delete selection */}
        {!viewsLoading && views.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>YOUR VIEWS</Text>

            {views.map(v => {
              const selected = selectedViewIds.includes(v.id);
              const symbol = v.operation === "divide" ? " ÷ " : " × ";
              return (
                <Pressable
                  key={v.id}
                  disabled={!selectMode}
                  onPress={() => toggleViewSelected(v.id)}
                  style={({ pressed }) => [
                    styles.viewRow,
                    selected && styles.viewRowSelected,
                    pressed && selectMode && !selected && { opacity: 0.7 },
                  ]}
                >
                  {selectMode && (
                    <Ionicons
                      name={selected ? "checkmark-circle" : "ellipse-outline"}
                      size={20}
                      color={selected ? "#4ADE80" : "rgba(255,255,255,0.45)"}
                      style={styles.viewRowCheck}
                    />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.viewRowName} numberOfLines={1}>{v.name}</Text>
                    <Text style={styles.viewRowMeta} numberOfLines={1}>
                      {v.presetName} · {v.aggregation} of {v.statNames.join(symbol)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}

            {/* Select-to-delete control. The circle turns selection mode on;
                the red button (matching the preset chips' trash) appears beside
                the label once you're in it. */}
            <View style={styles.selectDeleteRow}>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  if (selectMode) exitSelectMode();
                  else setSelectMode(true);
                }}
                hitSlop={8}
                style={styles.selectToggle}
              >
                <Ionicons
                  name={selectMode ? "close-circle" : "ellipse-outline"}
                  size={20}
                  color={selectMode ? "#F87171" : "rgba(255,255,255,0.55)"}
                />
                <Text style={styles.selectToggleText}>
                  {selectMode
                    ? selectedViewIds.length > 0
                      ? `${selectedViewIds.length} selected`
                      : "Select views to delete"
                    : "Select views to delete"}
                </Text>
              </Pressable>

              {selectMode && (
                <Pressable
                  onPress={confirmDeleteViews}
                  disabled={selectedViewIds.length === 0 || deleting}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.deleteViewsBtn,
                    (selectedViewIds.length === 0 || deleting) && { opacity: 0.4 },
                    pressed && selectedViewIds.length > 0 && styles.deleteViewsBtnPressed,
                  ]}
                >
                  <Ionicons name="trash" size={14} color="#FFFFFF" />
                </Pressable>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Sticky footer. The gradient lets content fade out underneath the button
          instead of colliding with it mid-scroll. */}
      <LinearGradient
        colors={["transparent", theme.colors.bg0, theme.colors.bg0]}
        locations={[0, 0.45, 1]}
        pointerEvents="none"
        style={[styles.footerScrim, { height: tabBarHeight + 120 }]}
      />
      <View style={[styles.footer, { paddingBottom: tabBarHeight + 20 }]}>
        <Animated.View style={buttonAnimatedStyle}>
          <Pressable
            onPress={save}
            disabled={!canCreate || saving}
            onPressIn={() => {
              if (!canCreate || saving) return;
              buttonScale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            onPressOut={() => {
              buttonScale.value = withSpring(1, { damping: 15, stiffness: 300 });
            }}
            style={[styles.createBtn, { opacity: !canCreate || saving ? 0.5 : 1 }]}
          >
            <Text style={styles.createBtnText}>{saving ? "Creating…" : "Create View"}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

/** Numbered step heading. The form has a real dependency order (a preset must be
 *  chosen before its stats exist), so the numbers aren't decoration. */
function StepHeader({ n, label, dimmed = false }: { n: number; label: string; dimmed?: boolean }) {
  return (
    <View style={styles.stepHeader}>
      <View style={[styles.stepBadge, dimmed && styles.stepBadgeDimmed]}>
        <Text style={[styles.stepBadgeText, dimmed && styles.stepBadgeTextDimmed]}>{n}</Text>
      </View>
      <Text style={[styles.stepLabel, dimmed && styles.stepLabelDimmed]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function SegmentButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.segment,
        selected && styles.segmentSelected,
        pressed && !selected && { opacity: 0.7 },
      ]}
    >
      <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  viewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: theme.radius.md,
    backgroundColor: theme.semantic.bg.subtle,
    borderWidth: 1,
    borderColor: theme.semantic.border.subtle,
    marginBottom: theme.space.px8,
  },
  viewRowSelected: {
    borderColor: theme.semantic.accent.solid,
    backgroundColor: theme.semantic.accent.subtle,
  },
  viewRowCheck: {
    marginRight: 2,
  },
  viewRowName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.1,
  },
  viewRowMeta: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.55)",
  },
  selectDeleteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    paddingHorizontal: 2,
  },
  selectToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  selectToggleText: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.65)",
    letterSpacing: 0.1,
  },
  deleteViewsBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteViewsBtnPressed: {
    backgroundColor: "#B91C1C",
  },
  container: { flex: 1, backgroundColor: theme.colors.bg0 },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.bg0,
    alignItems: "center",
    justifyContent: "center",
  },
  header: { paddingBottom: 32 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backBtn: {},
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.textHi,
    fontFamily: "Geist_700Bold",
  },
  scrollContent: {
    paddingHorizontal: theme.space.px16,
    paddingTop: theme.space.px20,
    paddingBottom: 220,
    gap: theme.space.px12,
  },

  /* Each step is a contained card so sections read as separate decisions
     rather than one continuous wall of controls. */
  card: {
    backgroundColor: theme.semantic.bg.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.semantic.border.subtle,
    padding: theme.space.px16,
  },
  cardLocked: {
    backgroundColor: theme.semantic.bg.subtle,
    borderColor: theme.semantic.border.hairline,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.semantic.text.tertiary,
    letterSpacing: 1.1,
    marginBottom: theme.space.px12,
    fontFamily: "Geist_700Bold",
  },

  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space.px8,
    marginBottom: theme.space.px12,
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.semantic.accent.subtle,
    borderWidth: 1,
    borderColor: theme.semantic.accent.solid,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBadgeDimmed: {
    backgroundColor: "transparent",
    borderColor: theme.semantic.border.default,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.semantic.accent.solid,
    fontFamily: "Geist_700Bold",
  },
  stepBadgeTextDimmed: { color: theme.semantic.text.muted },
  stepLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: theme.semantic.text.primary,
    letterSpacing: -0.2,
    fontFamily: "Geist_700Bold",
  },
  stepLabelDimmed: { color: theme.semantic.text.tertiary },

  /* Name field now reads as an input — it previously looked like a heading, so
     it wasn't obvious you could type in it. */
  nameInput: {
    fontSize: 20,
    fontFamily: "Geist_700Bold",
    fontWeight: "700",
    color: theme.semantic.text.primary,
    letterSpacing: -0.3,
    backgroundColor: theme.semantic.bg.subtle,
    borderWidth: 1,
    borderColor: theme.semantic.border.subtle,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space.px12,
    paddingVertical: theme.space.px12,
    minHeight: 52,
  },
  nameInputFilled: {
    borderColor: theme.semantic.accent.solid,
  },

  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.space.px8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: theme.space.px12,
    paddingVertical: 9,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.semantic.bg.subtle,
    borderWidth: 1,
    borderColor: theme.semantic.border.default,
  },
  chipSelected: {
    backgroundColor: theme.semantic.accent.solid,
    borderColor: theme.semantic.accent.solid,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.semantic.text.primary,
  },
  chipTextSelected: {
    color: theme.semantic.text.inverse,
  },
  /* Divide order shown as a badge instead of "1. " / "2. " inline text, so the
     numeral can't be mistaken for part of the stat name. */
  ordinalBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  ordinalBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: theme.semantic.text.inverse,
  },

  segmentGroup: {
    flexDirection: "row",
    gap: theme.space.px8,
  },
  segment: {
    flex: 1,
    paddingVertical: theme.space.px12,
    borderRadius: theme.radius.sm,
    alignItems: "center",
    backgroundColor: theme.semantic.bg.subtle,
    borderWidth: 1,
    borderColor: theme.semantic.border.default,
  },
  segmentSelected: {
    backgroundColor: theme.semantic.accent.solid,
    borderColor: theme.semantic.accent.solid,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.semantic.text.primary,
  },
  segmentTextSelected: {
    color: theme.semantic.text.inverse,
  },

  hint: {
    fontSize: 12,
    color: theme.semantic.text.tertiary,
    marginTop: theme.space.px8,
    lineHeight: 17,
  },
  emptyHint: {
    fontSize: 14,
    color: theme.semantic.text.secondary,
    lineHeight: 20,
  },
  lockedHint: {
    fontSize: 13,
    color: theme.semantic.text.muted,
  },

  /* Live formula readout. */
  resultCard: {
    backgroundColor: theme.semantic.bg.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.semantic.border.subtle,
    padding: theme.space.px16,
  },
  resultCardReady: {
    backgroundColor: theme.semantic.accent.subtle,
    borderColor: theme.semantic.accent.solid,
  },
  resultLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.semantic.text.tertiary,
    letterSpacing: 1.2,
    marginBottom: 6,
    fontFamily: "Geist_700Bold",
  },
  resultFormula: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.semantic.text.primary,
    letterSpacing: -0.2,
    fontFamily: "Geist_700Bold",
    textTransform: "capitalize",
  },
  resultFormulaMuted: {
    color: theme.semantic.text.muted,
    textTransform: "none",
  },

  footerScrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  footer: {
    position: "absolute",
    left: theme.space.px16,
    right: theme.space.px16,
    bottom: 0,
  },
  createBtn: {
    backgroundColor: theme.semantic.accent.solid,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.space.px16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.semantic.accent.solid,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  createBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.semantic.text.inverse,
    fontFamily: "Geist_700Bold",
  },
});
