// app/(tabs)/workout-summary.tsx
// Workout summary/overview screen shown after "Save Workout"
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { theme } from '../../constants/theme';
import { saveCompleteWorkout } from '../../lib/api/workouts';
import type { WorkoutDetails } from '../../lib/api/workouts';
import { useBottomTabOverflow } from '../../components/ui/TabBarBackground';
import { SuccessToast } from '../../components/SuccessToast';
import { ErrorToast } from '../../components/ErrorToast';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Exercise type to icon mapping
type ItemKind = 
  | "exercise"
  | "bb_shot" | "sc_shoot" | "hk_shoot"
  | "fb_sprint" | "bs_field" | "tn_rally"
  | "bs_hit"
  | "fb_drill" | "sc_drill" | "hk_drill" | "tn_drill";

const getExerciseIcon = (kind: string): React.ReactNode => {
  if (kind === "exercise") {
    return <MaterialCommunityIcons name="dumbbell" size={24} color="#FFFFFF" />;
  } else if (kind === "bb_shot" || kind === "sc_shoot" || kind === "hk_shoot") {
    return <MaterialCommunityIcons name="target" size={24} color="#FFFFFF" />;
  } else if (kind === "fb_sprint") {
    return <MaterialCommunityIcons name="run-fast" size={24} color="#FFFFFF" />;
  } else if (kind === "bs_hit") {
    return <MaterialCommunityIcons name="baseball-bat" size={24} color="#FFFFFF" />;
  } else if (kind === "bs_field") {
    return <MaterialCommunityIcons name="baseball" size={24} color="#FFFFFF" />;
  } else if (kind === "tn_rally") {
    return <MaterialCommunityIcons name="tennis" size={24} color="#FFFFFF" />;
  } else {
    // Drills
    return <Ionicons name="time-outline" size={24} color="#FFFFFF" />;
  }
};

// Get gradient colors based on exercise type (more solid for full boxes)
const getGradientColors = (kind: string): string[] => {
  if (kind === "exercise") {
    // Blue for exercises - more solid gradient
    return ["rgba(90, 166, 255, 0.4)", "rgba(90, 166, 255, 0.2)", "rgba(90, 166, 255, 0.1)"];
  } else if (kind === "bb_shot" || kind === "sc_shoot" || kind === "hk_shoot") {
    // Light green for shooting - more solid gradient
    return ["rgba(100, 200, 120, 0.4)", "rgba(100, 200, 120, 0.2)", "rgba(100, 200, 120, 0.1)"];
  } else if (kind === "fb_sprint" || kind === "bs_field" || kind === "tn_rally") {
    // Green for sprints, fielding, and rally - more solid gradient
    return ["rgba(100, 200, 120, 0.4)", "rgba(100, 200, 120, 0.2)", "rgba(100, 200, 120, 0.1)"];
  } else if (kind === "bs_hit") {
    // Purple for hitting - more solid gradient
    return ["rgba(180, 140, 255, 0.4)", "rgba(180, 140, 255, 0.2)", "rgba(180, 140, 255, 0.1)"];
  } else {
    // Light purple for drills - more solid gradient
    return ["rgba(180, 140, 255, 0.4)", "rgba(180, 140, 255, 0.2)", "rgba(180, 140, 255, 0.1)"];
  }
};

