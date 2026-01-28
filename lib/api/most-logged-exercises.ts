// lib/api/most-logged-exercises.ts
// API functions for fetching most logged exercises by time interval

import { supabase } from '../supabase';
import { SportMode, mapModeKeyToSportMode } from '../types';

// =====================================================
// Type Definitions
// =====================================================

export type TimeInterval = 30 | 90 | 180 | 360; // Days

export type MostLoggedExercise = {
  exerciseName: string;
  count: number; // Number of times logged (number of workout_exercises entries)
  mode: SportMode; // Mode where exercise was logged
  lastLogged?: string; // Date last logged (YYYY-MM-DD)
};

// =====================================================
// Helper Functions
// =====================================================

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
 * Fuzzy match exercise names - STRICT matching
 * Only matches:
 * 1. Exact match (case-insensitive)
 * 2. One character difference (typos) - BUT numbers must match exactly
 * 3. Normalized whitespace differences (spaces, hyphens, underscores)
 */
function fuzzyMatchExerciseName(exerciseName: string, query: string): boolean {
  if (!query || !query.trim()) return false; // Empty query matches nothing
  
  // Normalize both strings: lowercase, trim, normalize whitespace
  const normalize = (str: string): string => {
    return str
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .replace(/[-_]/g, ' '); // Hyphens and underscores to spaces
  };
  
  const nameNormalized = normalize(exerciseName);
  const queryNormalized = normalize(query);
  
  // 1. Exact match (case-insensitive, normalized)
  if (nameNormalized === queryNormalized) {
    return true;
  }
  
  // 2. Extract numbers from both strings and compare them
  // If numbers differ, don't match (e.g., "11ft" vs "17ft" should not match)
  const extractNumbers = (str: string): string => {
    return str.replace(/\D/g, ''); // Remove all non-digits
  };
  
  const nameNumbers = extractNumbers(nameNormalized);
  const queryNumbers = extractNumbers(queryNormalized);
  
  // If both have numbers and they differ, don't match
  if (nameNumbers.length > 0 && queryNumbers.length > 0) {
    if (nameNumbers !== queryNumbers) {
      return false; // Numbers differ, so don't match
    }
  }
  // If one has numbers and the other doesn't, don't match (e.g., "11ft" vs "ft")
  else if (nameNumbers.length > 0 || queryNumbers.length > 0) {
    return false;
  }
  
  // 3. One character difference (typo tolerance) - only for non-numeric characters
  // Calculate Levenshtein distance for single character differences
  const levenshteinDistance = (s1: string, s2: string): number => {
    const len1 = s1.length;
    const len2 = s2.length;
    const matrix: number[][] = [];
    
    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }
    
    // Fill matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,     // deletion
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j - 1] + 1   // substitution
          );
        }
      }
    }
    
    return matrix[len1][len2];
  };
  
  // Allow only 1 character difference (typo) - but numbers must match exactly (checked above)
  const distance = levenshteinDistance(nameNormalized, queryNormalized);
  if (distance <= 1) {
    return true;
  }
  
  return false;
}

/**
 * Group exercises by fuzzy matching
 * Returns a map of canonical name -> array of matching names
 */
function groupExercisesByFuzzyMatch(exerciseNames: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  const processed = new Set<string>();
  
  for (const name of exerciseNames) {
    if (processed.has(name)) continue;
    
    // Find all exercises that match this one
    const matches = [name];
    processed.add(name);
    
    for (const otherName of exerciseNames) {
      if (processed.has(otherName)) continue;
      
      if (fuzzyMatchExerciseName(name, otherName)) {
        matches.push(otherName);
        processed.add(otherName);
      }
    }
    
    // Use the longest/most complete name as the canonical name
    const canonical = matches.reduce((a, b) => a.length > b.length ? a : b);
    groups.set(canonical, matches);
  }
  
  return groups;
}

// =====================================================
// Main API Functions
// =====================================================

/**
 * Get most logged exercises for a specific mode and time interval
 * Returns top exercises sorted by count (descending)
 */
