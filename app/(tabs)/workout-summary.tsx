// app/(tabs)/workout-summary.tsx
// Workout summary/overview screen shown after "Save Workout"
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { saveCompleteWorkout } from '../../lib/api/workouts';
import type { WorkoutDetails } from '../../lib/api/workouts';

export default function WorkoutSummaryScreen() {
  const params = useLocalSearchParams<{ workoutData?: string; workoutId?: string | string[] }>();
  const [workout, setWorkout] = useState<WorkoutDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [workoutId, setWorkoutId] = useState<string | null>(null);

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

  const handleFinishWorkout = async () => {
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
        Alert.alert('Error', error.message || 'Failed to save workout.');
        return;
      }
      
      if (savedWorkoutId) {
        setWorkoutId(savedWorkoutId);
        Alert.alert('Success', 'Workout saved to history!', [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to home tab (not workouts tab)
              router.replace('/(tabs)/(home)');
            },
          },
        ]);
      }
    } catch (error: any) {
      setFinishing(false);
      Alert.alert('Error', 'An unexpected error occurred.');
      console.error('Save workout error:', error);
    }
  };

  const handleBack = () => {
    // Navigate back to workouts tab (not just back, which might go to home)
    router.replace('/(tabs)/workouts');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textHi} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.colors.textHi }]}>Workout Summary</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  if (!workout) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textHi} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.colors.textHi }]}>Workout Summary</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={{ color: theme.colors.textLo }}>Workout not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg0 }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textHi} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.textHi }]}>Workout Summary</Text>
        <View style={{ width: 40 }} /> {/* Spacer for centering */}
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Workout Name */}
        <View style={styles.section}>
          <Text style={[styles.workoutName, { color: theme.colors.textHi }]}>{String(workout.name || '')}</Text>
          <Text style={[styles.workoutDate, { color: theme.colors.textLo }]}>
            {workout.performedAt ? new Date(workout.performedAt).toLocaleDateString() : ''}
          </Text>
        </View>

        {/* Exercises */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textHi }]}>Exercises</Text>
          {(workout.exercises || []).map((exercise, exerciseIdx) => {
            // Ensure key is always a string to avoid text rendering errors
            const exerciseKey = exercise.id ? String(exercise.id) : `exercise-${String(exerciseIdx)}`;
            const setsCount = exercise.sets ? exercise.sets.length : 0;
            const exerciseName = String(exercise.name || '');
            const exerciseType = String(exercise.type || '');
            const setsText = String(setsCount !== 1 ? 'sets' : 'set');
            
            return (
              <View key={exerciseKey} style={[styles.exerciseCard, { backgroundColor: theme.colors.bg1 }]}>
                <View style={styles.exerciseHeader}>
                  <Text style={[styles.exerciseName, { color: theme.colors.textHi }]}>
                    {exerciseName}
                  </Text>
                  <Text style={[styles.exerciseType, { color: theme.colors.textLo }]}>
                    {exerciseType}
                  </Text>
                </View>
                <Text style={[styles.setCount, { color: theme.colors.textLo }]}>
                  {String(setsCount)} {setsText}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer Actions */}
      <View style={[styles.footer, { backgroundColor: theme.colors.bg0, borderTopColor: theme.colors.bg1 }]}>
        <Pressable
          onPress={handleBack}
          style={[styles.button, styles.backButtonFooter, { borderColor: theme.colors.bg2 }]}
        >
          <Text style={[styles.buttonText, { color: theme.colors.textHi }]}>Back to Edit</Text>
        </Pressable>
        <Pressable
          onPress={handleFinishWorkout}
          disabled={finishing}
          style={[styles.button, styles.finishButton, { backgroundColor: theme.colors.primary }]}
        >
          {finishing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[styles.buttonText, { color: '#fff' }]}>Finish Workout</Text>
          )}
        </Pressable>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 60,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 24,
  },
  section: {
    gap: 12,
  },
  workoutName: {
    fontSize: 24,
    fontWeight: '700',
  },
  workoutDate: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  exerciseCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  exerciseType: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  setCount: {
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonFooter: {
    borderWidth: 1,
  },
  finishButton: {
    // backgroundColor set inline
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});


