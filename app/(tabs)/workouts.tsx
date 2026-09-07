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
  Keyboard,
  BackHandler,
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
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

import { useMode } from "../../providers/ModeContext";
import { theme } from "../../constants/theme";
import { router } from "expo-router";
import { saveCompleteWorkout, getWorkoutWithDetails } from "../../lib/api/workouts";
import { listPresets, deletePreset, type ExercisePreset } from "../../lib/api/presets";
import { PresetCircleButton } from "../../components/PresetCircleButton";
import {
  getPresetColorTokens,
  getPresetHeaderGradient,
} from "../../constants/preset-cosmetics";
import { useAuth } from "../../providers/AuthProvider";
import { useSettings } from "../../providers/SettingsContext";
import { mapModeKeyToSportMode, mapItemKindToExerciseType } from "../../lib/types";
import { ErrorToast } from "../../components/ErrorToast";
import { PremiumShimmerCTASurface } from "../../components/PremiumShimmerCTASurface";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Swipeable } from "react-native-gesture-handler";
import { useTutorial } from "../../providers/TutorialContext";
import type { Rect } from "../../lib/tutorial";

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
  // User-defined preset (the new way). Stat names live on the item itself.
  | "preset"
  // Legacy sport-mode types — kept so historical workouts still load/render.
  | "exercise"
  | "bb_shot"
  | "fb_drill"
  | "fb_sprint"
  | "sc_drill"
  | "sc_shoot"
  | "bs_hit"
  | "bs_field"
  | "hk_drill"
  | "hk_shoot"
  | "tn_drill"
  | "tn_rally";

type SetRecord = Record<string, string>;
type AnyItem = {
  id: string;
  kind: ItemKind;
  name: string;
  sets: SetRecord[];
  /** Only populated when kind === 'preset'. Display order of stat-name labels. */
  statNames?: string[];
  /** Only populated when kind === 'preset'. The preset row this item came from. */
  presetId?: string;
};
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
    { key: "distance", label: "Distance (ft)", numeric: true },
    { key: "avgTime", label: "Avg. Time (sec)", numeric: true },
  ],
  // Soccer
  sc_drill: [
    { key: "reps", label: "Reps", numeric: true },
    { key: "time", label: "Time (min)", numeric: true },
  ],
  sc_shoot: [
    { key: "reps", label: "Reps", numeric: true },
    { key: "distance", label: "Distance (ft)", numeric: true },
  ],
  // Baseball
  bs_hit: [
    { key: "reps", label: "Reps", numeric: true },
    { key: "avgDistance", label: "Avg. Distance (ft)", numeric: true },
  ],
  bs_field: [
    { key: "reps", label: "Reps", numeric: true },
    { key: "distance", label: "Distance (ft)", numeric: true },
  ],
  // Hockey
  hk_drill: [
    { key: "reps", label: "Reps", numeric: true },
    { key: "time", label: "Time (min)", numeric: true },
  ],
  hk_shoot: [
    { key: "reps", label: "Reps", numeric: true },
    { key: "distance", label: "Distance (ft)", numeric: true },
  ],
  // Tennis
  tn_drill: [
    { key: "reps", label: "Reps", numeric: true },
    { key: "time", label: "Time (min)", numeric: true },
  ],
  tn_rally: [
    { key: "points", label: "Points", numeric: true },
    { key: "time", label: "Time (min)", numeric: true },
  ],
  // User-defined presets resolve their fields at runtime from item.statNames.
  // FIELD_SETS['preset'] is intentionally empty; use fieldsForItem(item) instead.
  preset: [],
};

/**
 * Resolve the input field templates for a given item. Preset items have
 * arbitrary user-defined stat names; legacy items fall back to FIELD_SETS.
 */
function fieldsForItem(item: AnyItem): { key: string; label: string; numeric?: boolean }[] {
  if (item.kind === "preset" && item.statNames) {
    return item.statNames.map((name, idx) => ({
      key: `stat_${idx}`,
      label: name,
      numeric: true,
    }));
  }
  return FIELD_SETS[item.kind];
}

