// lib/api/personal-records.ts
// API functions for fetching and calculating personal records

import { supabase } from '../supabase';
import { SportMode, ExerciseType, mapModeKeyToSportMode } from '../types';
import { getPrimaryExerciseTypeDirect } from './exercise-types-direct';

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

// =====================================================
// Type Definitions
// =====================================================

export type PersonalRecord = {
  exerciseName: string;
  mode: SportMode;
  exerciseType: ExerciseType;
  records: {
    // Exercise type records
    repsXWeight?: number | null; // Highest reps × weight
    reps?: number | null; // Highest reps
    weight?: number | null; // Highest weight
    
    // Shooting (basketball) records
    shootingPercentage?: number | null; // Highest percentage
    attempted?: number | null; // Highest attempted
    made?: number | null; // Highest made
    
    // Shooting (soccer/hockey) records
    distance?: number | null; // Highest distance
    shotsReps?: number | null; // Highest reps (for shots view)
    
    // Drill records
    drillReps?: number | null; // Highest reps
    time?: number | null; // Highest time (minutes)
    completionPercentage?: number | null; // Highest completion % (football drill)
    repsPerMinute?: number | null; // Highest reps/min (for all drill exercises)
    
    // Sprints (football) records
    sprintDistance?: number | null; // Highest distance
    speed?: number | null; // Highest speed (distance / avg_time)
    sprintReps?: number | null; // Highest reps
    
    // Hitting (baseball) records
    hittingReps?: number | null; // Highest reps
    avgDistance?: number | null; // Highest avg_distance (stored as distance in DB)
    
    // Fielding (baseball) records
    fieldingRepsXDistance?: number | null; // Highest (reps × distance)
    fieldingReps?: number | null; // Highest reps
    fieldingDistance?: number | null; // Highest distance
    
    // Rally (tennis) records
    points?: number | null; // Highest points
    rallyTime?: number | null; // Highest time (minutes)
  };
  dateAchieved?: string; // Date when record was achieved (YYYY-MM-DD)
};

// =====================================================
// Helper Functions
// =====================================================

/**
 * Find highest value and date for a given calculation function
 * Handles edge cases: null values, NaN, Infinity, zero values, invalid dates
 */
function findHighestValueAndDate<T>(
  sets: any[],
  calculateValue: (set: any) => number | null,
  getDate: (set: any) => string
): { value: number | null; date: string | null } {
  let maxValue: number | null = null;
  let maxDate: string | null = null;

  for (const set of sets) {
    const value = calculateValue(set);
    
    // Skip null, NaN, or Infinity values
    if (value === null || isNaN(value) || !isFinite(value)) {
      continue;
    }
    
    // Skip negative values (invalid data)
    if (value < 0) {
      continue;
    }
    
    const currentDate = getDate(set);
    
    // Skip if date is invalid or empty
    if (!currentDate || currentDate.trim() === '') {
      continue;
    }
    
    // Update max value and date
    if (maxValue === null || value > maxValue) {
      maxValue = value;
      maxDate = currentDate;
    } else if (value === maxValue && maxDate) {
      // If same value, use most recent date
      if (currentDate > maxDate) {
        maxDate = currentDate;
      }
    }
  }

  return { value: maxValue, date: maxDate };
}

// =====================================================
// Main API Functions
// =====================================================

/**
 * Get personal records for a specific exercise in a specific mode
 * Returns all-time best values for that exercise
 */
