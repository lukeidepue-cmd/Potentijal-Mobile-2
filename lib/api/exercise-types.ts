// lib/api/exercise-types.ts
// API functions for determining exercise types and their available metrics

import { supabase } from '../supabase';
import { ExerciseType, SportMode, mapModeKeyToSportMode } from '../types';

export type MetricOption = 
  | 'reps'
  | 'weight'
  | 'reps_x_weight'
  | 'attempted'
  | 'made'
  | 'percentage'
  | 'distance'
  | 'time_min'
  | 'avg_time_sec'
  | 'completed'
  | 'points';

/**
 * Get the primary exercise type for a given exercise name query
 * This determines what dropdown options to show in the progress graph
 */
export async function getPrimaryExerciseType(params: {
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

    const { data, error } = await supabase.rpc('get_primary_exercise_type', {
      p_user_id: user.id,
      p_mode: sportMode,
      p_query: params.query.trim(),
    });

    if (error) {
      return { data: null, error };
    }

    return { data: data as ExerciseType, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Get available metric options for an exercise type in a given sport mode
 * Based on documentation Section 2
 */
export function getMetricOptionsForExerciseType(
  exerciseType: ExerciseType,
  sportMode: SportMode
): MetricOption[] {
  switch (exerciseType) {
    case 'exercise':
      // Exercise type: Reps, Weight, Reps x Weight (all modes)
      return ['reps', 'weight', 'reps_x_weight'];
    
    case 'shooting':
      // Shooting type: 
      // - Basketball: Attempted, Made, Percentage
      // - Soccer, Hockey: Reps, Distance
      if (sportMode === 'basketball') {
        return ['attempted', 'made', 'percentage'];
      } else {
        // Soccer and Hockey
        return ['reps', 'distance'];
      }
    
    case 'drill':
      // Drill type (Basketball, Soccer, Hockey, Tennis): Reps, Time (min)
      return ['reps', 'time_min'];
    
    case 'sprints':
      // Sprints type (Football): Reps, Distance, Avg. Time (sec)
      return ['reps', 'distance', 'avg_time_sec'];
    
    case 'hitting':
      // Hitting type (Baseball): Reps, Distance (stored as distance in DB)
      // Note: The UI shows "Avg. Distance" but it's stored as distance field
      return ['reps', 'distance'];
    
    case 'fielding':
      // Fielding type (Baseball): Reps, Distance
      return ['reps', 'distance'];
    
    case 'rally':
      // Rally type (Tennis): Points, Time (min)
      return ['points', 'time_min'];
    
    default:
      return ['reps', 'weight', 'reps_x_weight'];
  }
}

/**
 * Get metric options for running mode
 * Running mode doesn't use exercise types, it has its own metrics
 */
export function getRunningMetricOptions(): ('distance_miles' | 'avg_pace_per_mile' | 'time_min')[] {
  return ['distance_miles', 'avg_pace_per_mile', 'time_min'];
}