/** Build the empty SetRecord for a new set, given any item (preset-aware). */
function emptySetForItem(item: AnyItem): SetRecord {
  const empty: SetRecord = {};
  fieldsForItem(item).forEach((f) => (empty[f.key] = ""));
  return empty;
}


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

  useEffect(() => {
    if (!user) {
      router.replace('/onboarding/identity');
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

  // User-defined exercise presets (replaces the old sport-mode preset buttons).
  // Refetched whenever the tab regains focus so newly-created presets appear immediately.
  const [presets, setPresets] = useState<ExercisePreset[]>([]);
  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      listPresets().then(({ data }) => {
        if (active && data) setPresets(data);
      });
      return () => {
        active = false;
      };
    }, [])
  );

  // Which preset chip is currently showing its swipe-up delete button. Only one
  // at a time, so the row can't fill up with trash buttons.
  const [revealedPresetId, setRevealedPresetId] = useState<string | null>(null);

  const confirmDeletePreset = React.useCallback((preset: ExercisePreset) => {
    // Deleting a preset is destructive well beyond the chip itself:
    //   - views.preset_id is ON DELETE CASCADE, so every View built on this
    //     preset is deleted with it.
    //   - workout_exercises.preset_id is ON DELETE SET NULL, so previously
    //     logged exercises lose their preset link and stop appearing in the
    //     Progress Graph and Skill Map. Rebuilding a preset with the same name
    //     does NOT relink them.
    // The logged sets themselves survive and still render in History, because
    // stat names/values live on workout_set_stats rather than on the preset.
    Alert.alert(
      `Delete “${preset.name}”?`,
      "Any Views built on this preset will be deleted too, and exercises you already logged with it will stop showing up in your Progress Graph and Skill Map.\n\nYour workout history keeps all of its sets. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await deletePreset(preset.id);
            if (error) {
              Alert.alert("Couldn't delete preset", error.message ?? "Please try again.");
              return;
            }
            setPresets(prev => prev.filter(p => p.id !== preset.id));
            setRevealedPresetId(null);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          },
        },
      ]
    );
  }, []);


  // ---- Tutorial wiring (Workouts steps) -----------------------------------
  const { step: tutorialStep, setStep: setTutorialStep, setContentRect } = useTutorial();

  // Measured window-space rects of the two spotlight targets.
  const presetRowRef = useRef<View>(null);
  const [presetRowRect, setPresetRowRect] = useState<Rect | null>(null);
  const [cardRect, setCardRect] = useState<Rect | null>(null);

  // The set currently being edited. Everything the editor needs (field
  // templates, label, initial values) is CAPTURED here at open time rather than
  // re-derived from `list` on every render. That keeps the editor mounted even
  // if the draft list briefly churns (autosave/focus resets), so the Modal can't
  // flicker-unmount mid-edit and drop the keyboard.
  const [editingSet, setEditingSet] = useState<{
    itemId: string;
    setIdx: number;
    fields: { key: string; label: string; numeric?: boolean }[];
    contextLabel: string;
    initialSet: SetRecord;
  } | null>(null);

  const measurePresetRow = useCallback(() => {
    presetRowRef.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) setPresetRowRect({ x, y, width, height });
    });
  }, []);

  // Drive the app-level overlay's content hole from the current step.
  useEffect(() => {
    if (tutorialStep === "workouts_preset") {
      setContentRect(presetRowRect);
    } else if (
      tutorialStep === "workouts_exercise_box" ||
      tutorialStep === "workouts_progress_tab"
    ) {
      setContentRect(cardRect);
    } else {
      setContentRect(null);
    }
  }, [tutorialStep, presetRowRect, cardRect, setContentRect]);

  // Clear the content hole when leaving the Workouts screen.
  useEffect(() => () => setContentRect(null), [setContentRect]);

  // Block Android hardware back during the Workouts tutorial steps.
  useEffect(() => {
    const active =
      tutorialStep === "workouts_preset" ||
      tutorialStep === "workouts_exercise_box" ||
      tutorialStep === "workouts_progress_tab";
    if (!active) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, [tutorialStep]);

  // On focus: arrive from the Home→Workouts step and auto-start a workout so the
  // preset row is visible to spotlight. Re-measure the preset row once it settles.
  useFocusEffect(
    React.useCallback(() => {
      const inWorkoutsStep =
        tutorialStep === "workouts_preset" ||
        tutorialStep === "workouts_exercise_box" ||
        tutorialStep === "workouts_progress_tab";

      if (tutorialStep === "home_workout_tab") {
        setIsCreating(true);
        setWorkoutName("");
        setTutorialStep("workouts_preset");
      } else if (inWorkoutsStep) {
        setIsCreating((cur) => {
          if (!cur) setWorkoutName("");
          return true;
        });
      }

      // The preset row slides in on isCreating; measure after it settles.
      const timers = [
        setTimeout(measurePresetRow, 350),
        setTimeout(measurePresetRow, 700),
      ];
      return () => timers.forEach(clearTimeout);
    }, [tutorialStep, setTutorialStep, measurePresetRow])
  );

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
        
        // Convert workout exercises to the format expected by the workouts tab.
        // Preset-kind exercises (those with customStats on any set) are
        // reconstructed as kind='preset' with statNames from presetStatNames.
        const convertedItems: AnyItem[] = workout.exercises.map((exercise) => {
          // Preset path: any exercise the API tagged with presetStatNames.
          if (exercise.presetStatNames && exercise.presetStatNames.length > 0) {
            const statNames = exercise.presetStatNames;
            const sets: SetRecord[] = exercise.sets.map((set) => {
              const setRecord: SetRecord = {};
              statNames.forEach((_, i) => { setRecord[`stat_${i}`] = ""; });
              (set.customStats || []).forEach((cs) => {
                const idx = statNames.indexOf(cs.name);
                if (idx !== -1) setRecord[`stat_${idx}`] = String(cs.value);
              });
              return setRecord;
            });

            const stub: AnyItem = {
              id: uid(),
              kind: "preset",
              name: exercise.name,
              sets,
              statNames,
              presetId: exercise.presetId,
            };
            if (sets.length === 0) {
              sets.push(emptySetForItem(stub));
            }
            return stub;
          }

          // Legacy path: map the stored exercise_type back to an ItemKind.
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
    } catch {
      // ignore
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
        } catch {
          // ignore
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
        } catch {
          // ignore
        }
      };
      loadWorkoutState();
    }
  }, [params.workoutId, user, m]); // Only run on mount or when mode changes

  // When tab gains focus: if no persisted draft exists (e.g. workout was just saved and
  // cleared, or user never started one), clear all in-memory drafts so every mode shows
  // a clean "Start Workout" state. This fixes cross-mode showing old exercises after save.
  useFocusEffect(
    useCallback(() => {
      if (!params.workoutId && user) {
        const checkAndReset = async () => {
          try {
            const savedState = await AsyncStorage.getItem(WORKOUT_STORAGE_KEY);
            if (!savedState) {
              setIsCreating(false);
              setWorkoutName("");
              setLiftDraft([]);
              setBbDraft([]);
              setFbDraft([]);
              setBsDraft([]);
              setScDraft([]);
              setHkDraft([]);
              setTnDraft([]);
            }
          } catch {
            // ignore
          }
        };
        checkAndReset();
      }
    }, [params.workoutId, user])
  );

  // Load workout if workoutId is provided (e.g., from copying a creator workout)
  useEffect(() => {
    const loadWorkout = async () => {
      if (params.workoutId && user) {
        const { data: workout, error } = await getWorkoutWithDetails(params.workoutId);
        
        if (error || !workout) {
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
        
        // Convert workout exercises to the format expected by the workouts tab.
        // Preset-kind exercises (those with customStats on any set) are
        // reconstructed as kind='preset' with statNames from presetStatNames.
        const convertedItems: AnyItem[] = workout.exercises.map((exercise) => {
          // Preset path: any exercise the API tagged with presetStatNames.
          if (exercise.presetStatNames && exercise.presetStatNames.length > 0) {
            const statNames = exercise.presetStatNames;
            const sets: SetRecord[] = exercise.sets.map((set) => {
              const setRecord: SetRecord = {};
              statNames.forEach((_, i) => { setRecord[`stat_${i}`] = ""; });
              (set.customStats || []).forEach((cs) => {
                const idx = statNames.indexOf(cs.name);
                if (idx !== -1) setRecord[`stat_${idx}`] = String(cs.value);
              });
              return setRecord;
            });

            const stub: AnyItem = {
              id: uid(),
              kind: "preset",
              name: exercise.name,
              sets,
              statNames,
              presetId: exercise.presetId,
            };
            if (sets.length === 0) {
              sets.push(emptySetForItem(stub));
            }
            return stub;
          }

          // Legacy path: map the stored exercise_type back to an ItemKind.
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
            // no setter for this mode
          }
        }, 300);
      }
    };
    
    loadWorkout();
  }, [params.workoutId, user, setMode, setLiftDraft, setBbDraft, setFbDraft, setBsDraft, setScDraft, setHkDraft, setTnDraft]);

  /* ---------- actions ---------- */
  /**
   * Add a new exercise card to the current workout.
   * - addItem("exercise") — legacy fixed-shape add (kept for any non-preset entry points)
   * - addItemFromPreset(preset) — adds a preset-kind card pre-populated with the
   *   preset's name and stat-name labels
   */
  const addItem = (kind: ItemKind) => {
    const stub: AnyItem = { id: uid(), kind, name: "", sets: [], statNames: undefined };
    const empty = emptySetForItem(stub);
    setList((cur) => [...cur, { ...stub, sets: [{ ...empty }] }]);
  };

  const addItemFromPreset = (preset: { id: string; name: string; statNames: string[] }) => {
    // Name intentionally LEFT BLANK — the user fills in the actual exercise
    // name (e.g. "Free Throw" preset → user types "Game-day Free Throws").
    // The preset name lives on as `presetId`-linked metadata via statNames.
    const stub: AnyItem = {
      id: uid(),
      kind: "preset",
      name: "",
      sets: [],
      statNames: preset.statNames,
      presetId: preset.id,
    };
    const empty = emptySetForItem(stub);
    setList((cur) => [...cur, { ...stub, sets: [{ ...empty }] }]);
  };

  const updateName = (id: string, name: string) => {
    setList((cur) => cur.map((x) => (x.id === id ? { ...x, name } : x)));
    // Tutorial: typing an exercise name unlocks the Progress tab. Dismiss the
    // keyboard so the (now-highlighted) Progress tab isn't hidden behind it.
    if (tutorialStep === "workouts_exercise_box" && name.trim().length > 0) {
      setTutorialStep("workouts_progress_tab");
      Keyboard.dismiss();
    }
  };

  const removeItem = (id: string) => setList((cur) => cur.filter((x) => x.id !== id));

  const addSet = (id: string) => {
    const item = list.find((x) => x.id === id);
    if (!item) return;
    const empty = emptySetForItem(item);
    setList((cur) => cur.map((x) => (x.id === id ? { ...x, sets: [...x.sets, { ...empty }] } : x)));
  };

  const removeSet = (id: string, setIndex: number) => {
    setList((cur) =>
      cur.map((x) =>
        x.id === id
          ? { ...x, sets: x.sets.filter((_, i) => i !== setIndex) }
          : x
      )
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
        // statNames + presetId are only meaningful for preset-kind items;
        // passed through so the save flow can write workout_set_stats and
        // tag workout_exercises.preset_id for Views queries.
        statNames: item.statNames,
        presetId: item.presetId,
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

  if (!fontsReady) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg0, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <>
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

        {/* Action buttons — user-defined presets. The first button opens the
            preset builder; the rest are the user's saved presets. */}
        {isCreating && (
          // Static wrapper holds the layout slot so the tutorial spotlight can
          // measure the row's resting position regardless of the slide-in anim.
          <View ref={presetRowRef} onLayout={measurePresetRow}>
          <Animated.View style={actionButtonsAnimatedStyle}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.actionRow}
            >
              <ActionButton
                icon={<Ionicons name="add" size={22} color={theme.semantic.accent.solid} />}
                label="Add Preset"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/(tabs)/(home)/build-preset");
                }}
                variant="primary"
                // During the tutorial's preset step, only a preset chip is tappable.
                disabled={tutorialStep === "workouts_preset"}
              />
              {presets.map((preset) => {
                const IconCmp = preset.iconSet === "ion" ? Ionicons : MaterialCommunityIcons;
                const tokens = getPresetColorTokens(preset.color);
                return (
                  <PresetCircleButton
                    key={preset.id}
                    icon={<IconCmp name={preset.iconName as any} size={20} color={tokens.solid} />}
                    label={preset.name}
                    tint={{ backgroundColor: tokens.subtle, borderColor: tokens.border }}
                    revealed={revealedPresetId === preset.id}
                    onRequestReveal={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setRevealedPresetId(preset.id);
                    }}
                    onRequestHide={() => setRevealedPresetId(null)}
                    onDelete={() => confirmDeletePreset(preset)}
                    // Don't let the delete gesture interrupt the tutorial step
                    // whose whole job is getting the user to tap a preset.
                    deleteDisabled={tutorialStep === "workouts_preset"}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      addItemFromPreset(preset);
                      // Tutorial: adding an exercise box advances to the box step.
                      if (tutorialStep === "workouts_preset") {
                        setTutorialStep("workouts_exercise_box");
                      }
                    }}
                  />
                );
              })}
              <ActionButton
                icon={<Ionicons name="checkmark" size={22} color="#FFFFFF" />}
                label="Finish"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  saveWorkout();
                }}
                variant="finish"
                disabled={saving || tutorialStep === "workouts_preset"}
              />
            </ScrollView>
          </Animated.View>
          </View>
        )}

        {/* Empty state with circles and hero button */}
        {!isCreating && (
          <View style={styles.emptyStateContainer}>
            <AnimatedPressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                startWorkoutScale.value = 1;
                setIsCreating(true);
                setWorkoutName("");
              }}
              onPressIn={() => {
                startWorkoutScale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
              }}
              onPressOut={() => {
                startWorkoutScale.value = withSpring(1, { damping: 15, stiffness: 300 });
              }}
              style={[styles.startWorkoutPressable, startWorkoutAnimatedStyle]}
            >
              <PremiumShimmerCTASurface style={styles.startWorkoutPremiumSurface}>
                <Text style={styles.startWorkoutPremiumText}>Start Workout</Text>
              </PremiumShimmerCTASurface>
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
                presets={presets}
                onRemove={() => removeItem(item.id)}
                onName={(v) => updateName(item.id, v)}
                onAddSet={() => addSet(item.id)}
                onRemoveSet={(setIdx) => removeSet(item.id, setIdx)}
                onEditSet={(setIdx) =>
                  setEditingSet({
                    itemId: item.id,
                    setIdx,
                    fields: fieldsForItem(item).map((f) =>
                      f.key === "weight"
                        ? { ...f, label: `Weight (${unitsWeight === "kg" ? "kg" : "lb"})` }
                        : f,
                    ),
                    contextLabel: item.name?.trim() || getTypeLabel(item.kind),
                    initialSet: { ...item.sets[setIdx] },
                  })
                }
                // Report the box's position so the tutorial overlay can spotlight it.
                // ONLY wired during the tutorial steps that need it — otherwise the
                // card's onLayout → measureInWindow → setCardRect chain fires on
                // every frame of the keyboard's show animation, re-rendering the
                // whole screen mid-presentation and knocking the set-editor input
                // out of focus (the "keyboard flashes then disappears" bug).
                onMeasure={
                  tutorialStep === "workouts_exercise_box" ||
                  tutorialStep === "workouts_progress_tab"
                    ? setCardRect
                    : undefined
                }
                // Lock the remove (x) button while the tutorial is teaching the box.
                disableRemove={
                  tutorialStep === "workouts_exercise_box" ||
                  tutorialStep === "workouts_progress_tab"
                }
              />
            ))}
          </ScrollView>
        )}
      </View>
    </KeyboardAvoidingView>

    {/* Set editor — hoisted OUT of the KeyboardAvoidingView/ScrollView, and fed
        entirely from captured state so it stays mounted through any list churn. */}
    {editingSet && (
      <SetEditorBottomSheet
        key={`${editingSet.itemId}:${editingSet.setIdx}`}
        set={editingSet.initialSet}
        fields={editingSet.fields}
        contextLabel={editingSet.contextLabel}
        setNumber={editingSet.setIdx + 1}
        onSave={(updatedSet) => {
          editingSet.fields.forEach((f) =>
            updateSet(editingSet.itemId, editingSet.setIdx, f.key, updatedSet[f.key] || ""),
          );
          setEditingSet(null);
        }}
        onClose={() => setEditingSet(null)}
      />
    )}
    </>
  );
}

