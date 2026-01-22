// app/(tabs)/workouts.tsx
// Revamped Workouts tab: pro header + compact set layout + angled inputs + per-mode toolbars
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import Svg, { Path } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

import { useMode } from "../../providers/ModeContext";
import { theme } from "../../constants/theme";
import { router } from "expo-router";
import { saveCompleteWorkout, getWorkoutWithDetails } from "../../lib/api/workouts";
import { useAuth } from "../../providers/AuthProvider";
import { useSettings } from "../../providers/SettingsContext";
import { mapModeKeyToSportMode, mapItemKindToExerciseType } from "../../lib/types";
import { ErrorToast } from "../../components/ErrorToast";
import AsyncStorage from "@react-native-async-storage/async-storage";

/* ---------------- Fonts (match Home pages) ---------------- */
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

/* ---------------- Types ---------------- */
type ModeKey =
  | "lifting"
  | "basketball"
  | "football"
  | "baseball"
  | "soccer"
  | "hockey"
  | "tennis";

type ItemKind =
  | "exercise"
  // basketball
  | "bb_shot"
  // football
  | "fb_drill"
  | "fb_sprint"
  // soccer
  | "sc_drill"
  | "sc_shoot"
  // baseball
  | "bs_hit"
  | "bs_field"
  // hockey
  | "hk_drill"
  | "hk_shoot"
  // tennis
  | "tn_drill"
  | "tn_rally";

type SetRecord = Record<string, string>;
type AnyItem = { id: string; kind: ItemKind; name: string; sets: SetRecord[] };
type DraftTuple = readonly [AnyItem[], React.Dispatch<React.SetStateAction<AnyItem[]>>];

/* ---------------- Helpers ---------------- */
const uid = () => Math.random().toString(36).slice(2, 9);

// Helper to get weight label based on user's unit preference
const getWeightLabel = (): string => {
  try {
    // This will be set dynamically in the component
    return "Weight (lb)"; // Default, will be overridden
  } catch {
    return "Weight (lb)";
  }
};

/** Field templates per kind (order = vertical stacking) */
const FIELD_SETS: Record<ItemKind, { key: string; label: string; numeric?: boolean }[]> = {
  // Shared
  exercise: [
    { key: "reps", label: "Reps", numeric: true },
    { key: "weight", label: "Weight", numeric: true }, // Will be set dynamically
  ],
  // Basketball
  bb_shot: [
    { key: "attempted", label: "Attempted", numeric: true },
    { key: "made", label: "Made", numeric: true },
  ],
  // Football
  fb_drill: [
    { key: "reps", label: "Reps", numeric: true },
    { key: "completed", label: "Completed", numeric: true },
  ],
  fb_sprint: [
    { key: "reps", label: "Reps", numeric: true },
    { key: "distance", label: "Distance", numeric: false },
    { key: "avgTime", label: "Avg. Time", numeric: false },
  ],
  // Soccer
  sc_drill: [
    { key: "reps", label: "Reps", numeric: true },
    { key: "time", label: "Time", numeric: false },
  ],
  sc_shoot: [
    { key: "reps", label: "Reps", numeric: true },
    { key: "distance", label: "Distance", numeric: false },
  ],
  // Baseball
  bs_hit: [
    { key: "reps", label: "Reps", numeric: true },
    { key: "avgDistance", label: "Avg. Distance", numeric: true },
  ],
  bs_field: [
    { key: "reps", label: "Reps", numeric: true },
    { key: "distance", label: "Distance", numeric: false },
  ],
  // Hockey
  hk_drill: [
    { key: "reps", label: "Reps", numeric: true },
    { key: "time", label: "Time", numeric: false },
  ],
  hk_shoot: [
    { key: "reps", label: "Reps", numeric: true },
    { key: "distance", label: "Distance", numeric: false },
  ],
  // Tennis
  tn_drill: [
    { key: "reps", label: "Reps", numeric: true },
    { key: "time", label: "Time", numeric: false },
  ],
  tn_rally: [
    { key: "points", label: "Points", numeric: true },
    { key: "time", label: "Time", numeric: false },
  ],
};


/* ---------------- Fonts map ---------------- */
const FONT = {
  displayMed: "SpaceGrotesk_600SemiBold",
  displayBold: "SpaceGrotesk_700Bold", // Font 3
  uiRegular: "Geist_400Regular",
  uiMedium: "Geist_500Medium",
  uiSemi: "Geist_600SemiBold", // Font 2 (chips)
  uiBold: "Geist_700Bold",
  uiXBold: "Geist_800ExtraBold",
} as const;

