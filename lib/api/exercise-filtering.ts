/**
 * Exercise Filtering Utilities
 * Functions for filtering exercises based on view restrictions
 */

import { supabase } from '../supabase';
import { SportMode, ExerciseType, mapModeKeyToSportMode } from '../types';
import { getExerciseTypeRestrictionForView } from './progress-views';
import { TimeInterval } from '../utils/time-intervals';

/**
 * Format date as YYYY-MM-DD for database queries
 */
function formatDateForDB(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get available exercises for a specific view
 * Returns unique exercise names that match the view's exercise type restriction
 * Filters by time interval: only shows exercises logged within the past N days
 * 
 * @param mode - Sport mode
 * @param viewName - View name (e.g., "Performance", "Tonnage", "Shooting %")
 * @param timeInterval - Time interval in days (30, 90, 180, 360) - filters exercises to only those logged within this range
 * @returns Array of unique exercise names
 */
export async function getAvailableExercisesForView(
  mode: SportMode | string,
  viewName: string,
  timeInterval?: TimeInterval
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
      timeInterval,
    });

    // Build workout query with time interval filter
    let workoutQuery = supabase
      .from('workouts')
      .select('id, performed_at')
      .eq('user_id', user.id)
      .eq('mode', sportMode);

    // Apply time interval filter if provided
    // This ensures exercises only appear if they were logged within the selected time range
    if (timeInterval !== undefined) {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - timeInterval);
      startDate.setHours(0, 0, 0, 0);

      const startDateStr = formatDateForDB(startDate);
      const endDateStr = formatDateForDB(today);

      workoutQuery = workoutQuery
        .gte('performed_at', startDateStr)
        .lte('performed_at', endDateStr);
    }

    // Fetch workouts for this user and mode
    const { data: workouts, error: workoutError } = await workoutQuery
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
          console.log(`🔍 [ExerciseFiltering] Grouping similar names: "${name}" with "${original}"`);
          // Use the longer/more complete version
          if (name.length > original.length) {
            exerciseNames.delete(original);
            exerciseNames.add(name);
            normalizedNames.set(normalized, name);
            console.log(`   → Kept longer name: "${name}"`);
          } else {
            // Keep existing
            console.log(`   → Kept existing name: "${original}"`);
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

    console.log('🔍 [ExerciseFiltering] Final exercise names:', Array.from(exerciseNames).sort());

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
 * BUT: Don't group exercises that differ by numbers (e.g., "5ft" vs "11ft")
 */
function areNamesSimilar(name1: string, name2: string): boolean {
  const n1 = name1.toLowerCase().replace(/\s+/g, '');
  const n2 = name2.toLowerCase().replace(/\s+/g, '');
  
  // Exact match (after normalization)
  if (n1 === n2) return true;
  
  // Extract numbers from both names
  const extractNumbers = (str: string): string => {
    return str.replace(/\D/g, ''); // Remove all non-digits
  };
  
  const n1Numbers = extractNumbers(n1);
  const n2Numbers = extractNumbers(n2);
  
  // If both have numbers and they differ, don't group (e.g., "5ft" vs "11ft")
  if (n1Numbers.length > 0 && n2Numbers.length > 0) {
    if (n1Numbers !== n2Numbers) {
      return false; // Numbers differ, so don't group
    }
  }
  // If one has numbers and the other doesn't, don't group (e.g., "5ft" vs "ft")
  else if (n1Numbers.length > 0 || n2Numbers.length > 0) {
    return false;
  }
  
  // One contains the other (e.g., "benchpress" contains "bench press")
  // Only for non-numeric names
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