export async function getMostLoggedExercises(
  mode: SportMode | string,
  timeInterval: TimeInterval,
  limit: number = 10
): Promise<{ data: MostLoggedExercise[]; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: [], error: { message: 'User not authenticated' } };
    }

    const sportMode = typeof mode === 'string' 
      ? mapModeKeyToSportMode(mode) 
      : mode;

    // Calculate date range
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - timeInterval);
    startDate.setHours(0, 0, 0, 0);

    const startDateStr = formatDateForDB(startDate);
    const endDateStr = formatDateForDB(today);

    // Step 1: Fetch workouts within time interval for this mode
    const { data: workouts, error: workoutError } = await supabase
      .from('workouts')
      .select('id, performed_at')
      .eq('user_id', user.id)
      .eq('mode', sportMode)
      .gte('performed_at', startDateStr)
      .lte('performed_at', endDateStr)
      .order('performed_at', { ascending: false });

    if (workoutError) {
      console.error('❌ [MostLoggedExercises] Error fetching workouts:', workoutError);
      return { data: [], error: workoutError };
    }

    if (!workouts || workouts.length === 0) {
      return { data: [], error: null }; // No workouts in this time period
    }

    const workoutIds = workouts.map(w => w.id);
    const workoutDates = new Map<string, string>(); // workout_id -> performed_at
    workouts.forEach(w => {
      workoutDates.set(w.id, w.performed_at);
    });

    // Step 2: Fetch all exercises for these workouts
    const { data: exercises, error: exerciseError } = await supabase
      .from('workout_exercises')
      .select('id, name, workout_id')
      .in('workout_id', workoutIds);

    if (exerciseError) {
      console.error('❌ [MostLoggedExercises] Error fetching exercises:', exerciseError);
      return { data: [], error: exerciseError };
    }

    if (!exercises || exercises.length === 0) {
      return { data: [], error: null }; // No exercises found
    }

    // Step 3: Group exercises by fuzzy matching
    // Filter out empty/null exercise names
    const exerciseNames = exercises
      .map((ex: any) => ex.name || '')
      .filter((name: string) => name && name.trim().length > 0);
    
    if (exerciseNames.length === 0) {
      return { data: [], error: null }; // No valid exercise names
    }
    
    const groupedExercises = groupExercisesByFuzzyMatch(exerciseNames);

    // Step 4: Count occurrences and get last logged date for each group
    const exerciseCounts: Map<string, { count: number; lastLogged: string }> = new Map();

    groupedExercises.forEach((matchingNames, canonicalName) => {
      let count = 0;
      let lastLogged = '';

      // Count all exercises that match this canonical name
      exercises.forEach((ex: any) => {
        const exName = ex.name || '';
        // Skip empty names
        if (!exName || !exName.trim()) {
          return;
        }
        
        if (matchingNames.some(name => fuzzyMatchExerciseName(exName, name))) {
          count++;
          const workoutDate = workoutDates.get(ex.workout_id) || '';
          // Only update lastLogged if date is valid and greater than current
          if (workoutDate && workoutDate.trim() && workoutDate > lastLogged) {
            lastLogged = workoutDate;
          }
        }
      });

      // Only add exercises with count > 0
      if (count > 0) {
        exerciseCounts.set(canonicalName, { count, lastLogged });
      }
    });

    // Step 5: Convert to array and sort by count (descending), then by last logged (descending), then alphabetically
    const result: MostLoggedExercise[] = Array.from(exerciseCounts.entries())
      .map(([exerciseName, data]) => ({
        exerciseName: exerciseName.trim(), // Ensure no leading/trailing whitespace
        count: data.count,
        mode: sportMode,
        lastLogged: (data.lastLogged && data.lastLogged.trim()) || undefined,
      }))
      .filter(ex => ex.exerciseName.length > 0) // Filter out any empty names
      .sort((a, b) => {
        // First sort by count (descending)
        if (b.count !== a.count) {
          return b.count - a.count;
        }
        // If counts are equal, sort by last logged (descending - most recent first)
        if (a.lastLogged && b.lastLogged) {
          const dateCompare = b.lastLogged.localeCompare(a.lastLogged);
          if (dateCompare !== 0) {
            return dateCompare;
          }
        }
        // If dates are equal or both missing, sort alphabetically by name
        return a.exerciseName.localeCompare(b.exerciseName);
      })
      .slice(0, limit); // Limit results

    return { data: result, error: null };
  } catch (error: any) {
    console.error('❌ [MostLoggedExercises] Exception:', error);
    return { data: [], error };
  }
}
