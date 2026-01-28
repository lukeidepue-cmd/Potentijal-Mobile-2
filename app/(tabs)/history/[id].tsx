// app/(tabs)/history/[id].tsx
import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, Image, Dimensions, Platform } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card } from "../../../components/Card";
import { theme } from "../../../constants/theme";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  withRepeat,
  withDelay,
  withSequence,
  cancelAnimation,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import {
  getWorkoutDetail,
  getPracticeDetail,
  getGameDetail,
  type HistoryPractice,
  type HistoryGame,
} from "../../../lib/api/history";
import { type WorkoutDetails, copyWorkoutSkeleton } from "../../../lib/api/workouts";
import { type ExerciseType } from "../../../lib/types";
import { useAuth } from "../../../providers/AuthProvider";
import { useSettings } from "../../../providers/SettingsContext";
import { getMyProfile } from "../../../lib/api/profile";
import { Alert } from "react-native";
import { PROFILE_FEATURES_ENABLED } from "../../../constants/features";

const iconFor: Record<string, React.ReactNode> = {
  workout: <MaterialCommunityIcons name="dumbbell" size={16} color="#111" />,
  basketball: <Ionicons name="basketball-outline" size={16} color="#111" />,
  football: <Ionicons name="american-football-outline" size={16} color="#111" />,
  soccer: <Ionicons name="football-outline" size={16} color="#111" />,
  baseball: <MaterialCommunityIcons name="baseball" size={16} color="#111" />,
  hockey: <MaterialCommunityIcons name="hockey-sticks" size={16} color="#111" />,
  tennis: <MaterialCommunityIcons name="tennisball" size={16} color="#111" />,
  lifting: <MaterialCommunityIcons name="dumbbell" size={16} color="#111" />,
};

function formatDate(iso?: string) {
  if (!iso) return "";
  // Parse as local date to avoid timezone issues
  const parts = iso.split('T')[0].split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    return `${month}/${day}/${String(year).slice(-2)}`;
  }
  // Fallback
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(-2)}`;
}

function formatFullDate(iso?: string) {
  if (!iso) return "";
  // Parse as local date to avoid timezone issues
  const parts = iso.split('T')[0].split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[month - 1]} ${day}, ${year}`;
  }
  // Fallback
  const d = new Date(iso);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

