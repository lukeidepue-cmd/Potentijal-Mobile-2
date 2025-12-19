// app/(tabs)/(home)/lifting/index.tsx
import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import Svg, { G, Line as SvgLine, Path, Circle, Text as SvgText } from "react-native-svg";
import { theme } from "../../../../constants/theme";
import { getScheduleWithStatus, getCurrentWeekStart } from "../../../../lib/api/schedule";
import { useAuth } from "../../../../providers/AuthProvider";
import { useExerciseProgressGraph, type ProgressMetric } from "../../../../hooks/useExerciseProgressGraph";
import { useExerciseProgressGraphDirect } from "../../../../hooks/useExerciseProgressGraphDirect";

// Fonts: Geist (Font 2) + Space Grotesk (Font 3 kept available)
import {
  useFonts as useGeist,
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
  Geist_800ExtraBold,
} from "@expo-google-fonts/geist";
import {
  useFonts as useSpaceGrotesk,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";

/* ---------------- Font roles ---------------- */
const FONT = {
  // Font 2 (UI = Geist)
  uiRegular: "Geist_400Regular",
  uiMedium: "Geist_500Medium",
  uiSemi: "Geist_600SemiBold",
  uiBold: "Geist_700Bold",
  uiXBold: "Geist_800ExtraBold",
  // Font 3 (Display = Space Grotesk)
  displayMed: "SpaceGrotesk_600SemiBold",
  displayBold: "SpaceGrotesk_700Bold",
};

/* ---------------- Helpers: week + mock data ---------------- */
type MetricKey = "reps" | "weight" | "volume";
type RangeKey = "7d" | "30d" | "90d" | "180d";
type DayStatus = "future" | "done" | "missed";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function getCurrentWeekStartingSunday(): Date[] {
  const now = startOfDay(new Date());
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d;
  });
}
const md = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
const yearOnly = (d: Date) => `${d.getFullYear()}`;

const WEEK_NAMES = [
  "Legs",
  "Chest & Triceps",
  "Back",
  "Rest",
  "Shoulders & Biceps",
  "Legs",
  "Forearms",
];

// simple rule for demo
function statusForDay(day: Date, index: number): DayStatus {
  const today = startOfDay(new Date());
  const dayStart = startOfDay(day);

  // demo: done on indices 1 & 4; missed on 0; others future/neutral
  if (dayStart.getTime() > today.getTime()) return "future";
  if (index === 1 || index === 4) return "done";
  if (index === 0) return "missed";
  return "future";
}

/* --------- Progress chart helpers (mock data) ---------- */
function binsFor(range: RangeKey) {
  switch (range) {
    case "7d": return { bins: 7, stepDays: 1 };
    case "30d": return { bins: 4, stepDays: 7 };   // weekly
    case "90d": return { bins: 6, stepDays: 14 };  // biweekly
    case "180d": return { bins: 6, stepDays: 30 }; // monthly-ish
  }
}

function baseAvgFor(metric: MetricKey, _exercise: string): number {
  if (metric === "reps") return 10;
  if (metric === "weight") return 135;
  return 1200; // volume (reps × weight)
}

function randomNear(avg: number, spread: number) {
  return Math.max(0, Math.round(avg + (Math.random() * 2 - 1) * spread));
}

type Pt = { x: number; y: number; date: Date };
function makeSeries(metric: MetricKey, range: RangeKey, exercise: string): { data: Pt[]; avg: number } {
  const { bins, stepDays } = binsFor(range);
  const avg = baseAvgFor(metric, exercise);
  const spread = Math.max(4, Math.round(avg * 0.15));
  const data: Pt[] = Array.from({ length: bins }).map((_, i) => {
    const daysBack = (bins - 1 - i) * stepDays;
    const d = new Date();
    d.setDate(d.getDate() - daysBack);
    return { x: i + 1, y: randomNear(avg, spread), date: d };
  });
  return { data, avg };
}

function yTicksFrom(avg: number) {
  const step = Math.max(1, Math.round(avg * 0.06));
  const arr = [
    avg - step * 4, avg - step * 3, avg - step * 2, avg - step,
    avg, avg + step, avg + step * 2, avg + step * 3, avg + step * 4,
  ].map((n) => Math.max(0, n));
  return Array.from(new Set(arr)).sort((a, b) => a - b);
}

