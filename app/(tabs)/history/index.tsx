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
  Image,
  ImageBackground,
  Dimensions,
  RefreshControl,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
} from "react-native-reanimated";

import { Card } from "../../../components/Card";
import { theme } from "../../../constants/theme";
import { Skeleton, SkeletonCard } from "../../../components/Skeleton";
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
  | "football"
  | "soccer"
  | "baseball"
  | "hockey"
  | "tennis";

const iconFor: Record<ModeKey, React.ReactNode> = {
  lifting: <MaterialCommunityIcons name="dumbbell" size={16} color="#111" />,
  basketball: <Ionicons name="basketball-outline" size={16} color="#111" />,
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

  // Load fonts
  useGeist({ Geist_500Medium, Geist_600SemiBold });
  useSpaceGrotesk({ SpaceGrotesk_700Bold });

  const [historyType, setHistoryType] = useState<HistoryType>("workouts");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  
  // Animation for sliding underline
  const underlinePosition = useSharedValue(0);
  const underlineWidth = useSharedValue(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const screenWidth = Dimensions.get("window").width;

  // Animation for spinning star loading
  const starRotation = useSharedValue(0);
  
  // Animation for search input focus
  const searchScale = useSharedValue(1);
  
  useEffect(() => {
    if (loading) {
      starRotation.value = withRepeat(
        withTiming(360, {
          duration: 800,
          easing: Easing.linear,
        }),
        -1,
        false
      );
    } else {
      starRotation.value = 0;
    }
  }, [loading]);

  const starAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${starRotation.value}deg` }],
  }));
  
  const searchAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: searchScale.value }],
  }));

  // Data state
  const [workouts, setWorkouts] = useState<HistoryWorkout[]>([]);
  const [practices, setPractices] = useState<HistoryPractice[]>([]);
  const [games, setGames] = useState<HistoryGame[]>([]);
  const [stats, setStats] = useState({ total: 0, streak: 0 });

  // Load data
  const loadData = useCallback(async (isRefresh = false) => {
    if (!user) {
      setLoading(false);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
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
              const resultStr = (g.result || '').toLowerCase(); // Handle null result
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
      setRefreshing(false);
    }
  }, [user, historyType, query]);

  // Pull-to-refresh handler
  const onRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadData(true);
  }, [loadData]);

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


  // Get available tabs (always show all 3, but conditionally enable)
  const availableTabs = useMemo(() => {
    return ["workouts", "practices", "games"] as HistoryType[];
  }, []);

  // Update underline position when historyType changes
  useEffect(() => {
    const index = availableTabs.indexOf(historyType);
    if (index >= 0 && containerWidth > 0) {
      const tabWidth = containerWidth / 3;
      const screenTabWidth = screenWidth / 3;
      const padding = 16; // controlArea paddingHorizontal
      
      let position: number;
      let width: number;
      
      if (index === 0) {
        // Workouts: extend to left edge of screen
        position = -padding; // Move left by padding amount
        width = screenTabWidth + padding; // Extend to cover padding + 1/3 screen
      } else if (index === 2) {
        // Games: extend to right edge of screen
        position = index * tabWidth - padding; // Start earlier to extend right
        width = screenTabWidth + padding; // Extend to cover padding + 1/3 screen
      } else {
        // Practices: centered in its section
        position = index * tabWidth;
        width = tabWidth;
      }
      
      underlinePosition.value = withTiming(position, {
        duration: 250,
      });
      underlineWidth.value = withTiming(width, {
        duration: 250,
      });
    }
  }, [historyType, containerWidth, availableTabs, screenWidth]);

  // Animated style for sliding underline
  const underlineStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: underlinePosition.value }],
      width: underlineWidth.value,
    };
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.bg }}>
      {/* Control Area - Segmented Control + Search */}
      <View style={styles.controlArea}>
        {/* Segmented Control with Underlines */}
        <View style={styles.segmentWrapper}>
          <View
            style={styles.segmentContainer}
            onLayout={(e) => {
              setContainerWidth(e.nativeEvent.layout.width);
            }}
          >
            {availableTabs.map((tab) => {
              const isActive = historyType === tab;
              const isDisabled = (tab === "practices" && !canLogPractices) || (tab === "games" && !canLogGames);
              
              return (
                <Pressable
                  key={tab}
                  onPress={() => {
                    if (!isDisabled) {
                      Haptics.selectionAsync();
                      setHistoryType(tab);
                    }
                  }}
                  style={[styles.segmentTab, isDisabled && styles.segmentTabDisabled]}
                  disabled={isDisabled}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      isActive && styles.segmentTextActive,
                      isDisabled && styles.segmentTextDisabled,
                    ]}
                  >
                    {tab === "workouts" ? "Workouts" : tab === "practices" ? "Practices" : "Games"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {/* Sliding underline - positioned relative to segmentWrapper to extend to edges */}
          <Animated.View style={[styles.segmentUnderline, underlineStyle]} />
        </View>

        {/* Search bar - surfaced tool */}
        <View style={styles.searchContainer}>
          <Animated.View
            style={[
              styles.searchWrap,
              searchFocused && styles.searchWrapFocused,
              searchAnimatedStyle,
            ]}
          >
            <Ionicons name="search" size={20} color={theme.color.dim} style={styles.searchIcon} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={searchPlaceholder}
              placeholderTextColor={theme.color.dim}
              style={styles.searchInput}
              onFocus={() => {
                setSearchFocused(true);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                searchScale.value = withTiming(1.02, { duration: 250 });
              }}
              onBlur={() => {
                setSearchFocused(false);
                searchScale.value = withTiming(1, { duration: 250 });
              }}
            />
          </Animated.View>
        </View>
      </View>

      {/* Scrollable list */}
      <ScrollView
        style={[styles.scrollView, searchFocused && styles.scrollViewDimmed]}
        contentContainerStyle={{
          padding: 16,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#22C55E"
            colors={["#22C55E"]}
          />
        }
      >
        {loading ? (
          <View style={styles.skeletonContainer}>
            {[...Array(5)].map((_, i) => (
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
            <Text style={styles.emptyText}>
              {historyType === "workouts" 
                ? "No workouts yet" 
                : historyType === "games" 
                ? "No games yet" 
                : "No practices yet"}
            </Text>
          </View>
        ) : (
          items.map((item) => {
            if (historyType === "workouts") {
              const workout = item as HistoryWorkout;
              const modeKey = getModeKey(workout.mode);
              
              // Use new card design for all sport modes
              if (modeKey === "basketball") {
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
                      style={styles.newCardContainer}
                    >
                    <View style={styles.basketballCard}>
                      {/* Layer 1: Base gradient background (darker top-left → deeper bottom-right) */}
                      <LinearGradient
                        colors={["#C84B25", "#FF6A2A"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      
                      {/* Layer 2: Dark overlay at bottom for depth */}
                      <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.18)"]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 0, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      
                      {/* Layer 3: Artwork - top-right, embedded feel */}
                      <View style={styles.cardBackgroundImages}>
                        <Image
                          source={require("../../../assets/history/basketball-hoop.png")}
                          style={styles.backgroundHoop}
                          resizeMode="cover"
                        />
                        <Image
                          source={require("../../../assets/history/basketball.png")}
                          style={styles.backgroundBall1}
                          resizeMode="cover"
                        />
                        {/* Right-side fade mask for artwork - lighter so images show through */}
                        <LinearGradient
                          colors={["transparent", "rgba(200, 75, 37, 0.15)"]}
                          start={{ x: 0.6, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={StyleSheet.absoluteFill}
                          pointerEvents="none"
                        />
                      </View>
                      
                      {/* Layer 4: Top sheen highlight (premium coating effect) */}
                      <LinearGradient
                        colors={["rgba(255,255,255,0.10)", "transparent"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 0.4 }}
                        style={StyleSheet.absoluteFill}
                        pointerEvents="none"
                      />
                      
                      {/* Layer 5: Text content */}
                      <View style={styles.cardContent}>
                        <Text style={styles.newCardName} numberOfLines={2}>
                          {workout.name}
                        </Text>
                        <Text style={styles.newCardDate}>
                          {fmtDate(workout.performed_at)} • Basketball
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              }
              
              // Hockey card with Panera-style design
              if (modeKey === "hockey") {
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
                    style={styles.newCardContainer}
                  >
                    <View style={styles.hockeyCard}>
                      {/* Layer 1: Base gradient background (darker top-left → deeper bottom-right) */}
                      <LinearGradient
                        colors={["#66CCCC", "#99FFFF"]} // Darker cyan → lighter cyan
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      
                      {/* Layer 2: Dark overlay at bottom for depth */}
                      <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.18)"]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 0, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      
                      {/* Layer 3: Artwork - top-right, embedded feel */}
                      <View style={styles.cardBackgroundImages}>
                        <Image
                          source={require("../../../assets/history/hockey-net.png")}
                          style={styles.backgroundHockeyNet}
                          resizeMode="cover"
                        />
                        {/* Right-side fade mask for artwork */}
                        <LinearGradient
                          colors={["transparent", "rgba(102, 204, 204, 0.15)"]}
                          start={{ x: 0.6, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={StyleSheet.absoluteFill}
                          pointerEvents="none"
                        />
                      </View>
                      
                      {/* Layer 4: Top sheen highlight (premium coating effect) */}
                      <LinearGradient
                        colors={["rgba(255,255,255,0.10)", "transparent"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 0.4 }}
                        style={StyleSheet.absoluteFill}
                        pointerEvents="none"
                      />
                      
                      {/* Layer 5: Text content */}
                      <View style={styles.cardContent}>
                        <Text style={styles.newCardName} numberOfLines={2}>
                          {workout.name}
                        </Text>
                        <Text style={styles.newCardDate}>
                          {fmtDate(workout.performed_at)} • Hockey
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              }
              
              // Football card with Panera-style design
              if (modeKey === "football") {
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
                    style={styles.newCardContainer}
                  >
                    <View style={styles.footballCard}>
                      {/* Layer 1: Base gradient background (darker top-left → deeper bottom-right) */}
                      <LinearGradient
                        colors={["#6B3410", "#A0522D"]} // Darker brown → lighter brown
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      
                      {/* Layer 2: Dark overlay at bottom for depth */}
                      <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.18)"]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 0, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      
                      {/* Layer 3: Artwork - top-right, embedded feel */}
                      <View style={styles.cardBackgroundImages}>
                        <Image
                          source={require("../../../assets/history/football-field.png")}
                          style={styles.backgroundFootballField}
                          resizeMode="cover"
                        />
                        <Image
                          source={require("../../../assets/history/football.png")}
                          style={styles.backgroundFootball}
                          resizeMode="cover"
                        />
                        <LinearGradient
                          colors={["transparent", "rgba(107, 52, 16, 0.15)"]}
                          start={{ x: 0.6, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={StyleSheet.absoluteFill}
                          pointerEvents="none"
                        />
                      </View>
                      
                      {/* Layer 4: Top sheen highlight (premium coating effect) */}
                      <LinearGradient
                        colors={["rgba(255,255,255,0.10)", "transparent"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 0.4 }}
                        style={StyleSheet.absoluteFill}
                        pointerEvents="none"
                      />
                      
                      {/* Layer 5: Text content */}
                      <View style={styles.cardContent}>
                        <Text style={styles.newCardName} numberOfLines={2}>
                          {workout.name}
                        </Text>
                        <Text style={styles.newCardDate}>
                          {fmtDate(workout.performed_at)} • Football
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              }
              
              // Tennis card with Panera-style design
              if (modeKey === "tennis") {
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
                    style={styles.newCardContainer}
                  >
                    <View style={styles.tennisCard}>
                      {/* Layer 1: Base gradient background (darker top-left → deeper bottom-right) */}
                      <LinearGradient
                        colors={["#8FA020", "#C8D844"]} // Darker yellow-green → darker but still bright tennis ball yellow-green
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      
                      {/* Layer 2: Dark overlay at bottom for depth */}
                      <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.18)"]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 0, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      
                      {/* Layer 3: Artwork - top-right, embedded feel */}
                      <View style={styles.cardBackgroundImages}>
                        <Image
                          source={require("../../../assets/history/tennis-racket.png")}
                          style={styles.backgroundTennisRacket}
                          resizeMode="cover"
                        />
                        <Image
                          source={require("../../../assets/history/tennis-ball.png")}
                          style={styles.backgroundTennisBall}
                          resizeMode="cover"
                        />
                        <LinearGradient
                          colors={["transparent", "rgba(143, 160, 32, 0.15)"]}
                          start={{ x: 0.6, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={StyleSheet.absoluteFill}
                          pointerEvents="none"
                        />
                      </View>
                      
                      {/* Layer 4: Top sheen highlight (premium coating effect) */}
                      <LinearGradient
                        colors={["rgba(255,255,255,0.10)", "transparent"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 0.4 }}
                        style={StyleSheet.absoluteFill}
                        pointerEvents="none"
                      />
                      
                      {/* Layer 5: Text content */}
                      <View style={styles.cardContent}>
                        <Text style={styles.newCardName} numberOfLines={2}>
                          {workout.name}
                        </Text>
                        <Text style={styles.newCardDate}>
                          {fmtDate(workout.performed_at)} • Tennis
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              }
              
              // Lifting card with Panera-style design
              if (modeKey === "lifting") {
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
                    style={styles.newCardContainer}
                  >
                    <View style={styles.liftingCard}>
                      {/* Layer 1: Base gradient background (darker top-left → deeper bottom-right) */}
                      <LinearGradient
                        colors={["#4A4A4A", "#6B6B6B"]} // Darker gray → lighter gray
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      
                      {/* Layer 2: Dark overlay at bottom for depth */}
                      <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.18)"]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 0, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      
                      {/* Layer 3: Artwork - top-right, embedded feel */}
                      <View style={styles.cardBackgroundImages}>
                        <Image
                          source={require("../../../assets/history/dumbell.png")}
                          style={styles.backgroundDumbbell}
                          resizeMode="cover"
                        />
                        <LinearGradient
                          colors={["transparent", "rgba(74, 74, 74, 0.15)"]}
                          start={{ x: 0.6, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={StyleSheet.absoluteFill}
                          pointerEvents="none"
                        />
                      </View>
                      
                      {/* Layer 4: Top sheen highlight (premium coating effect) */}
                      <LinearGradient
                        colors={["rgba(255,255,255,0.10)", "transparent"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 0.4 }}
                        style={StyleSheet.absoluteFill}
                        pointerEvents="none"
                      />
                      
                      {/* Layer 5: Text content */}
                      <View style={styles.cardContent}>
                        <Text style={styles.newCardName} numberOfLines={2}>
                          {workout.name}
                        </Text>
                        <Text style={styles.newCardDate}>
                          {fmtDate(workout.performed_at)} • Lifting
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              }
              
              // Baseball card with Panera-style design
              if (modeKey === "baseball") {
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
                    style={styles.newCardContainer}
                  >
                    <View style={styles.baseballCard}>
                      {/* Layer 1: Base gradient background (darker top-left → deeper bottom-right) */}
                      <LinearGradient
                        colors={["#B91C1C", "#E63946"]} // Darker red → lighter but still vibrant red
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      
                      {/* Layer 2: Dark overlay at bottom for depth */}
                      <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.18)"]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 0, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      
                      {/* Layer 3: Artwork - top-right, embedded feel */}
                      <View style={styles.cardBackgroundImages}>
                        <Image
                          source={require("../../../assets/history/baseball-bat.png")}
                          style={styles.backgroundBaseballBat}
                          resizeMode="cover"
                        />
                        <Image
                          source={require("../../../assets/history/baseball.png")}
                          style={styles.backgroundBaseball}
                          resizeMode="cover"
                        />
                        <LinearGradient
                          colors={["transparent", "rgba(185, 28, 28, 0.15)"]}
                          start={{ x: 0.6, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={StyleSheet.absoluteFill}
                          pointerEvents="none"
                        />
                      </View>
                      
                      {/* Layer 4: Top sheen highlight (premium coating effect) */}
                      <LinearGradient
                        colors={["rgba(255,255,255,0.10)", "transparent"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 0.4 }}
                        style={StyleSheet.absoluteFill}
                        pointerEvents="none"
                      />
                      
                      {/* Layer 5: Text content */}
                      <View style={styles.cardContent}>
                        <Text style={styles.newCardName} numberOfLines={2}>
                          {workout.name}
                        </Text>
                        <Text style={styles.newCardDate}>
                          {fmtDate(workout.performed_at)} • Baseball
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              }
              
              // Soccer card with Panera-style design
              if (modeKey === "soccer") {
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
                    style={styles.newCardContainer}
                  >
                    <View style={styles.soccerCard}>
                      {/* Layer 1: Base gradient background (darker top-left → deeper bottom-right) */}
                      <LinearGradient
                        colors={["#1E3A8A", "#3B82F6"]} // Darker night sky blue → lighter night sky blue
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      
                      {/* Layer 2: Dark overlay at bottom for depth */}
                      <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.18)"]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 0, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      
                      {/* Layer 3: Artwork - top-right, embedded feel */}
                      <View style={styles.cardBackgroundImages}>
                        <Image
                          source={require("../../../assets/history/soccer-goal.png")}
                          style={styles.backgroundSoccerGoal}
                          resizeMode="cover"
                        />
                        <LinearGradient
                          colors={["transparent", "rgba(30, 58, 138, 0.15)"]}
                          start={{ x: 0.6, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={StyleSheet.absoluteFill}
                          pointerEvents="none"
                        />
                      </View>
                      
                      {/* Layer 4: Top sheen highlight (premium coating effect) */}
                      <LinearGradient
                        colors={["rgba(255,255,255,0.10)", "transparent"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 0.4 }}
                        style={StyleSheet.absoluteFill}
                        pointerEvents="none"
                      />
                      
                      {/* Layer 5: Text content */}
                      <View style={styles.cardContent}>
                        <Text style={styles.newCardName} numberOfLines={2}>
                          {workout.name}
                        </Text>
                        <Text style={styles.newCardDate}>
                          {fmtDate(workout.performed_at)} • Soccer
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              }
              
              // Old design for other modes (for now)
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
                      <View style={styles.sportPill}>{iconFor[modeKey]}</View>
                    </View>
                  </Card>
                </Pressable>
              );
            } else if (historyType === "practices") {
              const practice = item as HistoryPractice;
              const modeKey = getModeKey(practice.mode);
              
              // Use new card design for all sport modes
              if (modeKey === "basketball") {
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
                    style={styles.newCardContainer}
                  >
                    <View style={styles.basketballCard}>
                      {/* Layer 1: Base gradient background (darker top-left → deeper bottom-right) */}
                      <LinearGradient
                        colors={["#C84B25", "#FF6A2A"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      
                      {/* Layer 2: Dark overlay at bottom for depth */}
                      <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.18)"]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 0, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      
                      {/* Layer 3: Artwork - top-right, embedded feel */}
                      <View style={styles.cardBackgroundImages}>
                        <Image
                          source={require("../../../assets/history/basketball-hoop.png")}
                          style={styles.backgroundHoop}
                          resizeMode="cover"
                        />
                        <Image
                          source={require("../../../assets/history/basketball.png")}
                          style={styles.backgroundBall1}
                          resizeMode="cover"
                        />
                        {/* Right-side fade mask for artwork - lighter so images show through */}
                        <LinearGradient
                          colors={["transparent", "rgba(200, 75, 37, 0.15)"]}
                          start={{ x: 0.6, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={StyleSheet.absoluteFill}
                          pointerEvents="none"
                        />
                      </View>
                      
                      {/* Layer 4: Top sheen highlight (premium coating effect) */}
                      <LinearGradient
                        colors={["rgba(255,255,255,0.10)", "transparent"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 0.4 }}
                        style={StyleSheet.absoluteFill}
                        pointerEvents="none"
                      />
                      
                      {/* Layer 5: Text content */}
                      <View style={styles.cardContent}>
                        <Text style={styles.newCardName} numberOfLines={2}>
                          {practice.title || "Practice"}
                        </Text>
                        <Text style={styles.newCardDate}>
                          {fmtDate(practice.practiced_at)} • Basketball
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              }
              
              // Hockey card with Panera-style design
              if (modeKey === "hockey") {
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
                    style={styles.newCardContainer}
                  >
                    <View style={styles.hockeyCard}>
                      {/* Layer 1: Base gradient background (darker top-left → deeper bottom-right) */}
                      <LinearGradient
                        colors={["#66CCCC", "#99FFFF"]} // Darker cyan → lighter cyan
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      
                      {/* Layer 2: Dark overlay at bottom for depth */}
                      <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.18)"]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 0, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      
                      {/* Layer 3: Artwork - top-right, embedded feel */}
                      <View style={styles.cardBackgroundImages}>
                        <Image
                          source={require("../../../assets/history/hockey-net.png")}
                          style={styles.backgroundHockeyNet}
                          resizeMode="cover"
                        />
                        {/* Right-side fade mask for artwork */}
                        <LinearGradient
                          colors={["transparent", "rgba(102, 204, 204, 0.15)"]}
                          start={{ x: 0.6, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={StyleSheet.absoluteFill}
                          pointerEvents="none"
                        />
                      </View>
                      
                      {/* Layer 4: Top sheen highlight (premium coating effect) */}
                      <LinearGradient
                        colors={["rgba(255,255,255,0.10)", "transparent"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 0.4 }}
                        style={StyleSheet.absoluteFill}
                        pointerEvents="none"
                      />
                      
                      {/* Layer 5: Text content */}
                      <View style={styles.cardContent}>
                        <Text style={styles.newCardName} numberOfLines={2}>
                          {practice.title || "Practice"}
                        </Text>
                        <Text style={styles.newCardDate}>
                          {fmtDate(practice.practiced_at)} • Hockey
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              }
              
              // Football card with Panera-style design
              if (modeKey === "football") {
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
                    style={styles.newCardContainer}
                  >
                    <View style={styles.footballCard}>
                      {/* Layer 1: Base gradient background (darker top-left → deeper bottom-right) */}
                      <LinearGradient
                        colors={["#6B3410", "#A0522D"]} // Darker brown → lighter brown
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      
                      {/* Layer 2: Dark overlay at bottom for depth */}
                      <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.18)"]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 0, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      
                      {/* Layer 3: Artwork - top-right, embedded feel */}
                      <View style={styles.cardBackgroundImages}>
                        <Image
                          source={require("../../../assets/history/football-field.png")}
                          style={styles.backgroundFootballField}
                          resizeMode="cover"
                        />
                        <Image
                          source={require("../../../assets/history/football.png")}
                          style={styles.backgroundFootball}
                          resizeMode="cover"
                        />
                        <LinearGradient
                          colors={["transparent", "rgba(107, 52, 16, 0.15)"]}
                          start={{ x: 0.6, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={StyleSheet.absoluteFill}
                          pointerEvents="none"
                        />
                      </View>
                      
                      {/* Layer 4: Top sheen highlight (premium coating effect) */}
                      <LinearGradient
                        colors={["rgba(255,255,255,0.10)", "transparent"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 0.4 }}
                        style={StyleSheet.absoluteFill}
                        pointerEvents="none"
                      />
                      
                      {/* Layer 5: Text content */}
                      <View style={styles.cardContent}>
                        <Text style={styles.newCardName} numberOfLines={2}>
                          {practice.title || "Practice"}
                        </Text>
                        <Text style={styles.newCardDate}>
                          {fmtDate(practice.practiced_at)} • Football
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              }
              
              // Tennis card with Panera-style design
              if (modeKey === "tennis") {
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
                    style={styles.newCardContainer}
                  >
                    <View style={styles.tennisCard}>
                      {/* Layer 1: Base gradient background (darker top-left → deeper bottom-right) */}
                      <LinearGradient
                        colors={["#8FA020", "#C8D844"]} // Darker yellow-green → darker but still bright tennis ball yellow-green
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      
                      {/* Layer 2: Dark overlay at bottom for depth */}
                      <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.18)"]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 0, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      
                      {/* Layer 3: Artwork - top-right, embedded feel */}
                      <View style={styles.cardBackgroundImages}>
                        <Image
                          source={require("../../../assets/history/tennis-racket.png")}
                          style={styles.backgroundTennisRacket}
                          resizeMode="cover"
                        />
                        <Image
                          source={require("../../../assets/history/tennis-ball.png")}
                          style={styles.backgroundTennisBall}
                          resizeMode="cover"
                        />
                        <LinearGradient
                          colors={["transparent", "rgba(143, 160, 32, 0.15)"]}
                          start={{ x: 0.6, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={StyleSheet.absoluteFill}
                          pointerEvents="none"
                        />
                      </View>
                      
                      {/* Layer 4: Top sheen highlight (premium coating effect) */}
                      <LinearGradient
                        colors={["rgba(255,255,255,0.10)", "transparent"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 0.4 }}
                        style={StyleSheet.absoluteFill}
                        pointerEvents="none"
                      />
                      
                      {/* Layer 5: Text content */}
                      <View style={styles.cardContent}>
                        <Text style={styles.newCardName} numberOfLines={2}>
                          {practice.title || "Practice"}
                        </Text>
                        <Text style={styles.newCardDate}>
                          {fmtDate(practice.practiced_at)} • Tennis
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              }
              
              // Lifting card with Panera-style design
              if (modeKey === "lifting") {
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
                    style={styles.newCardContainer}
                  >
                    <View style={styles.liftingCard}>
                      {/* Layer 1: Base gradient background (darker top-left → deeper bottom-right) */}
                      <LinearGradient
                        colors={["#4A4A4A", "#6B6B6B"]} // Darker gray → lighter gray
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      
                      {/* Layer 2: Dark overlay at bottom for depth */}
                      <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.18)"]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 0, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      
                      {/* Layer 3: Artwork - top-right, embedded feel */}
                      <View style={styles.cardBackgroundImages}>
                        <Image
                          source={require("../../../assets/history/dumbell.png")}
                          style={styles.backgroundDumbbell}
                          resizeMode="cover"
                        />
                        <LinearGradient
                          colors={["transparent", "rgba(74, 74, 74, 0.15)"]}
                          start={{ x: 0.6, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={StyleSheet.absoluteFill}
                          pointerEvents="none"
                        />
                      </View>
                      
                      {/* Layer 4: Top sheen highlight (premium coating effect) */}
                      <LinearGradient
                        colors={["rgba(255,255,255,0.10)", "transparent"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 0.4 }}
                        style={StyleSheet.absoluteFill}
                        pointerEvents="none"
                      />
                      
                      {/* Layer 5: Text content */}
                      <View style={styles.cardContent}>
                        <Text style={styles.newCardName} numberOfLines={2}>
                          {practice.title || "Practice"}
                        </Text>
                        <Text style={styles.newCardDate}>
                          {fmtDate(practice.practiced_at)} • Lifting
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              }
              
              // Baseball card with Panera-style design
              if (modeKey === "baseball") {
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
                    style={styles.newCardContainer}
                  >
                    <View style={styles.baseballCard}>
                      {/* Layer 1: Base gradient background (darker top-left → deeper bottom-right) */}
                      <LinearGradient
                        colors={["#B91C1C", "#E63946"]} // Darker red → lighter but still vibrant red
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      
                      {/* Layer 2: Dark overlay at bottom for depth */}
                      <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.18)"]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 0, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      
                      {/* Layer 3: Artwork - top-right, embedded feel */}
                      <View style={styles.cardBackgroundImages}>
                        <Image
                          source={require("../../../assets/history/baseball-bat.png")}
                          style={styles.backgroundBaseballBat}
                          resizeMode="cover"
                        />
                        <Image
                          source={require("../../../assets/history/baseball.png")}
                          style={styles.backgroundBaseball}
                          resizeMode="cover"
                        />
                        <LinearGradient
                          colors={["transparent", "rgba(185, 28, 28, 0.15)"]}
                          start={{ x: 0.6, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={StyleSheet.absoluteFill}
                          pointerEvents="none"
                        />
                      </View>
                      
                      {/* Layer 4: Top sheen highlight (premium coating effect) */}
                      <LinearGradient
                        colors={["rgba(255,255,255,0.10)", "transparent"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 0.4 }}
                        style={StyleSheet.absoluteFill}
                        pointerEvents="none"
                      />
                      
                      {/* Layer 5: Text content */}
                      <View style={styles.cardContent}>
                        <Text style={styles.newCardName} numberOfLines={2}>
                          {practice.title || "Practice"}
                        </Text>
                        <Text style={styles.newCardDate}>
                          {fmtDate(practice.practiced_at)} • Baseball
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              }
              
              // Soccer card with Panera-style design
              if (modeKey === "soccer") {
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
                    style={styles.newCardContainer}
                  >
                    <View style={styles.soccerCard}>
                      {/* Layer 1: Base gradient background (darker top-left → deeper bottom-right) */}
                      <LinearGradient
                        colors={["#1E3A8A", "#3B82F6"]} // Darker night sky blue → lighter night sky blue
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      
                      {/* Layer 2: Dark overlay at bottom for depth */}
                      <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.18)"]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 0, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      
                      {/* Layer 3: Artwork - top-right, embedded feel */}
                      <View style={styles.cardBackgroundImages}>
                        <Image
                          source={require("../../../assets/history/soccer-goal.png")}
                          style={styles.backgroundSoccerGoal}
                          resizeMode="cover"
                        />
                        <LinearGradient
                          colors={["transparent", "rgba(30, 58, 138, 0.15)"]}
                          start={{ x: 0.6, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={StyleSheet.absoluteFill}
                          pointerEvents="none"
                        />
                      </View>
                      
                      {/* Layer 4: Top sheen highlight (premium coating effect) */}
                      <LinearGradient
                        colors={["rgba(255,255,255,0.10)", "transparent"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 0.4 }}
                        style={StyleSheet.absoluteFill}
                        pointerEvents="none"
                      />
                      
                      {/* Layer 5: Text content */}
                      <View style={styles.cardContent}>
                        <Text style={styles.newCardName} numberOfLines={2}>
                          {practice.title || "Practice"}
                        </Text>
                        <Text style={styles.newCardDate}>
                          {fmtDate(practice.practiced_at)} • Soccer
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              }
              
              // Old design for other modes (for now)
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
                      <View style={styles.sportPill}>{iconFor[modeKey]}</View>
                    </View>
                  </Card>
                </Pressable>
              );
            } else {
              const game = item as HistoryGame;
              const modeKey = getModeKey(game.mode);
              
              // Use new card design for all sport modes
              if (modeKey === "basketball") {
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
                    style={styles.newCardContainer}
                  >
                    <View style={styles.basketballCard}>
                      {/* Layer 1: Base gradient background (darker top-left → deeper bottom-right) */}
                      <LinearGradient
                        colors={["#C84B25", "#FF6A2A"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      
                      {/* Layer 2: Dark overlay at bottom for depth */}
                      <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.18)"]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 0, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      
                      {/* Layer 3: Artwork - top-right, embedded feel */}
                      <View style={styles.cardBackgroundImages}>
                        <Image
                          source={require("../../../assets/history/basketball-hoop.png")}
                          style={styles.backgroundHoop}
                          resizeMode="cover"
                        />
                        <Image
                          source={require("../../../assets/history/basketball.png")}
                          style={styles.backgroundBall1}
                          resizeMode="cover"
                        />
                        {/* Right-side fade mask for artwork - lighter so images show through */}
                        <LinearGradient
                          colors={["transparent", "rgba(200, 75, 37, 0.15)"]}
                          start={{ x: 0.6, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={StyleSheet.absoluteFill}
                          pointerEvents="none"
                        />
                      </View>
                      
                      {/* Layer 4: Top sheen highlight (premium coating effect) */}
                      <LinearGradient
                        colors={["rgba(255,255,255,0.10)", "transparent"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 0.4 }}
                        style={StyleSheet.absoluteFill}
                        pointerEvents="none"
                      />
                      
                      {/* Layer 5: Text content */}
                      <View style={styles.cardContent}>
                        <Text style={styles.newCardName} numberOfLines={2}>
                          {game.title || "Game"}
                        </Text>
                        <Text style={styles.newCardDate}>
                          {fmtDate(game.played_at)} • Basketball
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              }
              
              // Hockey card with Panera-style design
              if (modeKey === "hockey") {
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
                    style={styles.newCardContainer}
                  >
                    <View style={styles.hockeyCard}>
                      {/* Layer 1: Base gradient background (darker top-left → deeper bottom-right) */}
                      <LinearGradient
                        colors={["#66CCCC", "#99FFFF"]} // Darker cyan → lighter cyan
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      
                      {/* Layer 2: Dark overlay at bottom for depth */}
                      <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.18)"]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 0, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      
                      {/* Layer 3: Artwork - top-right, embedded feel */}
                      <View style={styles.cardBackgroundImages}>
                        <Image
                          source={require("../../../assets/history/hockey-net.png")}
                          style={styles.backgroundHockeyNet}
                          resizeMode="cover"
                        />
                        {/* Right-side fade mask for artwork */}
                        <LinearGradient
                          colors={["transparent", "rgba(102, 204, 204, 0.15)"]}
                          start={{ x: 0.6, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={StyleSheet.absoluteFill}
                          pointerEvents="none"
                        />
                      </View>
                      
                      {/* Layer 4: Top sheen highlight (premium coating effect) */}
                      <LinearGradient
                        colors={["rgba(255,255,255,0.10)", "transparent"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 0.4 }}
                        style={StyleSheet.absoluteFill}
                        pointerEvents="none"
                      />
                      
                      {/* Layer 5: Text content */}
                      <View style={styles.cardContent}>
                        <Text style={styles.newCardName} numberOfLines={2}>
                          {game.title || "Game"}
                        </Text>
                        <Text style={styles.newCardDate}>
                          {fmtDate(game.played_at)} • Hockey
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              }
              
              // Football card with Panera-style design
              if (modeKey === "football") {
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
                    style={styles.newCardContainer}
                  >
                    <View style={styles.footballCard}>
                      {/* Layer 1: Base gradient background (darker top-left → deeper bottom-right) */}
                      <LinearGradient
                        colors={["#6B3410", "#A0522D"]} // Darker brown → lighter brown
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      
                      {/* Layer 2: Dark overlay at bottom for depth */}
                      <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.18)"]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 0, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      
                      {/* Layer 3: Artwork - top-right, embedded feel */}
                      <View style={styles.cardBackgroundImages}>
                        <Image
                          source={require("../../../assets/history/football-field.png")}
                          style={styles.backgroundFootballField}
                          resizeMode="cover"
                        />
                        <Image
                          source={require("../../../assets/history/football.png")}
                          style={styles.backgroundFootball}
                          resizeMode="cover"
                        />
                        <LinearGradient
                          colors={["transparent", "rgba(107, 52, 16, 0.15)"]}
                          start={{ x: 0.6, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={StyleSheet.absoluteFill}
                          pointerEvents="none"
                        />
                      </View>
                      
                      {/* Layer 4: Top sheen highlight (premium coating effect) */}
                      <LinearGradient
                        colors={["rgba(255,255,255,0.10)", "transparent"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 0.4 }}
                        style={StyleSheet.absoluteFill}
                        pointerEvents="none"
                      />
                      
                      {/* Layer 5: Text content */}
                      <View style={styles.cardContent}>
                        <Text style={styles.newCardName} numberOfLines={2}>
                          {game.title || "Game"}
                        </Text>
                        <Text style={styles.newCardDate}>
                          {fmtDate(game.played_at)} • Football
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              }
              
              // Tennis card with Panera-style design
              if (modeKey === "tennis") {
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
                    style={styles.newCardContainer}
                  >
                    <View style={styles.tennisCard}>
                      {/* Layer 1: Base gradient background (darker top-left → deeper bottom-right) */}
                      <LinearGradient
                        colors={["#8FA020", "#C8D844"]} // Darker yellow-green → darker but still bright tennis ball yellow-green
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      
                      {/* Layer 2: Dark overlay at bottom for depth */}
                      <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.18)"]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 0, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      
                      {/* Layer 3: Artwork - top-right, embedded feel */}
                      <View style={styles.cardBackgroundImages}>
                        <Image
                          source={require("../../../assets/history/tennis-racket.png")}
                          style={styles.backgroundTennisRacket}
                          resizeMode="cover"
                        />
                        <Image
                          source={require("../../../assets/history/tennis-ball.png")}
                          style={styles.backgroundTennisBall}
                          resizeMode="cover"
                        />
                        <LinearGradient
                          colors={["transparent", "rgba(143, 160, 32, 0.15)"]}
                          start={{ x: 0.6, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={StyleSheet.absoluteFill}
                          pointerEvents="none"
                        />
                      </View>
                      
                      {/* Layer 4: Top sheen highlight (premium coating effect) */}
                      <LinearGradient
                        colors={["rgba(255,255,255,0.10)", "transparent"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 0.4 }}
                        style={StyleSheet.absoluteFill}
                        pointerEvents="none"
                      />
                      
                      {/* Layer 5: Text content */}
                      <View style={styles.cardContent}>
                        <Text style={styles.newCardName} numberOfLines={2}>
                          {game.title || "Game"}
                        </Text>
                        <Text style={styles.newCardDate}>
                          {fmtDate(game.played_at)} • Tennis
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              }
              
              // Lifting card with Panera-style design
              if (modeKey === "lifting") {
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
                    style={styles.newCardContainer}
                  >
                    <View style={styles.liftingCard}>
                      {/* Layer 1: Base gradient background (darker top-left → deeper bottom-right) */}
                      <LinearGradient
                        colors={["#4A4A4A", "#6B6B6B"]} // Darker gray → lighter gray
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      
                      {/* Layer 2: Dark overlay at bottom for depth */}
                      <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.18)"]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 0, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      
                      {/* Layer 3: Artwork - top-right, embedded feel */}
                      <View style={styles.cardBackgroundImages}>
                        <Image
                          source={require("../../../assets/history/dumbell.png")}
                          style={styles.backgroundDumbbell}
                          resizeMode="cover"
                        />
                        <LinearGradient
                          colors={["transparent", "rgba(74, 74, 74, 0.15)"]}
                          start={{ x: 0.6, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={StyleSheet.absoluteFill}
                          pointerEvents="none"
                        />
                      </View>
                      
                      {/* Layer 4: Top sheen highlight (premium coating effect) */}
                      <LinearGradient
                        colors={["rgba(255,255,255,0.10)", "transparent"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 0.4 }}
                        style={StyleSheet.absoluteFill}
                        pointerEvents="none"
                      />
                      
                      {/* Layer 5: Text content */}
                      <View style={styles.cardContent}>
                        <Text style={styles.newCardName} numberOfLines={2}>
                          {game.title || "Game"}
                        </Text>
                        <Text style={styles.newCardDate}>
                          {fmtDate(game.played_at)} • Lifting
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              }
              
              // Baseball card with Panera-style design
              if (modeKey === "baseball") {
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
                    style={styles.newCardContainer}
                  >
                    <View style={styles.baseballCard}>
                      {/* Layer 1: Base gradient background (darker top-left → deeper bottom-right) */}
                      <LinearGradient
                        colors={["#B91C1C", "#E63946"]} // Darker red → lighter but still vibrant red
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      
                      {/* Layer 2: Dark overlay at bottom for depth */}
                      <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.18)"]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 0, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      
                      {/* Layer 3: Artwork - top-right, embedded feel */}
                      <View style={styles.cardBackgroundImages}>
                        <Image
                          source={require("../../../assets/history/baseball-bat.png")}
                          style={styles.backgroundBaseballBat}
                          resizeMode="cover"
                        />
                        <Image
                          source={require("../../../assets/history/baseball.png")}
                          style={styles.backgroundBaseball}
                          resizeMode="cover"
                        />
                        <LinearGradient
                          colors={["transparent", "rgba(185, 28, 28, 0.15)"]}
                          start={{ x: 0.6, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={StyleSheet.absoluteFill}
                          pointerEvents="none"
                        />
                      </View>
                      
                      {/* Layer 4: Top sheen highlight (premium coating effect) */}
                      <LinearGradient
                        colors={["rgba(255,255,255,0.10)", "transparent"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 0.4 }}
                        style={StyleSheet.absoluteFill}
                        pointerEvents="none"
                      />
                      
                      {/* Layer 5: Text content */}
                      <View style={styles.cardContent}>
                        <Text style={styles.newCardName} numberOfLines={2}>
                          {game.title || "Game"}
                        </Text>
                        <Text style={styles.newCardDate}>
                          {fmtDate(game.played_at)} • Baseball
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              }
              
              // Soccer card with Panera-style design
              if (modeKey === "soccer") {
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
                    style={styles.newCardContainer}
                  >
                    <View style={styles.soccerCard}>
                      {/* Layer 1: Base gradient background (darker top-left → deeper bottom-right) */}
                      <LinearGradient
                        colors={["#1E3A8A", "#3B82F6"]} // Darker night sky blue → lighter night sky blue
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      
                      {/* Layer 2: Dark overlay at bottom for depth */}
                      <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.18)"]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 0, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      
                      {/* Layer 3: Artwork - top-right, embedded feel */}
                      <View style={styles.cardBackgroundImages}>
                        <Image
                          source={require("../../../assets/history/soccer-goal.png")}
                          style={styles.backgroundSoccerGoal}
                          resizeMode="cover"
                        />
                        <LinearGradient
                          colors={["transparent", "rgba(30, 58, 138, 0.15)"]}
                          start={{ x: 0.6, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={StyleSheet.absoluteFill}
                          pointerEvents="none"
                        />
                      </View>
                      
                      {/* Layer 4: Top sheen highlight (premium coating effect) */}
                      <LinearGradient
                        colors={["rgba(255,255,255,0.10)", "transparent"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 0.4 }}
                        style={StyleSheet.absoluteFill}
                        pointerEvents="none"
                      />
                      
                      {/* Layer 5: Text content */}
                      <View style={styles.cardContent}>
                        <Text style={styles.newCardName} numberOfLines={2}>
                          {game.title || "Game"}
                        </Text>
                        <Text style={styles.newCardDate}>
                          {fmtDate(game.played_at)} • Soccer
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              }
              
              // Old design for other modes (for now)
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
                        {game.title || "Game"}
                      </Text>
                      <View style={styles.sportPill}>{iconFor[modeKey]}</View>
                    </View>
                  </Card>
                </Pressable>
              );
            }
          })
        )}
      </ScrollView>
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
  /* Control Area - Segmented Control + Search */
  controlArea: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 16, // Increased from 12 to add 4px padding between underline and search bar
  },

  /* Segmented Control with Underlines */
  segmentWrapper: {
    position: "relative",
    width: "100%",
  },
  segmentContainer: {
    flexDirection: "row",
    width: "100%",
  },
  segmentTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    position: "relative",
  },
  segmentTabDisabled: {
    opacity: 0.4,
  },
  segmentText: {
    color: theme.color.dim,
    fontSize: 17,
    fontWeight: "700",
    fontFamily: FONT.uiMedium,
    letterSpacing: 0.2,
  },
  segmentTextActive: {
    color: theme.color.text,
    fontWeight: "800",
    fontSize: 18,
  },
  segmentTextDisabled: {
    color: theme.color.dim,
  },
  segmentUnderline: {
    position: "absolute",
    bottom: 0,
    left: 0,
    height: 3, // Thicker underline
    backgroundColor: theme.color.brand,
    borderRadius: 1.5,
  },

  /* Search bar - surfaced tool */
  searchContainer: {
    // Container for spacing
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    // Subtle shadow for depth
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  searchWrapFocused: {
    backgroundColor: "rgba(255, 255, 255, 0.09)",
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  searchIcon: {
    marginRight: 10,
    opacity: 0.7,
  },
  searchInput: {
    color: theme.color.text,
    flex: 1,
    fontFamily: FONT.uiMedium,
    fontSize: 15,
    padding: 0, // Remove default padding
  },
  scrollView: {
    flex: 1,
  },
  scrollViewDimmed: {
    opacity: 0.6,
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

  /* New card design - Panera-style */
  newCardContainer: {
    marginBottom: 20, // More spacing between cards
  },
  basketballCard: {
    height: 120, // Reduced height to match list rhythm
    borderRadius: 24, // 22-28 range, using 24
    overflow: "hidden",
    position: "relative",
    // Border
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    // Shadow (iOS)
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    // Elevation (Android)
    elevation: 12,
  },
  cardBackgroundImages: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // No container opacity - let individual images control their own
  },
  backgroundHoop: {
    position: "absolute",
    right: -30, // Push to top-right, crop off edge
    top: -20,
    width: 240, // Scale up to crop edges
    height: 240,
    opacity: 0.35, // Increased visibility
  },
  backgroundBall1: {
    position: "absolute",
    right: 128, // Moved 10px more to the left (from 118)
    bottom: 39,
    width: 86, // Increased by 4px (from 82)
    height: 86, // Increased by 4px (from 82)
    opacity: 0.30, // Increased visibility
  },
  cardContent: {
    position: "absolute",
    left: 18, // Padding 16-18px
    top: 18,
    bottom: 18,
    right: 18,
    justifyContent: "center", // Vertically centered
    zIndex: 10,
  },
  newCardName: {
    fontSize: 22, // Slightly reduced from 24
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 6,
    fontFamily: FONT.displayBold,
    lineHeight: 26,
  },
  newCardDate: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.75)", // Slightly brighter for readability
    fontFamily: FONT.uiMedium,
  },
  
  /* Hockey card - same structure as basketball */
  hockeyCard: {
    height: 120, // Reduced height to match list rhythm
    borderRadius: 24, // 22-28 range, using 24
    overflow: "hidden",
    position: "relative",
    // Border
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    // Shadow (iOS)
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    // Elevation (Android)
    elevation: 12,
  },
  backgroundHockeyNet: {
    position: "absolute",
    right: -30, // Push to top-right, crop off edge
    top: -30, // Moved down 2px (from -32)
    width: 240, // Scale up to crop edges
    height: 240,
    opacity: 0.35, // Increased visibility
  },
  backgroundHockeyPuck: {
    position: "absolute",
    right: 130, // Moved to the right by 4px (from 134)
    bottom: 27, // Moved down by 4px (from 31)
    width: 44, // Shrunk by 4px (from 48)
    height: 44, // Shrunk by 4px (from 48)
    opacity: 0.65, // Less transparent (increased from 0.55)
  },
  
  /* Football card - same structure as basketball and hockey */
  footballCard: {
    height: 120, // Reduced height to match list rhythm
    borderRadius: 24, // 22-28 range, using 24
    overflow: "hidden",
    position: "relative",
    // Border
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    // Shadow (iOS)
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    // Elevation (Android)
    elevation: 12,
  },
  backgroundFootballField: {
    position: "absolute",
    right: 76, // Moved 52px to the left (from 24)
    top: 13, // Moved down 4px more (from 9)
    width: 152, // Increased by 8px (from 144)
    height: 152, // Increased by 8px (from 144)
    opacity: 0.45, // Increased visibility (from 0.35)
    transform: [{ scaleX: -1 }, { translateX: -76 }], // Flip horizontally and shift left by half width (76 = 152/2) to account for flip
  },
  backgroundFootball: {
    position: "absolute",
    right: 134, // Moved 8px to the right (from 142)
    bottom: 33, // Moved down 10px more (from 43)
    width: 62, // Increased by 8px (from 54)
    height: 62, // Increased by 8px (from 54)
    opacity: 0.30, // Slightly more subtle than primary
    transform: [{ scaleX: -1 }], // Flip horizontally to match the field
  },
  
  /* Tennis card - same structure as other sport cards */
  tennisCard: {
    height: 120, // Reduced height to match list rhythm
    borderRadius: 24, // 22-28 range, using 24
    overflow: "hidden",
    position: "relative",
    // Border
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    // Shadow (iOS)
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    // Elevation (Android)
    elevation: 12,
  },
  backgroundTennisRacket: {
    position: "absolute",
    right: -30, // Push to top-right, crop off edge
    top: -20,
    width: 240, // Scale up to crop edges
    height: 240,
    opacity: 0.35, // Increased visibility
  },
  backgroundTennisBall: {
    position: "absolute",
    right: 4, // Moved right by 12px more (from 16)
    bottom: 39,
    width: 86, // Sized appropriately (same as basketball)
    height: 86,
    opacity: 0.30, // Slightly more subtle than primary
  },
  
  /* Lifting card - same structure as other sport cards */
  liftingCard: {
    height: 120, // Reduced height to match list rhythm
    borderRadius: 24, // 22-28 range, using 24
    overflow: "hidden",
    position: "relative",
    // Border
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    // Shadow (iOS)
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    // Elevation (Android)
    elevation: 12,
  },
  backgroundSmithMachine: {
    position: "absolute",
    right: -30, // Push to top-right, crop off edge
    top: -20,
    width: 240, // Scale up to crop edges
    height: 240,
    opacity: 0.35, // Increased visibility
  },
  backgroundDumbbell: {
    position: "absolute",
    left: "50%", // Center horizontally
    top: "50%", // Center vertically
    width: 208, // Increased by 8px (from 200)
    height: 208, // Increased by 8px (from 200)
    opacity: 0.30, // Slightly more subtle than primary
    transform: [{ translateX: -25 }, { translateY: -83 }], // Moved up 4px more (from -79) and left 12px more (from -13)
  },
  
  /* Baseball card - same structure as other sport cards */
  baseballCard: {
    height: 120, // Reduced height to match list rhythm
    borderRadius: 24, // 22-28 range, using 24
    overflow: "hidden",
    position: "relative",
    // Border
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    // Shadow (iOS)
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    // Elevation (Android)
    elevation: 12,
  },
  backgroundBaseballBat: {
    position: "absolute",
    right: -14, // Moved right by 10px more (from -24)
    top: 2, // Moved down by 8px (from -6)
    width: 192, // Shrunk by 6px (from 198)
    height: 192, // Shrunk by 6px (from 198)
    opacity: 0.35, // Increased visibility
  },
  backgroundBaseball: {
    position: "absolute",
    right: 72, // Moved right by 18px (from 90)
    bottom: 39, // Moved up by 8px (from 31)
    width: 60, // Shrunk by 14px (from 74)
    height: 60, // Shrunk by 14px (from 74)
    opacity: 0.30, // Slightly more subtle than primary
  },
  
  /* Soccer card - same structure as other sport cards */
  soccerCard: {
    height: 120, // Reduced height to match list rhythm
    borderRadius: 24, // 22-28 range, using 24
    overflow: "hidden",
    position: "relative",
    // Border
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    // Shadow (iOS)
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    // Elevation (Android)
    elevation: 12,
  },
  backgroundSoccerGoal: {
    position: "absolute",
    right: -30, // Push to top-right, crop off edge
    top: -20,
    width: 240, // Scale up to crop edges
    height: 240,
    opacity: 0.35, // Increased visibility
  },
  backgroundSoccerBall: {
    position: "absolute",
    right: 128, // Positioned to complement primary artwork (same as basketball)
    bottom: 39,
    width: 86, // Sized appropriately (same as basketball)
    height: 86,
    opacity: 0.30, // Slightly more subtle than primary
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 400,
  },
  loadingStar: {
    width: 82,
    height: 82,
  },
  skeletonContainer: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 400,
    paddingVertical: 60,
  },
  emptyStar: {
    width: 182,
    height: 182,
    marginBottom: -30,
  },
  emptyText: {
    fontSize: 26,
    color: theme.color.dim,
    fontFamily: FONT.uiMedium,
  },
});