// Helper function to safely format stats for display
// Stats can be stored as jsonb (object) or text (string) in the database
function formatStatsForDisplay(stats: any): string {
  if (!stats) return "";
  
  // If it's already a string, return it
  if (typeof stats === "string") {
    return stats;
  }
  
  // If it's an object, format it nicely
  if (typeof stats === "object") {
    // If it's an empty object, return empty string
    if (Object.keys(stats).length === 0) {
      return "";
    }
    
    // Format as key-value pairs
    return Object.entries(stats)
      .map(([key, value]) => {
        // Capitalize first letter of key and format value
        const formattedKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
        return `${formattedKey}: ${value}`;
      })
      .join("\n");
  }
  
  // Fallback: convert to string
  return String(stats);
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const IMAGE_HEIGHT = SCREEN_HEIGHT * 0.25; // 25% of screen height

// Helper functions for exercise boxes
type ExerciseTypeForBox = "exercise" | "shooting" | "drill" | "sprints" | "hitting" | "fielding" | "rally";

const getExerciseTypeColor = (type: string, mode?: string): string => {
  if (type === "exercise") {
    return "#5AA6FF"; // Blue
  } else if (type === "shooting") {
    return "#64C878"; // Green
  } else if (type === "sprints" || type === "fielding" || type === "rally") {
    return "#64C878"; // Green
  } else if (type === "hitting") {
    return "#B48CFF"; // Purple
  } else {
    return "#B48CFF"; // Purple for drills
  }
};

const getExerciseIcon = (type: string): React.ReactNode => {
  if (type === "exercise") {
    return <MaterialCommunityIcons name="dumbbell" size={24} color="#FFFFFF" />;
  } else if (type === "shooting") {
    return <MaterialCommunityIcons name="target" size={24} color="#FFFFFF" />;
  } else if (type === "sprints") {
    return <MaterialCommunityIcons name="run-fast" size={24} color="#FFFFFF" />;
  } else if (type === "hitting") {
    return <MaterialCommunityIcons name="baseball-bat" size={24} color="#FFFFFF" />;
  } else if (type === "fielding") {
    return <MaterialCommunityIcons name="baseball" size={24} color="#FFFFFF" />;
  } else if (type === "rally") {
    return <MaterialCommunityIcons name="tennis" size={24} color="#FFFFFF" />;
  } else {
    return <Ionicons name="time-outline" size={24} color="#FFFFFF" />;
  }
};

// Format set display like workout tab
const formatSetDisplay = (
  set: any,
  exerciseType: string,
  mode?: string,
  unitsWeight?: string
): string => {
  const parts: string[] = [];
  
  if (exerciseType === "exercise") {
    if (set.reps != null) parts.push(`Reps: ${set.reps}`);
    if (set.weight != null) parts.push(`Weight (${unitsWeight === 'kg' ? 'kg' : 'lb'}): ${set.weight}`);
  } else if (exerciseType === "shooting") {
    if (mode === "basketball") {
      if (set.attempted != null) parts.push(`Attempted: ${set.attempted}`);
      if (set.made != null) parts.push(`Made: ${set.made}`);
    } else {
      if (set.reps != null) parts.push(`Reps: ${set.reps}`);
      if (set.distance != null) parts.push(`Distance: ${set.distance} ${mode === "soccer" || mode === "hockey" ? "yds" : ""}`);
    }
  } else if (exerciseType === "drill") {
    if (set.reps != null) parts.push(`Reps: ${set.reps}`);
    // completed is for football drills
    if (set.completed != null && mode === "football") {
      parts.push(`Completed: ${set.completed}`);
    }
    if (set.timeMin != null) parts.push(`Time: ${set.timeMin} min`);
  } else if (exerciseType === "sprints") {
    if (set.reps != null) parts.push(`Reps: ${set.reps}`);
    if (set.distance != null) parts.push(`Distance: ${set.distance} yds`);
    if (set.avgTimeSec != null) parts.push(`Avg. Time: ${set.avgTimeSec} sec`);
  } else if (exerciseType === "hitting") {
    if (set.reps != null) parts.push(`Reps: ${set.reps}`);
    if (set.distance != null) parts.push(`Distance: ${set.distance} ft`);
  } else if (exerciseType === "fielding") {
    if (set.reps != null) parts.push(`Reps: ${set.reps}`);
    if (set.distance != null) parts.push(`Distance: ${set.distance} ft`);
  } else if (exerciseType === "rally") {
    if (set.points != null) parts.push(`Points: ${set.points}`);
    if (set.timeMin != null) parts.push(`Time: ${set.timeMin} min`);
  }
  
  return parts.length > 0 ? parts.join(" • ") : "No data";
};

// Exercise Box Component with 3D styling
function ExerciseBox({
  exercise,
  mode,
  unitsWeight,
}: {
  exercise: { id?: string; name: string; type: string; sets: any[] };
  mode?: string;
  unitsWeight?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const rotation = useSharedValue(0);
  const height = useSharedValue(0);
  const opacity = useSharedValue(0);

  const exerciseColor = getExerciseTypeColor(exercise.type, mode);
  const exerciseIcon = getExerciseIcon(exercise.type);
  const setsCount = exercise.sets?.length || 0;
  const setsText = setsCount !== 1 ? "sets" : "set";

  useEffect(() => {
    rotation.value = withTiming(isExpanded ? 90 : 0, { duration: 200 });
    const estimatedHeight = exercise.sets.length * 60; // Increased height per set to prevent clipping
    height.value = withTiming(isExpanded ? estimatedHeight : 0, { duration: 200 });
    opacity.value = withTiming(isExpanded ? 1 : 0, { duration: 200 });
  }, [isExpanded, exercise.sets.length]);

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const setsContainerStyle = useAnimatedStyle(() => ({
    height: height.value,
    opacity: opacity.value,
  }));

  return (
    <View style={styles.exerciseBoxContainer}>
      {/* 3D Box with colored border */}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setIsExpanded(!isExpanded);
        }}
        style={({ pressed }) => [
          styles.exerciseBox,
          { borderColor: exerciseColor },
          pressed && { opacity: 0.8 },
        ]}
      >
        {/* Gradient overlay for depth */}
        <LinearGradient
          colors={["rgba(255,255,255,0.08)", "transparent", "rgba(0,0,0,0.15)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        {/* Top highlight for 3D effect */}
        <LinearGradient
          colors={["rgba(255,255,255,0.12)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 0.3 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={styles.exerciseBoxContent}>
          <View style={styles.exerciseBoxLeft}>
            <Text style={styles.exerciseBoxName}>{exercise.name}</Text>
            <Text style={styles.exerciseBoxSets}>
              {setsCount} {setsText}
            </Text>
          </View>
          <View style={styles.exerciseBoxRight}>
            <Animated.View style={[styles.exerciseBoxArrow, arrowStyle]}>
              <Ionicons name="chevron-forward" size={22} color={exerciseColor} />
            </Animated.View>
            {exerciseIcon}
          </View>
        </View>
      </Pressable>

      {/* Collapsible Sets Display */}
      {isExpanded && (
        <Animated.View style={[styles.setsContainer, setsContainerStyle]}>
          {exercise.sets.map((set, setIdx) => (
            <View key={set.id || setIdx} style={styles.setRow}>
              <Text style={styles.setRowLabel}>Set {set.setIndex || setIdx + 1}</Text>
              <Text 
                style={styles.setRowValue}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {formatSetDisplay(set, exercise.type, mode, unitsWeight)}
              </Text>
            </View>
          ))}
        </Animated.View>
      )}
    </View>
  );
}

// Get card background design for practice based on sport mode
function getPracticeCardBackground(mode?: string) {
  const modeKey = (mode || "").toLowerCase();
  
  switch (modeKey) {
    case "basketball":
      return {
        gradientColors: ["#C84B25", "#FF6A2A"],
        images: [
          { source: require("../../../assets/history/basketball-hoop.png"), style: "backgroundHoop" },
          { source: require("../../../assets/history/basketball.png"), style: "backgroundBall1" },
        ],
        fadeColor: "rgba(200, 75, 37, 0.15)",
      };
    case "football":
      return {
        gradientColors: ["#6B3410", "#A0522D"],
        images: [
          { source: require("../../../assets/history/football-field.png"), style: "backgroundFootballField" },
          { source: require("../../../assets/history/football.png"), style: "backgroundFootball" },
        ],
        fadeColor: "rgba(107, 52, 16, 0.15)",
      };
    case "soccer":
      return {
        gradientColors: ["#1E3A8A", "#3B82F6"],
        images: [
          { source: require("../../../assets/history/soccer-goal.png"), style: "backgroundSoccerGoal" },
        ],
        fadeColor: "rgba(30, 58, 138, 0.15)",
      };
    case "tennis":
      return {
        gradientColors: ["#8FA020", "#C8D844"],
        images: [
          { source: require("../../../assets/history/tennis-racket.png"), style: "backgroundTennisRacket" },
          { source: require("../../../assets/history/tennis-ball.png"), style: "backgroundTennisBall" },
        ],
        fadeColor: "rgba(143, 160, 32, 0.15)",
      };
    case "hockey":
      return {
        gradientColors: ["#66CCCC", "#99FFFF"],
        images: [
          { source: require("../../../assets/history/hockey-net.png"), style: "backgroundHockeyNet" },
        ],
        fadeColor: "rgba(102, 204, 204, 0.15)",
      };
    case "baseball":
      return {
        gradientColors: ["#B91C1C", "#E63946"],
        images: [
          { source: require("../../../assets/history/baseball-bat.png"), style: "backgroundBaseballBat" },
          { source: require("../../../assets/history/baseball.png"), style: "backgroundBaseball" },
        ],
        fadeColor: "rgba(185, 28, 28, 0.15)",
      };
    case "lifting":
      return {
        gradientColors: ["#4A4A4A", "#6B6B6B"],
        images: [
          { source: require("../../../assets/history/dumbell.png"), style: "backgroundDumbbell" },
        ],
        fadeColor: "rgba(74, 74, 74, 0.15)",
      };
    default:
      return {
        gradientColors: ["#C84B25", "#FF6A2A"],
        images: [
          { source: require("../../../assets/history/basketball-hoop.png"), style: "backgroundHoop" },
          { source: require("../../../assets/history/basketball.png"), style: "backgroundBall1" },
        ],
        fadeColor: "rgba(200, 75, 37, 0.15)",
      };
  }
}

export default function HistoryDetail() {
  const params = useLocalSearchParams<{
    id: string;
    type: "workout" | "practice" | "game";
    name?: string;
    when: string;
    mode?: string;
    result?: string;
    fromCreator?: string; // "true" if viewing from creator workouts
  }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { unitsWeight } = useSettings();

  const [loading, setLoading] = useState(true);
  const [workout, setWorkout] = useState<WorkoutDetails | null>(null);
  const [practice, setPractice] = useState<HistoryPractice | null>(null);
  const [game, setGame] = useState<HistoryGame | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canCopy, setCanCopy] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [animationComplete, setAnimationComplete] = useState(false);

  // Loading star animation - simple and clean
  const starRotation = useSharedValue(0);
  
  useEffect(() => {
    if (loading) {
      cancelAnimation(starRotation);
      starRotation.value = 0;
      starRotation.value = withRepeat(
        withTiming(360, { duration: 1000, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      cancelAnimation(starRotation);
      starRotation.value = 0;
    }
  }, [loading]);

  const starAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${starRotation.value}deg` }],
  }));

  // Animation values for practice detail screen - start card at card position, animate to top
  // Start card at approximate position where it would be in the history list (after header/control area)
  const headerHeight = 200; // Approximate header + control area height
  const cardX = useSharedValue(16); // Card margin from edges
  const cardY = useSharedValue(headerHeight); // Start after header area
  const cardWidth = useSharedValue(SCREEN_WIDTH - 32); // Card width (with margins)
  const cardHeight = useSharedValue(120); // Card height
  const cardBorderRadius = useSharedValue(24); // Start with card border radius
  const formY = useSharedValue(SCREEN_HEIGHT);
  
  // Set formY to visible position immediately when loading starts (for practice/game screens)
  useEffect(() => {
    if (loading && (params.type === "practice" || params.type === "game")) {
      cancelAnimation(formY);
      formY.value = IMAGE_HEIGHT;
    }
  }, [loading, params.type, params.id]);

  useEffect(() => {
    // Clear previous data immediately when params change
    setWorkout(null);
    setPractice(null);
    setGame(null);
    setAnimationComplete(false);
    // Reset formY for practice/game screens
    if (params.type === "practice" || params.type === "game") {
      formY.value = IMAGE_HEIGHT; // Set to visible position immediately
    }
    // Set loading to true immediately when params change, so star appears instantly
    setLoading(true);
    setError(null);
    loadDetail();
  }, [params.id, params.type]);

  // Animate card background and content for practice and game screens
  useEffect(() => {
    if (params.type === "practice" || params.type === "game") {
      // Start animation immediately when screen loads, don't wait for data
      // Animate card background to top - smooth transition
      const finalX = 0;
      const finalY = 0; // Go all the way to top (no insets.top)
      const finalWidth = SCREEN_WIDTH;
      const finalHeight = IMAGE_HEIGHT;

      // Animate card to top - smooth transition (start immediately)
      // Higher damping = less bounce, smoother animation
      cardX.value = withSpring(finalX, { damping: 35, stiffness: 50 });
      cardY.value = withSpring(finalY, { damping: 35, stiffness: 50 });
      cardWidth.value = withSpring(finalWidth, { damping: 35, stiffness: 50 });
      cardHeight.value = withSpring(finalHeight, { damping: 35, stiffness: 50 });
      cardBorderRadius.value = withSpring(0, { damping: 35, stiffness: 50 }); // Animate to 0 when at top

      // Animate form sliding up from bottom - but only if not loading
      // If loading, the separate useEffect will set it to IMAGE_HEIGHT immediately
      if (!loading) {
        cancelAnimation(formY);
        formY.value = withSpring(IMAGE_HEIGHT, {
          damping: 35,
          stiffness: 50,
        }, () => {
          runOnJS(setAnimationComplete)(true);
        });
      }
    } else {
      // For workout screens, content is already visible
      formY.value = 0;
      setAnimationComplete(true);
    }
  }, [params.type, loading]); // Include loading in dependencies

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    position: "absolute",
    left: cardX.value,
    top: cardY.value,
    width: cardWidth.value,
    height: cardHeight.value,
    borderRadius: cardBorderRadius.value,
    zIndex: 1,
  }));

  const formAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: formY.value - IMAGE_HEIGHT }],
  }));

  // Check if user can copy this workout (always check for creator workouts, even own)
  useEffect(() => {
    if (params.fromCreator === "true" && workout && user) {
      checkCanCopy();
    }
  }, [workout, user, params.fromCreator]);

  const checkCanCopy = async () => {
    if (!workout || !user) return;

    // If viewing a creator workout, allow copying regardless of user's sports preferences
    // This allows users to discover and copy workouts from creators even if they haven't set up that sport yet
    if (params.fromCreator === 'true') {
      setCanCopy(true);
      setCopyError(null);
      return;
    }

    // For own workouts, check if user has the required sport mode
    // Map database mode to frontend mode for comparison
    const { data: profile } = await getMyProfile();
    
    // Map workout.mode (database) to frontend mode key
    // "workout" in DB corresponds to "lifting" in frontend
    const modeMapping: Record<string, string> = {
      'workout': 'lifting',
      'basketball': 'basketball',
      'football': 'football',
      'baseball': 'baseball',
      'soccer': 'soccer',
      'hockey': 'hockey',
      'tennis': 'tennis',
    };
    
    const frontendMode = modeMapping[workout.mode] || workout.mode;
    
    // Check if user has the sport in their profile
    // Also check if the mode is "workout" and user has "lifting" OR if they have the exact mode
    const hasSport = profile && profile.sports && (
      profile.sports.includes(frontendMode) ||
      (workout.mode === 'workout' && profile.sports.includes('workout')) // Also allow if profile has "workout" directly
    );
    
    if (hasSport) {
      setCanCopy(true);
      setCopyError(null);
    } else {
      setCanCopy(false);
      const modeName = workout.mode === 'workout' ? 'Workout' : workout.mode.charAt(0).toUpperCase() + workout.mode.slice(1);
      setCopyError(`Cannot copy workout because it was logged in ${modeName} mode`);
    }
  };

  const handleCopy = async () => {
    if (!workout || !canCopy) return;
    
    const { data: newWorkoutId, error: copyError } = await copyWorkoutSkeleton({
      sourceWorkoutId: workout.id,
    });

    if (copyError || !newWorkoutId) {
      console.error(`❌ [Copy Workout] Copy failed:`, copyError);
      Alert.alert("Error", "Failed to copy workout");
      return;
    }
    
    Alert.alert("Success", "Workout copied! You can now edit it in the Workouts tab.", [
      {
        text: "OK",
        onPress: () => {
          // Navigate to workouts tab with the new workout ID
          // The workouts tab should load this workout automatically
          router.replace({
            pathname: "/(tabs)/workouts",
            params: { workoutId: newWorkoutId },
          });
        },
      },
    ]);
  };

  const loadDetail = async () => {
    setLoading(true);
    setError(null);

    try {
      // If type is missing, try to determine from workout (default to workout for creator workouts)
      let type = params.type;
      if (!type && params.fromCreator === "true") {
        type = "workout";
      }

      if (type === "workout" || (!type && params.fromCreator === "true")) {
        const { data, error: err } = await getWorkoutDetail(params.id);
        if (err || !data) {
          console.error('❌ [History Detail] Workout error:', err);
          setError("Failed to load workout");
        } else {
          setWorkout(data);
        }
      } else if (type === "practice") {
        const { data, error: err } = await getPracticeDetail(params.id);
        if (err || !data) {
          setError("Failed to load practice");
        } else {
          setPractice(data);
        }
      } else if (type === "game") {
        const { data, error: err } = await getGameDetail(params.id);
        if (err || !data) {
          setError("Failed to load game");
        } else {
          setGame(data);
        }
      } else {
        console.error('❌ [History Detail] Unknown type:', type);
        setError("Unknown item type");
      }
    } catch (err: any) {
      console.error('❌ [History Detail] Exception:', err);
      setError(err?.message || "Failed to load details");
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    if (params.type === "workout" || (params.fromCreator === "true" && workout)) {
      return params.name || workout?.name || "Workout";
    } else if (params.type === "practice") {
      return "Practice";
    } else {
      return "Game";
    }
  };

  const getSubtitle = () => {
    if (params.type === "workout") {
      return formatFullDate(params.when);
    } else if (params.type === "practice") {
      return practice ? formatFullDate(practice.practiced_at) : formatFullDate(params.when);
    } else {
      return game ? formatFullDate(game.played_at) : formatFullDate(params.when);
    }
  };

  // For practice and game screens, show animated card background header
  if (params.type === "practice" || params.type === "game") {
    // Use data if available, otherwise use params for initial render
    const mode = (params.type === "practice" ? practice?.mode : game?.mode) || params.mode || "basketball";
    const cardBg = getPracticeCardBackground(mode);
    const itemTitle = params.type === "practice" 
      ? (practice?.title || "Practice")
      : (game?.title || "Game");
    const itemDate = params.type === "practice"
      ? (practice ? formatFullDate(practice.practiced_at) : formatFullDate(params.when))
      : (game ? formatFullDate(game.played_at) : formatFullDate(params.when));

    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg0 }}>
        {/* Animated Card Background Header - animates from card position to top */}
        <Animated.View style={[cardAnimatedStyle, { overflow: "hidden" }]}>
          {/* Layer 1: Base gradient background */}
          <LinearGradient
            colors={cardBg.gradientColors}
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
            {cardBg.images.map((img, idx) => {
              // Map style names to actual style objects
              const styleMap: Record<string, any> = {
                backgroundHoop: styles.backgroundHoop,
                backgroundBall1: styles.backgroundBall1,
                backgroundFootballField: styles.backgroundFootballField,
                backgroundFootball: styles.backgroundFootball,
                backgroundSoccerGoal: styles.backgroundSoccerGoal,
                backgroundTennisRacket: styles.backgroundTennisRacket,
                backgroundTennisBall: styles.backgroundTennisBall,
                backgroundHockeyNet: styles.backgroundHockeyNet,
                backgroundBaseballBat: styles.backgroundBaseballBat,
                backgroundBaseball: styles.backgroundBaseball,
                backgroundDumbbell: styles.backgroundDumbbell,
              };
              return (
                <Image
                  key={idx}
                  source={img.source}
                  style={styleMap[img.style] || {}}
                  resizeMode="cover"
                />
              );
            })}
            {/* Right-side fade mask for artwork */}
            <LinearGradient
              colors={["transparent", cardBg.fadeColor]}
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
          
          {/* Back button - positioned absolutely over the background */}
          <Pressable 
            onPress={() => router.back()} 
            hitSlop={10} 
            style={[styles.backBtn, { 
              position: "absolute",
              top: insets.top + 16,
              left: 16,
              zIndex: 1001,
            }]}
          >
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </Pressable>
          
          {/* Text Overlay - Bottom Left */}
          <View style={styles.logTextOverlay}>
            <View style={styles.logTextContainer}>
              <Text style={styles.logTitle}>{itemTitle}</Text>
              <Text style={styles.logSubtitle}>{itemDate}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Content - Slides up from bottom */}
        <Animated.View style={[styles.contentContainer, formAnimatedStyle]}>
          {loading ? (
            <View style={[styles.loadingContainer, { backgroundColor: theme.colors.bg0, paddingTop: 40 }]}>
              <Animated.View style={starAnimatedStyle}>
                <Image
                  source={require("../../../assets/star.png")}
                  style={styles.loadingStar}
                  resizeMode="contain"
                />
              </Animated.View>
            </View>
          ) : error ? (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 16, paddingTop: 40 }}>
              <Text style={{ color: "#EF4444", fontSize: 16 }}>{error}</Text>
            </View>
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.contentSection}
              keyboardShouldPersistTaps="handled"
            >
              {/* Practice: Drills and Notes */}
              {params.type === "practice" && practice && (
                <>
                  {practice.drill && (
                    <View style={styles.inputSection}>
                      <View style={styles.labelOverlay}>
                        <Text style={styles.labelText}>Drills</Text>
                      </View>
                      <View style={styles.textBox}>
                        <Text style={styles.textBoxText}>{practice.drill}</Text>
                      </View>
                    </View>
                  )}

                  {practice.notes && (
                    <View style={styles.inputSection}>
                      <View style={styles.labelOverlay}>
                        <Text style={styles.labelText}>Notes</Text>
                      </View>
                      <View style={styles.textBox}>
                        <Text style={styles.textBoxText}>{practice.notes}</Text>
                      </View>
                    </View>
                  )}
                </>
              )}

              {/* Game: Stats and Notes */}
              {params.type === "game" && game && (
                <>
                  {game.stats && (
                    <View style={styles.inputSection}>
                      <View style={styles.labelOverlay}>
                        <Text style={styles.labelText}>Stats</Text>
                      </View>
                      <View style={styles.textBox}>
                        <Text style={styles.textBoxText}>{formatStatsForDisplay(game.stats)}</Text>
                      </View>
                    </View>
                  )}

                  {game.notes && (
                    <View style={styles.inputSection}>
                      <View style={styles.labelOverlay}>
                        <Text style={styles.labelText}>Notes</Text>
                      </View>
                      <View style={styles.textBox}>
                        <Text style={styles.textBoxText}>{game.notes}</Text>
                      </View>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          )}
        </Animated.View>
      </View>
    );
  }

  // For workout and game screens, use original layout
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.color.bg,
        paddingTop: insets.top,
      }}
    >
      {/* Header row */}
      <View style={{ flexDirection: "row", alignItems: "center", padding: 16, gap: 8 }}>
        <Pressable
          onPress={() => {
            // If from creator workouts, go back to creator workouts screen (only if profile features enabled)
            if (params.fromCreator === "true" && PROFILE_FEATURES_ENABLED) {
              router.replace("/(tabs)/profile/creator-workouts");
            } else {
              router.back();
            }
          }}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={20} color={theme.color.text} />
        </Pressable>
        <View style={{ flex: 1 }} />
        {/* Copy button for creator workouts */}
        {params.fromCreator === "true" && workout && canCopy && (
          <Pressable
            onPress={handleCopy}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: theme.color.brand,
              marginLeft: 8,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>Copy</Text>
          </Pressable>
        )}
        {params.fromCreator === "true" && workout && !canCopy && copyError && (
          <View style={{ marginLeft: 8, maxWidth: 120 }}>
            <Text style={{ color: theme.color.dim, fontSize: 10 }}>{copyError}</Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={[styles.loadingContainer, { backgroundColor: theme.color.bg }]}>
          <Animated.View style={starAnimatedStyle}>
            <Image
              source={require("../../../assets/star.png")}
              style={styles.loadingStar}
              resizeMode="contain"
            />
          </Animated.View>
        </View>
      ) : error ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 16 }}>
          <Text style={{ color: "#EF4444", fontSize: 16 }}>{error}</Text>
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 100, gap: 16 }}
        >
          {(params.type === "workout" || (params.fromCreator === "true" && workout)) && workout && (
            <>
              {/* Centered Heading */}
              <View style={styles.headingSection}>
                <Text style={styles.workoutName}>{workout.name || getTitle()}</Text>
                <Text style={styles.workoutDate}>
                  {workout.performedAt ? formatFullDate(workout.performedAt) : getSubtitle()}
                </Text>
              </View>

              {/* Exercise Boxes */}
              {workout.exercises.map((exercise, idx) => (
                <ExerciseBox
                  key={exercise.id || idx}
                  exercise={exercise}
                  mode={workout.mode}
                  unitsWeight={unitsWeight}
                />
              ))}
            </>
          )}

        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  titleLine: {
    color: theme.color.text,
    fontSize: 22,
    fontWeight: "900",
  },
  subtitle: {
    color: theme.color.dim,
    fontSize: 14,
    marginTop: 4,
  },
  rule: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginHorizontal: 16,
    marginVertical: 8,
  },
  sportPill: {
    minWidth: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: "#fef08a",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e7e4b3",
  },
  // Centered heading styles
  headingSection: {
    alignItems: "center",
    marginBottom: 8,
  },
  workoutName: {
    fontSize: 32,
    fontWeight: "800",
    color: theme.color.text,
    marginBottom: 4,
    textAlign: "center",
  },
  workoutDate: {
    fontSize: 14,
    color: theme.color.dim,
    textAlign: "center",
  },
  // Exercise box styles (3D)
  exerciseBoxContainer: {
    marginBottom: 20,
  },
  exerciseBox: {
    backgroundColor: theme.color.bg,
    borderRadius: 16,
    borderWidth: 2,
    overflow: "hidden",
    position: "relative",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.4,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
      },
      android: {
        elevation: 10,
      },
    }),
  },
  exerciseBoxContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    position: "relative",
  },
  exerciseBoxLeft: {
    flex: 1,
    gap: 4,
  },
  exerciseBoxName: {
    color: theme.color.text,
    fontSize: 18,
    fontWeight: "700",
  },
  exerciseBoxSets: {
    color: theme.color.dim,
    fontSize: 14,
  },
  exerciseBoxRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 16,
  },
  exerciseBoxArrow: {
    // Arrow is now inline with icon
  },
  // Sets container (collapsible)
  setsContainer: {
    overflow: "visible",
    paddingTop: 8,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderRadius: 12,
    marginTop: 8,
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
    gap: 12,
    minHeight: 50,
  },
  setRowLabel: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 12,
    minWidth: 50,
  },
  setRowValue: {
    color: theme.color.text,
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
    lineHeight: 20,
  },
  // Legacy styles (kept for practice/game screens)
  exerciseName: {
    color: theme.color.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  setNumber: {
    color: theme.color.dim,
    fontSize: 14,
    fontWeight: "600",
    minWidth: 60,
  },
  setData: {
    flexDirection: "row",
    gap: 12,
    flex: 1,
    justifyContent: "flex-end",
  },
  setValue: {
    color: theme.color.text,
    fontSize: 14,
    fontWeight: "600",
  },
  sectionTitle: {
    color: theme.color.dim,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionValue: {
    color: theme.color.text,
    fontSize: 16,
    fontWeight: "600",
  },
  // Practice detail screen styles (matching add-practice screen)
  contentContainer: {
    flex: 1,
    backgroundColor: theme.colors.bg0,
    marginTop: IMAGE_HEIGHT,
  },
  backBtn: {
    // No box styling - matches onboarding screens
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
  contentSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 20,
  },
  inputSection: {
    position: "relative",
    marginTop: 12,
  },
  labelOverlay: {
    position: "absolute",
    top: -8,
    left: 16,
    zIndex: 10,
    backgroundColor: "#74C69D", // Middle green shade (mint green)
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  labelText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0B0E10", // Dark text on mint green
    letterSpacing: 0.3,
  },
  textBox: {
    fontSize: 16,
    color: theme.colors.textHi,
    backgroundColor: "#1A1F28", // Dark background that complements the screen
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: 24, // Extra top padding for label overlap
    minHeight: 120,
  },
  textBoxText: {
    fontSize: 16,
    color: theme.colors.textHi,
    lineHeight: 24,
  },
  // Card background images container
  cardBackgroundImages: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  // Background image styles (matching history cards)
  backgroundHoop: {
    position: "absolute",
    right: -30,
    top: -20,
    width: 240,
    height: 240,
    opacity: 0.35,
  },
  backgroundBall1: {
    position: "absolute",
    right: 128,
    bottom: 39,
    width: 86,
    height: 86,
    opacity: 0.30,
  },
  backgroundHockeyNet: {
    position: "absolute",
    right: -30,
    top: -30,
    width: 240,
    height: 240,
    opacity: 0.35,
  },
  backgroundFootballField: {
    position: "absolute",
    right: 76,
    top: 13,
    width: 152,
    height: 152,
    opacity: 0.45,
    transform: [{ scaleX: -1 }, { translateX: -76 }],
  },
  backgroundFootball: {
    position: "absolute",
    right: 134,
    bottom: 33,
    width: 62,
    height: 62,
    opacity: 0.30,
    transform: [{ scaleX: -1 }],
  },
  backgroundSoccerGoal: {
    position: "absolute",
    right: -30,
    top: -20,
    width: 240,
    height: 240,
    opacity: 0.35,
  },
  backgroundTennisRacket: {
    position: "absolute",
    right: -30,
    top: -20,
    width: 240,
    height: 240,
    opacity: 0.35,
  },
  backgroundTennisBall: {
    position: "absolute",
    right: 4,
    bottom: 39,
    width: 86,
    height: 86,
    opacity: 0.30,
  },
  backgroundBaseballBat: {
    position: "absolute",
    right: -14,
    top: 2,
    width: 192,
    height: 192,
    opacity: 0.35,
  },
  backgroundBaseball: {
    position: "absolute",
    right: 72,
    bottom: 39,
    width: 60,
    height: 60,
    opacity: 0.30,
  },
  backgroundDumbbell: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 208,
    height: 208,
    opacity: 0.30,
    transform: [{ translateX: -25 }, { translateY: -83 }],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingStar: {
    width: 150,
    height: 150,
  },
});
