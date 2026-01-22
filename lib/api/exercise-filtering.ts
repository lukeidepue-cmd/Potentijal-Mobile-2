/**
 * Exercise Filtering Utilities
 * Functions for filtering exercises based on view restrictions
 */

import { supabase } from '../supabase';
import { SportMode, ExerciseType, mapModeKeyToSportMode } from '../types';
import { getExerciseTypeRestrictionForView } from './progress-views';

/**
 * Get available exercises for a specific view
 * Returns unique exercise names that match the view's exercise type restriction
 * 
 * @param mode - Sport mode
 * @param viewName - View name (e.g., "Performance", "Tonnage", "Shooting %")
 * @returns Array of unique exercise names
 */
export async function getAvailableExercisesForView(
  mode: SportMode | string,
  viewName: string
): Promise<{ data: string[]; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: [], error: { message: 'User not authenticated' } };
    }

    const sportMode = typeof mode === 'string' 
      ? mapModeKeyToSportMode(mode) 
      : mode;

    // Get exercise type restriction for this view
    const exerciseTypeRestriction = getExerciseTypeRestrictionForView(sportMode, viewName);
    
    if (!exerciseTypeRestriction) {
      return { data: [], error: { message: `View "${viewName}" not found for mode ${sportMode}` } };
    }

    console.log('🔍 [ExerciseFiltering] Getting exercises for view:', {
      mode: sportMode,
      view: viewName,
      exerciseTypeRestriction,
    });

    // Fetch workouts for this user and mode
    const { data: workouts, error: workoutError } = await supabase
      .from('workouts')
      .select('id')
      .eq('user_id', user.id)
      .eq('mode', sportMode)
      .limit(1000); // Reasonable limit

    if (workoutError) {
      return { data: [], error: workoutError };
    }

    if (!workouts || workouts.length === 0) {
      return { data: [], error: null };
    }

    const workoutIds = workouts.map(w => w.id);

    // Fetch exercises that match the exercise type restriction
    const { data: exercises, error: exercisesError } = await supabase
      .from('workout_exercises')
      .select('name, exercise_type')
      .in('workout_id', workoutIds)
      .eq('exercise_type', exerciseTypeRestriction);

    if (exercisesError) {
      return { data: [], error: exercisesError };
    }

    if (!exercises || exercises.length === 0) {
      return { data: [], error: null };
    }

    // Extract unique exercise names
    // Use a Set to deduplicate, but also group similar names together
    const exerciseNames = new Set<string>();
    const normalizedNames = new Map<string, string>(); // normalized -> original

    exercises.forEach((ex: any) => {
      const name = (ex.name || '').trim();
      if (!name) return;

      // Normalize name for grouping (lowercase, remove extra spaces)
      const normalized = name.toLowerCase().replace(/\s+/g, ' ').trim();
      
      // Check if we already have a similar name
      let found = false;
      for (const [norm, original] of normalizedNames.entries()) {
        // If names are very similar (fuzzy match), use the existing one
        if (areNamesSimilar(normalized, norm)) {
          // Use the longer/more complete version
          if (name.length > original.length) {
            exerciseNames.delete(original);
            exerciseNames.add(name);
            normalizedNames.set(normalized, name);
          } else {
            // Keep existing
          }
          found = true;
          break;
        }
      }

      if (!found) {
        exerciseNames.add(name);
        normalizedNames.set(normalized, name);
      }
    });

    const uniqueNames = Array.from(exerciseNames).sort();

    console.log('✅ [ExerciseFiltering] Found exercises:', uniqueNames.length);

    return { data: uniqueNames, error: null };
  } catch (error: any) {
    console.error('❌ [ExerciseFiltering] Error:', error);
    return { data: [], error };
  }
}

/**
 * Check if two exercise names are similar (for grouping)
 * Used to group variations like "bench press" and "Bench Press"
 */
function areNamesSimilar(name1: string, name2: string): boolean {
  const n1 = name1.toLowerCase().replace(/\s+/g, '');
  const n2 = name2.toLowerCase().replace(/\s+/g, '');
  
  // Exact match (after normalization)
  if (n1 === n2) return true;
  
  // One contains the other (e.g., "benchpress" contains "bench press")
  if (n1.includes(n2) || n2.includes(n1)) {
    // Only consider similar if the difference is small (e.g., just spacing/casing)
    const lengthDiff = Math.abs(n1.length - n2.length);
    if (lengthDiff <= 2) return true; // Allow small differences (spaces, etc.)
  }
  
  return false;
}

/**
 * Get available exercises for a view with search/filter
 * Filters the available exercises by a search query
 * 
 * @param mode - Sport mode
 * @param viewName - View name
 * @param searchQuery - Optional search query to filter exercises
 * @returns Array of exercise names matching the search
 */
export async function searchExercisesForView(
  mode: SportMode | string,
  viewName: string,
  searchQuery?: string
): Promise<{ data: string[]; error: any }> {
  const { data: allExercises, error } = await getAvailableExercisesForView(mode, viewName);
  
  if (error) {
    return { data: [], error };
  }

  if (!searchQuery || !searchQuery.trim()) {
    return { data: allExercises, error: null };
  }

  // Filter exercises by search query (fuzzy matching)
  const queryLower = searchQuery.toLowerCase().trim();
  const filtered = allExercises.filter(exerciseName => {
    return fuzzyMatchExerciseName(exerciseName, queryLower);
  });

  return { data: filtered, error: null };
}

/**
 * Fuzzy match exercise names (reused from hook)
 */
function fuzzyMatchExerciseName(exerciseName: string, query: string): boolean {
  const nameLower = exerciseName.toLowerCase().trim();
  const queryLower = query.toLowerCase().trim();
  
  if (!queryLower) return true; // Empty query matches all
  
  const nameNoSpaces = nameLower.replace(/\s+/g, '');
  const queryNoSpaces = queryLower.replace(/\s+/g, '');
  
  // Split into words for better matching
  const nameWords = nameLower.split(/\s+/).filter(w => w.length > 2);
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
  
  // Exact or substring match
  if (nameLower.includes(queryLower) || 
      queryLower.includes(nameLower) ||
      nameNoSpaces.includes(queryNoSpaces) ||
      queryNoSpaces.includes(nameNoSpaces)) {
    return true;
  }
  
  // Word-based matching
  if (queryWords.length > 0) {
    const wordMatch = queryWords.some(qw => 
      nameWords.some(nw => nw.includes(qw) || qw.includes(nw))
    );
    if (wordMatch) return true;
  }
  
  // Starts with match
  if (nameLower.startsWith(queryLower) ||
      queryLower.startsWith(nameLower) ||
      nameWords.some(nw => nw.startsWith(queryLower)) ||
      queryWords.some(qw => nameWords.some(nw => nw.startsWith(qw)))) {
    return true;
  }
  
  return false;
}
