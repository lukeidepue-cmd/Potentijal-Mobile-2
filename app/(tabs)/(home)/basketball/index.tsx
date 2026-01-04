// app/(tabs)/(home)/basketball/index.tsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  StatusBar,
  Platform,
  Modal,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, router } from "expo-router";
import Svg, { G, Line as SvgLine, Path, Circle, Text as SvgText } from "react-native-svg";
import { getScheduleWithStatus, getCurrentWeekStart } from "../../../../lib/api/schedule";
import { useAuth } from "../../../../providers/AuthProvider";
import { getHistoryStats } from "../../../../lib/api/history";
import { useExerciseProgressGraphDirect } from "../../../../hooks/useExerciseProgressGraphDirect";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMode } from "../../../../providers/ModeContext";
import { getPrimaryExerciseTypeDirect } from "../../../../lib/api/exercise-types-direct";
import { getMetricOptionsForExerciseType } from "../../../../lib/api/exercise-types";
import type { ProgressMetric } from "../../../../hooks/useExerciseProgressGraph";
import { Confetti } from "../../../../components/Confetti";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence } from "react-native-reanimated";
import {
  useFonts as useSpaceGrotesk,
  SpaceGrotesk_700Bold,
  SpaceGrotesk_800ExtraBold,
} from "@expo-google-fonts/space-grotesk";
import * as Haptics from "expo-haptics";

const AnimatedText = Animated.createAnimatedComponent(Text);

// Animated Hero Headline Component
function AnimatedHeroHeadline({ 
  message, 
  textScale, 
  textOpacity 
}: { 
  message: string; 
  textScale: Animated.SharedValue<number>; 
  textOpacity: Animated.SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: textScale.value }],
    opacity: textOpacity.value,
  }));

  return (
    <AnimatedText style={[styles.heroHeadline, animatedStyle]}>
      {message}
    </AnimatedText>
  );
}

/* ---------------- Types ---------------- */
type RangeKey = "7d" | "30d" | "90d" | "180d";

/* ---------------- Helpers ---------------- */
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

const getDayName = (d: Date) => {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  return days[d.getDay()];
};

const md = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;