/* ============================================================================
   Screen
============================================================================ */
export default function WorkoutsScreen() {
  const { mode, setMode } = useMode();
  const { unitsWeight } = useSettings();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ workoutId?: string }>();
  const m = (mode || "lifting").toLowerCase() as ModeKey;

  // Redirect to test auth if not signed in
  useEffect(() => {
    if (!user) {
      router.replace('/(tabs)/test-auth');
    }
  }, [user]);

  // Load fonts to match Home pages
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

  /* ---------- top meta ---------- */
  const [isCreating, setIsCreating] = useState(false);
  
  // Animation for Start Workout button
  const startWorkoutScale = useSharedValue(1);
  const startWorkoutAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: startWorkoutScale.value }],
  }));
  const [workoutName, setWorkoutName] = useState("");
  const [nameInputFocused, setNameInputFocused] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const nameInputRef = useRef<TextInput>(null);
  
  // Animation for name input focus
  const nameInputScale = useSharedValue(1);
  
  // Reset animation when button becomes visible again
  useEffect(() => {
    if (!isCreating) {
      startWorkoutScale.value = 1;
    }
  }, [isCreating]);

  // Animation values for empty state transition
  const nameInputTranslateY = useSharedValue(-100);
  const nameInputOpacity = useSharedValue(0);
  const actionButtonsTranslateY = useSharedValue(-100);
  const actionButtonsOpacity = useSharedValue(0);

  // Animated styles
  const nameInputAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: nameInputTranslateY.value },
      { scale: nameInputScale.value },
    ],
    opacity: nameInputOpacity.value,
  }));

  const nameInputPillAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: nameInputScale.value }],
  }));

  const actionButtonsAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: actionButtonsTranslateY.value }],
    opacity: actionButtonsOpacity.value,
  }));

  // Animate in when creating starts
  useEffect(() => {
    if (isCreating) {
      // Animate name input
      nameInputTranslateY.value = withSpring(0, { damping: 25, stiffness: 100 });
      nameInputOpacity.value = withTiming(1, { duration: 300 });
      
      // Animate action buttons with slight delay
      setTimeout(() => {
        actionButtonsTranslateY.value = withSpring(0, { damping: 25, stiffness: 100 });
        actionButtonsOpacity.value = withTiming(1, { duration: 300 });
      }, 100);
    } else {
      // Reset animations when not creating
      nameInputTranslateY.value = -100;
      nameInputOpacity.value = 0;
      actionButtonsTranslateY.value = -100;
      actionButtonsOpacity.value = 0;
    }
  }, [isCreating]);

  // Reset workout state when mode changes
  useEffect(() => {
    setIsCreating(false);
    setWorkoutName("");
    setList([]);
  }, [m]);

  // Load workout if workoutId is provided (e.g., from copying a creator workout)
  useEffect(() => {
    const loadWorkout = async () => {
      if (params.workoutId && user) {
        const { data: workout, error } = await getWorkoutWithDetails(params.workoutId);
        
        if (error || !workout) {
          console.error(`❌ [Workouts] Failed to load workout:`, error);
          Alert.alert("Error", "Failed to load copied workout");
          return;
        }
        
        // Map database mode to frontend mode
        const modeMapping: Record<string, ModeKey> = {
          'workout': 'lifting',
          'basketball': 'basketball',
          'football': 'football',
          'baseball': 'baseball',
          'soccer': 'soccer',
          'hockey': 'hockey',
          'tennis': 'tennis',
        };
        
        const frontendMode = modeMapping[workout.mode] || 'lifting';
        
        // Set the mode to match the workout
        setMode(frontendMode);
        
        // Set workout name (remove "(Copied)" suffix if present)
        const nameWithoutCopied = workout.name.replace(' (Copied)', '');
        setWorkoutName(nameWithoutCopied);
        
        // Convert workout exercises to the format expected by the workouts tab
        const convertedItems: AnyItem[] = workout.exercises.map((exercise) => {
          // Map exercise type to item kind
          const typeToKind: Record<string, ItemKind> = {
            'exercise': 'exercise',
            'shooting': 'bb_shot',
            'drill': 'fb_drill',
            'sprints': 'fb_sprint',
            'hitting': 'bs_hit',
            'fielding': 'bs_field',
            'rally': 'tn_rally',
          };
          
          const kind = typeToKind[exercise.type] || 'exercise';
          
          // Convert sets to SetRecord format
          const sets: SetRecord[] = exercise.sets.map((set) => {
            const setRecord: SetRecord = {};
            if (set.reps !== undefined) setRecord.reps = String(set.reps);
            if (set.weight !== undefined) setRecord.weight = String(set.weight);
            if (set.attempted !== undefined) setRecord.attempted = String(set.attempted);
            if (set.made !== undefined) setRecord.made = String(set.made);
            if (set.distance !== undefined) setRecord.distance = String(set.distance);
            if (set.timeMin !== undefined) setRecord.time = String(set.timeMin);
            if (set.avgTimeSec !== undefined) setRecord.avgTime = String(set.avgTimeSec);
            if (set.completed !== undefined) setRecord.completed = String(set.completed);
            if (set.points !== undefined) setRecord.points = String(set.points);
            return setRecord;
          });
          
          // If no sets, add one empty set
          if (sets.length === 0) {
            const empty: SetRecord = {};
            FIELD_SETS[kind].forEach((f) => (empty[f.key] = ""));
            sets.push(empty);
          }
          
          return {
            id: uid(),
            kind,
            name: exercise.name,
            sets,
          };
        });
        
        // Wait for mode to update, then set the exercises
        // Use a small delay to ensure the mode context has updated
        setTimeout(() => {
          // Get the correct draft setter based on the updated mode
          const currentMode = (mode || "lifting").toLowerCase() as ModeKey;
          const draftSetters: Record<ModeKey, React.Dispatch<React.SetStateAction<AnyItem[]>>> = {
            lifting: setLiftDraft,
            basketball: setBbDraft,
            football: setFbDraft,
            baseball: setBsDraft,
            soccer: setScDraft,
            hockey: setHkDraft,
            tennis: setTnDraft,
          };
          
          const setDraft = draftSetters[currentMode] || draftSetters[frontendMode];
          if (setDraft) {
            setDraft(convertedItems);
            
            // Start the workout
            setIsCreating(true);
          } else {
            console.error(`❌ [Workouts] No setter found for mode: ${currentMode}`);
          }
        }, 200);
      }
    };
    
    loadWorkout();
  }, [params.workoutId, user, mode, setMode]);

  /* ---------- per-mode drafts ---------- */
  const [liftDraft, setLiftDraft] = useState<AnyItem[]>([]);
  const [bbDraft, setBbDraft] = useState<AnyItem[]>([]);
  const [fbDraft, setFbDraft] = useState<AnyItem[]>([]);
  const [bsDraft, setBsDraft] = useState<AnyItem[]>([]);
  const [scDraft, setScDraft] = useState<AnyItem[]>([]);
  const [hkDraft, setHkDraft] = useState<AnyItem[]>([]);
  const [tnDraft, setTnDraft] = useState<AnyItem[]>([]);

  const drafts: Record<ModeKey, DraftTuple> = {
    lifting: [liftDraft, setLiftDraft],
    basketball: [bbDraft, setBbDraft],
    football: [fbDraft, setFbDraft],
    baseball: [bsDraft, setBsDraft],
    soccer: [scDraft, setScDraft],
    hockey: [hkDraft, setHkDraft],
    tennis: [tnDraft, setTnDraft],
  };

  const [list, setList] = drafts[m];

  // Persist workout state to AsyncStorage
  const WORKOUT_STORAGE_KEY = '@workout_draft';
  
  // Clear workout state function (called when workout is saved)
  const clearWorkoutState = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(WORKOUT_STORAGE_KEY);
      console.log('✅ [Workouts] Cleared workout state from AsyncStorage');
    } catch (error) {
      console.error('❌ [Workouts] Error clearing workout state:', error);
    }
  }, []);

  // Save workout state to AsyncStorage whenever it changes
  useEffect(() => {
    if (isCreating && user) {
      const saveWorkoutState = async () => {
        try {
          const stateToSave = {
            isCreating,
            workoutName,
            mode: m,
            drafts: {
              lifting: liftDraft,
              basketball: bbDraft,
              football: fbDraft,
              baseball: bsDraft,
              soccer: scDraft,
              hockey: hkDraft,
              tennis: tnDraft,
            },
          };
          await AsyncStorage.setItem(WORKOUT_STORAGE_KEY, JSON.stringify(stateToSave));
          console.log('✅ [Workouts] Saved workout state to AsyncStorage');
        } catch (error) {
          console.error('❌ [Workouts] Error saving workout state:', error);
        }
      };
      saveWorkoutState();
    }
  }, [isCreating, workoutName, m, liftDraft, bbDraft, fbDraft, bsDraft, scDraft, hkDraft, tnDraft, user]);

  // Load workout state from AsyncStorage on mount (only if not loading from params)
  useEffect(() => {
    if (!params.workoutId && user) {
      const loadWorkoutState = async () => {
        try {
          const savedState = await AsyncStorage.getItem(WORKOUT_STORAGE_KEY);
          if (savedState) {
            const state = JSON.parse(savedState);
            
            // Only restore if we're in the same mode
            if (state.mode === m && state.isCreating) {
              setIsCreating(state.isCreating);
              setWorkoutName(state.workoutName || "");
              
              // Restore the draft for the current mode
              const draftSetters: Record<ModeKey, React.Dispatch<React.SetStateAction<AnyItem[]>>> = {
                lifting: setLiftDraft,
                basketball: setBbDraft,
                football: setFbDraft,
                baseball: setBsDraft,
                soccer: setScDraft,
                hockey: setHkDraft,
                tennis: setTnDraft,
              };
              
              const setDraft = draftSetters[m];
              if (setDraft && state.drafts && state.drafts[m]) {
                setDraft(state.drafts[m]);
                console.log('✅ [Workouts] Restored workout state from AsyncStorage');
              }
            }
          } else {
            // No saved state - reset to "Start Workout" screen
            setIsCreating(false);
            setWorkoutName("");
            // Clear all drafts
            setLiftDraft([]);
            setBbDraft([]);
            setFbDraft([]);
            setBsDraft([]);
            setScDraft([]);
            setHkDraft([]);
            setTnDraft([]);
          }
        } catch (error) {
          console.error('❌ [Workouts] Error loading workout state:', error);
        }
      };
      loadWorkoutState();
    }
  }, [params.workoutId, user, m]); // Only run on mount or when mode changes

  // Check AsyncStorage when screen comes into focus - reset if workout was saved
  useFocusEffect(
    useCallback(() => {
      if (!params.workoutId && user) {
        const checkAndReset = async () => {
          try {
            const savedState = await AsyncStorage.getItem(WORKOUT_STORAGE_KEY);
            // If no saved state exists (workout was saved and cleared), reset local state
            if (!savedState && isCreating) {
              setIsCreating(false);
              setWorkoutName("");
              // Clear all drafts
              setLiftDraft([]);
              setBbDraft([]);
              setFbDraft([]);
              setBsDraft([]);
              setScDraft([]);
              setHkDraft([]);
              setTnDraft([]);
              console.log('✅ [Workouts] Reset workout state - workout was saved');
            }
          } catch (error) {
            console.error('❌ [Workouts] Error checking workout state:', error);
          }
        };
        checkAndReset();
      }
    }, [params.workoutId, user, isCreating])
  );

  // Load workout if workoutId is provided (e.g., from copying a creator workout)
  useEffect(() => {
    const loadWorkout = async () => {
      if (params.workoutId && user) {
        const { data: workout, error } = await getWorkoutWithDetails(params.workoutId);
        
        if (error || !workout) {
          console.error(`❌ [Workouts] Failed to load workout:`, error);
          Alert.alert("Error", "Failed to load copied workout");
          return;
        }
        
        // Map database mode to frontend mode
        const modeMapping: Record<string, ModeKey> = {
          'workout': 'lifting',
          'basketball': 'basketball',
          'football': 'football',
          'baseball': 'baseball',
          'soccer': 'soccer',
          'hockey': 'hockey',
          'tennis': 'tennis',
        };
        
        const frontendMode = modeMapping[workout.mode] || 'lifting';
        
        // Set the mode to match the workout
        setMode(frontendMode);
        
        // Set workout name (remove "(Copied)" suffix if present)
        const nameWithoutCopied = workout.name.replace(' (Copied)', '');
        setWorkoutName(nameWithoutCopied);
        
        // Convert workout exercises to the format expected by the workouts tab
        const convertedItems: AnyItem[] = workout.exercises.map((exercise) => {
          // Map exercise type to item kind
          const typeToKind: Record<string, ItemKind> = {
            'exercise': 'exercise',
            'shooting': 'bb_shot',
            'drill': 'fb_drill',
            'sprints': 'fb_sprint',
            'hitting': 'bs_hit',
            'fielding': 'bs_field',
            'rally': 'tn_rally',
          };
          
          const kind = typeToKind[exercise.type] || 'exercise';
          
          // Convert sets to SetRecord format
          const sets: SetRecord[] = exercise.sets.map((set) => {
            const setRecord: SetRecord = {};
            if (set.reps !== undefined) setRecord.reps = String(set.reps);
            if (set.weight !== undefined) setRecord.weight = String(set.weight);
            if (set.attempted !== undefined) setRecord.attempted = String(set.attempted);
            if (set.made !== undefined) setRecord.made = String(set.made);
            if (set.distance !== undefined) setRecord.distance = String(set.distance);
            if (set.timeMin !== undefined) setRecord.time = String(set.timeMin);
            if (set.avgTimeSec !== undefined) setRecord.avgTime = String(set.avgTimeSec);
            if (set.completed !== undefined) setRecord.completed = String(set.completed);
            if (set.points !== undefined) setRecord.points = String(set.points);
            return setRecord;
          });
          
          // If no sets, add one empty set
          if (sets.length === 0) {
            const empty: SetRecord = {};
            FIELD_SETS[kind].forEach((f) => (empty[f.key] = ""));
            sets.push(empty);
          }
          
          return {
            id: uid(),
            kind,
            name: exercise.name,
            sets,
          };
        });
        
        // Wait a bit for mode to update, then set the exercises
        setTimeout(() => {
          // Get the correct draft setter based on the frontend mode
          const draftSetters: Record<ModeKey, React.Dispatch<React.SetStateAction<AnyItem[]>>> = {
            lifting: setLiftDraft,
            basketball: setBbDraft,
            football: setFbDraft,
            baseball: setBsDraft,
            soccer: setScDraft,
            hockey: setHkDraft,
            tennis: setTnDraft,
          };
          
          const setDraft = draftSetters[frontendMode];
          if (setDraft) {
            setDraft(convertedItems);
            
            // Start the workout
            setIsCreating(true);
          } else {
            console.error(`❌ [Workouts] No setter found for mode: ${frontendMode}`);
          }
        }, 300);
      }
    };
    
    loadWorkout();
  }, [params.workoutId, user, setMode, setLiftDraft, setBbDraft, setFbDraft, setBsDraft, setScDraft, setHkDraft, setTnDraft]);

  /* ---------- actions ---------- */
  const addItem = (kind: ItemKind) => {
    const empty: SetRecord = {};
    FIELD_SETS[kind].forEach((f) => (empty[f.key] = ""));
    setList((cur) => [...cur, { id: uid(), kind, name: "", sets: [{ ...empty }] }]);
  };

  const updateName = (id: string, name: string) =>
    setList((cur) => cur.map((x) => (x.id === id ? { ...x, name } : x)));

  const removeItem = (id: string) => setList((cur) => cur.filter((x) => x.id !== id));

  const addSet = (id: string) => {
    const item = list.find((x) => x.id === id);
    if (!item) return;
    const empty: SetRecord = {};
    FIELD_SETS[item.kind].forEach((f) => (empty[f.key] = ""));
    setList((cur) => cur.map((x) => (x.id === id ? { ...x, sets: [...x.sets, { ...empty }] } : x)));
  };

  const updateSet = (id: string, index: number, key: string, value: string) => {
    setList((cur) =>
      cur.map((x) =>
        x.id !== id
          ? x
          : { ...x, sets: x.sets.map((s, i) => (i === index ? { ...s, [key]: value } : s)) }
      )
    );
  };

  const [saving, setSaving] = useState(false);

  const saveWorkout = async () => {
    if (!workoutName.trim()) {
      setErrorMessage("Please give your workout a name.");
      setShowError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (list.length === 0) {
      setErrorMessage("Add at least one exercise first.");
      setShowError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    
    // Check if all exercises have names
    const unnamedExercises = list.filter(item => !item.name || !item.name.trim());
    if (unnamedExercises.length > 0) {
      setErrorMessage("Please name all exercises.");
      setShowError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    // Don't save to database yet - just pass data to summary screen
    // Workout will be saved when user clicks "Finish Workout"
    // Format date using local date to avoid timezone issues
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const performedAtDate = `${year}-${month}-${day}`;

    const workoutData = {
      mode: m,
      name: workoutName.trim(),
      performedAt: performedAtDate,
      items: list.map(item => ({
        kind: item.kind,
        name: item.name,
        sets: item.sets,
      })),
    };

    // Encode workout data as JSON string for navigation params
    const workoutDataJson = encodeURIComponent(JSON.stringify(workoutData));
    
    router.push({
      pathname: "/(tabs)/workout-summary",
      params: { workoutData: workoutDataJson },
    });
  };

  /* ---------- sport icon (right pill) ---------- */
  const RightIcon = () => {
    const iconProps = { size: 18, color: theme.colors.textHi } as const;
    const inner = (() => {
      switch (m) {
        case "lifting":
          return <Ionicons name="barbell-outline" {...iconProps} />;
        case "basketball":
          return <Ionicons name="basketball-outline" {...iconProps} />;
        case "football":
          return <Ionicons name="american-football-outline" {...iconProps} />;
        case "soccer":
          return <Ionicons name="football-outline" {...iconProps} />;
        case "baseball":
          return <Ionicons name="baseball-outline" {...iconProps} />;
        case "hockey":
          return <MaterialCommunityIcons name="hockey-sticks" size={18} color={theme.colors.textHi} />;
        case "tennis":
          return <MaterialCommunityIcons name="tennis" size={18} color={theme.colors.textHi} />;
        default:
          return <Ionicons name="barbell-outline" {...iconProps} />;
      }
    })();
    return (
      <View style={styles.iconPill}>
        {inner}
      </View>
    );
  };

  /* ---------- toolbar (name + "green boxes") ---------- */
  const Toolbar = () => {

    if (!isCreating) {
      return (
        <Pressable
          onPress={() => {
            setIsCreating(true);
            setWorkoutName("");
          }}
          style={styles.addWorkoutBtn}
        >
          <Text style={[styles.addWorkoutText, { fontFamily: FONT.displayBold }]}>+ Add Workout</Text>
        </Pressable>
      );
    }

    const Button = ({ label, onPress, flex = 1 }: { label: string; onPress: () => void; flex?: number }) => (
      <Pressable onPress={onPress} style={[styles.topBtn, { flex }]}>
        <Text style={[styles.topBtnText, { fontFamily: FONT.uiSemi }]} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    );

    // first row: workout name full width - will be rendered outside Toolbar
    const nameRow = null;

    // second row: per-mode green boxes
    const rowBtns: React.ReactNode[] = [];
    if (m === "lifting") {
      rowBtns.push(<Button key="+ex" label="+ Exercise" onPress={() => addItem("exercise")} />);
    } else if (m === "basketball") {
      rowBtns.push(<Button key="+ex" label="+ Exercise" onPress={() => addItem("exercise")} />);
      rowBtns.push(<Button key="+shot" label="+ Shooting" onPress={() => addItem("bb_shot")} />);
      rowBtns.push(<Button key="+drill" label="+ Drill" onPress={() => addItem("sc_drill")} />);
    } else if (m === "football") {
      rowBtns.push(<Button key="+ex" label="+ Exercise" onPress={() => addItem("exercise")} />);
      rowBtns.push(<Button key="+drill" label="+ Drill" onPress={() => addItem("fb_drill")} />);
      rowBtns.push(<Button key="+spr" label="+ Sprints" onPress={() => addItem("fb_sprint")} />);
    } else if (m === "soccer") {
      rowBtns.push(<Button key="+ex" label="+ Exercise" onPress={() => addItem("exercise")} />);
      rowBtns.push(<Button key="+drill" label="+ Drill" onPress={() => addItem("sc_drill")} />);
      rowBtns.push(<Button key="+shoot" label="+ Shooting" onPress={() => addItem("sc_shoot")} />);
    } else if (m === "baseball") {
      rowBtns.push(<Button key="+ex" label="+ Exercise" onPress={() => addItem("exercise")} />);
      rowBtns.push(<Button key="+hit" label="+ Hitting" onPress={() => addItem("bs_hit")} />);
      rowBtns.push(<Button key="+field" label="+ Fielding" onPress={() => addItem("bs_field")} />);
    } else if (m === "hockey") {
      rowBtns.push(<Button key="+ex" label="+ Exercise" onPress={() => addItem("exercise")} />);
      rowBtns.push(<Button key="+drill" label="+ Drill" onPress={() => addItem("hk_drill")} />);
      rowBtns.push(<Button key="+shoot" label="+ Shooting" onPress={() => addItem("hk_shoot")} />);
    } else if (m === "tennis") {
      rowBtns.push(<Button key="+ex" label="+ Exercise" onPress={() => addItem("exercise")} />);
      rowBtns.push(<Button key="+drill" label="+ Drill" onPress={() => addItem("tn_drill")} />);
      rowBtns.push(<Button key="+rally" label="+ Rally" onPress={() => addItem("tn_rally")} />);
    }

    // Don't render nameRow here - it's rendered outside Toolbar
    return (
      <View style={[styles.row, { marginTop: 8 }]}>{rowBtns}</View>
    );
  };

  if (!fontsReady) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg0, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: "padding", android: undefined })}
      style={{ flex: 1 }}
    >
      <ErrorToast
        message={errorMessage}
        visible={showError}
        onHide={() => setShowError(false)}
      />
      {/* Layer A: Base gradient */}
      <LinearGradient
        colors={["#0B1513", "#0F2A22", "#0F3B2E", "#070B0A"]}
        locations={[0, 0.3, 0.6, 1]}
        style={{ flex: 1, position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      
      {/* Layer B: Vignette overlay */}
      <LinearGradient
        colors={["rgba(0,0,0,0.4)", "transparent", "transparent", "rgba(0,0,0,0.5)"]}
        locations={[0, 0.15, 0.85, 1]}
        style={{ flex: 1, position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        pointerEvents="none"
      />
      
      {/* Layer C: Subtle grain/noise (simulated with opacity) */}
      <View
        style={{
          flex: 1,
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(255,255,255,0.02)",
          opacity: 0.06,
        }}
        pointerEvents="none"
      />
      
      <View style={{ flex: 1 }}>
        {/* Header with blur/haze backdrop */}
        <BlurView intensity={20} tint="dark" style={styles.headerBlur}>
          <View style={styles.headerContainer}>
            {/* Workout name input - floating pill with animation */}
            {isCreating && (
              <Animated.View style={[styles.nameInputContainer, nameInputAnimatedStyle]}>
                <Animated.View style={[styles.nameInputPill, nameInputPillAnimatedStyle]}>
                  <Ionicons name="create-outline" size={18} color="rgba(255,255,255,0.6)" style={{ marginRight: 8 }} />
                  <TextInput
                    ref={nameInputRef}
                    value={workoutName}
                    onChangeText={(text) => {
                      setWorkoutName(text);
                    }}
                    placeholder="Workout name…"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    style={styles.nameInputText}
                    autoCorrect={false}
                    autoCapitalize="words"
                    keyboardType="default"
                    returnKeyType="done"
                    blurOnSubmit={false}
                    onSubmitEditing={() => {}}
                    editable={true}
                    onFocus={() => {
                      setNameInputFocused(true);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      nameInputScale.value = withTiming(1.02, { duration: 250 });
                    }}
                    onBlur={() => {
                      setNameInputFocused(false);
                      nameInputScale.value = withTiming(1, { duration: 250 });
                    }}
                  />
                </Animated.View>
              </Animated.View>
            )}
          </View>
        </BlurView>

        {/* Revolut-style action buttons with labels - animated */}
        {isCreating && (
          <Animated.View style={[styles.actionRow, actionButtonsAnimatedStyle]}>
              {/* Exercise button */}
              <ActionButton
                icon={<MaterialCommunityIcons name="dumbbell" size={20} color="#FFFFFF" />}
                label="Exercise"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  addItem("exercise");
                }}
              />

              {/* Mode-specific buttons */}
              {m === "basketball" && (
                <>
                  <ActionButton
                    icon={<MaterialCommunityIcons name="target" size={20} color="#FFFFFF" />}
                    label="Shooting"
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      addItem("bb_shot");
                    }}
                  />
                  <ActionButton
                    icon={<Ionicons name="time-outline" size={20} color="#FFFFFF" />}
                    label="Drill"
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      addItem("sc_drill");
                    }}
                  />
                </>
              )}
              
              {m === "football" && (
                <>
                  <ActionButton
                    icon={<Ionicons name="time-outline" size={20} color="#FFFFFF" />}
                    label="Drill"
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      addItem("fb_drill");
                    }}
                  />
                  <ActionButton
                    icon={<MaterialCommunityIcons name="run-fast" size={20} color="#FFFFFF" />}
                    label="Sprints"
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      addItem("fb_sprint");
                    }}
                  />
                </>
              )}

              {m === "soccer" && (
                <>
                  <ActionButton
                    icon={<Ionicons name="time-outline" size={20} color="#FFFFFF" />}
                    label="Drill"
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      addItem("sc_drill");
                    }}
                  />
                  <ActionButton
                    icon={<MaterialCommunityIcons name="target" size={20} color="#FFFFFF" />}
                    label="Shooting"
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      addItem("sc_shoot");
                    }}
                  />
                </>
              )}

              {m === "baseball" && (
                <>
                  <ActionButton
                    icon={<MaterialCommunityIcons name="baseball-bat" size={20} color="#FFFFFF" />}
                    label="Hitting"
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      addItem("bs_hit");
                    }}
                  />
                  <ActionButton
                    icon={<MaterialCommunityIcons name="baseball" size={20} color="#FFFFFF" />}
                    label="Fielding"
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      addItem("bs_field");
                    }}
                  />
                </>
              )}

              {m === "hockey" && (
                <>
                  <ActionButton
                    icon={<Ionicons name="time-outline" size={20} color="#FFFFFF" />}
                    label="Drill"
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      addItem("hk_drill");
                    }}
                  />
                  <ActionButton
                    icon={<MaterialCommunityIcons name="target" size={20} color="#FFFFFF" />}
                    label="Shooting"
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      addItem("hk_shoot");
                    }}
                  />
                </>
              )}

              {m === "tennis" && (
                <>
                  <ActionButton
                    icon={<Ionicons name="time-outline" size={20} color="#FFFFFF" />}
                    label="Drill"
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      addItem("tn_drill");
                    }}
                  />
                  <ActionButton
                    icon={<MaterialCommunityIcons name="grid" size={20} color="#FFFFFF" />}
                    label="Rally"
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      addItem("tn_rally");
                    }}
                  />
                </>
              )}

              {/* Finish Workout button */}
              <ActionButton
                icon={<MaterialCommunityIcons name="hexagon" size={20} color="#FFFFFF" />}
                label="Finish"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  saveWorkout();
                }}
                variant="finish"
                disabled={saving}
              />
          </Animated.View>
        )}

        {/* Empty state with circles and hero button */}
        {!isCreating && (
          <View style={styles.emptyStateContainer}>
            {/* Mascot star */}
            <View style={styles.mascotCircles}>
              <Image 
                source={require("../../assets/star.png")} 
                style={styles.starImage}
                resizeMode="contain"
              />
            </View>
            
            {/* Hero button */}
            <AnimatedPressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                // Reset scale before state change to ensure animation works next time
                startWorkoutScale.value = 1;
                setIsCreating(true);
                setWorkoutName("");
              }}
              onPressIn={() => {
                startWorkoutScale.value = withSpring(0.88, { damping: 8, stiffness: 100 });
              }}
              onPressOut={() => {
                startWorkoutScale.value = withSpring(1, { damping: 8, stiffness: 100 });
              }}
              style={[styles.startWorkoutButton, startWorkoutAnimatedStyle]}
            >
              <LinearGradient
                colors={[theme.colors.primary600, theme.colors.primary500]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.startWorkoutGradient}
              >
                <Text style={styles.startWorkoutText}>Start Workout</Text>
              </LinearGradient>
            </AnimatedPressable>
          </View>
        )}

        {/* BODY - Exercise cards */}
        {isCreating && (
          <ScrollView
            style={{ flex: 1, marginTop: 20 }}
            contentContainerStyle={{
              paddingHorizontal: theme.layout.xl,
              paddingTop: 20,
              paddingBottom: 120,
              gap: 16,
            }}
            keyboardShouldPersistTaps="handled"
          >
            {list.map((item) => (
              <FullWidthCard
                key={item.id}
                item={item}
                onRemove={() => removeItem(item.id)}
                onName={(v) => updateName(item.id, v)}
                onAddSet={() => addSet(item.id)}
                onChange={(setIdx, key, v) => updateSet(item.id, setIdx, key, v)}
              />
            ))}
          </ScrollView>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

/* ================= Action Button Component ================= */
function ActionButton({
  icon,
  label,
  onPress,
  variant = "default",
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  variant?: "default" | "finish";
  disabled?: boolean;
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
    opacity.value = withTiming(0.8, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    opacity.value = withTiming(1, { duration: 100 });
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={{ alignItems: "center", gap: 6 }}
    >
      <Animated.View
        style={[
          styles.actionButton,
          variant === "finish" && styles.actionButtonFinish,
          animatedStyle,
        ]}
      >
        {disabled ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          icon
        )}
      </Animated.View>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

/* ================= Card (square) ================= */
function FullWidthCard({
  item,
  onRemove,
  onName,
  onAddSet,
  onChange,
}: {
  item: AnyItem;
  onRemove: () => void;
  onName: (v: string) => void;
  onAddSet: () => void;
  onChange: (setIdx: number, key: string, value: string) => void;
}) {
  const { unitsWeight } = useSettings();
  const [editingSetIndex, setEditingSetIndex] = useState<number | null>(null);
  
  const fields = FIELD_SETS[item.kind].map(f => {
    // Update weight label based on user preference
    if (f.key === 'weight') {
      return { ...f, label: `Weight (${unitsWeight === 'kg' ? 'kg' : 'lb'})` };
    }
    return f;
  });

  // Get the type label (Exercise, Shooting, Drill, Sprints, Hitting, Fielding, Rally)
  const getTypeLabel = (kind: ItemKind): string => {
    if (kind === "exercise") return "Exercise";
    if (kind === "bb_shot" || kind === "sc_shoot" || kind === "hk_shoot") return "Shooting";
    if (kind === "fb_sprint") return "Sprints";
    if (kind === "bs_hit") return "Hitting";
    if (kind === "bs_field") return "Fielding";
    if (kind === "tn_rally") return "Rally";
    if (kind.endsWith("_drill")) return "Drill";
    return "Exercise";
  };

  const typeLabel = getTypeLabel(item.kind);

  // Get gradient colors based on exercise type
  const getHeaderGradientColors = (kind: ItemKind): string[] => {
    if (kind === "exercise") {
      // Blue for exercises
      return ["rgba(90, 166, 255, 0.3)", "rgba(90, 166, 255, 0.1)", "transparent"];
    } else if (kind === "bb_shot" || kind === "sc_shoot" || kind === "hk_shoot") {
      // Light green for shooting
      return ["rgba(100, 200, 120, 0.3)", "rgba(100, 200, 120, 0.1)", "transparent"];
    } else if (kind === "fb_sprint" || kind === "bs_field" || kind === "tn_rally") {
      // Green for sprints, fielding, and rally
      return ["rgba(100, 200, 120, 0.3)", "rgba(100, 200, 120, 0.1)", "transparent"];
    } else if (kind === "bs_hit") {
      // Purple for hitting
      return ["rgba(180, 140, 255, 0.3)", "rgba(180, 140, 255, 0.1)", "transparent"];
    } else {
      // Light purple for drills
      return ["rgba(180, 140, 255, 0.3)", "rgba(180, 140, 255, 0.1)", "transparent"];
    }
  };

  const headerGradientColors = getHeaderGradientColors(item.kind);

  // Format set display value
  const formatSetDisplay = (set: SetRecord): string => {
    const parts: string[] = [];
    fields.forEach(f => {
      const value = set[f.key];
      if (value && value.trim()) {
        parts.push(`${f.label}: ${value}`);
      }
    });
    return parts.length > 0 ? parts.join(" • ") : "Tap to add";
  };

  const cardScale = useSharedValue(1);
  const cardOpacity = useSharedValue(0);

  useEffect(() => {
    cardOpacity.value = withTiming(1, { duration: 200 });
    cardScale.value = withSpring(1, { damping: 20, stiffness: 100 });
  }, []);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: (1 - cardScale.value) * 6 }, { scale: cardScale.value }],
  }));

  return (
    <>
      <Animated.View style={[styles.card, cardAnimatedStyle]}>
        {/* Top strip header with gradient accent */}
        <LinearGradient
          colors={headerGradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.cardHeaderStrip}
        >
          <View style={styles.cardHeaderContent}>
            <TextInput
              value={item.name}
              onChangeText={onName}
              placeholder={typeLabel}
              placeholderTextColor="rgba(255, 255, 255, 0.6)"
              style={styles.cardHeaderText}
            />
          </View>
          <View style={styles.cardHeaderActions}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onAddSet();
              }}
              style={styles.cardActionButton}
              hitSlop={8}
            >
              <Ionicons name="add" size={18} color="rgba(255, 255, 255, 0.9)" />
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onRemove();
              }}
              style={styles.cardActionButton}
              hitSlop={8}
            >
              <Ionicons name="close" size={18} color="rgba(255, 255, 255, 0.9)" />
            </Pressable>
          </View>
        </LinearGradient>

        {/* Sets list - rows */}
        <View style={styles.setsListContainer}>
          {item.sets.map((s, idx) => (
            <Pressable
              key={idx}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setEditingSetIndex(idx);
              }}
              style={({ pressed }) => [
                styles.setRow,
                pressed && { opacity: 0.7 },
              ]}
            >
              <View style={styles.setRowContent}>
                <Text style={styles.setRowLabel}>Set {idx + 1}</Text>
                <Text style={styles.setRowValue}>{formatSetDisplay(s)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.4)" />
            </Pressable>
          ))}
        </View>
      </Animated.View>

      {/* Bottom sheet for editing set */}
      {editingSetIndex !== null && (
        <SetEditorBottomSheet
          set={item.sets[editingSetIndex]}
          fields={fields}
          onSave={(updatedSet) => {
            fields.forEach(f => {
              onChange(editingSetIndex, f.key, updatedSet[f.key] || "");
            });
            setEditingSetIndex(null);
          }}
          onClose={() => setEditingSetIndex(null)}
        />
      )}
    </>
  );
}

