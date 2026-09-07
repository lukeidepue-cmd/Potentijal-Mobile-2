// app/(tabs)/meals/progress-graphs.tsx
// Progress Graph driven by user-built Views (one preset + a stat formula +
// aggregation). Replaces the sport-mode / fuzzy-exercise-search version.
//
// UI flow:
//   1. Horizontal chip row: [+ Build New View] [view-1] [view-2] ...
//   2. Timeframe segmented control: 30 / 90 / 180 / 360 days (always 6 buckets)
//   3. When a view + timeframe are picked, render the line graph.
//
// Empty states:
//   - User has no presets       → tell them to build a preset first
//   - User has no views         → just the +Build New View button + hint
//   - View has no data in range → graph hidden, "No data in this timeframe"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  G,
  Path,
  Circle,
  Line as SvgLine,
  Text as SvgText,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { HelpOverlay } from "@/components/HelpOverlay";

import { theme } from "@/constants/theme";
import {
  listViews,
  getViewProgress,
  listPresetExerciseNames,
  type ExerciseView,
  type ViewProgressPoint,
  type ViewDays,
  VIEW_DAYS_OPTIONS,
  VIEW_BUCKETS,
} from "@/lib/api/views";
import { listPresets } from "@/lib/api/presets";
import { useTutorial } from "../../../providers/TutorialContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ============================================================================
//  GraphDisplay — SVG line chart. Inlined here (kept the existing visual
//  language: green line + glow, right-side Y labels, bottom X labels).
// ============================================================================

