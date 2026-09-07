// app/(tabs)/history/index.tsx
//
// Redesign 2026-05-29 — see docs/DESIGN_RESEARCH_2026.md
// Goals:
//   1. Replace the bland flat list with a premium card pattern (date kicker
//      stripe, type icon, hairline border, chevron, spring press).
//   2. Add a Whoop-style "big number + label" hero showing total + streak.
//   3. Capsule-pill segmented control with animated indicator (iOS-26 feel).
//
// API + data loading is unchanged; only chrome + rendering was touched.

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  SafeAreaView,
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Image,
  Dimensions,
  RefreshControl,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router/react-navigation";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  Easing,
  Layout,
  FadeIn,
} from "react-native-reanimated";

import { theme } from "../../../constants/theme";
import { getPresetColorTokens } from "../../../constants/preset-cosmetics";
import { SkeletonCard } from "../../../components/Skeleton";
import {
  listWorkouts,
  listPractices,
  listGames,
  getHistoryStats,
  type HistoryWorkout,
  type HistoryPractice,
  type HistoryGame,
} from "../../../lib/api/history";
import { useAuth } from "../../../providers/AuthProvider";
import { useFeatures } from "../../../hooks/useFeatures";

import {
  useFonts as useGeist,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
} from "@expo-google-fonts/geist";
import {
  useFonts as useSpaceGrotesk,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";

const FONT = {
  uiMedium: "Geist_500Medium",
  uiSemi: "Geist_600SemiBold",
  uiBold: "Geist_700Bold",
  displayBold: "SpaceGrotesk_700Bold",
} as const;

type HistoryType = "workouts" | "practices" | "games";

const TYPE_META: Record<HistoryType, { label: string; icon: keyof typeof Ionicons.glyphMap; mciIcon?: keyof typeof MaterialCommunityIcons.glyphMap }> = {
  workouts:  { label: "Workouts", icon: "barbell" },
  practices: { label: "Practices", icon: "people", mciIcon: "whistle" },
  games:     { label: "Games", icon: "trophy" },
};

function fmtMonth(iso: string) {
  const parts = iso.split("T")[0].split("-");
  if (parts.length !== 3) return "";
  const monthAbbr = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return monthAbbr[parseInt(parts[1], 10) - 1] || "";
}
function fmtDay(iso: string) {
  const parts = iso.split("T")[0].split("-");
  if (parts.length !== 3) return "";
  return parts[2].replace(/^0/, "");
}
function fmtYear(iso: string) {
  const parts = iso.split("T")[0].split("-");
  if (parts.length !== 3) return "";
  return parts[0].slice(-2);
}

/* ---------------------------- Screen ---------------------------- */
export default function HistoryIndex() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { canLogPractices, canLogGames } = useFeatures();

  useGeist({ Geist_500Medium, Geist_600SemiBold, Geist_700Bold });
  useSpaceGrotesk({ SpaceGrotesk_700Bold });

  const [historyType, setHistoryType] = useState<HistoryType>("workouts");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  /* Pill segmented control — animated highlight */
  const [containerWidth, setContainerWidth] = useState(0);
  const indicatorX = useSharedValue(0);
  const indicatorW = useSharedValue(0);

  /* Loading star */
  const starRotation = useSharedValue(0);
  useEffect(() => {
    if (loading) {
      starRotation.value = withRepeat(
        withTiming(360, { duration: 800, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      starRotation.value = 0;
    }
  }, [loading]);

  /* Data */
  const [workouts, setWorkouts] = useState<HistoryWorkout[]>([]);
  const [practices, setPractices] = useState<HistoryPractice[]>([]);
  const [games, setGames] = useState<HistoryGame[]>([]);
  const [stats, setStats] = useState({ total: 0, streak: 0 });

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (!user) {
        setLoading(false);
        return;
      }

      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        if (historyType === "workouts") {
          const { data, error } = await listWorkouts({ search: query || undefined });
          if (error) setWorkouts([]);
          else setWorkouts(data || []);
          const statsResult = await getHistoryStats({ kind: "workouts" });
          if (!statsResult.error) setStats(statsResult.data || { total: 0, streak: 0 });
        } else if (historyType === "practices") {
          const { data, error } = await listPractices({});
          if (error) setPractices([]);
          else {
            let filtered = data || [];
            if (query.trim()) {
              const q = query.trim().toLowerCase();
              filtered = filtered.filter((p) => {
                const dateStr = `${fmtMonth(p.practiced_at)} ${fmtDay(p.practiced_at)}`.toLowerCase();
                const modeStr = p.mode.toLowerCase();
                return dateStr.includes(q) || modeStr.includes(q);
              });
            }
            setPractices(filtered);
          }
          const statsResult = await getHistoryStats({ kind: "practices" });
          if (!statsResult.error) setStats(statsResult.data || { total: 0, streak: 0 });
        } else {
          const { data, error } = await listGames({});
          if (error) setGames([]);
          else {
            let filtered = data || [];
            if (query.trim()) {
              const q = query.trim().toLowerCase();
              filtered = filtered.filter((g) => {
                const dateStr = `${fmtMonth(g.played_at)} ${fmtDay(g.played_at)}`.toLowerCase();
                const modeStr = g.mode.toLowerCase();
                const resultStr = (g.result || "").toLowerCase();
                const titleStr = (g.title || "").toLowerCase();
                return (
                  dateStr.includes(q) ||
                  modeStr.includes(q) ||
                  resultStr.includes(q) ||
                  titleStr.includes(q)
                );
              });
            }
            setGames(filtered);
          }
          const statsResult = await getHistoryStats({ kind: "games" });
          if (!statsResult.error) setStats(statsResult.data || { total: 0, streak: 0 });
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user, historyType, query],
  );

  const onRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadData(true);
  }, [loadData]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const items = useMemo(() => {
    if (historyType === "workouts") return workouts;
    if (historyType === "practices") return practices;
    return games;
  }, [historyType, workouts, practices, games]);

  /* Tab → indicator position */
  const availableTabs: HistoryType[] = ["workouts", "practices", "games"];
  useEffect(() => {
    const idx = availableTabs.indexOf(historyType);
    if (idx < 0 || containerWidth <= 0) return;
    // Subtract the track's 4px horizontal padding on each side (8px total) so the
    // indicator stays inside the track. The indicator's own `left: 4` covers the
    // left inset; this keeps the right edge of the last tab from overflowing.
    const tabW = (containerWidth - 8) / availableTabs.length;
    indicatorX.value = withSpring(idx * tabW, theme.spring.snappy);
    indicatorW.value = withSpring(tabW, theme.spring.snappy);
  }, [historyType, containerWidth]);
  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorW.value,
  }));

  const searchPlaceholder = useMemo(() => {
    if (historyType === "workouts") return "Search workouts";
    if (historyType === "practices") return "Search practices";
    return "Search games";
  }, [historyType]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.semantic.bg.canvas }}>
      {/* Subtle radial-ish ambient glow at top — borrowed from Whoop's hero treatment */}
      <LinearGradient
        colors={[
          "rgba(34,197,94,0.10)",
          "rgba(34,197,94,0.03)",
          "rgba(0,0,0,0)",
        ]}
        locations={[0, 0.4, 1]}
        style={styles.ambientGlow}
        pointerEvents="none"
      />

      <View style={styles.controlArea}>
        {/* Title row — present even though the tab bar already labels the page;
            gives the screen a "this is your record" feel.  */}
        <View style={styles.titleRow}>
          <Text style={styles.pageTitle}>History</Text>
          <View style={styles.statsInline}>
            <Text style={styles.statsInlineNum}>{stats.total}</Text>
            <Text style={styles.statsInlineLabel}>logged</Text>
            <View style={styles.statsDivider} />
            <Text style={styles.statsInlineNum}>{stats.streak}</Text>
            <Text style={styles.statsInlineLabel}>streak</Text>
          </View>
        </View>

        {/* Capsule pill segmented control */}
        <View
          style={styles.segmentTrack}
          onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        >
          <Animated.View style={[styles.segmentIndicator, indicatorStyle]} />
          {availableTabs.map((tab) => {
            const isActive = historyType === tab;
            const isDisabled =
              (tab === "practices" && !canLogPractices) ||
              (tab === "games" && !canLogGames);
            return (
              <Pressable
                key={tab}
                onPress={() => {
                  if (isDisabled) {
                    router.push("/(tabs)/purchase-premium");
                    return;
                  }
                  Haptics.selectionAsync();
                  setHistoryType(tab);
                }}
                style={[styles.segmentTab, isDisabled && { opacity: 0.4 }]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    isActive && styles.segmentTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {TYPE_META[tab].label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Search */}
        <View
          style={[
            styles.searchWrap,
            searchFocused && styles.searchWrapFocused,
          ]}
        >
          <Ionicons name="search" size={18} color={theme.semantic.text.tertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={searchPlaceholder}
            placeholderTextColor={theme.semantic.text.tertiary}
            style={styles.searchInput}
            onFocus={() => {
              setSearchFocused(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setQuery("");
              }}
              hitSlop={10}
              style={styles.searchClear}
            >
              <Ionicons name="close-circle" size={18} color={theme.semantic.text.tertiary} />
            </Pressable>
          )}
        </View>
      </View>

      {/* List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: theme.space.px16, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.semantic.accent.solid}
            colors={[theme.semantic.accent.solid]}
          />
        }
      >
        {loading ? (
          <View style={{ paddingTop: theme.space.px8 }}>
            {[...Array(7)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Image
              source={require("../../../assets/empty-star.png")}
              style={styles.emptyStar}
              resizeMode="contain"
            />
            <Text style={styles.emptyHeading}>
              {historyType === "workouts"
                ? "No workouts yet"
                : historyType === "games"
                ? "No games yet"
                : "No practices yet"}
            </Text>
            <Text style={styles.emptyBody}>
              {historyType === "workouts"
                ? "Log your first workout from the Workouts tab to start building your history."
                : historyType === "games"
                ? "Log your first game from the Home tab to track your competition record."
                : "Log your first practice from the Home tab to track training volume."}
            </Text>
          </View>
        ) : (
          <View style={{ paddingTop: theme.space.px8 }}>
            {items.map((item, idx) => {
              if (historyType === "workouts") {
                const w = item as HistoryWorkout;
                return (
                  <HistoryCard
                    key={w.id}
                    index={idx}
                    isoDate={w.performed_at}
                    title={w.name}
                    type="workouts"
                    presetColor={w.presetColor}
                    onPress={() => {
                      Haptics.selectionAsync();
                      router.push({
                        pathname: "/(tabs)/history/[id]",
                        params: {
                          id: w.id,
                          type: "workout",
                          name: w.name,
                          when: w.performed_at,
                          mode: w.mode,
                        },
                      });
                    }}
                  />
                );
              }
              if (historyType === "practices") {
                const p = item as HistoryPractice;
                return (
                  <HistoryCard
                    key={p.id}
                    index={idx}
                    isoDate={p.practiced_at}
                    title={(p as any).title || "Practice"}
                    type="practices"
                    onPress={() => {
                      Haptics.selectionAsync();
                      router.push({
                        pathname: "/(tabs)/history/[id]",
                        params: {
                          id: p.id,
                          type: "practice",
                          when: p.practiced_at,
                          mode: p.mode,
                        },
                      });
                    }}
                  />
                );
              }
              const g = item as HistoryGame;
              return (
                <HistoryCard
                  key={g.id}
                  index={idx}
                  isoDate={g.played_at}
                  title={g.title || "Game"}
                  type="games"
                  resultBadge={g.result || undefined}
                  onPress={() => {
                    Haptics.selectionAsync();
                    router.push({
                      pathname: "/(tabs)/history/[id]",
                      params: {
                        id: g.id,
                        type: "game",
                        when: g.played_at,
                        mode: g.mode,
                        result: g.result,
                        title: g.title || undefined,
                      },
                    });
                  }}
                />
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* --------------------- Premium history card --------------------- */
function HistoryCard({
  isoDate,
  title,
  type,
  resultBadge,
  onPress,
  index,
  presetColor,
}: {
  isoDate: string;
  title: string;
  type: HistoryType;
  resultBadge?: string;
  onPress: () => void;
  index: number;
  /** Color key (red/orange/yellow/green/blue/purple/pink) of the first preset
   *  used in this workout. Tints the date kicker + type-icon ring. Null/undef
   *  falls back to the default accent green (legacy workouts, no presets). */
  presetColor?: string | null;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const meta = TYPE_META[type];
  const resultColor =
    resultBadge?.toLowerCase() === "win"
      ? theme.semantic.intent.success
      : resultBadge?.toLowerCase() === "loss"
      ? theme.semantic.intent.danger
      : theme.semantic.text.secondary;

  // The workout-history card itself stays the default accent (green) regardless
  // of the preset color — the preset color is shown on the per-exercise boxes in
  // the workout detail screen instead, not on this list card.
  const tokens = getPresetColorTokens(null);

  return (
    <Animated.View
      entering={FadeIn.duration(220).delay(Math.min(index, 8) * 30)}
      layout={Layout.springify().damping(20).stiffness(170)}
    >
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.98, theme.spring.snappy);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, theme.spring.snappy);
        }}
      >
        <Animated.View style={[styles.card, animatedStyle]}>
          {/* Date kicker — tinted to the preset color when one is linked. */}
          <View style={[styles.dateKicker, { backgroundColor: tokens.subtle }]}>
            <Text style={[styles.dateMonth, { color: tokens.solid }]}>{fmtMonth(isoDate)}</Text>
            <Text style={styles.dateDay}>{fmtDay(isoDate)}</Text>
            <Text style={styles.dateYear}>'{fmtYear(isoDate)}</Text>
          </View>

          {/* Hairline divider between kicker and content */}
          <View style={styles.cardDivider} />

          {/* Body — type icon + title + optional result badge */}
          <View style={styles.cardBody}>
            <View style={[styles.typeIconWrap, { borderColor: tokens.subtle }]}>
              {meta.mciIcon ? (
                <MaterialCommunityIcons
                  name={meta.mciIcon}
                  size={18}
                  color={tokens.solid}
                />
              ) : (
                <Ionicons name={meta.icon} size={16} color={tokens.solid} />
              )}
            </View>

            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {title}
              </Text>
              <Text style={styles.cardSubtitle} numberOfLines={1}>
                {meta.label.slice(0, -1)}
                {resultBadge ? ` · ${resultBadge}` : ""}
              </Text>
            </View>

            {resultBadge ? (
              <View
                style={[
                  styles.resultPill,
                  { borderColor: resultColor, backgroundColor: `${resultColor}1F` },
                ]}
              >
                <Text style={[styles.resultPillText, { color: resultColor }]}>
                  {resultBadge.toUpperCase()}
                </Text>
              </View>
            ) : (
              <Ionicons name="chevron-forward" size={18} color={theme.semantic.text.tertiary} />
            )}
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

/* ------------------------------ Styles ------------------------------ */
const SCREEN_W = Dimensions.get("window").width;

const styles = StyleSheet.create({
  ambientGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 320,
  },

  controlArea: {
    paddingHorizontal: theme.space.px16,
    paddingTop: theme.space.px8,
    paddingBottom: theme.space.px16,
    gap: theme.space.px16,
  },

  /* Title + inline stats */
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingTop: theme.space.px8,
  },
  pageTitle: {
    fontSize: 32,
    lineHeight: 34,
    fontFamily: FONT.displayBold,
    fontWeight: "700",
    letterSpacing: -1,
    color: theme.semantic.text.primary,
  },
  statsInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingBottom: 4,
  },
  statsInlineNum: {
    fontSize: 18,
    fontFamily: FONT.uiBold,
    fontWeight: "700",
    color: theme.semantic.text.primary,
    fontVariant: ["tabular-nums"],
  },
  statsInlineLabel: {
    fontSize: 11,
    fontFamily: FONT.uiMedium,
    fontWeight: "600",
    color: theme.semantic.text.tertiary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginRight: 8,
  },
  statsDivider: {
    width: 1,
    height: 14,
    backgroundColor: theme.semantic.border.subtle,
    marginRight: 8,
  },

  /* Segmented pill */
  segmentTrack: {
    flexDirection: "row",
    height: 44,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.semantic.bg.surface,
    borderWidth: 1,
    borderColor: theme.semantic.border.hairline,
    padding: 4,
    position: "relative",
    overflow: "hidden",
  },
  segmentIndicator: {
    position: "absolute",
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.semantic.accent.solid,
    shadowColor: theme.semantic.accent.solid,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
  },
  segmentTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.space.px8,
  },
  segmentText: {
    fontSize: 13,
    fontFamily: FONT.uiSemi,
    fontWeight: "600",
    color: theme.semantic.text.secondary,
    letterSpacing: 0.1,
  },
  segmentTextActive: {
    color: theme.semantic.text.inverse,
    fontFamily: FONT.uiBold,
    fontWeight: "700",
  },

  /* Search */
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space.px8,
    height: 44,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space.px12,
    backgroundColor: theme.semantic.bg.surface,
    borderWidth: 1,
    borderColor: theme.semantic.border.hairline,
  },
  searchWrapFocused: {
    borderColor: theme.semantic.accent.solid,
    backgroundColor: theme.semantic.bg.surfaceElevated,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONT.uiMedium,
    color: theme.semantic.text.primary,
    padding: 0,
  },
  searchClear: {
    padding: 2,
  },

  /* Premium card */
  card: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: theme.semantic.bg.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.semantic.border.subtle,
    marginBottom: theme.space.px8,
    overflow: "hidden",
    ...(theme.elevation.e1 as object),
  },
  dateKicker: {
    width: 64,
    paddingVertical: theme.space.px12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.semantic.accent.subtle,
  },
  dateMonth: {
    fontSize: 10,
    fontFamily: FONT.uiBold,
    fontWeight: "700",
    color: theme.semantic.accent.solid,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  dateDay: {
    fontSize: 24,
    fontFamily: FONT.displayBold,
    fontWeight: "700",
    color: theme.semantic.text.primary,
    letterSpacing: -0.8,
    fontVariant: ["tabular-nums"],
    lineHeight: 26,
  },
  dateYear: {
    fontSize: 10,
    fontFamily: FONT.uiMedium,
    fontWeight: "500",
    color: theme.semantic.text.tertiary,
    fontVariant: ["tabular-nums"],
    marginTop: 1,
  },
  cardDivider: {
    width: 1,
    backgroundColor: theme.semantic.border.hairline,
  },
  cardBody: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space.px12,
    paddingHorizontal: theme.space.px16,
    paddingVertical: theme.space.px16,
    minHeight: 76,
  },
  typeIconWrap: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.semantic.bg.canvas,
    borderWidth: 1,
    borderColor: theme.semantic.accent.subtle,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: FONT.uiBold,
    fontWeight: "700",
    color: theme.semantic.text.primary,
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 12,
    fontFamily: FONT.uiMedium,
    color: theme.semantic.text.tertiary,
    marginTop: 2,
  },
  resultPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
  },
  resultPillText: {
    fontSize: 10,
    fontFamily: FONT.uiBold,
    fontWeight: "700",
    letterSpacing: 0.8,
  },

  /* Empty state — canonical 4-part pattern */
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 380,
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  emptyStar: {
    width: 140,
    height: 140,
    marginBottom: -12,
  },
  emptyHeading: {
    fontSize: 20,
    fontFamily: FONT.uiBold,
    fontWeight: "700",
    color: theme.semantic.text.primary,
    marginBottom: 6,
    letterSpacing: -0.3,
    textAlign: "center",
  },
  emptyBody: {
    fontSize: 14,
    fontFamily: FONT.uiMedium,
    color: theme.semantic.text.tertiary,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
});