export async function getPersonalRecords(
  exerciseName: string,
  mode: SportMode | string
): Promise<{ data: PersonalRecord | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    const sportMode = typeof mode === 'string' 
      ? mapModeKeyToSportMode(mode) 
      : mode;

    // Step 1: Detect exercise type
    const { data: exerciseType, error: typeError } = await getPrimaryExerciseTypeDirect({
      mode: sportMode,
      query: exerciseName,
    });

    if (typeError) {
      console.error('❌ [PersonalRecords] Error detecting exercise type:', typeError);
      return { data: null, error: typeError };
    }

    if (!exerciseType) {
      return { data: null, error: { message: 'Could not determine exercise type' } };
    }

    // Step 2: Fetch ALL workouts (all-time) for this mode
    const { data: workouts, error: workoutError } = await supabase
      .from('workouts')
      .select('id, performed_at')
      .eq('user_id', user.id)
      .eq('mode', sportMode)
      .order('performed_at', { ascending: false });

    if (workoutError) {
      console.error('❌ [PersonalRecords] Error fetching workouts:', workoutError);
      return { data: null, error: workoutError };
    }

    if (!workouts || workouts.length === 0) {
      return { data: null, error: null }; // No workouts for this mode
    }

    const workoutIds = workouts.map(w => w.id);
    const workoutDates = new Map<string, string>(); // workout_id -> performed_at
    workouts.forEach(w => {
      workoutDates.set(w.id, w.performed_at);
    });

    // Step 3: Fetch exercises matching the name (fuzzy match)
    const { data: exercises, error: exerciseError } = await supabase
      .from('workout_exercises')
      .select('id, name, workout_id, exercise_type')
      .in('workout_id', workoutIds)
      .eq('exercise_type', exerciseType);

    if (exerciseError) {
      console.error('❌ [PersonalRecords] Error fetching exercises:', exerciseError);
      return { data: null, error: exerciseError };
    }

    if (!exercises || exercises.length === 0) {
      return { data: null, error: null }; // No exercises found
    }

    // Filter exercises using fuzzy matching
    const matchingExercises = exercises.filter((ex: any) => 
      fuzzyMatchExerciseName(ex.name || '', exerciseName)
    );

    if (matchingExercises.length === 0) {
      return { data: null, error: null }; // No matching exercises
    }

    const exerciseIds = matchingExercises.map(e => e.id);

    // Step 4: Fetch all sets for matching exercises
    const { data: sets, error: setsError } = await supabase
      .from('workout_sets')
      .select('id, workout_exercise_id, reps, weight, attempted, made, distance, time_min, avg_time_sec, completed, points')
      .in('workout_exercise_id', exerciseIds)
      .order('set_index');

    if (setsError) {
      console.error('❌ [PersonalRecords] Error fetching sets:', setsError);
      return { data: null, error: setsError };
    }

    if (!sets || sets.length === 0) {
      return { data: null, error: null }; // No sets found
    }

    // Create a map of exercise_id -> workout_id for date lookup
    const exerciseToWorkout = new Map<string, string>();
    matchingExercises.forEach(ex => {
      exerciseToWorkout.set(ex.id, ex.workout_id);
    });

    // Helper to get date for a set
    const getSetDate = (set: any): string => {
      const workoutId = exerciseToWorkout.get(set.workout_exercise_id);
      return workoutId ? (workoutDates.get(workoutId) || '') : '';
    };

    // Step 5: Calculate records based on exercise type and mode
    const records: PersonalRecord['records'] = {};
    let overallDate: string | null = null;

    if (exerciseType === 'exercise') {
      // Exercise type: Highest reps × weight, highest reps, highest weight
      // Note: Allow 0 weight for bodyweight exercises, but require reps > 0
      const repsXWeight = findHighestValueAndDate(
        sets,
        (set) => {
          const reps = set.reps != null ? Number(set.reps) : null;
          // Require reps > 0
          if (reps === null || reps <= 0) {
            return null;
          }
          
          // Handle weight: can be null or 0 (both mean bodyweight)
          if (set.weight != null) {
            const weight = Number(set.weight);
            // If weight is 0, just use reps (bodyweight exercise)
            if (weight === 0) {
              return reps;
            }
            // If weight > 0, use reps × weight
            if (weight > 0) {
              return reps * weight;
            }
          } else {
            // No weight specified: treat as bodyweight, just use reps
            return reps;
          }
          
          return null;
        },
        getSetDate
      );
      records.repsXWeight = repsXWeight.value;
      if (repsXWeight.date && (!overallDate || repsXWeight.date > overallDate)) {
        overallDate = repsXWeight.date;
      }

      const reps = findHighestValueAndDate(
        sets,
        (set) => {
          const repsValue = set.reps != null ? Number(set.reps) : null;
          // Require reps > 0 (0 reps is not a valid record)
          return repsValue !== null && repsValue > 0 ? repsValue : null;
        },
        getSetDate
      );
      records.reps = reps.value;
      if (reps.date && (!overallDate || reps.date > overallDate)) {
        overallDate = reps.date;
      }

      const weight = findHighestValueAndDate(
        sets,
        (set) => {
          const weightValue = set.weight != null ? Number(set.weight) : null;
          // Allow 0 weight (bodyweight exercises), but require >= 0
          return weightValue !== null && weightValue >= 0 ? weightValue : null;
        },
        getSetDate
      );
      records.weight = weight.value;
      if (weight.date && (!overallDate || weight.date > overallDate)) {
        overallDate = weight.date;
      }

    } else if (exerciseType === 'shooting') {
      if (sportMode === 'basketball') {
        // Basketball shooting: Highest percentage, highest attempted, highest made
        const percentage = findHighestValueAndDate(
          sets,
          (set) => {
            const attempted = set.attempted != null ? Number(set.attempted) : null;
            const made = set.made != null ? Number(set.made) : null;
            // Require attempted > 0 to avoid division by zero
            if (attempted !== null && attempted > 0 && made !== null && made >= 0) {
              // If made > attempted, treat as 100%
              if (made > attempted) {
                return 100;
              }
              const percentageValue = (made / attempted) * 100;
              // Ensure percentage is valid (0-100)
              if (isFinite(percentageValue) && percentageValue >= 0 && percentageValue <= 100) {
                return percentageValue;
              }
            }
            return null;
          },
          getSetDate
        );
        records.shootingPercentage = percentage.value;
        if (percentage.date && (!overallDate || percentage.date > overallDate)) {
          overallDate = percentage.date;
        }

        const attempted = findHighestValueAndDate(
          sets,
          (set) => {
            const attemptedValue = set.attempted != null ? Number(set.attempted) : null;
            // Require attempted > 0
            return attemptedValue !== null && attemptedValue > 0 ? attemptedValue : null;
          },
          getSetDate
        );
        records.attempted = attempted.value;
        if (attempted.date && (!overallDate || attempted.date > overallDate)) {
          overallDate = attempted.date;
        }

        const made = findHighestValueAndDate(
          sets,
          (set) => {
            const madeValue = set.made != null ? Number(set.made) : null;
            // Require made >= 0 (0 is valid if no shots made)
            return madeValue !== null && madeValue >= 0 ? madeValue : null;
          },
          getSetDate
        );
        records.made = made.value;
        if (made.date && (!overallDate || made.date > overallDate)) {
          overallDate = made.date;
        }
      } else {
        // Soccer/Hockey shooting: Highest distance, highest reps
        const distance = findHighestValueAndDate(
          sets,
          (set) => {
            const distanceValue = set.distance != null ? Number(set.distance) : null;
            // Require distance >= 0
            return distanceValue !== null && distanceValue >= 0 ? distanceValue : null;
          },
          getSetDate
        );
        records.distance = distance.value;
        if (distance.date && (!overallDate || distance.date > overallDate)) {
          overallDate = distance.date;
        }

        const shotsReps = findHighestValueAndDate(
          sets,
          (set) => {
            const repsValue = set.reps != null ? Number(set.reps) : null;
            // Require reps > 0
            return repsValue !== null && repsValue > 0 ? repsValue : null;
          },
          getSetDate
        );
        records.shotsReps = shotsReps.value;
        if (shotsReps.date && (!overallDate || shotsReps.date > overallDate)) {
          overallDate = shotsReps.date;
        }
      }

    } else if (exerciseType === 'drill') {
      if (sportMode === 'football') {
        // Football drill: Highest reps, highest completion %
        const drillReps = findHighestValueAndDate(
          sets,
          (set) => {
            const repsValue = set.reps != null ? Number(set.reps) : null;
            // Require reps > 0
            return repsValue !== null && repsValue > 0 ? repsValue : null;
          },
          getSetDate
        );
        records.drillReps = drillReps.value;
        if (drillReps.date && (!overallDate || drillReps.date > overallDate)) {
          overallDate = drillReps.date;
        }

        const completionPercentage = findHighestValueAndDate(
          sets,
          (set) => {
            const reps = set.reps != null ? Number(set.reps) : null;
            const completed = set.completed != null 
              ? (typeof set.completed === 'number' ? set.completed : Number(set.completed))
              : null;
            // Require reps > 0 to avoid division by zero
            if (reps !== null && reps > 0 && completed !== null && completed >= 0) {
              // If completed > reps, treat as 100%
              if (completed > reps) {
                return 100;
              }
              const percentageValue = (completed / reps) * 100;
              // Ensure percentage is valid (0-100)
              if (isFinite(percentageValue) && percentageValue >= 0 && percentageValue <= 100) {
                return percentageValue;
              }
            }
            return null;
          },
          getSetDate
        );
        records.completionPercentage = completionPercentage.value;
        if (completionPercentage.date && (!overallDate || completionPercentage.date > overallDate)) {
          overallDate = completionPercentage.date;
        }

        // Calculate reps/min for football drills (if time is available)
        const repsPerMinute = findHighestValueAndDate(
          sets,
          (set) => {
            const reps = set.reps != null ? Number(set.reps) : null;
            const time = set.time_min != null ? Number(set.time_min) : null;
            // Require reps > 0 and time > 0 to avoid division by zero
            if (reps !== null && reps > 0 && time !== null && time > 0) {
              const repsPerMinValue = reps / time;
              // Ensure value is valid (finite and non-negative)
              if (isFinite(repsPerMinValue) && repsPerMinValue >= 0) {
                return repsPerMinValue;
              }
            }
            return null;
          },
          getSetDate
        );
        records.repsPerMinute = repsPerMinute.value;
        if (repsPerMinute.date && (!overallDate || repsPerMinute.date > overallDate)) {
          overallDate = repsPerMinute.date;
        }
      } else {
        // Basketball/Soccer/Hockey/Tennis drill: Highest reps, highest time
        const drillReps = findHighestValueAndDate(
          sets,
          (set) => {
            const repsValue = set.reps != null ? Number(set.reps) : null;
            // Require reps > 0
            return repsValue !== null && repsValue > 0 ? repsValue : null;
          },
          getSetDate
        );
        records.drillReps = drillReps.value;
        if (drillReps.date && (!overallDate || drillReps.date > overallDate)) {
          overallDate = drillReps.date;
        }

        const time = findHighestValueAndDate(
          sets,
          (set) => {
            const timeValue = set.time_min != null ? Number(set.time_min) : null;
            // Require time > 0 (0 time is not a valid record)
            return timeValue !== null && timeValue > 0 ? timeValue : null;
          },
          getSetDate
        );
        records.time = time.value;
        if (time.date && (!overallDate || time.date > overallDate)) {
          overallDate = time.date;
        }

        // Calculate reps/min for basketball/soccer/hockey/tennis drills
        const repsPerMinute = findHighestValueAndDate(
          sets,
          (set) => {
            const reps = set.reps != null ? Number(set.reps) : null;
            const time = set.time_min != null ? Number(set.time_min) : null;
            // Require reps > 0 and time > 0 to avoid division by zero
            if (reps !== null && reps > 0 && time !== null && time > 0) {
              const repsPerMinValue = reps / time;
              // Ensure value is valid (finite and non-negative)
              if (isFinite(repsPerMinValue) && repsPerMinValue >= 0) {
                return repsPerMinValue;
              }
            }
            return null;
          },
          getSetDate
        );
        records.repsPerMinute = repsPerMinute.value;
        if (repsPerMinute.date && (!overallDate || repsPerMinute.date > overallDate)) {
          overallDate = repsPerMinute.date;
        }
      }

    } else if (exerciseType === 'sprints') {
      // Football sprints: Highest distance, highest speed (distance/avg_time), highest reps
      const sprintDistance = findHighestValueAndDate(
        sets,
        (set) => {
          const distanceValue = set.distance != null ? Number(set.distance) : null;
          // Require distance >= 0
          return distanceValue !== null && distanceValue >= 0 ? distanceValue : null;
        },
        getSetDate
      );
      records.sprintDistance = sprintDistance.value;
      if (sprintDistance.date && (!overallDate || sprintDistance.date > overallDate)) {
        overallDate = sprintDistance.date;
      }

      const speed = findHighestValueAndDate(
        sets,
        (set) => {
          const distance = set.distance != null ? Number(set.distance) : null;
          const avgTime = set.avg_time_sec != null ? Number(set.avg_time_sec) : null;
          // Require distance >= 0 and avg_time > 0 to avoid division by zero
          if (distance !== null && distance >= 0 && avgTime !== null && avgTime > 0) {
            const speedValue = distance / avgTime;
            // Ensure speed is valid (finite and non-negative)
            if (isFinite(speedValue) && speedValue >= 0) {
              return speedValue;
            }
          }
          return null;
        },
        getSetDate
      );
      records.speed = speed.value;
      if (speed.date && (!overallDate || speed.date > overallDate)) {
        overallDate = speed.date;
      }

      const sprintReps = findHighestValueAndDate(
        sets,
        (set) => {
          const repsValue = set.reps != null ? Number(set.reps) : null;
          // Require reps > 0
          return repsValue !== null && repsValue > 0 ? repsValue : null;
        },
        getSetDate
      );
      records.sprintReps = sprintReps.value;
      if (sprintReps.date && (!overallDate || sprintReps.date > overallDate)) {
        overallDate = sprintReps.date;
      }

    } else if (exerciseType === 'hitting') {
      // Baseball hitting: Highest reps, highest avg_distance (stored as distance in DB)
      const hittingReps = findHighestValueAndDate(
        sets,
        (set) => {
          const repsValue = set.reps != null ? Number(set.reps) : null;
          // Require reps > 0
          return repsValue !== null && repsValue > 0 ? repsValue : null;
        },
        getSetDate
      );
      records.hittingReps = hittingReps.value;
      if (hittingReps.date && (!overallDate || hittingReps.date > overallDate)) {
        overallDate = hittingReps.date;
      }

      const avgDistance = findHighestValueAndDate(
        sets,
        (set) => {
          const distanceValue = set.distance != null ? Number(set.distance) : null;
          // Require distance >= 0
          return distanceValue !== null && distanceValue >= 0 ? distanceValue : null;
        },
        getSetDate
      );
      records.avgDistance = avgDistance.value;
      if (avgDistance.date && (!overallDate || avgDistance.date > overallDate)) {
        overallDate = avgDistance.date;
      }

    } else if (exerciseType === 'fielding') {
      // Baseball fielding: Highest (reps × distance), highest reps, highest distance
      const fieldingRepsXDistance = findHighestValueAndDate(
        sets,
        (set) => {
          const reps = set.reps != null ? Number(set.reps) : null;
          const distance = set.distance != null ? Number(set.distance) : null;
          // Require reps > 0 and distance >= 0
          if (reps !== null && reps > 0 && distance !== null && distance >= 0) {
            return reps * distance;
          }
          return null;
        },
        getSetDate
      );
      records.fieldingRepsXDistance = fieldingRepsXDistance.value;
      if (fieldingRepsXDistance.date && (!overallDate || fieldingRepsXDistance.date > overallDate)) {
        overallDate = fieldingRepsXDistance.date;
      }

      const fieldingReps = findHighestValueAndDate(
        sets,
        (set) => {
          const repsValue = set.reps != null ? Number(set.reps) : null;
          // Require reps > 0
          return repsValue !== null && repsValue > 0 ? repsValue : null;
        },
        getSetDate
      );
      records.fieldingReps = fieldingReps.value;
      if (fieldingReps.date && (!overallDate || fieldingReps.date > overallDate)) {
        overallDate = fieldingReps.date;
      }

      const fieldingDistance = findHighestValueAndDate(
        sets,
        (set) => {
          const distanceValue = set.distance != null ? Number(set.distance) : null;
          // Require distance >= 0
          return distanceValue !== null && distanceValue >= 0 ? distanceValue : null;
        },
        getSetDate
      );
      records.fieldingDistance = fieldingDistance.value;
      if (fieldingDistance.date && (!overallDate || fieldingDistance.date > overallDate)) {
        overallDate = fieldingDistance.date;
      }

    } else if (exerciseType === 'rally') {
      // Tennis rally: Highest points, highest time
      const points = findHighestValueAndDate(
        sets,
        (set) => {
          const pointsValue = set.points != null ? Number(set.points) : null;
          // Require points >= 0
          return pointsValue !== null && pointsValue >= 0 ? pointsValue : null;
        },
        getSetDate
      );
      records.points = points.value;
      if (points.date && (!overallDate || points.date > overallDate)) {
        overallDate = points.date;
      }

      const rallyTime = findHighestValueAndDate(
        sets,
        (set) => {
          const timeValue = set.time_min != null ? Number(set.time_min) : null;
          // Require time > 0 (0 time is not a valid record)
          return timeValue !== null && timeValue > 0 ? timeValue : null;
        },
        getSetDate
      );
      records.rallyTime = rallyTime.value;
      if (rallyTime.date && (!overallDate || rallyTime.date > overallDate)) {
        overallDate = rallyTime.date;
      }
    }

    const result: PersonalRecord = {
      exerciseName,
      mode: sportMode,
      exerciseType,
      records,
      dateAchieved: overallDate || undefined,
    };

    return { data: result, error: null };
  } catch (error: any) {
    console.error('❌ [PersonalRecords] Exception:', error);
    return { data: null, error };
  }
}
