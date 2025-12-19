// lib/api/exercise-types-direct.ts
// Direct query version - bypasses RPC for exercise type detection

import { supabase } from '../supabase';
import { ExerciseType, SportMode, mapModeKeyToSportMode } from '../types';

/**
 * Get the primary exercise type for a given exercise name query
 * Uses direct queries instead of RPC to avoid type errors
 */
export async function getPrimaryExerciseTypeDirect(params: {
  mode: SportMode | string;
  query: string;
}): Promise<{ data: ExerciseType | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    const sportMode = typeof params.mode === 'string' 
      ? mapModeKeyToSportMode(params.mode) 
      : params.mode;

    const queryLower = params.query.toLowerCase().trim();
    
    // First get workouts for this user and mode
    const { data: workouts, error: workoutError } = await supabase
      .from('workouts')
      .select('id')
      .eq('user_id', user.id)
      .eq('mode', sportMode)
      .limit(1000);

    if (workoutError) {
      return { data: null, error: workoutError };
    }

    if (!workouts || workouts.length === 0) {
      return { data: 'exercise', error: null }; // Default to exercise
    }

    const workoutIds = workouts.map(w => w.id);

    // Then get exercises for these workouts
    const { data: exercises, error } = await supabase
      .from('workout_exercises')
      .select('id, name, exercise_type')
      .in('workout_id', workoutIds);

    if (error) {
      return { data: null, error };
    }

    if (!exercises || exercises.length === 0) {
      return { data: 'exercise', error: null }; // Default to exercise
    }

    // Fuzzy match exercises
    const matchingExercises = exercises.filter((ex: any) => {
      const nameLower = (ex.name || '').toLowerCase();
      const nameNoSpaces = nameLower.replace(/\s+/g, '');
      const queryNoSpaces = queryLower.replace(/\s+/g, '');
      
      return nameLower.includes(queryLower) || 
             queryLower.includes(nameLower) ||
             nameNoSpaces.includes(queryNoSpaces) ||
             queryNoSpaces.includes(nameNoSpaces) ||
             nameLower.startsWith(queryLower) ||
             queryLower.startsWith(nameLower);
    });

    if (matchingExercises.length === 0) {
      return { data: 'exercise', error: null }; // Default to exercise
    }

    // Count exercise types for matching exercises
    const typeCounts = new Map<ExerciseType, number>();
    matchingExercises.forEach((ex: any) => {
      const type = ex.exercise_type as ExerciseType;
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
    });

    // Return the most common type
    let mostCommonType: ExerciseType = 'exercise';
    let maxCount = 0;
    typeCounts.forEach((count, type) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommonType = type;
      }
    });

    return { data: mostCommonType, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

