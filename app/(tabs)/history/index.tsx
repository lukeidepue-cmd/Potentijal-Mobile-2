// app/(tabs)/history/index.tsx
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
  LayoutChangeEvent,
  ActivityIndicator,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import { Card } from "../../../components/Card";
import { theme } from "../../../constants/theme";
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
import { mapModeKeyToSportMode, type SportMode } from "../../../lib/types";
import { useFeatures } from "../../../hooks/useFeatures";

/* --------------------- Fonts --------------------- */
import {
  useFonts as useGeist,
  Geist_500Medium,
  Geist_600SemiBold,
} from "@expo-google-fonts/geist";
import {
  useFonts as useSpaceGrotesk,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";

const FONT = {
  uiMedium: "Geist_500Medium",
  uiSemi: "Geist_600SemiBold",
  displayBold: "SpaceGrotesk_700Bold",
} as const;

/* --------------------- Types & helpers --------------------- */
type HistoryType = "workouts" | "practices" | "games";

type ModeKey =
  | "lifting"
  | "basketball"
  | "running"
  | "football"
  | "soccer"
  | "baseball"
  | "hockey"
  | "tennis";

const iconFor: Record<ModeKey, React.ReactNode> = {
  lifting: <MaterialCommunityIcons name="dumbbell" size={16} color="#111" />,
  basketball: <Ionicons name="basketball-outline" size={16} color="#111" />,
  running: <MaterialCommunityIcons name="run" size={16} color="#111" />,
  football: <Ionicons name="american-football-outline" size={16} color="#111" />,
  soccer: <Ionicons name="football-outline" size={16} color="#111" />,
  baseball: <MaterialCommunityIcons name="baseball" size={16} color="#111" />,
  hockey: <MaterialCommunityIcons name="hockey-sticks" size={16} color="#111" />,
  tennis: <MaterialCommunityIcons name="tennisball" size={16} color="#111" />,
};

const resultIconFor: Record<'win' | 'loss' | 'tie', React.ReactNode> = {
  win: <Ionicons name="checkmark-circle" size={16} color="#22C55E" />,
  loss: <Ionicons name="close-circle" size={16} color="#EF4444" />,
  tie: <Ionicons name="remove-circle" size={16} color="#F59E0B" />,
};

function fmtDate(iso: string) {
  // Parse as local date to avoid timezone issues
  // iso is in YYYY-MM-DD format from database
  const parts = iso.split('T')[0].split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    return `${month}/${day}/${String(year).slice(-2)}`;
  }
  // Fallback to Date parsing if format is unexpected
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(-2)}`;
}

function getModeKey(mode: string): ModeKey {
  const modeMap: Record<string, ModeKey> = {
    workout: "lifting",
    basketball: "basketball",
    running: "running",
    football: "football",
    soccer: "soccer",
    baseball: "baseball",
    hockey: "hockey",
    tennis: "tennis",
  };
  return modeMap[mode] || "lifting";
}

/* --------------------------- Screen --------------------------- */
export default function HistoryIndex() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { canLogPractices, canLogGames } = useFeatures();
  const [barH, setBarH] = useState(0);

  // Load fonts
  useGeist({ Geist_500Medium, Geist_600SemiBold });
  useSpaceGrotesk({ SpaceGrotesk_700Bold });

  const [historyType, setHistoryType] = useState<HistoryType>("workouts");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Data state
  const [workouts, setWorkouts] = useState<HistoryWorkout[]>([]);
  const [practices, setPractices] = useState<HistoryPractice[]>([]);
  const [games, setGames] = useState<HistoryGame[]>([]);
  const [stats, setStats] = useState({ total: 0, streak: 0 });

  // Load data
  const loadData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      if (historyType === "workouts") {
        const { data, error } = await listWorkouts({ search: query || undefined });
        if (error) {
          console.error("Error loading workouts:", error);
          setWorkouts([]);
        } else {
          setWorkouts(data || []);
        }
        const statsResult = await getHistoryStats({ kind: "workouts" });
        if (!statsResult.error) {
          setStats(statsResult.data || { total: 0, streak: 0 });
        }
      } else if (historyType === "practices") {
        const { data, error } = await listPractices({});
        if (error) {
          console.error("Error loading practices:", error);
          setPractices([]);
        } else {
          // Filter by search query if provided
          let filtered = data || [];
          if (query.trim()) {
            const q = query.trim().toLowerCase();
            filtered = filtered.filter((p) => {
              const dateStr = fmtDate(p.practiced_at).toLowerCase();
              const modeStr = p.mode.toLowerCase();
              // For date search, be more precise
              if (q.match(/^\d{1,2}\/\d{1,2}/)) {
                // If query looks like a date (e.g., "11/21" or "11/2")
                // "11/2" should match "11/20", "11/21", "11/22", etc.
                // "11/21" should only match "11/21"
                if (q.endsWith('/')) {
                  // If ends with /, match exact date
                  return dateStr === q.slice(0, -1) || dateStr.startsWith(q) || modeStr.includes(q);
                } else {
                  // Match if date starts with the pattern or contains it
                  return dateStr.startsWith(q) || dateStr.includes('/' + q + '/') || modeStr.includes(q);
                }
              }
              return dateStr.includes(q) || modeStr.includes(q);
            });
          }
          setPractices(filtered);
        }
        const statsResult = await getHistoryStats({ kind: "practices" });
        if (!statsResult.error) {
          setStats(statsResult.data || { total: 0, streak: 0 });
        }
      } else if (historyType === "games") {
        const { data, error } = await listGames({});
        if (error) {
          console.error("Error loading games:", error);
          setGames([]);
        } else {
          // Filter by search query if provided
          let filtered = data || [];
          if (query.trim()) {
              const q = query.trim().toLowerCase();
            filtered = filtered.filter((g) => {
              const dateStr = fmtDate(g.played_at).toLowerCase();
              const modeStr = g.mode.toLowerCase();
              const resultStr = g.result.toLowerCase();
              const titleStr = (g.title || '').toLowerCase();
              // For date search, be more precise
              if (q.match(/^\d{1,2}\/\d{1,2}/)) {
                // If query looks like a date (e.g., "11/21" or "11/2")
                // "11/2" should match "11/20", "11/21", "11/22", etc.
                // "11/21" should only match "11/21"
                if (q.endsWith('/')) {
                  // If ends with /, match exact date
                  return dateStr === q.slice(0, -1) || dateStr.startsWith(q) || modeStr.includes(q) || resultStr.includes(q) || titleStr.includes(q);
                } else {
                  // Match if date starts with the pattern or contains it
                  return dateStr.startsWith(q) || dateStr.includes('/' + q + '/') || modeStr.includes(q) || resultStr.includes(q) || titleStr.includes(q);
                }
              }
              return dateStr.includes(q) || modeStr.includes(q) || resultStr.includes(q) || titleStr.includes(q);
            });
          }
          setGames(filtered);
        }
        const statsResult = await getHistoryStats({ kind: "games" });
        if (!statsResult.error) {
          setStats(statsResult.data || { total: 0, streak: 0 });
        }
      }
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoading(false);
    }
  }, [user, historyType, query]);

  // Reload when type changes or on focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const GAP = 14;

  // Get current items based on type
  const items = useMemo(() => {
    if (historyType === "workouts") {
      return workouts;
    } else if (historyType === "practices") {
      return practices;
    } else {
      return games;
    }
  }, [historyType, workouts, practices, games]);

  // Update search placeholder based on type
  const searchPlaceholder = useMemo(() => {
    if (historyType === "workouts") return "Search for a workout";
    if (historyType === "practices") return "Search practices";
    return "Search games";
  }, [historyType]);

  // Get stat labels based on type
  const statLabels = useMemo(() => {
    if (historyType === "workouts") {
      return { left: "Total Workouts", right: "Workout Streak" };
    } else if (historyType === "practices") {
      return { left: "Total Practices", right: "Practice Streak" };
    } else {
      return { left: "Total Games", right: "Win Streak" };
    }
  }, [historyType]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.bg }}>
      {/* Header */}
      <View style={{ alignItems: "center", paddingHorizontal: 16, paddingTop: 8 }}>
        <Text style={styles.header}>History</Text>
        <View style={styles.headerUnderline} />
      </View>

      {/* Search + dropdown row */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 10, marginTop: 10 }}>
        <View style={{ flex: 13 }}>
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={16} color={theme.color.dim} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={searchPlaceholder}
              placeholderTextColor={theme.color.dim}
              style={styles.searchInput}
            />
          </View>
        </View>
        <View style={{ flex: 7 }}>
          <HistoryTypeDropdown 
            value={historyType} 
            onChange={setHistoryType}
            canLogPractices={canLogPractices}
            canLogGames={canLogGames}
          />
        </View>
      </View>

      {/* Scrollable list */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: Math.max(0, barH - GAP),
        }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <Card>
            <ActivityIndicator size="small" color={theme.color.brand} />
            <Text style={{ color: "#666", marginTop: 8 }}>Loading...</Text>
          </Card>
        ) : items.length === 0 ? (
          <Card>
            <Text style={{ color: "#666", fontWeight: "700" }}>No {historyType} found.</Text>
          </Card>
        ) : (
          items.map((item) => {
            if (historyType === "workouts") {
              const workout = item as HistoryWorkout;
              return (
                <Pressable
                  key={workout.id}
                  onPress={() => {
                    Haptics.selectionAsync();
                    router.push({
                      pathname: "/(tabs)/history/[id]",
                      params: {
                        id: workout.id,
                        type: "workout",
                        name: workout.name,
                        when: workout.performed_at,
                        mode: workout.mode,
                      },
                    });
                  }}
                  style={{ marginBottom: 12 }}
                >
                  <Card>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Text style={styles.dateText}>{fmtDate(workout.performed_at)}</Text>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {workout.name}
                      </Text>
                      <View style={styles.sportPill}>{iconFor[getModeKey(workout.mode)]}</View>
                    </View>
                  </Card>
                </Pressable>
              );
            } else if (historyType === "practices") {
              const practice = item as HistoryPractice;
              return (
                <Pressable
                  key={practice.id}
                  onPress={() => {
                    Haptics.selectionAsync();
                    router.push({
                      pathname: "/(tabs)/history/[id]",
                      params: {
                        id: practice.id,
                        type: "practice",
                        when: practice.practiced_at,
                        mode: practice.mode,
                      },
                    });
                  }}
                  style={{ marginBottom: 12 }}
                >
                  <Card>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Text style={styles.dateText}>{fmtDate(practice.practiced_at)}</Text>
                      <View style={{ flex: 1 }} />
                      <View style={styles.sportPill}>{iconFor[getModeKey(practice.mode)]}</View>
                    </View>
                  </Card>
                </Pressable>
              );
            } else {
              const game = item as HistoryGame;
              return (
                <Pressable
                  key={game.id}
                  onPress={() => {
                    Haptics.selectionAsync();
                    router.push({
                      pathname: "/(tabs)/history/[id]",
                      params: {
                        id: game.id,
                        type: "game",
                        when: game.played_at,
                        mode: game.mode,
                        result: game.result,
                        title: game.title || undefined,
                      },
                    });
                  }}
                  style={{ marginBottom: 12 }}
                >
                  <Card>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Text style={styles.dateText}>{fmtDate(game.played_at)}</Text>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {game.title || game.result.charAt(0).toUpperCase() + game.result.slice(1)}
                      </Text>
                      <View style={styles.sportPill}>{iconFor[getModeKey(game.mode)]}</View>
                    </View>
                  </Card>
                </Pressable>
              );
            }
          })
        )}
      </ScrollView>

      {/* Sticky bottom stats */}
      <View
        style={[
          styles.stickyBar,
          {
            paddingBottom: Math.max(4, insets.bottom - 16),
            paddingTop: GAP,
          },
        ]}
        onLayout={(e: LayoutChangeEvent) => setBarH(e.nativeEvent.layout.height)}
      >
        <View style={[styles.statCard, { marginRight: 8 }]}>
          <View style={styles.statRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.statKicker}>Total</Text>
              <Text style={styles.statTitle}>{statLabels.left.replace("Total ", "")}</Text>
            </View>
            <Text style={styles.statValueRight}>{stats.total}</Text>
          </View>
        </View>

        <View style={[styles.statCard, { marginLeft: 8 }]}>
          <View style={styles.statRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.statKicker}>{statLabels.right.split(" ")[0]}</Text>
              <Text style={styles.statTitle}>{statLabels.right.split(" ").slice(1).join(" ")}</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={styles.statValueRight}>{stats.streak}</Text>
              <MaterialCommunityIcons name="fire" size={16} color={theme.color.brand} />
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

/* ---------------------- Small components ---------------------- */
function HistoryTypeDropdown({
  value,
  onChange,
  canLogPractices,
  canLogGames,
}: {
  value: HistoryType;
  onChange: (t: HistoryType) => void;
  canLogPractices: boolean;
  canLogGames: boolean;
}) {
  const [open, setOpen] = useState(false);
  const options: HistoryType[] = ["workouts", "practices", "games"];

  const canAccessOption = (opt: HistoryType): boolean => {
    if (opt === "workouts") return true;
    if (opt === "practices") return canLogPractices;
    if (opt === "games") return canLogGames;
    return true;
  };

  return (
    <View>
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          setOpen((s) => !s);
        }}
        style={styles.ddTrigger}
      >
        <Text style={styles.ddText} numberOfLines={1} ellipsizeMode="clip">
          {value === "workouts" ? "Workouts" : value === "practices" ? "Practices" : "Games"}
        </Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color="#cbd5e1" />
      </Pressable>

      {open && (
        <View style={styles.ddMenu}>
          {options.map((opt) => {
            const canAccess = canAccessOption(opt);
            return (
            <Pressable
              key={opt}
              onPress={() => {
                if (canAccess) {
                  onChange(opt);
                  setOpen(false);
                }
              }}
              style={[
                styles.ddItem,
                value === opt && { backgroundColor: "#0f1317", borderColor: theme.color.brand },
                !canAccess && { opacity: 0.5 },
              ]}
              disabled={!canAccess}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {!canAccess && (
                  <Ionicons name="lock-closed" size={14} color="#cbd5e1" />
                )}
                <Text
                  style={[
                    styles.ddItemText,
                    value === opt && { color: theme.color.brand },
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {opt === "workouts" ? "Workouts" : opt === "practices" ? "Practices" : "Games"}
                </Text>
              </View>
            </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

/* ----------------------------- Styles ----------------------------- */
const styles = StyleSheet.create({
  header: {
    color: theme.color.text,
    fontSize: 28,
    letterSpacing: 0.2,
    fontWeight: Platform.select({ ios: "900", android: "700" }) as any,
    fontFamily: "Geist_800ExtraBold",
  },
  headerUnderline: {
    height: 3,
    alignSelf: "stretch",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 999,
    marginTop: 6,
  },

  /* search + dropdown */
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#0f1317",
    borderWidth: 1,
    borderColor: "#1a222b",
  },
  searchInput: {
    color: theme.color.text,
    flex: 1,
    fontFamily: FONT.uiMedium,
  },

  ddTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#0f1317",
    borderWidth: 1,
    borderColor: "#1a222b",
  },
  ddText: {
    color: "#e2e8f0",
    fontWeight: "800",
    fontSize: 13,
    lineHeight: 16,
  },

  ddMenu: {
    position: "absolute",
    top: 46,
    left: 0,
    right: 0,
    borderRadius: 12,
    backgroundColor: "#0b0f13",
    borderWidth: 1,
    borderColor: "#1a222b",
    overflow: "hidden",
    zIndex: 10,
  },
  ddItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1a222b",
  },
  ddItemText: {
    color: "#e2e8f0",
    fontWeight: "800",
    fontSize: 13,
    lineHeight: 16,
    fontFamily: FONT.uiSemi,
  },

  /* list row */
  dateText: {
    color: theme.color.brand,
    fontWeight: "900",
    marginRight: 12,
    minWidth: 64,
    fontFamily: FONT.uiSemi,
  },
  itemName: {
    flex: 1,
    color: theme.color.text,
    fontWeight: "900",
    fontFamily: FONT.uiSemi,
  },
  sportPill: {
    marginLeft: 12,
    minWidth: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: "#fef08a",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e7e4b3",
  },

  /* sticky bottom stats */
  stickyBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 0,
    flexDirection: "row",
    backgroundColor: theme.color.bg,
    zIndex: 50,
    elevation: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "transparent",
    borderColor: theme.color.brand,
    borderWidth: 1,
    borderRadius: 16,
    padding: 10,
  },
  statKicker: {
    color: theme.color.dim,
    fontSize: 11,
    marginBottom: 2,
    fontFamily: FONT.displayBold,
  },
  statTitle: {
    color: theme.color.text,
    fontSize: 16,
    marginBottom: 0,
    fontFamily: FONT.uiMedium,
  },
  statValueRight: {
    color: theme.color.text,
    fontSize: 24,
    fontFamily: FONT.uiSemi,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
  },
});