/* -------------------------------- Component -------------------------------- */
export default function LiftingHome() {
  const [geistLoaded] = useGeist({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    Geist_800ExtraBold,
  });
  const [sgLoaded] = useSpaceGrotesk({
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });
  const fontsReady = geistLoaded && sgLoaded;

  const days = getCurrentWeekStartingSunday();
  const { user } = useAuth();
  const weekStart = getCurrentWeekStart();

  // Schedule state
  const [scheduleData, setScheduleData] = useState<Array<{
    dayIndex: number;
    label: string | null;
    status: 'completed' | 'missed' | 'rest' | 'empty';
    date: string;
  }> | null>(null);

  // Load schedule on mount and when screen comes into focus
  useEffect(() => {
    if (user) {
      loadSchedule();
    }
  }, [user, weekStart]);

  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        loadSchedule();
      }
    }, [user, weekStart])
  );

  const loadSchedule = async () => {
    const { data } = await getScheduleWithStatus({
      mode: 'lifting',
      weekStartDate: weekStart,
    });
    if (data) {
      setScheduleData(data);
    }
  };

  // Progress state -> now controlled by 2 dropdowns
  const [metric, setMetric] = useState<MetricKey>("weight");
  const [range, setRange] = useState<RangeKey>("90d");
  const [exercise, setExercise] = useState("");

  // Map frontend metric/range to backend
  const backendMetric: ProgressMetric = 
    metric === "reps" ? "reps" :
    metric === "weight" ? "weight" :
    "reps_x_weight";
  
  const backendDays = 
    range === "7d" ? 7 :
    range === "30d" ? 30 :
    range === "90d" ? 90 :
    range === "180d" ? 180 :
    360;

  // Fetch real progress data - using direct query to bypass RPC issues
  const { data: progressData, loading: progressLoading } = useExerciseProgressGraphDirect({
    mode: 'lifting',
    query: exercise,
    metric: backendMetric,
    days: backendDays as 7 | 30 | 90 | 180 | 360,
  });

  // Convert progress data to series format for graph
  const { data: series, avg } = useMemo(() => {
    if (!progressData || progressData.length === 0 || !exercise.trim()) {
      return { data: [], avg: 0 };
    }

    // Convert backend data to graph series
    // Handle both camelCase (from Supabase) and snake_case (direct from DB)
    const graphSeries = progressData
      .filter(p => p.value !== null)
      .map(p => {
        const bucketStart = (p as any).bucketStart ?? (p as any).bucket_start ?? '';
        const date = bucketStart ? new Date(bucketStart) : new Date();
        return {
          x: (p as any).bucketIndex ?? (p as any).bucket_index ?? 0,
          y: Number(p.value) || 0,
          date: date,
        };
      })
      .sort((a, b) => a.x - b.x);

    const values = graphSeries.map(s => s.y);
    const average = values.length > 0 
      ? values.reduce((sum, v) => sum + v, 0) / values.length 
      : 0;

    return { data: graphSeries, avg: average };
  }, [progressData, exercise]);

  const yTicks = useMemo(() => yTicksFrom(avg), [avg]);

  // Chart layout
  const H = 220;
  const M = { top: 10, bottom: 32, left: 42, right: 16 };
  const [w, setW] = useState(0);
  const innerW = Math.max(0, w - M.left - M.right);
  const innerH = H - M.top - M.bottom;
  const yMin = yTicks[0];
  const yMax = yTicks[yTicks.length - 1];
  const xFor = (i: number) => M.left + (series.length <= 1 ? 0 : (i * innerW) / (series.length - 1));
  const yFor = (val: number) => M.top + innerH - (innerH * (val - yMin)) / Math.max(1, yMax - yMin);
  const linePath = useMemo(() => {
    if (series.length === 0) return "";
    return series.map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(p.y)}`).join(" ");
  }, [series, w, yMin, yMax]);

  // Dropdown menus
  const [openMetric, setOpenMetric] = useState(false);
  const [openRange, setOpenRange] = useState(false);

  if (!fontsReady) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg0, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.bg0 }}
      contentContainerStyle={{ padding: theme.layout.xl, gap: theme.layout.lg, paddingBottom: 24 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* ===== Header: "Home" (Font 3 + underline) ===== */}
      <View style={{ alignItems: "center", marginTop: 32 }}>
        <Text style={styles.header}>Home</Text>
        <View style={styles.headerUnderline} />
      </View>

      {/* ================= SCHEDULE (Checklist) ================= */}
      <View style={styles.card}>
        <Text style={styles.scheduleTitle}>Schedule</Text>

        <View style={{ marginTop: 4 }}>
          {days.map((d, idx) => {
            const scheduleItem = scheduleData?.[idx];
            const label = scheduleItem?.label || '';
            const status = scheduleItem?.status || 'empty';
            
            // Map status to UI status
            const uiStatus: DayStatus = 
              status === 'completed' || status === 'rest' ? 'done' :
              status === 'missed' ? 'missed' :
              'future';
            
            const underlineColor =
              uiStatus === "done" ? theme.colors.primary600 :
              uiStatus === "missed" ? "#F14D4D" : "rgba(255,255,255,0.68)";
            const markColor =
              uiStatus === "done" ? theme.colors.primary600 :
              uiStatus === "missed" ? "#F14D4D" : "rgba(255,255,255,0.45)";

            return (
              <View key={idx} style={styles.checkRow}>
                {/* checkbox */}
                <View style={[styles.checkbox, { borderColor: markColor }]}>
                  {uiStatus === "done" && <Ionicons name="checkmark" size={12} color={markColor} />}
                  {uiStatus === "missed" && <Ionicons name="close" size={12} color={markColor} />}
                </View>

                {/* name */}
                <Text style={styles.checkName} numberOfLines={1}>
                  {label || ''}
                </Text>

                {/* date */}
                <Text style={styles.checkDate}>{md(d)}</Text>

                {/* underline */}
                <View style={[styles.underline, { backgroundColor: underlineColor }]} />
              </View>
            );
          })}
        </View>
      </View>

      {/* Right-aligned CTA under the schedule card, with 8px margin top/bottom */}
      <View style={{ alignItems: "flex-end", marginVertical: 8 }}>
        <Pressable onPress={() => router.push("/(tabs)/(home)/schedule-week")} style={{ borderRadius: 999, overflow: "hidden" }}>
          <LinearGradient
            colors={[theme.colors.primary600, "#3BAA6F"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.scheduleBtn, { paddingVertical: 14 }]} // retains +4px inside
          >
            <Ionicons name="add" size={18} color="#06160D" />
            <Text style={styles.scheduleBtnText}>Schedule Next Week</Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* ================= PROGRESS ================= */}
      <View style={styles.card}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
          <View style={styles.leftTick} />
          <Text style={styles.progressTitle}>Progress</Text>
        </View>

        {/* Search first */}
        <TextInput
          placeholder="Search an Exercise (e.g. bench press)…"
          placeholderTextColor={theme.colors.textLo}
          value={exercise}
          onChangeText={(t) => setExercise(t)}
          style={styles.search}
          autoCorrect={false}
          autoCapitalize="none"
          blurOnSubmit={false}
        />

        {/* Two dropdowns row (Font 2) */}
        <View style={styles.dropRow}>
          {/* Metric dropdown */}
          <View style={{ flex: 1, position: "relative" }}>
            <Pressable
              onPress={() => {
                setOpenMetric((v) => !v);
                setOpenRange(false);
              }}
              style={[styles.dropdown, openMetric && styles.dropdownActive]}
            >
              <Text style={styles.dropdownText}>
                {metric === "volume" ? "Reps × Weight" : metric[0].toUpperCase() + metric.slice(1)}
              </Text>
              <Ionicons name="chevron-down" size={12} color={openMetric ? theme.colors.primary600 : theme.colors.textHi} />
            </Pressable>
            {openMetric && (
              <View style={styles.menu}>
                {(["reps", "weight", "volume"] as MetricKey[]).map((k) => (
                  <Pressable
                    key={k}
                    onPress={() => {
                      setMetric(k);
                      setOpenMetric(false);
                    }}
                    style={styles.menuItem}
                  >
                    <Text style={styles.menuText}>
                      {k === "volume" ? "Reps × Weight" : k[0].toUpperCase() + k.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Range dropdown */}
          <View style={{ flex: 1, position: "relative" }}>
            <Pressable
              onPress={() => {
                setOpenRange((v) => !v);
                setOpenMetric(false);
              }}
              style={[styles.dropdown, openRange && styles.dropdownActive]}
            >
              <Text style={styles.dropdownText}>
                {range === "7d" ? "7 Days" : range === "30d" ? "30 Days" : range === "90d" ? "90 Days" : "180 Days"}
              </Text>
              <Ionicons name="chevron-down" size={12} color={openRange ? theme.colors.primary600 : theme.colors.textHi} />
            </Pressable>
            {openRange && (
              <View style={styles.menu}>
                {(["7d", "30d", "90d", "180d"] as RangeKey[]).map((k) => (
                  <Pressable
                    key={k}
                    onPress={() => {
                      setRange(k);
                      setOpenRange(false);
                    }}
                    style={styles.menuItem}
                  >
                    <Text style={styles.menuText}>
                      {k === "7d" ? "7 Days" : k === "30d" ? "30 Days" : k === "90d" ? "90 Days" : "180 Days"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Chart (non-interactive) */}
        <View
          style={styles.chartWrap}
          onLayout={(e) => setW(e.nativeEvent.layout.width)}
        >
          <Svg width="100%" height="100%">
            {/* Grid + axes */}
            <G>
              {/* Y grid lines & labels */}
              {yTicks.map((t, i) => {
                const y = yFor(t);
                return (
                  <React.Fragment key={`y-${i}`}>
                    <SvgLine x1={M.left} x2={w - M.right} y1={y} y2={y} stroke="#16222c" strokeWidth={1} />
                    <SvgText x={M.left - 6} y={y + 3} fill="#8AA0B5" fontSize={10} textAnchor="end">
                      {t}
                    </SvgText>
                  </React.Fragment>
                );
              })}
              {/* X labels */}
              {series.map((p, i) => {
                const x = xFor(i);
                const lbl = range === "180d" ? yearOnly(p.date) : md(p.date);
                return (
                  <SvgText key={`x-${i}`} x={x} y={H - 12} fill="#8AA0B5" fontSize={10} textAnchor="middle">
                    {lbl}
                  </SvgText>
                );
              })}
              {/* Axes lines */}
              <SvgLine x1={M.left} x2={w - M.right} y1={H - M.bottom} y2={H - M.bottom} stroke="#22303d" strokeWidth={1} />
              <SvgLine x1={M.left} x2={M.left} y1={M.top} y2={H - M.bottom} stroke="#22303d" strokeWidth={1} />
            </G>

            {/* Line */}
            {linePath ? <Path d={linePath} fill="none" stroke={theme.colors.primary600} strokeWidth={2} /> : null}

            {/* Points */}
            {series.map((p, i) => (
              <Circle
                key={`pt-${i}`}
                cx={xFor(i)}
                cy={yFor(p.y)}
                r={4.5}
                stroke="#0a1a13"
                strokeWidth={2}
                fill={theme.colors.primary600}
              />
            ))}
          </Svg>
        </View>
      </View>
    </ScrollView>
  );
}

/* -------------------------------- Styles -------------------------------- */
const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    backgroundColor: "#0E1216",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 14,
  },

  /* Top Header ("Home") */
  header: {
    color: theme.colors.textHi,
    fontSize: 28,
    letterSpacing: 0.2,
    fontFamily: "Geist_800ExtraBold", // Space Grotesk
  },
  headerUnderline: {
    height: 3,
    alignSelf: "stretch",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 999,
    marginTop: 6,
  },

  /* Schedule title: Font 2 centered */
  scheduleTitle: {
    color: theme.colors.textHi,
    fontSize: 26,
    textAlign: "center",
    fontFamily: FONT.uiXBold,
    marginBottom: 6,
    letterSpacing: 0.2,
  },

  /* Checklist rows */
  checkRow: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingLeft: 4,
    marginHorizontal: 6,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  checkName: {
    flex: 1,
    color: theme.colors.textHi,
    fontSize: 16,
    fontFamily: FONT.uiXBold, // Font 2
  },
  checkDate: {
    color: "#A9B7C4",
    fontSize: 14,
    fontFamily: FONT.uiBold,
    marginLeft: 10,
  },
  underline: {
    position: "absolute",
    left: 32,
    right: 6,
    bottom: 2,
    height: 3,
    borderRadius: 999,
  },

  // right-aligned CTA
  scheduleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  scheduleBtnText: { color: "#06160D", fontFamily: FONT.uiXBold },

  /* Progress */
  leftTick: {
    width: 3,
    height: 16,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.35)",
    marginRight: 10,
  },
  progressTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontFamily: FONT.uiXBold, // Font 2
  },

  search: {
    backgroundColor: "#0C1014",
    color: theme.colors.textHi,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    marginTop: 2,
    marginBottom: 10,
    fontFamily: FONT.uiRegular,
  },

  /* Dropdowns */
  dropRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#0A0F12",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  dropdownActive: {
    borderColor: theme.colors.primary600,
    backgroundColor: "#0E1316",
  },
  dropdownText: {
    color: theme.colors.textHi,
    fontSize: 12,
    letterSpacing: 0.2,
    fontFamily: FONT.uiSemi, // Font 2
  },
  menu: {
    position: "absolute",
    top: 42,
    left: 0,
    right: 0,
    backgroundColor: "#0E1216",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
    zIndex: 20,
  },
  menuItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  menuText: {
    color: theme.colors.textHi,
    fontSize: 12,
    fontFamily: FONT.uiSemi,
  },

  chartWrap: {
    height: 220,
    backgroundColor: "#0B121A",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1a2230",
    overflow: "hidden",
  },
});


 