function formatBucketEndForLabel(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${m}/${d}`;
}

/**
 * Redesigned chart (May 2026).
 * Upgrades from the bare-bones version:
 *   - Hero value header above the chart (Whoop-style "big number + delta")
 *   - Subtle horizontal gridlines aligned with Y-ticks
 *   - Soft gradient AREA FILL under the line (line green → transparent)
 *   - Smooth catmull-rom-ish curve via mid-point quadratic smoothing
 *   - The most recent point gets a distinct "live" treatment (white ring,
 *     larger inner, pulse-ready halo) per the peak-end rule.
 *   - Quieter axis typography so the data does the talking.
 */
function GraphDisplay({
  data,
  width,
  viewName,
  presetName,
  exerciseName,
}: {
  data: ViewProgressPoint[];
  width: number;
  viewName: string;
  presetName: string;
  /** The single exercise this graph is plotting. Shown as the hero headline
   *  since the chart now reflects one exercise, not the whole preset. */
  exerciseName: string;
}) {
  if (width === 0) return null;

  const M = { top: 28, right: 56, bottom: 36, left: 16 };
  const H = 300;
  const W = width;
  const chartWidth = W - M.left - M.right;
  const chartHeight = H - M.top - M.bottom;

  const values = data.map(p => p.value).filter((v): v is number => v !== null);
  if (values.length === 0) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const isConstant = range === 0;

  let displayMin = min;
  let displayMax = max;
  let displayRange = range;
  if (isConstant) {
    const mag = Math.abs(min);
    const pad = mag >= 100 ? mag * 0.2 : mag >= 10 ? mag * 0.1 : Math.max(mag * 0.1, 1);
    displayMin = min - pad;
    displayMax = max + pad;
    displayRange = displayMax - displayMin;
  }

  const yTicks = Array.from({ length: 5 }, (_, i) => displayMin + displayRange * (i / 4));
  const yFor = (v: number, isPoint = false) => {
    if (isConstant && isPoint) return M.top + chartHeight / 2;
    const ratio = (v - displayMin) / displayRange;
    return M.top + chartHeight - chartHeight * ratio;
  };

  const xFor = (bucketIndex: number) => {
    const t = bucketIndex / (VIEW_BUCKETS - 1);
    return M.left + chartWidth * t;
  };

  const pointsWithValues = data
    .filter(p => p.value !== null)
    .map(p => ({
      bucketIndex: p.bucketIndex,
      value: p.value as number,
      x: xFor(p.bucketIndex),
      y: yFor(p.value as number, true),
    }))
    .sort((a, b) => a.x - b.x);

  // Smoothed line path — quadratic mid-point smoothing makes the chart feel
  // organic rather than zig-zaggy without needing a real cubic curve.
  let linePath = "";
  pointsWithValues.forEach((p, i) => {
    if (i === 0) {
      linePath += `M ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
      return;
    }
    const prev = pointsWithValues[i - 1];
    const mx = (prev.x + p.x) / 2;
    const my = (prev.y + p.y) / 2;
    linePath += ` Q ${prev.x.toFixed(2)} ${prev.y.toFixed(2)} ${mx.toFixed(2)} ${my.toFixed(2)}`;
    if (i === pointsWithValues.length - 1) {
      linePath += ` T ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
    }
  });

  // Area fill — close the path back to the baseline so we can shade beneath.
  const baselineY = M.top + chartHeight;
  const areaPath = linePath
    ? `${linePath} L ${pointsWithValues[pointsWithValues.length - 1].x.toFixed(2)} ${baselineY} L ${pointsWithValues[0].x.toFixed(2)} ${baselineY} Z`
    : "";

  const formatTickLabel = (v: number) => {
    if (Math.abs(v) >= 1000) return v.toFixed(0);
    if (Math.abs(v) >= 10) return v.toFixed(1);
    if (Math.abs(v) >= 1) return v.toFixed(2);
    return v.toFixed(3);
  };

  // ── Hero header values (Whoop-style big number + delta) ─────────────────
  const latest = pointsWithValues[pointsWithValues.length - 1];
  const previous =
    pointsWithValues.length >= 2
      ? pointsWithValues[pointsWithValues.length - 2]
      : null;
  const delta = previous ? latest.value - previous.value : 0;
  const deltaPct = previous && previous.value !== 0
    ? (delta / Math.abs(previous.value)) * 100
    : 0;

  const formatBigNumber = (v: number) => {
    const abs = Math.abs(v);
    if (abs >= 1000) return v.toFixed(0);
    if (abs >= 10) return v.toFixed(1);
    if (abs >= 1) return v.toFixed(2);
    return v.toFixed(2);
  };
  const deltaColor =
    delta > 0 ? "#22C55E" : delta < 0 ? "#FF6B6B" : "rgba(255,255,255,0.45)";
  const deltaIcon = delta > 0 ? "↑" : delta < 0 ? "↓" : "·";

  const LINE_COLOR = "#22C55E";

  return (
    <View style={{ width: W }}>
      {/* Hero value header — research §6 (Whoop big number + sparkline pattern).
          This is the single biggest jump in perceived premium feel. */}
      <View style={localStyles.heroValueRow}>
        <View style={{ flex: 1 }}>
          <Text style={localStyles.heroLabel} numberOfLines={1}>
            {exerciseName.toUpperCase()} <Text style={localStyles.heroLabelDim}>· {viewName}</Text>
          </Text>
          <View style={localStyles.heroRow}>
            <Text style={localStyles.heroValue}>{formatBigNumber(latest.value)}</Text>
            {previous && (
              <View style={[localStyles.deltaPill, { borderColor: deltaColor + "55", backgroundColor: deltaColor + "1A" }]}>
                <Text style={[localStyles.deltaText, { color: deltaColor }]}>
                  {deltaIcon} {Math.abs(delta) >= 10 ? Math.abs(delta).toFixed(1) : Math.abs(delta).toFixed(2)}
                  {previous.value !== 0 ? ` · ${Math.abs(deltaPct).toFixed(0)}%` : ""}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <Svg width={W} height={H}>
        <Defs>
          {/* Area gradient — line color at top, fade to transparent at baseline */}
          <SvgLinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={LINE_COLOR} stopOpacity="0.30" />
            <Stop offset="60%" stopColor={LINE_COLOR} stopOpacity="0.08" />
            <Stop offset="100%" stopColor={LINE_COLOR} stopOpacity="0" />
          </SvgLinearGradient>
          {/* Glow gradient for the most recent point */}
          <SvgLinearGradient id="pulseGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={LINE_COLOR} stopOpacity="0.5" />
            <Stop offset="100%" stopColor={LINE_COLOR} stopOpacity="0" />
          </SvgLinearGradient>
        </Defs>

        {/* Horizontal gridlines aligned with Y-ticks — research §6 data-ink ratio:
            hairlines whisper structure without competing with the data. */}
        <G>
          {yTicks.map((t, i) => (
            <SvgLine
              key={`grid-${i}`}
              x1={M.left}
              x2={W - M.right}
              y1={yFor(t, false)}
              y2={yFor(t, false)}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
          ))}
        </G>

        {/* Area fill */}
        {areaPath && pointsWithValues.length > 1 && (
          <Path d={areaPath} fill="url(#areaGrad)" />
        )}

        {/* X-axis date labels (lighter, tabular) */}
        <G>
          {data.map(p => (
            <SvgText
              key={`x-${p.bucketIndex}`}
              x={xFor(p.bucketIndex)}
              y={H - 10}
              fill="rgba(255,255,255,0.40)"
              fontSize={10}
              fontWeight="500"
              textAnchor="middle"
            >
              {formatBucketEndForLabel(p.bucketEnd)}
            </SvgText>
          ))}
        </G>

        {/* Y-axis value labels on the right */}
        <G>
          {yTicks.map((t, i) => (
            <SvgText
              key={`y-${i}`}
              x={W - M.right + 10}
              y={yFor(t, false) + 3}
              fill="rgba(255,255,255,0.45)"
              fontSize={10}
              fontWeight="500"
              textAnchor="start"
            >
              {formatTickLabel(t)}
            </SvgText>
          ))}
        </G>

        {/* Line — keep the glow + solid pattern but use smoothed path + accent color */}
        {linePath && (
          <>
            <Path
              d={linePath}
              fill="none"
              stroke={LINE_COLOR}
              strokeWidth={6}
              opacity={0.25}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d={linePath}
              fill="none"
              stroke={LINE_COLOR}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}

        {/* Data point dots — last point gets the "live" treatment */}
        <G>
          {pointsWithValues.map((p, i) => {
            const isLast = i === pointsWithValues.length - 1;
            if (isLast) {
              return (
                <React.Fragment key={`pt-${p.bucketIndex}`}>
                  <Circle cx={p.x} cy={p.y} r={14} fill={LINE_COLOR} opacity={0.10} />
                  <Circle cx={p.x} cy={p.y} r={8} fill={LINE_COLOR} opacity={0.25} />
                  <Circle cx={p.x} cy={p.y} r={5} fill={LINE_COLOR} />
                  <Circle cx={p.x} cy={p.y} r={2} fill="#FFFFFF" />
                </React.Fragment>
              );
            }
            return (
              <React.Fragment key={`pt-${p.bucketIndex}`}>
                <Circle cx={p.x} cy={p.y} r={5} fill={LINE_COLOR} opacity={0.18} />
                <Circle cx={p.x} cy={p.y} r={2.5} fill={LINE_COLOR} />
              </React.Fragment>
            );
          })}
        </G>
      </Svg>
    </View>
  );
}

// Chart-specific local styles (kept out of main styles to scope clearly).
const localStyles = StyleSheet.create({
  heroValueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 14,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  heroLabelDim: {
    color: "rgba(255,255,255,0.32)",
    fontWeight: "500",
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
  },
  heroValue: {
    fontSize: 40,
    fontWeight: "800",
    color: "rgba(255,255,255,0.96)",
    letterSpacing: -1.2,
    fontVariant: ["tabular-nums"],
    lineHeight: 44,
  },
  deltaPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  deltaText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.1,
    fontVariant: ["tabular-nums"],
  },
});

// ============================================================================
//  Screen
// ============================================================================

export default function ProgressGraphsScreen() {
  const insets = useSafeAreaInsets();

  const [hasAnyPresets, setHasAnyPresets] = useState<boolean | null>(null);
  const [views, setViews] = useState<ExerciseView[]>([]);
  const [viewsLoading, setViewsLoading] = useState(true);

  const [selectedViewId, setSelectedViewId] = useState<string | null>(null);
  const [days, setDays] = useState<ViewDays>(30);

  // Exercise selection — the user picks ONE exercise name logged under the
  // selected view's preset; the graph plots only that exercise's data.
  const [availableExercises, setAvailableExercises] = useState<string[]>([]);
  const [exercisesLoading, setExercisesLoading] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);

  const [graphData, setGraphData] = useState<ViewProgressPoint[]>([]);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphError, setGraphError] = useState<string | null>(null);

  const [graphWidth, setGraphWidth] = useState(0);
  const [showHelp, setShowHelp] = useState(false);

  // ---- Tutorial wiring ----------------------------------------------------
  const { step: tutorialStep, setStep: setTutorialStep, setContentRect } = useTutorial();
  const buildViewBtnRef = useRef<View>(null);
  const [buildViewBtnRect, setBuildViewBtnRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const measureBuildViewBtn = useCallback(() => {
    buildViewBtnRef.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) setBuildViewBtnRect({ x, y, width, height });
    });
  }, []);

  // Arriving here from the Progress tab card advances to the intro overlay.
  useFocusEffect(
    useCallback(() => {
      if (tutorialStep === "progress_graph_button") {
        setTutorialStep("progress_graph_intro");
      }
      const t = setTimeout(measureBuildViewBtn, 350);
      return () => {
        clearTimeout(t);
        setContentRect(null);
      };
    }, [tutorialStep, setTutorialStep, setContentRect, measureBuildViewBtn])
  );

  // Spotlight the +Build New View button only during that step.
  useEffect(() => {
    setContentRect(tutorialStep === "progress_build_view_button" ? buildViewBtnRect : null);
  }, [tutorialStep, buildViewBtnRect, setContentRect]);

  // Bumped on every focus so the exercise loader re-runs and picks up exercises
  // logged since the last visit, without discarding the current selection.
  const [focusNonce, setFocusNonce] = useState(0);

  // Reload views + preset-existence when the screen regains focus, so newly
  // created views or presets show up without a full reload.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setViewsLoading(true);
      setFocusNonce(n => n + 1);
      Promise.all([listViews(), listPresets()]).then(([viewsRes, presetsRes]) => {
        if (!active) return;
        if (viewsRes.data) {
          setViews(viewsRes.data);
          // Auto-select the first view if nothing is selected yet (or the prior
          // selection no longer exists).
          setSelectedViewId(prev => {
            if (prev && viewsRes.data!.some(v => v.id === prev)) return prev;
            return viewsRes.data!.length > 0 ? viewsRes.data![0].id : null;
          });
        }
        setHasAnyPresets((presetsRes.data?.length ?? 0) > 0);
        setViewsLoading(false);
      });
      return () => {
        active = false;
      };
    }, [])
  );

  const selectedView = useMemo(
    () => views.find(v => v.id === selectedViewId) ?? null,
    [views, selectedViewId]
  );

  // Load the exercise names logged under the selected view's preset. Re-runs
  // when the preset changes (switching to a view of a different preset) and on
  // every focus (focusNonce). Default-selects the first exercise on a preset
  // change; preserves the user's pick on a focus refresh.
  const selectionPresetRef = React.useRef<string | null>(null);
  const selectedPresetId = selectedView?.presetId ?? null;
  useEffect(() => {
    if (!selectedPresetId) {
      setAvailableExercises([]);
      setSelectedExercise(null);
      selectionPresetRef.current = null;
      return;
    }
    let active = true;
    setExercisesLoading(true);
    listPresetExerciseNames({ presetId: selectedPresetId }).then(({ data }) => {
      if (!active) return;
      const names = data || [];
      const isNewPreset = selectionPresetRef.current !== selectedPresetId;
      selectionPresetRef.current = selectedPresetId;
      setAvailableExercises(names);
      setSelectedExercise(prev => {
        if (isNewPreset) return names[0] ?? null;
        // Focus refresh — keep the current pick if it still exists.
        if (prev && names.includes(prev)) return prev;
        return names[0] ?? null;
      });
      setExercisesLoading(false);
    });
    return () => {
      active = false;
    };
  }, [selectedPresetId, focusNonce]);

  // Refetch graph data when the selected view, exercise, or timeframe changes.
  // The graph plots ONLY the selected exercise (not the whole preset).
  useEffect(() => {
    if (!selectedView || !selectedExercise) {
      setGraphData([]);
      setGraphError(null);
      return;
    }
    let active = true;
    setGraphLoading(true);
    setGraphError(null);
    getViewProgress({ view: selectedView, days, exerciseName: selectedExercise }).then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setGraphError(error.message || "Failed to load graph data.");
        setGraphData([]);
      } else {
        setGraphData(data || []);
      }
      setGraphLoading(false);
    });
    return () => {
      active = false;
    };
  }, [selectedView, selectedExercise, days]);

  const hasAnyDataPoints = useMemo(
    () => graphData.some(p => p.value !== null),
    [graphData]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Three-layer background — mirrors the Workouts tab's signature gradient
          stack, hue-shifted from athletic green to twilight blue so the
          Progress screen reads as a sibling surface (same depth, different
          identity). Source: app/(tabs)/workouts.tsx (Layers A/B/C). */}
      <LinearGradient
        colors={["#0B1015", "#0F1F2E", "#0F2C3E", "#070A0E"]}
        locations={[0, 0.3, 0.6, 1]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <LinearGradient
        colors={["rgba(0,0,0,0.4)", "transparent", "transparent", "rgba(0,0,0,0.5)"]}
        locations={[0, 0.15, 0.85, 1]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        pointerEvents="none"
      />
      <View
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(255,255,255,0.02)",
          opacity: 0.06,
        }}
        pointerEvents="none"
      />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.textHi} />
        </Pressable>
        <Text style={styles.headerTitle}>Progress</Text>
        {/* Help button — matches Skill Map / Consistency Score treatment */}
        <Pressable onPress={() => setShowHelp(true)} hitSlop={10} style={styles.helpButton}>
          <View style={styles.helpButtonCircle}>
            <Ionicons name="help-circle" size={20} color="#FFFFFF" />
          </View>
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Views chip row */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Views</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            <View ref={buildViewBtnRef} onLayout={measureBuildViewBtn} collapsable={false}>
              <Pressable
                onPress={() => router.push("/(tabs)/(home)/build-view")}
                style={({ pressed }) => [styles.addChip, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="add" size={16} color="#22C55E" />
                <Text style={styles.addChipText}>Build New View</Text>
              </Pressable>
            </View>

            {views.map(v => {
              const selected = v.id === selectedViewId;
              return (
                <Pressable
                  key={v.id}
                  onPress={() => setSelectedViewId(v.id)}
                  style={({ pressed }) => [
                    styles.viewChip,
                    selected && styles.viewChipSelected,
                    pressed && !selected && { opacity: 0.7 },
                  ]}
                >
                  <Text
                    style={[styles.viewChipText, selected && styles.viewChipTextSelected]}
                    numberOfLines={1}
                  >
                    {v.name}{" "}
                    <Text
                      style={[
                        styles.viewChipPresetText,
                        selected && styles.viewChipPresetTextSelected,
                      ]}
                    >
                      ({v.presetName})
                    </Text>
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Exercise chip row — pick ONE exercise logged under the selected
            view's preset. The graph plots only this exercise's data, not the
            whole preset. */}
        {selectedView && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Exercise</Text>
            {exercisesLoading ? (
              <ActivityIndicator
                color="#FFFFFF"
                style={{ alignSelf: "flex-start", marginLeft: 4 }}
              />
            ) : availableExercises.length === 0 ? (
              <Text style={styles.exerciseEmptyHint}>
                No exercises logged under the "{selectedView.presetName}" preset yet.
              </Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                {availableExercises.map(name => {
                  const selected = name === selectedExercise;
                  return (
                    <Pressable
                      key={name}
                      onPress={() => setSelectedExercise(name)}
                      style={({ pressed }) => [
                        styles.viewChip,
                        selected && styles.viewChipSelected,
                        pressed && !selected && { opacity: 0.7 },
                      ]}
                    >
                      <Text
                        style={[styles.viewChipText, selected && styles.viewChipTextSelected]}
                        numberOfLines={1}
                      >
                        {name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>
        )}

        {/* Graph area — moved ABOVE the timeframe bar (the timeframe now sits
            UNDER the chart, like a finder/zoom strip controlling the view). */}
        <View
          style={styles.graphSection}
          onLayout={e => setGraphWidth(e.nativeEvent.layout.width)}
        >
          {viewsLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : hasAnyPresets === false ? (
            <EmptyState
              title="Build a preset first"
              body="Views graph the stats you defined in your presets. Build a preset from the Home tab, log a workout with it, then come back to build a view."
            />
          ) : views.length === 0 ? (
            <EmptyState
              title="No views yet"
              body="Tap +Build New View to choose a preset, pick which of its stats to plot, and how to combine them."
            />
          ) : !selectedView ? (
            <EmptyState title="Pick a view above" body="" />
          ) : exercisesLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : availableExercises.length === 0 ? (
            <EmptyState
              title="No exercises yet"
              body={`Log a workout under the "${selectedView.presetName}" preset, then pick an exercise to graph.`}
            />
          ) : !selectedExercise ? (
            <EmptyState title="Pick an exercise above" body="" />
          ) : graphLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : graphError ? (
            <EmptyState title="Couldn't load data" body={graphError} />
          ) : !hasAnyDataPoints ? (
            <EmptyState
              title="No data in this timeframe"
              body={`No "${selectedExercise}" data in the last ${days} days. Log it under the "${selectedView.presetName}" preset, then come back.`}
            />
          ) : (
            <GraphDisplay
              data={graphData}
              width={graphWidth}
              viewName={selectedView.name}
              presetName={selectedView.presetName}
              exerciseName={selectedExercise}
            />
          )}
        </View>

        {/* Timeframe segmented control — sliding animated indicator.
            Below the graph (was above) so it reads as a "zoom" control. */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Timeframe</Text>
          <TimeframeSegment
            options={VIEW_DAYS_OPTIONS}
            value={days}
            onChange={setDays}
          />
        </View>
      </ScrollView>

      {/* Help overlay — same pattern as Skill Map / Consistency Score */}
      <HelpOverlay
        visible={showHelp}
        onClose={() => setShowHelp(false)}
        title="Progress Graph Guide"
      >
        <View style={helpStyles.section}>
          <Text style={helpStyles.heading}>What This Screen Shows</Text>
          <Text style={helpStyles.text}>
            The Progress Graph plots <Text style={helpStyles.bold}>one exercise</Text> as a line over time, so you can see how it's trending. It graphs only the exercise you pick — e.g. just "Sprint drill" — never the whole preset blended together.
          </Text>
          <Text style={helpStyles.text}>
            Each point on the line is a <Text style={helpStyles.bold}>time bucket</Text> — a slice of your timeframe. The chart always shows six buckets, oldest on the left, newest on the right, so the spacing stays consistent.
          </Text>
        </View>

        <View style={helpStyles.section}>
          <Text style={helpStyles.heading}>The Building Blocks</Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>Preset:</Text> a template you built (e.g. "Exercise"). It defines the stat names you fill in when logging.</Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>Exercise:</Text> a single thing you log under a preset, named by you (e.g. "Sprint drill"). Every set you ever log with that name is the same exercise. One preset holds many exercises.</Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>View:</Text> a way to turn a preset's stats into one number — a formula plus an aggregation (see below). The same preset can have many views.</Text>
        </View>

        <View style={helpStyles.section}>
          <Text style={helpStyles.heading}>How To Use It</Text>
          <Text style={helpStyles.bullet}>1. <Text style={helpStyles.bold}>Pick a view</Text> from the chip row (or tap "+Build New View"). Each chip shows its preset in parentheses.</Text>
          <Text style={helpStyles.bullet}>2. <Text style={helpStyles.bold}>Pick an exercise</Text> in the Exercise row — the list is the exercises logged under that view's preset. The graph plots just this one.</Text>
          <Text style={helpStyles.bullet}>3. <Text style={helpStyles.bold}>Pick a timeframe</Text> at the bottom (30 / 90 / 180 / 360 days).</Text>
          <Text style={helpStyles.text}>
            The header above the chart names what you're looking at: the exercise, then the view (e.g. "SPRINT DRILL · Peak Reps × Weight").
          </Text>
        </View>

        <View style={helpStyles.section}>
          <Text style={helpStyles.heading}>What A View Measures</Text>
          <Text style={helpStyles.text}>
            A View is a small formula you build once and reuse. It has these pieces:
          </Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>Stats:</Text> one or more of the stat names from the preset (e.g. "Reps", "Weight").</Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>Operation:</Text> how to combine those stats inside each set — multiply (e.g. Reps × Weight) or divide (e.g. Makes ÷ Attempts).</Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>Aggregation:</Text> how to collapse all of a bucket's set-values into the one number that gets plotted — Highest, Total, or Average.</Text>
          <Text style={helpStyles.text}>
            So a view like "Peak Reps × Weight" plots, for each bucket, the single best Reps × Weight set the chosen exercise had in that window.
          </Text>
        </View>

        <View style={helpStyles.section}>
          <Text style={helpStyles.heading}>Reading the Chart</Text>
          <Text style={helpStyles.text}>
            Above the chart, a big number shows the value of the <Text style={helpStyles.bold}>most recent bucket</Text> — your latest window in the timeframe. Next to it, a small pill shows the delta vs. the previous bucket: green up arrow if you improved, red down arrow if you didn't, neutral dash if it's the same.
          </Text>
          <Text style={helpStyles.text}>
            On the chart itself:
          </Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>The line</Text> is smoothed between points so the trend reads at a glance.</Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>The shaded area</Text> beneath the line uses your accent color fading to transparent — visual weight, not extra data.</Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>Each dot</Text> is one bucket's value. The newest dot gets a soft halo to mark it as "live."</Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>The X-axis labels</Text> show the end date of each bucket (e.g. 5/8, 5/15).</Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>The Y-axis labels</Text> on the right show the value range — the chart auto-scales to fit your data, so a flat line at 100 is the same shape as a flat line at 0.01.</Text>
        </View>

        <View style={helpStyles.section}>
          <Text style={helpStyles.heading}>Timeframes</Text>
          <Text style={helpStyles.text}>
            The 30 / 90 / 180 / 360 bar at the bottom controls how far back the chart looks. The window is always split evenly into 6 buckets:
          </Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>30d:</Text> 6 buckets of ~5 days each — short-range, week-to-week trend.</Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>90d:</Text> 6 buckets of ~15 days each — month-to-month trend.</Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>180d:</Text> 6 buckets of ~30 days each — quarter-by-quarter trend.</Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>360d:</Text> 6 buckets of ~60 days each — long-range, season-over-season trend.</Text>
          <Text style={helpStyles.text}>
            Switching timeframes redraws the whole chart from scratch — same view, different lens. If your data is sparse, longer timeframes let each bucket cover more workouts and smooth out the line.
          </Text>
        </View>

        <View style={helpStyles.section}>
          <Text style={helpStyles.heading}>Shared with Skill Map</Text>
          <Text style={helpStyles.text}>
            Every View you build on this screen also shows up on the Skill Map screen, and vice versa. The Progress Graph plots one exercise over time as a line; the Skill Map takes up to six exercises and compares them against each other on a radar chart. Same views, same exercises — two ways to look at them.
          </Text>
        </View>

        <View style={helpStyles.section}>
          <Text style={helpStyles.heading}>Empty Chart? Here's Why</Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>No presets yet:</Text> Views need a preset to pull from. Build one from the Home tab, log a workout with it, then come back.</Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>Presets but no views:</Text> Tap <Text style={helpStyles.bold}>+ Build New View</Text> at the top to define a metric on one of your presets.</Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>No exercises to pick:</Text> You haven't logged any exercise under that view's preset yet. Log one, then it'll appear in the Exercise row.</Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>Exercise picked but no data:</Text> That exercise has no sets inside the selected timeframe. Try a longer timeframe, or log a session.</Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>Some buckets blank:</Text> Sparse data — those buckets had no qualifying sets. The line skips them and connects the dots that exist.</Text>
        </View>
      </HelpOverlay>
    </View>
  );
}

/**
 * Sliding segmented control for the timeframe row.
 * A single Animated.View indicator slides between option positions via
 * spring physics (Apple-style snappy preset). Keeps the
 * "track + pills" container visual but adds real motion.
 */
function TimeframeSegment({
  options,
  value,
  onChange,
}: {
  options: readonly ViewDays[];
  value: ViewDays;
  onChange: (d: ViewDays) => void;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const TRACK_PADDING = 4;
  const tabWidth = trackWidth > 0 ? (trackWidth - TRACK_PADDING * 2) / options.length : 0;
  const selectedIndex = Math.max(0, options.indexOf(value));

  const indicatorX = useSharedValue(0);

  useEffect(() => {
    indicatorX.value = withSpring(selectedIndex * tabWidth, theme.spring.snappy);
  }, [selectedIndex, tabWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: tabWidth,
  }));

  return (
    <View
      style={styles.timeframeRow}
      onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}
    >
      {trackWidth > 0 && (
        <Animated.View style={[styles.timeframeIndicator, indicatorStyle]} />
      )}
      {options.map(opt => {
        const selected = opt === value;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={({ pressed }) => [
              styles.timeframeBtn,
              pressed && !selected && { opacity: 0.6 },
            ]}
          >
            <Text style={[styles.timeframeText, selected && styles.timeframeTextSelected]}>
              {opt}d
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {body ? <Text style={styles.emptyBody}>{body}</Text> : null}
    </View>
  );
}

// ============================================================================
//  Styles
// ============================================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg0 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: {},
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.textHi,
  },
  // Help button — same circular ghost-glass treatment as Skill Map /
  // Consistency Score so all three Progress sub-screens share one language.
  helpButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  helpButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },

  section: { paddingHorizontal: 16, paddingTop: 16 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.5)",
    letterSpacing: 1.4,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  exerciseEmptyHint: {
    fontSize: 13,
    lineHeight: 18,
    color: "rgba(255, 255, 255, 0.55)",
    paddingHorizontal: 4,
  },

  // Build New View = SECONDARY action (ghost / dashed) so the
  // selected View chip is the only solid-accent element in the row.
  // Pre-redesign both were solid green and visually collided.
  chipRow: { flexDirection: "row", gap: 8, paddingRight: 16 },
  addChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#74C69D",
  },
  addChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.85)",
    letterSpacing: -0.1,
  },
  viewChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.09)",
    maxWidth: SCREEN_WIDTH - 80,
  },
  viewChipSelected: {
    backgroundColor: "#22C55E",
    borderColor: "#22C55E",
    shadowColor: "#22C55E",
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
  },
  viewChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.92)",
    letterSpacing: -0.1,
  },
  viewChipTextSelected: { color: "#06090C", fontWeight: "700" },
  viewChipPresetText: {
    fontSize: 11,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.45)",
  },
  viewChipPresetTextSelected: { color: "rgba(6, 9, 12, 0.55)" },

  // Timeframe = segmented control with a SLIDING indicator (the green pill
  // animates between positions on selection, instead of just flashing
  // background colors on/off).
  timeframeRow: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    position: "relative",
  },
  timeframeIndicator: {
    position: "absolute",
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: 999,
    backgroundColor: "#22C55E",
    shadowColor: "#22C55E",
    shadowOpacity: 0.30,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  timeframeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
    backgroundColor: "transparent",
    borderWidth: 0,
    zIndex: 1,
  },
  timeframeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.75)",
    letterSpacing: 0.1,
    fontVariant: ["tabular-nums"],
  },
  timeframeTextSelected: { color: "#06090C", fontWeight: "700" },

  graphSection: {
    paddingHorizontal: 8,
    paddingTop: 24,
    minHeight: 340,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.textHi,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyBody: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    lineHeight: 20,
  },
});

// Help overlay typography — mirrors helpStyles in Skill Map / Consistency
// Score so the three Progress sub-screens read with one voice.
const helpStyles = StyleSheet.create({
  section: { gap: 12 },
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
