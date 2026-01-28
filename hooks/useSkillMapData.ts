/**
 * Skill Map Data Hook
 * Fetches and calculates skill map data for selected exercises
 * Uses the same view logic as Progress Graphs but calculates for entire time interval
 */

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import { SportMode, mapModeKeyToSportMode } from '../lib/types';
import { getViewConfig, getCalculationTypeForView, getExerciseTypeRestrictionForView } from '../lib/api/progress-views';
import { TimeInterval } from '../lib/utils/time-intervals';
import { calculateViewValueForInterval, ExerciseData, SetData } from '../lib/api/progress-view-calculations';

/**
 * Skill Map exercise data structure
 */
export interface SkillMapExerciseData {
  exerciseName: string;
  rawValue: number; // The calculated metric value
  percentage: number; // Percentage relative to highest (0-100)
  isHighest: boolean; // True if this is the highest value
}

/**
 * Hook return type
 */
export interface UseSkillMapDataResult {
  data: SkillMapExerciseData[] | null;
  highestValue: number | null;
  loading: boolean;
  error: any;
}

/**
 * Hook parameters
 */
export interface UseSkillMapDataParams {
  mode: SportMode | string;
  view: string; // View name (e.g., "Performance", "Tonnage", "Shooting %")
  exercises: string[]; // Array of up to 6 exercise names
  timeInterval: TimeInterval;
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
 * Format date as YYYY-MM-DD for database queries
 */
function formatDateForDB(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Main hook for skill map data
 */
export function useSkillMapData(params: UseSkillMapDataParams): UseSkillMapDataResult {
  const { user } = useAuth();
  const [data, setData] = useState<SkillMapExerciseData[] | null>(null);
  const [highestValue, setHighestValue] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      setData(null);
      setHighestValue(null);
      return;
    }

    // Don't fetch if no view selected or no exercises
    if (!params.view || !params.exercises || params.exercises.length === 0) {
      setData(null);
      setHighestValue(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const sportMode = typeof params.mode === 'string' 
      ? mapModeKeyToSportMode(params.mode) 
      : params.mode;

    // Get view configuration
    const viewConfig = getViewConfig(sportMode, params.view);
    if (!viewConfig) {
      setError({ message: `View "${params.view}" not found for mode ${sportMode}` });
      setLoading(false);
      return;
    }

    const calculationType = getCalculationTypeForView(sportMode, params.view);
    const exerciseTypeRestriction = getExerciseTypeRestrictionForView(sportMode, params.view);

    if (!calculationType || !exerciseTypeRestriction) {
      setError({ message: 'Invalid view configuration' });
      setLoading(false);
      return;
    }

    // Calculate time range (entire interval, not bucketed)
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - params.timeInterval);
    startDate.setHours(0, 0, 0, 0);

    const startDateStr = formatDateForDB(startDate);
    const endDateStr = formatDateForDB(today);

    console.log('🔍 [SkillMap] Fetching data:', {
      mode: sportMode,
      view: params.view,
      exercises: params.exercises,
      timeInterval: params.timeInterval,
      dateRange: `${startDateStr} to ${endDateStr}`,
      exerciseTypeRestriction,
    });

    // Step 1: Fetch workouts
    supabase
      .from('workouts')
      .select('id, performed_at, mode')
      .eq('user_id', user.id)
      .eq('mode', sportMode)
      .gte('performed_at', startDateStr)
      .lte('performed_at', endDateStr)
      .order('performed_at', { ascending: false })
      .then(async ({ data: workouts, error: workoutError }) => {
        if (workoutError) {
          console.error('❌ [SkillMap] Workout query error:', workoutError);
          setError(workoutError);
          setLoading(false);
          return;
        }

        if (!workouts || workouts.length === 0) {
          console.log('✅ [SkillMap] No workouts found');
          setData([]);
          setHighestValue(null);
          setLoading(false);
          return;
        }

        const workoutIds = workouts.map(w => w.id);
        const workoutDateMap = new Map(workouts.map(w => [w.id, w.performed_at]));

        // Step 2: Fetch exercises (filtered by exercise type restriction)
        const { data: exercises, error: exercisesError } = await supabase
          .from('workout_exercises')
          .select('id, workout_id, name, exercise_type')
          .in('workout_id', workoutIds)
          .eq('exercise_type', exerciseTypeRestriction);

        if (exercisesError) {
          console.error('❌ [SkillMap] Exercises query error:', exercisesError);
          setError(exercisesError);
          setLoading(false);
          return;
        }

        if (!exercises || exercises.length === 0) {
          console.log('✅ [SkillMap] No exercises found for exercise type:', exerciseTypeRestriction);
          setData([]);
          setHighestValue(null);
          setLoading(false);
          return;
        }

        // Step 3: Filter exercises by name (fuzzy matching for each selected exercise)
        const matchedExercises: ExerciseData[] = [];
        const exerciseNameMap = new Map<string, string>(); // Map exercise name to canonical name
        const selectedToCanonicalMap = new Map<string, string>(); // Map selected exercise to canonical name

        console.log('🔍 [SkillMap] Matching exercises:', {
          selectedExercises: params.exercises,
          totalExercisesInDB: exercises.length,
        });

        for (const selectedExercise of params.exercises) {
          // Find all exercises that match this selected exercise name
          const matching = exercises.filter(ex => 
            fuzzyMatchExerciseName(ex.name, selectedExercise)
          );

          console.log(`🔍 [SkillMap] Matching "${selectedExercise}":`, {
            matches: matching.length,
            matchedNames: matching.map(m => m.name),
          });

          if (matching.length > 0) {
            // Use the most common name (or first match) as canonical name
            const canonicalName = matching[0].name;
            selectedToCanonicalMap.set(selectedExercise, canonicalName);
            
            // Add all matching exercises to our list
            for (const ex of matching) {
              matchedExercises.push({
                id: ex.id,
                workout_id: ex.workout_id,
                name: ex.name,
                exercise_type: ex.exercise_type as any,
                performed_at: workoutDateMap.get(ex.workout_id) || '',
              });
              // Map all variations to canonical name
              exerciseNameMap.set(ex.name, canonicalName);
            }
          } else {
            console.warn(`⚠️ [SkillMap] No matches found for selected exercise: "${selectedExercise}"`);
          }
        }

        if (matchedExercises.length === 0) {
          console.log('✅ [SkillMap] No exercises matched selected exercise names');
          setData([]);
          setHighestValue(null);
          setLoading(false);
          return;
        }

        const matchedExerciseIds = matchedExercises.map(e => e.id);

        // Step 4: Fetch sets for matched exercises
        const { data: sets, error: setsError } = await supabase
          .from('workout_sets')
          .select('*')
          .in('workout_exercise_id', matchedExerciseIds)
          .order('set_index', { ascending: true });

        if (setsError) {
          console.error('❌ [SkillMap] Sets query error:', setsError);
          setError(setsError);
          setLoading(false);
          return;
        }

        if (!sets || sets.length === 0) {
          console.log('✅ [SkillMap] No sets found for matched exercises');
          setData([]);
          setHighestValue(null);
          setLoading(false);
          return;
        }

        // Parse sets to ensure 0 values are preserved (not converted to null)
        const parsedSets: SetData[] = (sets || []).map(s => ({
          id: s.id,
          workout_exercise_id: s.workout_exercise_id,
          set_index: s.set_index,
          reps: s.reps != null ? Number(s.reps) : null,
          weight: s.weight != null ? Number(s.weight) : null,
          attempted: s.attempted != null ? Number(s.attempted) : null,
          made: s.made != null ? Number(s.made) : null,
          distance: s.distance != null ? Number(s.distance) : null,
          time_min: s.time_min != null ? Number(s.time_min) : null,
          avg_time_sec: s.avg_time_sec != null ? Number(s.avg_time_sec) : null,
          completed: (() => {
            if (s.completed == null || s.completed === '') return null;
            if (typeof s.completed === 'number') return s.completed;
            if (typeof s.completed === 'boolean') return s.completed ? 1 : 0;
            const parsed = parseFloat(String(s.completed));
            return isNaN(parsed) ? null : parsed;
          })(),
          points: s.points ? Number(s.points) : null,
        }));

        // Step 5: Group exercises by canonical name and calculate values
        // IMPORTANT: We need to preserve the order of selected exercises
        // Use selectedToCanonicalMap to maintain order and ensure all selected exercises are represented
        const exerciseGroups = new Map<string, ExerciseData[]>();
        
        for (const exercise of matchedExercises) {
          const canonicalName = exerciseNameMap.get(exercise.name) || exercise.name;
          if (!exerciseGroups.has(canonicalName)) {
            exerciseGroups.set(canonicalName, []);
          }
          exerciseGroups.get(canonicalName)!.push(exercise);
        }

        console.log('🔍 [SkillMap] Exercise groups:', {
          groupCount: exerciseGroups.size,
          groups: Array.from(exerciseGroups.keys()),
          selectedExercises: params.exercises,
          selectedToCanonical: Array.from(selectedToCanonicalMap.entries()),
        });

        // Step 6: Calculate view value for each exercise group
        // Process in the order of selected exercises to maintain order
        const exerciseResults: Array<{ name: string; value: number; originalSelected: string }> = [];
        const processedCanonicalNames = new Set<string>();

        // Process exercises in the order they were selected
        for (const selectedExercise of params.exercises) {
          const canonicalName = selectedToCanonicalMap.get(selectedExercise);
          
          // Handle case where selected exercise didn't match anything in database
          if (!canonicalName) {
            console.warn(`⚠️ [SkillMap] Selected exercise "${selectedExercise}" had no matches in database`);
            // Still add it with value 0 so user can see it was selected but has no data
            exerciseResults.push({
              name: selectedExercise, // Use the selected name directly
              value: 0,
              originalSelected: selectedExercise,
            });
            console.log(`✅ [SkillMap] Added unmatched exercise "${selectedExercise}" with value 0`);
            continue;
          }

          // Skip if we've already processed this canonical name
          if (processedCanonicalNames.has(canonicalName)) {
            console.log(`🔵 [SkillMap] Canonical name "${canonicalName}" already processed, skipping duplicate`);
            continue;
          }

          const exerciseGroup = exerciseGroups.get(canonicalName);
          if (!exerciseGroup || exerciseGroup.length === 0) {
            console.warn(`⚠️ [SkillMap] No exercise group found for canonical name: "${canonicalName}"`);
            continue;
          }

          const exerciseIds = exerciseGroup.map(e => e.id);
          const exerciseSets = parsedSets.filter(s => 
            exerciseIds.includes(s.workout_exercise_id)
          );

          const value = calculateViewValueForInterval(
            sportMode,
            calculationType,
            exerciseGroup,
            exerciseSets
          );

          if (value !== null && value !== undefined) {
            exerciseResults.push({
              name: canonicalName,
              value,
              originalSelected: selectedExercise,
            });
            processedCanonicalNames.add(canonicalName);
            console.log(`✅ [SkillMap] Added exercise "${canonicalName}" (selected as "${selectedExercise}") with value: ${value}`);
          } else {
            console.warn(`⚠️ [SkillMap] No value calculated for "${canonicalName}" (selected as "${selectedExercise}") - value is null/undefined`);
            // Still add it with value 0 so it appears in the chart (user can see it has no data)
            exerciseResults.push({
              name: canonicalName,
              value: 0,
              originalSelected: selectedExercise,
            });
            processedCanonicalNames.add(canonicalName);
          }
        }

        console.log('🔍 [SkillMap] Exercise results before sorting:', {
          count: exerciseResults.length,
          results: exerciseResults.map(r => ({ name: r.name, value: r.value, selected: r.originalSelected })),
        });

        if (exerciseResults.length === 0) {
          console.log('✅ [SkillMap] No valid values calculated for exercises');
          setData([]);
          setHighestValue(null);
          setLoading(false);
          return;
        }

        // Step 7: Find highest value (exclude zeros to avoid division issues)
        const nonZeroValues = exerciseResults.map(r => r.value).filter(v => v > 0);
        const maxValue = nonZeroValues.length > 0 ? Math.max(...nonZeroValues) : 0;

        // Step 8: Calculate percentages
        // Maintain the order of selected exercises (don't sort)
        const skillMapData: SkillMapExerciseData[] = exerciseResults.map(result => {
          let percentage = 0;
          if (maxValue > 0 && result.value > 0) {
            percentage = (result.value / maxValue) * 100;
          } else if (result.value === 0) {
            percentage = 0; // Exercises with no data show as 0%
          }
          
          return {
            exerciseName: result.name,
            rawValue: result.value,
            percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
            isHighest: result.value === maxValue && maxValue > 0, // Only mark as highest if value > 0
          };
        });

        // Don't sort - maintain the order of selected exercises
        // This ensures all exercises appear in the radar chart in the order they were selected

        console.log('✅ [SkillMap] Calculated skill map data:', {
          selectedExercisesCount: params.exercises.length,
          resultCount: skillMapData.length,
          highestValue: maxValue,
          selectedExercises: params.exercises,
          resultExercises: skillMapData.map(d => d.exerciseName),
          data: skillMapData.map(d => ({
            name: d.exerciseName,
            rawValue: d.rawValue,
            percentage: d.percentage,
            isHighest: d.isHighest,
          })),
        });

        // Warn if we're missing exercises
        if (skillMapData.length < params.exercises.length) {
          console.warn(`⚠️ [SkillMap] Missing exercises! Selected ${params.exercises.length}, but only ${skillMapData.length} in results.`);
          console.warn(`   Selected: ${params.exercises.join(', ')}`);
          console.warn(`   Results: ${skillMapData.map(d => d.exerciseName).join(', ')}`);
        }

        setData(skillMapData);
        setHighestValue(maxValue);
        setLoading(false);
      })
      .catch((err) => {
        console.error('❌ [SkillMap] Exception:', err);
        setError(err);
        setLoading(false);
      });
  }, [user, params.mode, params.view, JSON.stringify(params.exercises), params.timeInterval]);

  return {
    data,
    highestValue,
    loading,
    error,
  };
}
