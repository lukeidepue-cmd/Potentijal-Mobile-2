// app/(tabs)/(home)/index.tsx
import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, router } from "expo-router";
import * as Haptics from "expo-haptics";
import { getScheduleWithStatus, getCurrentWeekStart } from "../../../lib/api/schedule";
import { getMyProfile } from "../../../lib/api/profile";
import { useAuth } from "../../../providers/AuthProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabOverflow } from "../../../components/ui/TabBarBackground";
import { Confetti } from "../../../components/Confetti";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence } from "react-native-reanimated";
import { getSportButtons, SPORT_IMAGE_BY_KEY, type ImageKey } from "../../../constants/sport-images";

const AnimatedText = Animated.createAnimatedComponent(Text);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
type MetricKey = "reps" | "weight" | "volume";
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


/* -------------------------------- Component -------------------------------- */
export default function LiftingHome() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabOverflow();
  const days = getCurrentWeekStartingSunday();
  const { user } = useAuth();
  const weekStart = getCurrentWeekStart();
  const today = startOfDay(new Date());
  
  // Animation for Edit Schedule button
  const editScheduleScale = useSharedValue(1);
  const editScheduleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: editScheduleScale.value }],
  }));

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

  // primary_sport from profile — drives which athlete photos appear on the
  // Log Game / Log Practice buttons. Lifting (or null) hides both buttons.
  const [primarySport, setPrimarySport] = useState<string | null>(null);
  const sportButtons = useMemo(() => getSportButtons(primarySport), [primarySport]);

  // Refs for measuring the image-button positions before route push, so the
  // destination screen can animate the image from its starting frame.
  const gameCardRef = useRef<View>(null);
  const practiceCardRef = useRef<View>(null);

  // Per-button press animation (Reanimated)
  const gameScale = useSharedValue(1);
  const practiceScale = useSharedValue(1);
  const gameAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: gameScale.value }] }));
  const practiceAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: practiceScale.value }] }));

  // Load schedule
  useEffect(() => {
    if (user) {
      loadSchedule();
      loadPrimarySport();
    }
  }, [user, weekStart]);

  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        loadSchedule();
      }
    }, [user, weekStart])
  );

  const loadPrimarySport = async () => {
    const { data } = await getMyProfile();
    if (data) {
      // profile.sports is an array; primary_sport is the canonical one.
      // Fall back to the first sport in the array if primary_sport is unset.
      const sport = data.primary_sport || (data.sports && data.sports[0]) || null;
      setPrimarySport(sport);
    }
  };

  const loadSchedule = async () => {
    const { data } = await getScheduleWithStatus({
      weekStartDate: weekStart,
    });
    if (data) {
      // Check if status changed to completed (trigger confetti)
      const todayDayIndex = today.getDay();
      const currentItem = data.find(item => item.dayIndex === todayDayIndex);
      const currentStatus = currentItem?.status || 'empty';
      
      // Check if status changed to completed (trigger confetti)
      const prevStatus = previousStatusRef.current;
      
      // If we had a previous status and it wasn't completed, but now it is, trigger confetti
      if (prevStatus !== null && prevStatus !== 'completed' && currentStatus === 'completed' && currentItem?.label) {
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

          {/* Center: Brand */}
          <Text style={styles.headerBrand}>Home</Text>

          {/* Right: Settings */}
          <View style={styles.headerRight}>
            <Pressable
              style={styles.headerIconButton}
              onPress={() => router.push("/(tabs)/settings")}
            >
              <Ionicons name="settings-outline" size={22} color="#FFFFFF" />
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

      {/* Scrollable content — only Edit Schedule is sticky now, so the
          padding budget shrinks. ~120pt for the lone CTA + safe area + tab. */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingTop: headerTotalHeight, paddingBottom: 140 }}
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
                <Image 
                  source={require("../../../assets/star.png")}
                  style={styles.starImage}
                  resizeMode="contain"
                />
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

        {/* Stats moved to the History tab — Home stays focused on planning
            (Edit Schedule) and logging (Build Preset / Game / Practice). */}

        {/* In-scroll action stack — preset above the divider, game/practice below.
            Only Edit Schedule lives in the sticky footer; everything else scrolls
            with content so the page breathes when there's more to show. */}
        <View style={styles.inlineActionStack}>
          <Pressable
            onPress={() => router.push("/(tabs)/(home)/build-preset")}
            style={({ pressed }) => [
              styles.buildPresetBtn,
              pressed && styles.buildPresetBtnPressed,
            ]}
          >
            {/* Accent-tinted icon badge — matches the workout set badge language */}
            <View style={styles.buildPresetIconWrap}>
              <Ionicons name="add" size={18} color="#22C55E" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.buildPresetText}>Build New Preset</Text>
              <Text style={styles.buildPresetSubtext}>Save a custom exercise type</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.35)" />
          </Pressable>

          {sportButtons && (
            <>
              <View style={styles.ctaDivider} />

              {/* Log Game image button — measures position before push so the
                  destination screen can animate the image from this frame. */}
              <View ref={gameCardRef} collapsable={false}>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    gameCardRef.current?.measure((x, y, width, height, pageX, pageY) => {
                      router.push({
                        pathname: "/(tabs)/(home)/add-game",
                        params: {
                          imageSource: sportButtons.game.key,
                          initialX: String(pageX),
                          initialY: String(pageY),
                          initialWidth: String(width),
                          initialHeight: String(height),
                        },
                      });
                    });
                  }}
                  onPressIn={() => {
                    gameScale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
                  }}
                  onPressOut={() => {
                    gameScale.value = withSpring(1, { damping: 15, stiffness: 300 });
                  }}
                  style={styles.logImageButton}
                >
                  <Animated.View style={[styles.logImageInner, gameAnimatedStyle]}>
                    <Image
                      source={SPORT_IMAGE_BY_KEY[sportButtons.game.key as ImageKey]}
                      style={styles.logImage}
                      resizeMode="cover"
                    />
                    <LinearGradient
                      colors={["rgba(0,0,0,0.05)", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.85)"]}
                      locations={[0, 0.65, 1]}
                      style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.logTextOverlay}>
                      <Text style={styles.logTitle}>Log Game</Text>
                    </View>
                  </Animated.View>
                </Pressable>
              </View>

              {/* Log Practice image button — same pattern */}
              <View ref={practiceCardRef} collapsable={false} style={{ marginTop: 10 }}>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    practiceCardRef.current?.measure((x, y, width, height, pageX, pageY) => {
                      router.push({
                        pathname: "/(tabs)/(home)/add-practice",
                        params: {
                          imageSource: sportButtons.practice.key,
                          initialX: String(pageX),
                          initialY: String(pageY),
                          initialWidth: String(width),
                          initialHeight: String(height),
                        },
                      });
                    });
                  }}
                  onPressIn={() => {
                    practiceScale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
                  }}
                  onPressOut={() => {
                    practiceScale.value = withSpring(1, { damping: 15, stiffness: 300 });
                  }}
                  style={styles.logImageButton}
                >
                  <Animated.View style={[styles.logImageInner, practiceAnimatedStyle]}>
                    <Image
                      source={SPORT_IMAGE_BY_KEY[sportButtons.practice.key as ImageKey]}
                      style={styles.logImage}
                      resizeMode="cover"
                    />
                    <LinearGradient
                      colors={["rgba(0,0,0,0.05)", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.85)"]}
                      locations={[0, 0.65, 1]}
                      style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.logTextOverlay}>
                      <Text style={styles.logTitle}>Log Practice</Text>
                    </View>
                  </Animated.View>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* FIX #5: Sticky bottom primary CTA */}
      <View style={[styles.stickyCTA, { bottom: tabBarHeight + -2 }]}>
        {/* Primary CTA Button - Edit Schedule */}
        {/* Sticky footer — ONLY Edit Schedule. Build Preset + Log Game/Practice
            live in the scroll content so they don't crowd the bottom. */}
        <AnimatedPressable
          style={[styles.primaryCTA, editScheduleAnimatedStyle]}
          onPress={() => router.push("/(tabs)/(home)/schedule-week")}
          onPressIn={() => {
            editScheduleScale.value = withSpring(0.96, { damping: 26, stiffness: 280 });
          }}
          onPressOut={() => {
            editScheduleScale.value = withSpring(1, { damping: 26, stiffness: 280 });
          }}
        >
          <Ionicons name="calendar" size={18} color="#06090C" />
          <Text style={styles.primaryCTAText}>Edit Schedule</Text>
        </AnimatedPressable>
      </View>

      {/* Confetti Animation - High z-index to appear above everything */}
      {showConfetti && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000, elevation: 10000, pointerEvents: 'none' }}>
          <Confetti
            active={showConfetti}
            onComplete={() => {
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
    marginTop: -18, // Pull star + text block up 26px (was 8)
  },
  // Negative bottom margin pulls the headline + supporting text up 22px,
  // tucking them snug under the star illustration.
  heroIconContainer: {
    marginBottom: -22,
  },
  mascotCircles: {
    width: 200,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  starImage: {
    width: 200,
    height: 200,
  },
  mascotCircle1: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  mascotCircle2: {
    position: "absolute",
    top: 20,
    left: 20,
  },
  mascotCircle3: {
    position: "absolute",
    top: 35,
    left: 35,
  },
  
  // FIX #4: Typography hierarchy
  // Hero headline — shrunk further (22 → 19) so it sits as a quiet subtitle
  // under the star rather than a competing display element.
  heroHeadline: {
    fontSize: 19,
    fontWeight: "700",
    color: "rgba(255,255,255,0.94)",
    textAlign: "center",
    lineHeight: 23,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  heroSupporting: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.60)",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 24,
    maxWidth: 300,
    alignSelf: "center",
  },

  // FIX #6: Divider
  sectionDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)", // Low opacity
    marginHorizontal: 24,
    marginTop: 20, // FIX #6: 20-28px spacing
    marginBottom: 8, // Tightened gap to the Build Preset button (was 24)
  },

  // FIX #2: Content card with different surface
  progressCard: {
    marginHorizontal: 16,
    marginTop: 0, // FIX #6: Proper spacing after divider
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
  // Primary: brand-accent pill matching the rest of the visual system.
  // (Pre-redesign: was solid #FFFFFF which collided with the dark surface
  // language and clipped against the secondary row below.)
  primaryCTA: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#22C55E",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  secondaryCTARow: {
    flexDirection: "row",
    gap: 12,
  },
  secondaryCTA: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.10)",
    borderRadius: 14,
    paddingVertical: 14,
  },
  secondaryCTAText: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.92)",
    letterSpacing: -0.1,
  },
  // Athlete-photo image buttons (Log Game / Log Practice). Tall, premium
  // image-card sizing closer to the original v1.0 hero buttons.
  logImageButton: {
    width: "100%",
    height: 180,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.20,
    shadowRadius: 12,
    elevation: 8,
  },
  logImageInner: {
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
    padding: 16,
    justifyContent: "flex-end",
    alignItems: "flex-start",
  },
  logTitle: {
    fontSize: 28,
    fontFamily: "SpaceGrotesk_800ExtraBold",
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.8,
    textShadowColor: "rgba(0, 0, 0, 0.7)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    transform: [{ skewX: "-5deg" }],
  },
  // In-scroll action stack — sits under the Workout Stats cards.
  // Edit Schedule is the only sticky CTA; this stack scrolls with content.
  inlineActionStack: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  // Build New Preset — premium "list row" pattern (Things 3 / iOS Settings).
  // Accent badge on the left, title + subtitle in the middle, chevron on the
  // right. Reads as substantial without competing with the Edit Schedule
  // pill (still solid green, still bottom-sticky, still the primary action).
  buildPresetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.09)",
    backgroundColor: "rgba(255, 255, 255, 0.035)",
  },
  buildPresetBtnPressed: {
    backgroundColor: "rgba(34, 197, 94, 0.07)",
    borderColor: "rgba(34, 197, 94, 0.25)",
  },
  buildPresetIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(34, 197, 94, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.32)",
    alignItems: "center",
    justifyContent: "center",
  },
  buildPresetText: {
    fontSize: 15,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.94)",
    letterSpacing: -0.2,
  },
  buildPresetSubtext: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.42)",
    marginTop: 1,
    letterSpacing: 0.05,
  },
  // Divider between Build Preset (above) and Log Game / Log Practice (below).
  // Hairline 1px at ~10% white, inset 4px from the edges of the stack.
  ctaDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255, 255, 255, 0.10)",
    marginTop: 16,
    marginBottom: 14,
    marginHorizontal: 4,
  },
  primaryCTAText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#06090C",
    letterSpacing: -0.1,
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 100,
    paddingRight: 12,
  },
  modalContentWrapper: {
    position: "relative",
    alignItems: "flex-end",
  },
  modalTriangle: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 12,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "rgba(0, 0, 0, 0.6)",
    marginBottom: -1,
    marginRight: 8,
    zIndex: 1,
  },
  modalContentBlur: {
    borderRadius: 16,
    overflow: "hidden",
  },
  modalContent: {
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 8,
    minWidth: 180,
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
  
});