export default function WorkoutSummaryScreen() {
  const params = useLocalSearchParams<{ workoutData?: string; workoutId?: string | string[] }>();
  const [workout, setWorkout] = useState<WorkoutDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [workoutId, setWorkoutId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabOverflow();

  // Button animation values
  const buttonScale = useSharedValue(1);
  const buttonTranslateY = useSharedValue(0);
  const buttonShadowOpacity = useSharedValue(0.25);
  const buttonShadowOffset = useSharedValue(10);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: buttonScale.value },
      { translateY: buttonTranslateY.value },
    ],
    shadowOpacity: buttonShadowOpacity.value,
    shadowOffset: { width: 0, height: buttonShadowOffset.value },
  }));

  useEffect(() => {
    // If workoutData is provided (from "Save Workout"), parse it and display
    // If workoutId is provided (from elsewhere), we'd load it (not used in current flow)
    if (params.workoutData) {
      try {
        const decoded = decodeURIComponent(params.workoutData);
        const workoutData = JSON.parse(decoded);
        
        // Convert workout data to WorkoutDetails format for display
        const workoutDetails: WorkoutDetails = {
          id: 'draft', // Temporary ID until saved
          name: workoutData.name || '',
          mode: workoutData.mode as any,
          performedAt: workoutData.performedAt || new Date().toISOString().split('T')[0],
          exercises: workoutData.items.map((item: any, idx: number) => ({
            id: `draft-exercise-${idx}`,
            name: item.name || '',
            type: item.kind as any,
            sets: item.sets.map((set: any, setIdx: number) => ({
              id: `draft-set-${idx}-${setIdx}`,
              setIndex: setIdx + 1,
              reps: set.reps ? parseFloat(String(set.reps)) : undefined,
              weight: set.weight ? parseFloat(String(set.weight)) : undefined,
              attempted: set.attempted ? parseFloat(String(set.attempted)) : undefined,
              made: set.made ? parseFloat(String(set.made)) : undefined,
              distance: set.distance ? parseFloat(String(set.distance)) : undefined,
              timeMin: set.time ? parseFloat(String(set.time)) : undefined,
              avgTimeSec: set.avgTime ? parseFloat(String(set.avgTime)) : undefined,
              completed: set.completed === 'true' || set.completed === true,
              points: set.points ? parseFloat(String(set.points)) : undefined,
            })),
          })),
        };
        
        setWorkout(workoutDetails);
        setLoading(false);
      } catch (error) {
        console.error('Failed to parse workout data:', error);
        Alert.alert('Error', 'Failed to load workout data.');
        router.back();
      }
    } else {
      setLoading(false);
    }
  }, [params.workoutData]);

  const handleSaveWorkout = async () => {
    if (!workout || !params.workoutData) {
      Alert.alert('Error', 'No workout data to save.');
      return;
    }
    
    setFinishing(true);
    
    try {
      // Parse workout data again to save it
      const decoded = decodeURIComponent(params.workoutData);
      const workoutData = JSON.parse(decoded);
      
      // Now save to database
      const { data: savedWorkoutId, error } = await saveCompleteWorkout({
        mode: workoutData.mode,
        name: workoutData.name,
        performedAt: workoutData.performedAt,
        items: workoutData.items,
      });
      
      setFinishing(false);
      
      if (error) {
        setErrorMessage(error.message || 'Failed to save workout.');
        setShowError(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      
      if (savedWorkoutId) {
        setWorkoutId(savedWorkoutId);
        setShowSuccess(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Clear persisted workout state from AsyncStorage (workout is now saved)
        const AsyncStorage = await import('@react-native-async-storage/async-storage');
        AsyncStorage.default.removeItem('@workout_draft').catch((error) => {
          console.error('❌ [Workout Summary] Error clearing workout state:', error);
        });
        
        // Cancel today's workout notification if workout was logged before 12PM
        const { cancelTodaysWorkoutNotification, trackWorkoutAndScheduleAITrainerReminder } = await import('../../lib/notifications/notifications');
        cancelTodaysWorkoutNotification(workoutData.mode).catch((error) => {
          console.error('❌ [Workout Summary] Error canceling notification:', error);
        });
        
        // Track workout count and schedule AI Trainer reminder if needed (every 7 workouts)
        trackWorkoutAndScheduleAITrainerReminder().catch((error) => {
          console.error('❌ [Workout Summary] Error tracking workout for AI Trainer reminder:', error);
        });
        
        // Navigate to home tab immediately after save
        setTimeout(() => {
          try {
            router.replace('/(tabs)/(home)');
          } catch (error) {
            console.error('Navigation error:', error);
          }
        }, 100);
      }
    } catch (error: any) {
      setFinishing(false);
      setErrorMessage('An unexpected error occurred.');
      setShowError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error('Save workout error:', error);
    }
  };

  const handleBack = () => {
    // Navigate back to workouts tab (not just back, which might go to home)
    router.replace('/(tabs)/workouts');
  };


  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.bg0 }]}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.textHi} />
          </Pressable>
        </View>
        <View style={styles.loadingContainer}>
          <Animated.View style={starAnimatedStyle}>
            <Image
              source={require("../../assets/star.png")}
              style={styles.loadingStar}
              resizeMode="contain"
            />
          </Animated.View>
        </View>
      </View>
    );
  }

  if (!workout) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.bg0 }]}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.textHi} />
          </Pressable>
        </View>
        <View style={styles.emptyContainer}>
          <Image
            source={require("../../assets/empty-star.png")}
            style={styles.emptyStar}
            resizeMode="contain"
          />
          <Text style={styles.emptyText}>Workout not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg0 }]}>
      <SuccessToast
        message="Workout saved to history!"
        visible={showSuccess}
        onHide={() => setShowSuccess(false)}
      />
      <ErrorToast
        message={errorMessage}
        visible={showError}
        onHide={() => setShowError(false)}
      />
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textHi} />
        </Pressable>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={[styles.contentContainer, { paddingBottom: tabBarHeight + 100 }]}
      >
        {/* Workout Name as Heading - Centered */}
        <View style={styles.headingSection}>
          <Text style={[styles.workoutName, { color: theme.colors.textHi }]}>
            {String(workout.name || '')}
          </Text>
          <Text style={[styles.workoutDate, { color: theme.colors.textLo }]}>
            {workout.performedAt ? (() => {
              // Parse date string manually to avoid timezone issues
              // performedAt is in YYYY-MM-DD format
              const parts = workout.performedAt.split('-');
              if (parts.length === 3) {
                const year = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10);
                const day = parseInt(parts[2], 10);
                // Format as M/D/YYYY
                return `${month}/${day}/${year}`;
              }
              // Fallback to Date parsing if format is unexpected
              return new Date(workout.performedAt).toLocaleDateString();
            })() : ''}
          </Text>
        </View>

        {/* Exercise Boxes */}
        {(workout.exercises || []).map((exercise, exerciseIdx) => {
            const exerciseKey = exercise.id ? String(exercise.id) : `exercise-${String(exerciseIdx)}`;
            const setsCount = exercise.sets ? exercise.sets.length : 0;
            const exerciseName = String(exercise.name || '');
            const exerciseKind = String(exercise.type || '');
            const setsText = String(setsCount !== 1 ? 'sets' : 'set');
            const gradientColors = getGradientColors(exerciseKind);
            const exerciseIcon = getExerciseIcon(exerciseKind);
            
            return (
              <View key={exerciseKey} style={styles.exerciseBox}>
                {/* Gradient Background */}
                <LinearGradient
                  colors={gradientColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                
                {/* Content */}
                <View style={styles.exerciseBoxContent}>
                  <View style={styles.exerciseBoxLeft}>
                    <Text style={[styles.exerciseName, { color: theme.colors.textHi }]}>
                      {exerciseName}
                    </Text>
                    <Text style={[styles.setCount, { color: theme.colors.textLo }]}>
                      {String(setsCount)} {setsText}
                    </Text>
                  </View>
                  <View style={styles.exerciseBoxRight}>
                    {exerciseIcon}
                  </View>
                </View>
              </View>
            );
          })}
      </ScrollView>

      {/* Save Workout Button - Bottom */}
      <View style={[styles.saveButtonContainer, { bottom: tabBarHeight + 16 }]}>
        {/* Shadow wrapper with glow effect */}
        <Animated.View 
          style={[
            styles.buttonShadowWrapper,
            buttonAnimatedStyle,
          ]}
        >
          <AnimatedPressable
            onPress={handleSaveWorkout}
            disabled={finishing}
            onPressIn={() => {
              buttonScale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
              buttonTranslateY.value = withSpring(1, { damping: 15, stiffness: 300 });
              buttonShadowOpacity.value = withTiming(0.15, { duration: 100 });
              buttonShadowOffset.value = withTiming(6, { duration: 100 });
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            onPressOut={() => {
              buttonScale.value = withSpring(1, { damping: 15, stiffness: 300 });
              buttonTranslateY.value = withSpring(0, { damping: 15, stiffness: 300 });
              buttonShadowOpacity.value = withTiming(0.25, { duration: 100 });
              buttonShadowOffset.value = withTiming(10, { duration: 100 });
            }}
            style={[styles.saveButton, finishing && { opacity: 0.6 }]}
          >
            {/* Subtle gradient overlay for depth */}
            <LinearGradient
              colors={["rgba(255,255,255,0.18)", "rgba(0,0,0,0.12)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {finishing ? (
              <ActivityIndicator color="#0B0E10" />
            ) : (
              <>
                <Text style={styles.saveButtonText}>Save Workout</Text>
                <Ionicons name="checkmark" size={20} color="#0B0E10" style={{ zIndex: 1 }} />
              </>
            )}
          </AnimatedPressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 60,
  },
  backButton: {
    padding: 8,
    // No box styling - matches onboarding screens
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingStar: {
    width: 82,
    height: 82,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 16,
  },
  headingSection: {
    marginBottom: 8,
    alignItems: 'center',
  },
  workoutName: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  workoutDate: {
    fontSize: 14,
    textAlign: 'center',
  },
  exerciseBox: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    minHeight: 80,
  },
  exerciseBoxContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  exerciseBoxLeft: {
    flex: 1,
    gap: 4,
  },
  exerciseBoxRight: {
    marginLeft: 16,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '600',
  },
  setCount: {
    fontSize: 14,
  },
  saveButtonContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 100,
  },
  buttonShadowWrapper: {
    // Enhanced shadow with green glow effect
    shadowColor: "#74C69D", // Mint green shadow for glow effect
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6, // Higher opacity for visible glow
    shadowRadius: 25, // Larger radius for spread-out glow
    elevation: 14,
  },
  saveButton: {
    backgroundColor: "#74C69D", // Same mint green as overlapping headers
    borderRadius: 24, // More curved corners
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.10)", // Subtle border for depth
    overflow: "hidden", // For gradient overlay
    position: "relative",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0B0E10", // Dark text on mint green
    zIndex: 1, // Above gradient
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
    color: theme.colors.textLo,
  },
});