/* ================= Action Button Component ================= */
function ActionButton({
  icon,
  label,
  onPress,
  variant = "default",
  disabled = false,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  variant?: "default" | "primary" | "finish";
  disabled?: boolean;
  /** Optional tint overrides for the default-variant background + border —
   *  used by preset chips to show the user's chosen preset color. */
  tint?: { backgroundColor: string; borderColor: string };
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
          variant === "primary" && styles.actionButtonPrimary,
          variant === "finish" && styles.actionButtonFinish,
          // Tint overrides come last so preset chips win over the default fill.
          variant === "default" && tint && {
            backgroundColor: tint.backgroundColor,
            borderColor: tint.borderColor,
            borderWidth: 1.5,
          },
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

/* Maps an item kind to its human-readable type label. Module-level so both the
   card and the screen-level set editor can resolve a fallback context label. */
function getTypeLabel(kind: ItemKind): string {
  if (kind === "preset") return "Preset";
  if (kind === "exercise") return "Exercise";
  if (kind === "bb_shot" || kind === "sc_shoot" || kind === "hk_shoot") return "Shooting";
  if (kind === "fb_sprint") return "Sprints";
  if (kind === "bs_hit") return "Hitting";
  if (kind === "bs_field") return "Fielding";
  if (kind === "tn_rally") return "Rally";
  if (kind.endsWith("_drill")) return "Drill";
  return "Exercise";
}

/* ================= Card (square) ================= */
function FullWidthCard({
  item,
  presets,
  onRemove,
  onName,
  onAddSet,
  onRemoveSet,
  onEditSet,
  onMeasure,
  disableRemove,
}: {
  item: AnyItem;
  /** Full preset list — used to resolve the preset color for the header
   *  gradient when item.kind === 'preset'. Lookup by presetId. */
  presets: ExercisePreset[];
  onRemove: () => void;
  onName: (v: string) => void;
  onAddSet: () => void;
  onRemoveSet: (setIdx: number) => void;
  /** Opens the screen-level set editor for the given set index. */
  onEditSet: (setIdx: number) => void;
  /** Reports this card's window-space rect (used by the tutorial spotlight). */
  onMeasure?: (rect: Rect) => void;
  /** When true, the card's remove (x) button is inert — used during the tutorial
   *  so the user can't delete the exercise box they're being taught about. */
  disableRemove?: boolean;
}) {
  const { unitsWeight } = useSettings();
  const cardWrapRef = useRef<View>(null);
  const reportMeasure = useCallback(() => {
    if (!onMeasure) return;
    cardWrapRef.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) onMeasure({ x, y, width, height });
    });
  }, [onMeasure]);
  // Store refs for each Swipeable component (one per set)
  const swipeableRefs = useRef<Map<number, Swipeable>>(new Map());
  
  const fields = fieldsForItem(item).map(f => {
    // Update weight label based on user preference (legacy 'exercise' kind only).
    if (f.key === 'weight') {
      return { ...f, label: `Weight (${unitsWeight === 'kg' ? 'kg' : 'lb'})` };
    }
    return f;
  });

  // Resolve preset color from the presets list (when this is a preset-kind
  // item). Falls back to undefined for legacy kinds, which still pick a color
  // from getHeaderGradientColors below.
  const linkedPreset = useMemo(
    () => (item.kind === "preset" && item.presetId
      ? presets.find(p => p.id === item.presetId)
      : undefined),
    [item.kind, item.presetId, presets],
  );

  // Get gradient colors based on exercise type
  const getHeaderGradientColors = (kind: ItemKind): string[] => {
    if (kind === "preset") {
      // User-chosen color from the preset. If we can't find the preset (e.g.
      // it was deleted), fall back to the default green wash.
      return getPresetHeaderGradient(linkedPreset?.color);
    } else if (kind === "exercise") {
      // Legacy 'exercise' kind keeps blue for back-compat.
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
      <View ref={cardWrapRef} onLayout={reportMeasure} collapsable={false}>
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
              placeholder="Name"
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
                if (disableRemove) return;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onRemove();
              }}
              disabled={disableRemove}
              style={[styles.cardActionButton, disableRemove && { opacity: 0.3 }]}
              hitSlop={8}
            >
              <Ionicons name="close" size={18} color="rgba(255, 255, 255, 0.9)" />
            </Pressable>
          </View>
        </LinearGradient>

        {/* Sets list - rows */}
        <View style={styles.setsListContainer}>
          {item.sets.map((s, idx) => {
            const renderRightActions = () => {
              return (
                <View style={styles.swipeDeleteContainer}>
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      onRemoveSet(idx);
                      // Close the swipeable after a short delay to allow animation
                      setTimeout(() => {
                        swipeableRefs.current.get(idx)?.close();
                      }, 100);
                    }}
                    style={styles.swipeDeleteButton}
                  >
                    <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
                  </Pressable>
                </View>
              );
            };

            return (
              <Swipeable
                key={idx}
                ref={(ref) => {
                  if (ref) {
                    swipeableRefs.current.set(idx, ref);
                  } else {
                    swipeableRefs.current.delete(idx);
                  }
                }}
                renderRightActions={renderRightActions}
                rightThreshold={40}
                overshootRight={false}
              >
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onEditSet(idx);
                  }}
                  style={({ pressed }) => [
                    styles.setRow,
                    pressed && styles.setRowPressed,
                  ]}
                >
                  {/* Numbered set badge — matches the preset stat-index visual language */}
                  <View style={styles.setBadge}>
                    <Text style={styles.setBadgeText}>{idx + 1}</Text>
                  </View>

                  {/* Content area — either an empty-state affordance or filled stat chips */}
                  {(() => {
                    const filled = fields.filter(f => (s[f.key] ?? "").trim().length > 0);
                    if (filled.length === 0) {
                      return (
                        <View style={styles.setRowContent}>
                          <Text style={styles.setEmptyText}>Tap to log set</Text>
                          <Text style={styles.setEmptyHint} numberOfLines={1}>
                            {fields.map(f => f.label).join(" · ")}
                          </Text>
                        </View>
                      );
                    }
                    return (
                      <View style={styles.setChipRow}>
                        {filled.map(f => (
                          <View key={f.key} style={styles.setChip}>
                            <Text style={styles.setChipLabel}>{f.label}</Text>
                            <Text style={styles.setChipValue}>{s[f.key]}</Text>
                          </View>
                        ))}
                      </View>
                    );
                  })()}

                  {/* Right affordance: plus when empty (invitation), chevron when filled (edit) */}
                  {(() => {
                    const hasAny = fields.some(f => (s[f.key] ?? "").trim().length > 0);
                    return hasAny ? (
                      <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.35)" />
                    ) : (
                      <View style={styles.setAddPill}>
                        <Ionicons name="add" size={14} color="#22C55E" />
                      </View>
                    );
                  })()}
                </Pressable>
              </Swipeable>
            );
          })}
        </View>
      </Animated.View>
      </View>
    </>
  );
}