/* ================= Set Editor Bottom Sheet ================= */
function SetEditorBottomSheet({
  set,
  fields,
  onSave,
  onClose,
}: {
  set: SetRecord;
  fields: { key: string; label: string; numeric?: boolean }[];
  onSave: (updatedSet: SetRecord) => void;
  onClose: () => void;
}) {
  const [localSet, setLocalSet] = useState<SetRecord>({ ...set });
  const insets = useSafeAreaInsets();
  const sheetY = useSharedValue(600);

  useEffect(() => {
    sheetY.value = withSpring(0, { damping: 25, stiffness: 100 });
  }, []);

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }],
  }));

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    sheetY.value = withTiming(600, { duration: 200 }, (finished) => {
      if (finished) {
        runOnJS(onSave)(localSet);
      }
    });
  };

  const handleClose = () => {
    sheetY.value = withTiming(600, { duration: 200 }, (finished) => {
      if (finished) {
        runOnJS(onClose)();
      }
    });
  };

  return (
    <Modal visible={true} transparent animationType="none" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.bottomSheetOverlay}>
          <Pressable style={styles.bottomSheetBackdrop} onPress={handleClose} />
          <Animated.View style={[styles.bottomSheet, sheetAnimatedStyle]}>
            <View style={styles.bottomSheetHandle} />
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>Edit Set</Text>
              <Pressable onPress={handleClose}>
                <Ionicons name="close" size={24} color={theme.colors.textHi} />
              </Pressable>
            </View>
            
            <ScrollView
              style={styles.bottomSheetScrollView}
              contentContainerStyle={styles.bottomSheetContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              {fields.length > 0 ? (
                fields.map((f) => (
                  <View key={f.key} style={styles.bottomSheetField}>
                    <Text style={styles.bottomSheetFieldLabel}>{f.label}</Text>
                    <TextInput
                      value={localSet[f.key] ?? ""}
                      onChangeText={(t) => {
                        setLocalSet({ ...localSet, [f.key]: f.numeric ? t.replace(/[^\d.]/g, "") : t });
                      }}
                      placeholder={`Enter ${f.label.toLowerCase()}`}
                      placeholderTextColor={theme.colors.textLo}
                      keyboardType={f.numeric ? "numeric" : "default"}
                      style={styles.bottomSheetInput}
                    />
                  </View>
                ))
              ) : (
                <Text style={{ color: theme.colors.textLo, textAlign: "center", padding: 20 }}>
                  No fields available
                </Text>
              )}
            </ScrollView>

            <View style={[styles.bottomSheetFooter, { paddingBottom: insets.bottom }]}>
              <Pressable onPress={handleSave} style={styles.bottomSheetSaveButton}>
                <Text style={styles.bottomSheetSaveText}>Save</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ============================================================================
   Styles
============================================================================ */
const styles = StyleSheet.create({
  /* Header with blur */
  headerBlur: {
    paddingTop: 30,
    paddingBottom: 16,
  },
  headerContainer: {
    paddingHorizontal: theme.layout.xl,
  },
  header: {
    color: theme.colors.textHi,
    fontSize: 32,
    letterSpacing: -0.5,
    fontFamily: "SpaceGrotesk_700Bold",
    fontWeight: "700",
  },
  iconPill: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.10)",
    borderWidth: 0.5,
    borderColor: "rgba(255, 255, 255, 0.10)",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 4,
      },
    }),
  },

  /* Workout name input - floating pill */
  nameInputPill: {
    flexDirection: "row",
    alignItems: "center",
    height: 50,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.10)",
    borderWidth: 0.5,
    borderColor: "rgba(255, 255, 255, 0.10)",
    paddingHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
      },
      android: {
        elevation: 10,
      },
    }),
  },
  nameInputText: {
    flex: 1,
    color: theme.colors.textHi,
    fontSize: 15,
    fontFamily: "Geist_500Medium",
  },

  /* Action buttons row */
  actionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 20,
    marginTop: 24,
    marginBottom: 20,
    paddingHorizontal: theme.layout.xl,
  },
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.10)",
    borderWidth: 0.5,
    borderColor: "rgba(255, 255, 255, 0.10)",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 6,
      },
    }),
  },
  actionButtonFinish: {
    backgroundColor: "rgba(255, 90, 90, 0.25)",
    borderColor: "rgba(255, 90, 90, 0.3)",
  },
  actionLabel: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    fontFamily: "Geist_500Medium",
    marginTop: 4,
    textAlign: "center",
  },

  /* Empty state */
  emptyStateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.layout.xl,
    paddingTop: 60,
  },
  mascotCircles: {
    width: 262,
    height: 262,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginBottom: -32,
    marginTop: -176,
  },
  starImage: {
    width: 262,
    height: 262,
  },
  startWorkoutButton: {
    borderRadius: 20,
    overflow: "hidden",
    marginTop: -4,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary600,
        shadowOpacity: 0.4,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
      },
      android: {
        elevation: 12,
      },
    }),
  },
  startWorkoutButtonPressed: {
    opacity: 0.9,
  },
  startWorkoutGradient: {
    paddingVertical: 18,
    paddingHorizontal: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  startWorkoutText: {
    color: "#052d1b",
    fontSize: 18,
    fontFamily: "Geist_700Bold",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  nameInputContainer: {
    marginTop: 26,
  },

  /* Card - glass surface */
  card: {
    backgroundColor: "rgba(10, 14, 16, 0.55)",
    borderRadius: 24,
    borderWidth: 0.5,
    borderColor: "rgba(255, 255, 255, 0.10)",
    overflow: "hidden",
    width: "100%",
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
      },
      android: {
        elevation: 8,
      },
    }),
  },
  
  /* Card header strip with gradient */
  cardHeaderStrip: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardHeaderContent: {
    flex: 1,
  },
  cardHeaderText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Geist_700Bold",
  },
  cardHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardActionButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Sets list */
  setsListContainer: {
    padding: 16,
    gap: 0,
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  setRowContent: {
    flex: 1,
    gap: 4,
  },
  setRowLabel: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 12,
    fontFamily: "Geist_500Medium",
  },
  setRowValue: {
    color: theme.colors.textHi,
    fontSize: 15,
    fontFamily: "Geist_600SemiBold",
  },

  /* Bottom sheet */
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  bottomSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomSheet: {
    backgroundColor: theme.colors.surface1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    maxHeight: "85%",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: -8 },
      },
      android: {
        elevation: 20,
      },
    }),
  },
  bottomSheetScrollView: {
    maxHeight: 400,
  },
  bottomSheetFooter: {
    paddingTop: 16,
    paddingHorizontal: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  bottomSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  bottomSheetTitle: {
    color: theme.colors.textHi,
    fontSize: 22,
    fontFamily: "Geist_700Bold",
    fontWeight: "700",
  },
  bottomSheetContent: {
    gap: 20,
    paddingBottom: 24,
    paddingTop: 8,
  },
  bottomSheetField: {
    gap: 8,
  },
  bottomSheetFieldLabel: {
    color: theme.colors.textLo,
    fontSize: 13,
    fontFamily: "Geist_500Medium",
  },
  bottomSheetInput: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    color: theme.colors.textHi,
    fontSize: 16,
    fontFamily: "Geist_500Medium",
    borderWidth: 0.5,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  bottomSheetSaveButton: {
    backgroundColor: theme.colors.primary600,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  bottomSheetSaveText: {
    color: "#052d1b",
    fontSize: 16,
    fontFamily: "Geist_700Bold",
    fontWeight: "700",
  },
});


