// Format date as YYYY-MM-DD in local timezone (not UTC)
function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Format date as YYYY-MM-DD in UTC (to match backend format)
function formatDateUTC(date: Date): string {
  const utcYear = date.getUTCFullYear();
  const utcMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
  const utcDay = String(date.getUTCDate()).padStart(2, '0');
  return `${utcYear}-${utcMonth}-${utcDay}`;
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
export default function BasketballHome() {
  const [sgLoaded] = useSpaceGrotesk({ SpaceGrotesk_700Bold, SpaceGrotesk_800ExtraBold });
  const insets = useSafeAreaInsets();
  
  // Press state for log cards - using animated values for smooth transitions
  const gameScale = useSharedValue(1);
  const gameScrimOpacity = useSharedValue(1);
  const practiceScale = useSharedValue(1);
  const practiceScrimOpacity = useSharedValue(1);
  
  // Refs for measuring card positions for shared element transitions
  const gameCardRef = useRef<View>(null);
  const practiceCardRef = useRef<View>(null);
  
  const gameAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: gameScale.value }],
  }));
  
  const gameScrimAnimatedStyle = useAnimatedStyle(() => ({
    opacity: gameScrimOpacity.value,
  }));
  
  const practiceAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: practiceScale.value }],
  }));
  
  const practiceScrimAnimatedStyle = useAnimatedStyle(() => ({
    opacity: practiceScrimOpacity.value,
  }));
  const days = getCurrentWeekStartingSunday();
  const { user } = useAuth();
  const weekStart = getCurrentWeekStart();
  const today = startOfDay(new Date());

  // Schedule state
  const [scheduleData, setScheduleData] = useState<Array<{
    dayIndex: number;
    label: string | null;
    status: 'completed' | 'missed' | 'rest' | 'empty';
    date: string;
  }> | null>(null);
  
  // Confetti and animation state
  const [showConfetti, setShowConfetti] = useState(false);
  const previousStatusRef = useRef<'completed' | 'missed' | 'rest' | 'empty' | null>(null);
  const textScale = useSharedValue(1);
  const textOpacity = useSharedValue(1);
  
  // Stats state
  const [workoutStats, setWorkoutStats] = useState({ total: 0, streak: 0 });

  // Load schedule
  useEffect(() => {
    if (user) {
      loadSchedule();
    }
  }, [user, weekStart]);

  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        loadSchedule();
        loadWorkoutStats();
      }
    }, [user, weekStart])
  );
  
  const loadWorkoutStats = async () => {
    if (!user) return;
    const statsResult = await getHistoryStats({ kind: "workouts" });
    if (!statsResult.error) {
      setWorkoutStats(statsResult.data || { total: 0, streak: 0 });
    }
  };

  const loadSchedule = async () => {
    const { data } = await getScheduleWithStatus({
      mode: 'basketball',
      weekStartDate: weekStart,
    });
    if (data) {
      // Check if status changed to completed (trigger confetti)
      const todayDayIndex = today.getDay();
      const currentItem = data.find(item => item.dayIndex === todayDayIndex);
      const currentStatus = currentItem?.status || 'empty';
      
      // Check if status changed to completed (trigger confetti)
      const prevStatus = previousStatusRef.current;
      
      // Debug logging
      console.log('Basketball Schedule Load:', {
        previousStatus: prevStatus,
        currentStatus,
        hasLabel: !!currentItem?.label,
        shouldTrigger: prevStatus !== null && prevStatus !== 'completed' && currentStatus === 'completed' && currentItem?.label
      });
      
      // If we had a previous status and it wasn't completed, but now it is, trigger confetti
      if (prevStatus !== null && prevStatus !== 'completed' && currentStatus === 'completed' && currentItem?.label) {
        console.log('🎉 Triggering confetti animation!');
        setShowConfetti(true);
        // Animate text change with more visible animation
        textScale.value = withSequence(
          withSpring(1.3, { damping: 6, stiffness: 100 }),
          withSpring(1, { damping: 10, stiffness: 100 })
        );
        textOpacity.value = withSequence(
          withTiming(0, { duration: 150 }),
          withTiming(1, { duration: 400 })
        );
      }
      
      // Update ref for next comparison
      previousStatusRef.current = currentStatus;
      setScheduleData(data);
    }
  };

  // Get today's message - use same dayIndex logic as calendar
  const todayScheduleItem = useMemo(() => {
    if (!scheduleData) return null;
    const todayDayIndex = today.getDay(); // 0 = Sunday, 6 = Saturday
    return scheduleData.find(item => item.dayIndex === todayDayIndex) || null;
  }, [scheduleData, today]);

  const todayMessage = useMemo(() => {
    if (!todayScheduleItem) {
      return "Recovery matters too";
    }
    
    const status = todayScheduleItem.status;
    const label = todayScheduleItem.label?.trim() || '';
    
    // Check status first - if completed, show completion message
    if (status === 'completed') {
      return "Workout Completed!";
    }
    
    // If missed, show waiting message
    if (status === 'missed') {
      return "Today's workout is still waiting";
    }
    
    // Check if it's explicitly a rest day (status === 'rest' or label indicates rest)
    const normalizedLabel = label.toLowerCase().replace(/[^a-z0-9 ]/g, '');
    const isRest = status === 'rest' || 
      normalizedLabel.startsWith('rest') ||
      normalizedLabel.endsWith('rest') ||
      normalizedLabel.includes(' rest ') ||
      normalizedLabel === 'rest day' ||
      normalizedLabel === 'restday' ||
      normalizedLabel.startsWith('day off') ||
      normalizedLabel.endsWith('off day');
    
    if (isRest) {
      return "Recovery matters too";
    }
    
    // If there's a label (workout scheduled) but status is 'empty', it's a scheduled workout
    if (label && status === 'empty') {
      return "Today's workout is still waiting";
    }
    
    // Default: no schedule or empty label
    return "Recovery matters too";
  }, [todayScheduleItem]);

  // Progress state
  const [metric, setMetric] = useState<string>("reps");
  const [range, setRange] = useState<RangeKey>("90d");
  const [exercise, setExercise] = useState("");
  const [availableMetrics, setAvailableMetrics] = useState<string[]>(["reps", "attempted", "made", "percentage"]);
  const [openMetric, setOpenMetric] = useState(false);
  const [openRange, setOpenRange] = useState(false);

  // Detect exercise type when query changes
  useEffect(() => {
    if (exercise.trim() && user) {
      getPrimaryExerciseTypeDirect({ mode: 'basketball', query: exercise.trim() }).then(({ data: exerciseType, error }) => {
        if (error) {
          console.error('Error getting exercise type:', error);
          setAvailableMetrics(["reps", "weight", "reps_x_weight"]);
          setMetric("reps");
          return;
        }
        if (exerciseType) {
          const metrics = getMetricOptionsForExerciseType(exerciseType, 'basketball');
          setAvailableMetrics(metrics);
          if (!metrics.includes(metric)) {
            setMetric(metrics[0] || "reps");
          }
        } else {
          setAvailableMetrics(["reps", "weight", "reps_x_weight"]);
          setMetric("reps");
        }
      });
    } else {
      setAvailableMetrics(["reps", "attempted", "made", "percentage"]);
      setMetric("reps");
    }
  }, [exercise, user]);

  // Map to backend
  const backendMetric: ProgressMetric = metric as ProgressMetric;
  
  const backendDays = 
    range === "7d" ? 7 :
    range === "30d" ? 30 :
    range === "90d" ? 90 :
    range === "180d" ? 180 :
    360;

  // Fetch progress data
  const { data: progressData } = useExerciseProgressGraphDirect({
    mode: 'basketball',
    query: exercise,
    metric: backendMetric,
    days: backendDays as 7 | 30 | 90 | 180 | 360,
  });

  // Convert to graph series
  const { data: series, avg } = useMemo(() => {
    if (!progressData || progressData.length === 0 || !exercise.trim()) {
      return { data: [], avg: 0 };
    }

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

  const { mode, setMode } = useMode();
  const [showModeChooser, setShowModeChooser] = useState(false);
  const [showAssistantCard, setShowAssistantCard] = useState(false);

  // Calculate header height
  const headerTopHeight = 56; // Height for top actions row
  const calendarContentHeight = 60;
  const calendarPadding = 20; // Extra padding (4 top + 16 bottom) to prevent cut-off
  const headerTotalHeight = headerTopHeight + calendarContentHeight + calendarPadding + insets.top;

  // Get supporting message text
  const supportingMessage = useMemo(() => {
    if (!todayScheduleItem) {
      return "Taking time to rest is key for your athletic goals. Keep up the good work!";
    }
    
    const status = todayScheduleItem.status;
    const label = todayScheduleItem.label?.trim() || '';
    
    // Check status first - if completed, show completion message
    if (status === 'completed') {
      return "Soak in that sense of accomplishment";
    }
    
    // If missed, show waiting message
    if (status === 'missed') {
      return "Every workout contributes to your progress!";
    }
    
    // Check if it's explicitly a rest day (status === 'rest' or label indicates rest)
    const normalizedLabel = label.toLowerCase().replace(/[^a-z0-9 ]/g, '');
    const isRest = status === 'rest' || 
      normalizedLabel.startsWith('rest') ||
      normalizedLabel.endsWith('rest') ||
      normalizedLabel.includes(' rest ') ||
      normalizedLabel === 'rest day' ||
      normalizedLabel === 'restday' ||
      normalizedLabel.startsWith('day off') ||
      normalizedLabel.endsWith('off day');
    
    if (isRest) {
      return "Taking time to rest is key for your athletic goals. Keep up the good work!";
    }
    
    // If there's a label (workout scheduled) but status is 'empty', it's a scheduled workout
    if (label && status === 'empty') {
      return "Every workout contributes to your progress!";
    }
    
    // Default: no schedule or empty label
    return "Taking time to rest is key for your athletic goals. Keep up the good work!";
  }, [todayScheduleItem]);

  return (
    <View style={styles.container}>
      {/* FIX #1: HeaderShell with left actions, center brand, right actions, calendar inside */}
      <View 
        style={[
          styles.headerShell, 
          { 
            height: headerTotalHeight,
            paddingTop: insets.top,
            top: 0,
          }
        ]}
      >
        {/* Top actions row */}
        <View style={styles.headerTopRow}>
          {/* Left: Notifications only (profile removed) */}
          <View style={styles.headerLeft}>
            <Pressable 
              style={styles.headerIconButton}
              onPress={() => {}}
            >
              <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Center: Brand/Sport Mode Label */}
          <Text style={styles.headerBrand}>Basketball</Text>

          {/* Right: Settings + Mode Switch */}
          <View style={styles.headerRight}>
            <Pressable 
              style={styles.headerIconButton}
              onPress={() => router.push("/(tabs)/settings")}
            >
              <Ionicons name="settings-outline" size={22} color="#FFFFFF" />
            </Pressable>
            <Pressable 
              style={styles.headerIconButton}
              onPress={() => setShowModeChooser(true)}
            >
              <Ionicons name="basketball-outline" size={22} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {/* Calendar strip inside header */}
        <View style={styles.calendarContainer}>
          <View style={styles.calendarContent}>
            {days.map((day, index) => {
              const isToday = day.getTime() === today.getTime();
              // Find schedule status for this day - match by dayIndex (0=Sunday, 6=Saturday)
              // This avoids timezone issues with date string comparison
              const dayIndex = day.getDay(); // 0 = Sunday, 6 = Saturday
              const scheduleItem = scheduleData?.find(item => item.dayIndex === dayIndex);
              const status = scheduleItem?.status || 'empty';
              
              // Green if completed or rest, red if missed
              const dayNameColor = status === 'completed' || status === 'rest' 
                ? '#3eb489' // Green
                : status === 'missed' 
                ? '#FF4444' // Red
                : '#9E9E9E'; // Default gray
              
              return (
                <View key={index} style={styles.calendarDay}>
                  <Text style={[styles.calendarDayName, { color: dayNameColor }]}>{getDayName(day)}</Text>
                  <View style={[styles.calendarDateCircle, isToday && styles.calendarDateCircleActive]}>
                    <Text style={[styles.calendarDate, isToday && styles.calendarDateActive]}>
                      {day.getDate()}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingTop: headerTotalHeight, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Extended gradient wrapper - extends upward behind calendar */}
        <View style={styles.gradientWrapper}>
          {/* Extended gradient for pull-down - extends behind calendar - EXACT same color as top of hero gradient */}
          <LinearGradient
            colors={["#2D6A4F", "#2D6A4F"]}
            locations={[0, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.pullDownGradient}
          />
          
          {/* Hero gradient background layer - OLD GRADIENT STRUCTURE with NEW GREEN SHADES: Replaced #2D5A4A with #2D6A4F, maintaining same structure */}
          <LinearGradient
            colors={["#2D6A4F", "#2C684E", "#2B664D", "#2A644C", "#29624B", "#28604A", "#275E49", "#265C48", "#255A47", "#245846", "#235645", "#225444", "#215243", "#205042", "#1F4E41", "#1E4C40", "#1D4A3F", "#1C483E", "#1B463D", "#1A443C", "#19423B", "#18403A", "#173E39", "#163C38", "#153A37", "#143836", "#133635", "#123434", "#0F1A1C", "#0B0E10", "#0B0E10"]}
            locations={[0, 0.03, 0.06, 0.09, 0.12, 0.15, 0.18, 0.21, 0.24, 0.27, 0.30, 0.33, 0.36, 0.39, 0.42, 0.45, 0.48, 0.51, 0.54, 0.57, 0.60, 0.63, 0.66, 0.69, 0.72, 0.75, 0.78, 0.81, 0.87, 0.93, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.heroGradient}
          >
          {/* FIX #3: Hero Module with icon, headline, supporting text */}
          <View style={styles.heroModule}>
            {/* Small hero icon/illustration */}
            <View style={styles.heroIconContainer}>
              <View style={styles.mascotCircles}>
                <View style={styles.mascotCircle1} />
                <View style={styles.mascotCircle2} />
                <View style={styles.mascotCircle3} />
              </View>
            </View>
            
            {/* FIX #4: Typography hierarchy - headline 32-36px semibold */}
            <AnimatedHeroHeadline 
              message={todayMessage}
              textScale={textScale}
              textOpacity={textOpacity}
            />
            
            {/* FIX #4: Supporting text 15-16px ~70% opacity */}
            <Text style={styles.heroSupporting}>{supportingMessage}</Text>
          </View>
        </LinearGradient>
        </View>

        {/* FIX #6: Divider line between hero and content */}
        <View style={styles.sectionDivider} />

        {/* Log Game Section */}
        <View
          ref={gameCardRef}
          collapsable={false}
        >
          <Pressable 
            style={[styles.logSection, { marginTop: 0 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              // Measure image position before navigation
              if (gameCardRef.current) {
                gameCardRef.current.measure((x, y, width, height, pageX, pageY) => {
                  router.push({
                    pathname: "/(tabs)/(home)/basketball/add-game",
                    params: {
                      imageSource: "kyrie",
                      initialX: String(pageX),
                      initialY: String(pageY),
                      initialWidth: String(width),
                      initialHeight: String(height),
                    },
                  });
                });
              } else {
                router.push("/(tabs)/(home)/basketball/add-game");
              }
            }}
          onPressIn={() => {
            gameScale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
            gameScrimOpacity.value = withTiming(1.1, { duration: 100 });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          onPressOut={() => {
            gameScale.value = withSpring(1, { damping: 15, stiffness: 300 });
            gameScrimOpacity.value = withTiming(1, { duration: 100 });
          }}
        >
          <Animated.View style={[styles.logSectionInner, gameAnimatedStyle]}>
            <Image 
              source={require("../../../../assets/players/kyrie.png")} 
              style={styles.logImage}
              resizeMode="cover"
            />
            {/* Gradient Scrim Overlay */}
            <Animated.View style={[StyleSheet.absoluteFill, gameScrimAnimatedStyle]}>
              <LinearGradient
                colors={["rgba(0,0,0,0.05)", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.85)"]}
                locations={[0, 0.65, 1]}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
            {/* Text Overlay - Bottom Left */}
            <View style={styles.logTextOverlay}>
              <View style={styles.logTextContainer}>
                <Text style={[styles.logTitle, !sgLoaded && { fontFamily: undefined }]}>Log Game</Text>
                <Text style={styles.logSubtitle}>Stats • Outcome • Notes</Text>
              </View>
            </View>
          </Animated.View>
          </Pressable>
        </View>

        {/* Log Practice Section */}
        <View
          ref={practiceCardRef}
          collapsable={false}
        >
          <Pressable 
            style={styles.logSection}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              // Measure image position before navigation
              if (practiceCardRef.current) {
                practiceCardRef.current.measure((x, y, width, height, pageX, pageY) => {
                  router.push({
                    pathname: "/(tabs)/(home)/basketball/add-practice",
                    params: {
                      imageSource: "shai",
                      initialX: String(pageX),
                      initialY: String(pageY),
                      initialWidth: String(width),
                      initialHeight: String(height),
                    },
                  });
                });
              } else {
                router.push("/(tabs)/(home)/basketball/add-practice");
              }
            }}
          onPressIn={() => {
            practiceScale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
            practiceScrimOpacity.value = withTiming(1.1, { duration: 100 });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          onPressOut={() => {
            practiceScale.value = withSpring(1, { damping: 15, stiffness: 300 });
            practiceScrimOpacity.value = withTiming(1, { duration: 100 });
          }}
        >
          <Animated.View style={[styles.logSectionInner, practiceAnimatedStyle]}>
            <Image 
              source={require("../../../../assets/players/shai.webp")} 
              style={styles.logImage}
              resizeMode="cover"
            />
            {/* Gradient Scrim Overlay */}
            <Animated.View style={[StyleSheet.absoluteFill, practiceScrimAnimatedStyle]}>
              <LinearGradient
                colors={["rgba(0,0,0,0.05)", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.85)"]}
                locations={[0, 0.65, 1]}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
            {/* Text Overlay - Bottom Left */}
            <View style={styles.logTextOverlay}>
              <View style={styles.logTextContainer}>
                <Text style={[styles.logTitle, !sgLoaded && { fontFamily: undefined }]}>Log Practice</Text>
                <Text style={styles.logSubtitle}>Drills • Notes • Minutes</Text>
              </View>
            </View>
          </Animated.View>
        </Pressable>
        </View>

        {/* FIX #2: Content card with different surface */}
        <View style={styles.progressCard}>
          {/* FIX #4: Section heading with action on right */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <View style={styles.progressTick} />
              <Text style={styles.sectionTitle}>Progress</Text>
            </View>
            <Pressable onPress={() => {}}>
              <Text style={styles.sectionAction}>See all →</Text>
            </Pressable>
          </View>

          <TextInput
            placeholder="Search an Exercise (e.g. bench press)…"
            placeholderTextColor="#6B7280"
            value={exercise}
            onChangeText={setExercise}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
          />

          <View style={styles.dropdownRow}>
            <View style={styles.dropdownWrapper}>
              <Pressable
                onPress={() => {
                  setOpenMetric(!openMetric);
                  setOpenRange(false);
                }}
                style={[styles.dropdown, openMetric && styles.dropdownActive]}
              >
                <Text style={styles.dropdownText}>
                  {metric === "reps" ? "Reps" : 
                   metric === "attempted" ? "Attempted" :
                   metric === "made" ? "Made" :
                   metric === "percentage" ? "Percentage" :
                   metric === "weight" ? "Weight" :
                   metric === "reps_x_weight" ? "Reps × Weight" :
                   metric === "distance" ? "Distance" :
                   metric === "time_min" ? "Time (min)" :
                   metric}
                </Text>
                <Ionicons name="chevron-down" size={12} color={openMetric ? "#4A9EFF" : "#9E9E9E"} />
              </Pressable>
              {openMetric && (
                <View style={styles.dropdownMenu}>
                  {availableMetrics.map((k) => (
                    <Pressable
                      key={k}
                      onPress={() => {
                        setMetric(k);
                        setOpenMetric(false);
                      }}
                      style={styles.dropdownMenuItem}
                    >
                      <Text style={styles.dropdownMenuText}>
                        {k === "reps" ? "Reps" : 
                         k === "attempted" ? "Attempted" :
                         k === "made" ? "Made" :
                         k === "percentage" ? "Percentage" :
                         k === "weight" ? "Weight" :
                         k === "reps_x_weight" ? "Reps × Weight" :
                         k === "distance" ? "Distance" :
                         k === "time_min" ? "Time (min)" :
                         k}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.dropdownWrapper}>
              <Pressable
                onPress={() => {
                  setOpenRange(!openRange);
                  setOpenMetric(false);
                }}
                style={[styles.dropdown, openRange && styles.dropdownActive]}
              >
                <Text style={styles.dropdownText}>
                  {range === "7d" ? "7 Days" : range === "30d" ? "30 Days" : range === "90d" ? "90 Days" : "180 Days"}
                </Text>
                <Ionicons name="chevron-down" size={12} color={openRange ? "#4A9EFF" : "#9E9E9E"} />
              </Pressable>
              {openRange && (
                <View style={styles.dropdownMenu}>
                  {(["7d", "30d", "90d", "180d"] as RangeKey[]).map((k) => (
                    <Pressable
                      key={k}
                      onPress={() => {
                        setRange(k);
                        setOpenRange(false);
                      }}
                      style={styles.dropdownMenuItem}
                    >
                      <Text style={styles.dropdownMenuText}>
                        {k === "7d" ? "7 Days" : k === "30d" ? "30 Days" : k === "90d" ? "90 Days" : "180 Days"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Chart */}
          <View style={styles.chartContainer} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
            <Svg width="100%" height="100%">
              <G>
                {yTicks.map((t, i) => {
                  const y = yFor(t);
                  return (
                    <React.Fragment key={`y-${i}`}>
                      <SvgLine x1={M.left} x2={w - M.right} y1={y} y2={y} stroke="#2A2F38" strokeWidth={1} />
                      <SvgText x={M.left - 6} y={y + 3} fill="#9E9E9E" fontSize={10} textAnchor="end">
                        {String(t)}
                      </SvgText>
                    </React.Fragment>
                  );
                })}
                {series.map((p, i) => {
                  const x = xFor(i);
                  const lbl = md(p.date);
                  return (
                    <SvgText key={`x-${i}`} x={x} y={H - 12} fill="#9E9E9E" fontSize={10} textAnchor="middle">
                      {lbl}
                    </SvgText>
                  );
                })}
                <SvgLine x1={M.left} x2={w - M.right} y1={H - M.bottom} y2={H - M.bottom} stroke="#2A2F38" strokeWidth={1} />
                <SvgLine x1={M.left} x2={M.left} y1={M.top} y2={H - M.bottom} stroke="#2A2F38" strokeWidth={1} />
              </G>
              {linePath ? <Path d={linePath} fill="none" stroke="#4A9EFF" strokeWidth={2} /> : null}
              {series.map((p, i) => (
                <Circle
                  key={`pt-${i}`}
                  cx={xFor(i)}
                  cy={yFor(p.y)}
                  r={4.5}
                  stroke="#0F1419"
                  strokeWidth={2}
                  fill="#4A9EFF"
                />
              ))}
            </Svg>
          </View>
        </View>
        
        {/* Workout Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <View style={styles.statRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.statKicker}>Total</Text>
                <Text style={styles.statTitle}>Workouts</Text>
              </View>
              <Text style={styles.statValueRight}>{workoutStats.total}</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.statKicker}>Workout</Text>
                <Text style={styles.statTitle}>Streak</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={styles.statValueRight}>{workoutStats.streak}</Text>
                <MaterialCommunityIcons name="fire" size={16} color="#4A9EFF" />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* FIX #5: Sticky bottom primary CTA */}
      <View style={[styles.stickyCTA, { bottom: insets.bottom + 16 }]}>
        {/* FIX #5: Expandable assistant card above CTA */}
        <Pressable 
          style={styles.assistantCard}
          onPress={() => setShowAssistantCard(!showAssistantCard)}
        >
          <View style={styles.assistantCardContent}>
            <Text style={styles.assistantCardText}>Today's Focus: Mobility + Core (12 min)</Text>
            <Ionicons 
              name={showAssistantCard ? "chevron-up" : "chevron-down"} 
              size={16} 
              color="#9E9E9E" 
            />
          </View>
        </Pressable>

        {/* Primary CTA Button - Edit Schedule */}
        <Pressable 
          style={styles.primaryCTA} 
          onPress={() => router.push("/(tabs)/(home)/schedule-week")}
        >
          <Ionicons name="pencil" size={20} color="#000000" />
          <Text style={styles.primaryCTAText}>Edit Schedule</Text>
        </Pressable>
      </View>

      {/* Mode Chooser Modal */}
      <Modal
        visible={showModeChooser}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModeChooser(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowModeChooser(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Switch mode</Text>
            {[
              { key: "lifting", label: "Lifting", icon: "dumbbell" },
              { key: "basketball", label: "Basketball", icon: "basketball-outline" },
              { key: "football", label: "Football", icon: "american-football-outline" },
              { key: "baseball", label: "Baseball", icon: "baseball" },
              { key: "soccer", label: "Soccer", icon: "football-outline" },
              { key: "hockey", label: "Hockey", icon: "hockey-sticks" },
              { key: "tennis", label: "Tennis", icon: "tennisball-outline" },
            ].map((m) => (
              <Pressable
                key={m.key}
                style={styles.modalItem}
                onPress={() => {
                  setMode(m.key as any);
                  setShowModeChooser(false);
                }}
              >
                {m.icon.includes("-") ? (
                  <Ionicons name={m.icon as any} size={18} color="#FFFFFF" />
                ) : (
                  <MaterialCommunityIcons name={m.icon as any} size={18} color="#FFFFFF" />
                )}
                <Text style={styles.modalItemText}>{m.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Confetti Animation - High z-index to appear above everything */}
      {showConfetti && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000, elevation: 10000, pointerEvents: 'none' }}>
          <Confetti 
            active={showConfetti} 
            onComplete={() => {
              console.log('Confetti animation completed');
              setShowConfetti(false);
            }}
          />
        </View>
      )}
    </View>
  );
}

/* -------------------------------- Styles -------------------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0E10",
  },
  
  // FIX #1 & #2: HeaderShell with depth layering - IN FRONT of gradient
  headerShell: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: "#22272d", // FIX #7: Exact hex color
    zIndex: 2000, // Increased to be clearly in front
    elevation: 2000, // Increased for Android
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, // Increased shadow for more depth
    shadowRadius: 12, // Increased blur radius
    borderBottomLeftRadius: 16, // FIX #7: Rounded container
    borderBottomRightRadius: 16,
    overflow: "visible", // Changed to visible to allow shadow to show
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 56,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    justifyContent: "flex-end",
  },
  headerBrand: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF", // FIX #7: Near-white, not pure white
    textAlign: "center",
    flex: 1,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  
  // FIX #7: Calendar inside rounded container with notch - shadow under calendar
  calendarContainer: {
    position: "relative",
    paddingBottom: 16, // Extended padding to prevent cut-off
    paddingTop: 4, // Extra top padding
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2, // Android shadow
  },
  calendarContent: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8, // Reduced since container has padding
  },
  calendarDay: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 40,
  },
  calendarDayName: {
    fontSize: 11,
    fontWeight: "500",
    color: "#9E9E9E", // FIX #7: Muted text
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  calendarDateCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  calendarDateCircleActive: {
    backgroundColor: "#FFFFFF", // White circle for current day
  },
  calendarDate: {
    fontSize: 15,
    fontWeight: "500",
    color: "#9E9E9E", // FIX #7: Muted text
  },
  calendarDateActive: {
    color: "#000000", // Black text in white circle
  },

  // ScrollView
  scrollView: {
    flex: 1,
    backgroundColor: "#0B0E10",
  },

  // Gradient wrapper - extends upward behind calendar
  gradientWrapper: {
    position: "relative",
    marginTop: -600, // Extend upward behind calendar
    paddingTop: 600, // Compensate for negative margin
  },

  // Extended gradient for pull-down - extends behind calendar
  pullDownGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 600, // Tall enough to cover scroll distance
    zIndex: 0, // Behind hero gradient
  },

  // FIX #2: Hero gradient background layer
  heroGradient: {
    paddingHorizontal: 24,
    paddingTop: 52, // Increased more to move gradient and content down
    paddingBottom: 40, // Increased to extend green gradient further down
    minHeight: 400, // Increased to allow more green gradient space
    position: "relative",
    zIndex: 1, // Above pull-down gradient
  },
  
  // FIX #3: Hero Module
  heroModule: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8, // Add a bit more space to push circles and text down
  },
  heroIconContainer: {
    marginBottom: 20,
  },
  mascotCircles: {
    width: 120, // FIX #3: Smaller icon
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  mascotCircle1: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(62, 180, 137, 0.2)", // Green based on #3eb489
    position: "absolute",
    top: 0,
    left: 0,
  },
  mascotCircle2: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(62, 180, 137, 0.3)", // Green based on #3eb489
    position: "absolute",
    top: 15,
    left: 15,
  },
  mascotCircle3: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(62, 180, 137, 0.4)", // Green based on #3eb489
    position: "absolute",
    top: 30,
    left: 30,
  },
  
  // FIX #4: Typography hierarchy
  heroHeadline: {
    fontSize: 18, // Reduced by 12px from 30
    fontWeight: "600", // semibold
    color: "#FFFFFF", // FIX #7: Near-white, not pure white
    textAlign: "center",
    lineHeight: 24, // Adjusted proportionally
    marginBottom: 12,
  },
  heroSupporting: {
    fontSize: 13, // Increased by 2px from 11
    fontWeight: "400",
    color: "rgba(255, 255, 255, 0.7)", // FIX #4 & #7: ~70% opacity, muted
    textAlign: "center",
    lineHeight: 18, // Adjusted proportionally
    paddingHorizontal: 16,
  },

  // FIX #6: Divider
  sectionDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)", // Low opacity
    marginHorizontal: 24,
    marginTop: 20, // FIX #6: 20-28px spacing
    marginBottom: 40, // Increased spacing for log sections
  },

  // FIX #2: Content card with different surface
  progressCard: {
    marginHorizontal: 16,
    marginTop: 40, // Increased spacing after log sections
    padding: 20,
    backgroundColor: "#1A1F28", // Different surface
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  
  // FIX #4: Section header with action on right
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressTick: {
    width: 3,
    height: 18,
    borderRadius: 2,
    backgroundColor: "#4A9EFF",
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 19, // FIX #4: 18-20px semibold
    fontWeight: "600", // semibold
    color: "#FFFFFF", // FIX #7: Near-white
  },
  sectionAction: {
    fontSize: 14,
    fontWeight: "500",
    color: "#4A9EFF",
  },
  
  searchInput: {
    backgroundColor: "#0F1419",
    color: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2A2F38",
    marginBottom: 12,
    fontSize: 14,
  },
  dropdownRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  dropdownWrapper: {
    flex: 1,
    position: "relative",
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#0F1419",
    borderWidth: 1,
    borderColor: "#2A2F38",
  },
  dropdownActive: {
    borderColor: "#4A9EFF",
    backgroundColor: "#1A2332",
  },
  dropdownText: {
    color: "#FFFFFF", // FIX #7: Near-white
    fontSize: 12,
    fontWeight: "600",
  },
  dropdownMenu: {
    position: "absolute",
    top: 42,
    left: 0,
    right: 0,
    backgroundColor: "#1A1F28",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2A2F38",
    zIndex: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  dropdownMenuItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#2A2F38",
  },
  dropdownMenuText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  chartContainer: {
    height: 220,
    backgroundColor: "#0F1419",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2A2F38",
    overflow: "hidden",
  },
  
  // FIX #5: Sticky bottom CTA
  stickyCTA: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 100,
  },
  assistantCard: {
    backgroundColor: "#1A1F28",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#2A2F38",
  },
  assistantCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  assistantCardText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#9E9E9E", // FIX #7: Muted text
    flex: 1,
  },
  primaryCTA: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryCTAText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000000",
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 100,
    paddingRight: 12,
  },
  modalContent: {
    backgroundColor: "#1A1F28",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 8,
    minWidth: 220,
    borderWidth: 1,
    borderColor: "#2A2F38",
  },
  modalTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9E9E9E",
    marginBottom: 6,
    marginLeft: 6,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  modalItemText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    flex: 1,
  },
  
  // Log Game/Practice Sections - Premium Card Style
  logSection: {
    marginHorizontal: 16,
    marginTop: 32,
    marginBottom: 8,
    borderRadius: 26,
    overflow: "hidden",
    height: 200,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  logSectionInner: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  logImage: {
    width: "100%",
    height: "100%",
  },
  logTextOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 22,
    paddingBottom: 24,
    justifyContent: "flex-end",
    alignItems: "flex-start",
  },
  logTextContainer: {
    maxWidth: "70%",
  },
  logTitle: {
    fontSize: 42,
    fontFamily: "SpaceGrotesk_800ExtraBold",
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -1,
    textShadowColor: "rgba(0, 0, 0, 0.7)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    marginBottom: 6,
    transform: [{ skewX: "-5deg" }], // Slight italic-like slant
  },
  logSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.7)",
    letterSpacing: 0.3,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  
  // Stats Section
  statsSection: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#1A1F28",
    borderColor: "#2A2F38",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statKicker: {
    color: "#9E9E9E",
    fontSize: 11,
    marginBottom: 4,
    fontWeight: "600",
  },
  statTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  statValueRight: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
  },
});