/* ================= Set Editor Bottom Sheet ================= */
function SetEditorBottomSheet({
  set,
  fields,
  contextLabel,
  setNumber,
  onSave,
  onClose,
}: {
  set: SetRecord;
  fields: { key: string; label: string; numeric?: boolean }[];
  contextLabel: string;
  setNumber: number;
  onSave: (updatedSet: SetRecord) => void;
  onClose: () => void;
}) {
  const [localSet, setLocalSet] = useState<SetRecord>({ ...set });
  const insets = useSafeAreaInsets();

  // Has-content flag drives the Save button state. Empty sets can still be
  // saved, but a subtle accent dim hints "you haven't typed anything."
  const hasAnyValue = fields.some(f => (localSet[f.key] ?? "").trim().length > 0);

  // Deliberately minimal: native Modal slide animation + native
  // KeyboardAvoidingView, with NO reanimated transforms and NO manual keyboard
  // listeners. On the New Architecture, animating a Modal's content position
  // while one of its TextInputs is focused resigns the input's first responder
  // mid-animation — that was the "keyboard flashes open then immediately closes"
  // bug. A plain, static sheet that the OS keyboard simply pushes up keeps focus.
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.bottomSheetOverlay}
      >
        {/* Backdrop sits BEHIND the sheet as a sibling — tapping it dismisses,
            taps inside the sheet never reach it. */}
        <Pressable style={styles.bottomSheetBackdrop} onPress={onClose} />

        <View style={styles.bottomSheet}>
          <View style={styles.bottomSheetHandle} />

          {/* Context kicker + title row. */}
          <View style={styles.bottomSheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bottomSheetKicker} numberOfLines={1}>
                {contextLabel.toUpperCase()} <Text style={styles.bottomSheetKickerDim}>· SET {setNumber}</Text>
              </Text>
              <Text style={styles.bottomSheetTitle}>Edit set</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} style={styles.bottomSheetCloseBtn}>
              <Ionicons name="close" size={18} color="rgba(255,255,255,0.85)" />
            </Pressable>
          </View>

          <ScrollView
            style={styles.bottomSheetScrollView}
            contentContainerStyle={styles.bottomSheetContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {fields.length > 0 ? (
              fields.map((f) => {
                const value = localSet[f.key] ?? "";
                return (
                  <View key={f.key} style={styles.bottomSheetField}>
                    <Text style={styles.bottomSheetFieldLabel}>{f.label}</Text>
                    <View style={styles.bottomSheetInputWrap}>
                      <TextInput
                        value={value}
                        onChangeText={(t) =>
                          setLocalSet((cur) => ({
                            ...cur,
                            [f.key]: f.numeric ? t.replace(/[^\d.]/g, "") : t,
                          }))
                        }
                        placeholder="0"
                        placeholderTextColor="rgba(255,255,255,0.22)"
                        keyboardType={f.numeric ? "numeric" : "default"}
                        style={styles.bottomSheetInput}
                        selectionColor="#22C55E"
                      />
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={{ color: theme.colors.textLo, textAlign: "center", padding: 20 }}>
                No fields available
              </Text>
            )}
          </ScrollView>

          <View style={[styles.bottomSheetFooter, { paddingBottom: insets.bottom + 8 }]}>
            <Pressable
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onSave(localSet);
              }}
              style={[
                styles.bottomSheetSaveButton,
                !hasAnyValue && styles.bottomSheetSaveButtonDim,
              ]}
            >
              <Text style={styles.bottomSheetSaveText}>Save set</Text>
              <Ionicons name="checkmark" size={18} color="#06090C" />
            </Pressable>
          </View>
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
  actionButtonPrimary: {
    backgroundColor: theme.semantic.accent.subtle,
    borderColor: theme.semantic.accent.solid,
    borderWidth: 1.5,
    shadowColor: theme.semantic.accent.solid,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  actionButtonFinish: {
    backgroundColor: theme.semantic.accent.solid,
    borderColor: theme.semantic.accent.solid,
    borderWidth: 0,
    shadowColor: theme.semantic.accent.solid,
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  actionLabel: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    fontFamily: "Geist_500Medium",
    marginTop: 4,
    textAlign: "center",
  },

  /* Empty state — CTA matches Settings Upgrade / Progress AI Trainer */
  emptyStateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.layout.xl,
  },
  startWorkoutPressable: {
    width: "100%",
    maxWidth: 268,
    alignSelf: "center",
    alignItems: "center",
  },
  startWorkoutPremiumSurface: {
    width: "100%",
    maxWidth: 228,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  startWorkoutPremiumText: {
    color: "#000000",
    fontSize: 17,
    fontFamily: "Geist_600SemiBold",
    fontWeight: "600",
    letterSpacing: 0.15,
    includeFontPadding: false,
    textAlignVertical: "center",
    textShadowColor: "rgba(0, 0, 0, 0.25)",
    textShadowOffset: { width: 0, height: 1.2 },
    textShadowRadius: 2.5,
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

  /* Sets list — flat rows inside the parent exercise card.
     No per-row box (the card is already a box). Hairline divider between rows
     keeps separation. */
  setsListContainer: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 8,
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  setRowPressed: {
    opacity: 0.6,
  },
  setBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(34, 197, 94, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.32)",
    alignItems: "center",
    justifyContent: "center",
  },
  setBadgeText: {
    color: "#22C55E",
    fontSize: 12,
    fontFamily: "Geist_700Bold",
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  setRowContent: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  // Empty: "Tap to log set" reads as accent-tinted to invite action (Fitts's
  // affordance) with the field labels as a single hint line below.
  setEmptyText: {
    color: "rgba(34, 197, 94, 0.92)",
    fontSize: 14,
    fontFamily: "Geist_600SemiBold",
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  setEmptyHint: {
    color: "rgba(255, 255, 255, 0.36)",
    fontSize: 11,
    fontFamily: "Geist_500Medium",
    letterSpacing: 0.1,
  },
  // Filled: render each field as a label/value pair so users can see the
  // structure (Whoop-style "stat label above number").
  setChipRow: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    minWidth: 0,
  },
  setChip: {
    minWidth: 0,
  },
  setChipLabel: {
    color: "rgba(255, 255, 255, 0.42)",
    fontSize: 10,
    fontFamily: "Geist_600SemiBold",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 1,
  },
  setChipValue: {
    color: "rgba(255, 255, 255, 0.96)",
    fontSize: 15,
    fontFamily: "Geist_700Bold",
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.2,
  },
  setAddPill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(34, 197, 94, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.32)",
    alignItems: "center",
    justifyContent: "center",
  },
  swipeDeleteContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingRight: 16,
    backgroundColor: "rgba(255, 59, 48, 0.15)",
  },
  swipeDeleteButton: {
    width: 60,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    // No background color - just the icon on the gradient
  },

  /* Bottom sheet */
  /* Edit-set sheet — premium redesign.
     Kicker line tells the user WHICH set; refined inputs have focused-state
     accent borders; Save button is the same accent green pill used across the
     redesign (instead of the chunky bright primary600). */
  bottomSheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  bottomSheetBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
  bottomSheet: {
    backgroundColor: "#11171F",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingHorizontal: 20,
    maxHeight: "85%",
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.45,
        shadowRadius: 30,
        shadowOffset: { width: 0, height: -10 },
      },
      android: { elevation: 24 },
    }),
  },
  bottomSheetScrollView: {
    maxHeight: 420,
  },
  bottomSheetFooter: {
    paddingTop: 14,
    paddingHorizontal: 0,
  },
  bottomSheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 18,
  },
  bottomSheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 12,
  },
  bottomSheetKicker: {
    fontSize: 10,
    fontFamily: "Geist_700Bold",
    fontWeight: "700",
    color: "#22C55E",
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  bottomSheetKickerDim: {
    color: "rgba(34,197,94,0.55)",
    fontWeight: "600",
  },
  bottomSheetTitle: {
    color: "rgba(255,255,255,0.96)",
    fontSize: 24,
    fontFamily: "Geist_700Bold",
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  bottomSheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomSheetContent: {
    gap: 16,
    paddingBottom: 20,
    paddingTop: 4,
  },
  bottomSheetField: {
    gap: 8,
  },
  // Field label is now an UPPERCASE kicker, dimmed when unfocused, accent
  // when the input is focused — gives a "selected channel" cue.
  bottomSheetFieldLabel: {
    color: "rgba(255,255,255,0.42)",
    fontSize: 11,
    fontFamily: "Geist_700Bold",
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    paddingHorizontal: 2,
  },
  bottomSheetFieldLabelFocused: {
    color: "#22C55E",
  },
  // The input is now wrapped in a styled View so we can animate the border
  // independently. Larger numeric-feel typography and accent focus border.
  bottomSheetInputWrap: {
    backgroundColor: "rgba(255, 255, 255, 0.035)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  bottomSheetInputWrapFocused: {
    backgroundColor: "rgba(34, 197, 94, 0.05)",
    borderColor: "#22C55E",
    shadowColor: "#22C55E",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  bottomSheetInput: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: "rgba(255,255,255,0.96)",
    fontSize: 20,
    fontFamily: "Geist_700Bold",
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.3,
  },
  bottomSheetSaveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#22C55E",
    borderRadius: 16,
    height: 52,
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.40,
    shadowRadius: 18,
    elevation: 8,
  },
  bottomSheetSaveButtonDim: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  bottomSheetSaveText: {
    color: "#06090C",
    fontSize: 16,
    fontFamily: "Geist_700Bold",
    fontWeight: "700",
    letterSpacing: -0.1,
  },
});


















