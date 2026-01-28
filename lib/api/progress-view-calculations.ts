/**
 * Progress View Calculation Functions
 * Implements calculation logic for each view type
 */

import { SportMode, ExerciseType } from '../types';
import { ViewCalculationType } from './progress-views';
import { TimeBucket } from '../utils/time-intervals';

/**
 * Exercise data structure (from database)
 */
export interface ExerciseData {
  id: string;
  workout_id: string;
  name: string;
  exercise_type: ExerciseType;
  performed_at: string; // Date string from workout
}

/**
 * Set data structure (from database)
 */
export interface SetData {
  id: string;
  workout_exercise_id: string;
  set_index: number;
  reps?: number | null;
  weight?: number | null;
  attempted?: number | null;
  made?: number | null;
  distance?: number | null;
  time_min?: number | null;
  avg_time_sec?: number | null;
  completed?: boolean | number | null;
  points?: number | null;
}

/**
 * Calculate Performance View value
 * Highest single set (reps × weight) in bucket
 * If weight is null, use highest reps instead
 */
function calculatePerformanceView(
  exercises: ExerciseData[],
  sets: SetData[],
  bucket: TimeBucket
): number | null {
  let maxValue: number | null = null;

  // Get sets for exercises in this bucket
  const exerciseIds = exercises.map(e => e.id);
  const bucketSets = sets.filter(s => exerciseIds.includes(s.workout_exercise_id));

  // Find highest reps × weight across all sets
  // If weight is null, just use reps
  for (const set of bucketSets) {
    if (set.reps != null) {
      let value: number;
      if (set.weight != null) {
        // Normal case: reps × weight
        value = Number(set.reps) * Number(set.weight);
      } else {
        // No weight: just use reps
        value = Number(set.reps);
      }
      if (maxValue === null || value > maxValue) {
        maxValue = value;
      }
    }
  }

  return maxValue;
}

/**
 * Calculate Tonnage View value
 * Average (reps × weight × sets) per exercise square in bucket
 * If weight is null, calculate as (reps × sets) instead
 * 
 * Documentation: "Average reps x weight x sets per exercise type square"
 * Example: If user logged "bench press" twice in a 5-day period:
 * - Day 1: total reps x weight x sets = 3000
 * - Day 2: total reps x weight x sets = 5000
 * - Average = (3000 + 5000) / 2 = 4000
 * 
 * For each exercise square (each time exercise was logged in a workout):
 * - If weight exists: Calculate sum of (reps × weight) for all sets × number of sets
 * - If weight is null: Calculate sum of reps for all sets × number of sets
 * - This gives total tonnage for that exercise square
 * Then average across all exercise squares
 */
function calculateTonnageView(
  exercises: ExerciseData[],
  sets: SetData[],
  bucket: TimeBucket
): number | null {
  // Group sets by exercise (each exercise = one "exercise square")
  const exerciseValues: number[] = [];

  for (const exercise of exercises) {
    const exerciseSets = sets.filter(s => s.workout_exercise_id === exercise.id);
    
    if (exerciseSets.length === 0) continue;

    // Check if any set has weight (to determine calculation method)
    const hasWeight = exerciseSets.some(s => s.weight != null);
    
    let tonnagePerSquare = 0;
    let hasValidData = false;

    if (hasWeight) {
      // Calculate sum of (reps × weight) for all sets in this exercise square
      // If weight is 0, treat as bodyweight (just use reps)
      let sumRepsWeight = 0;
      for (const set of exerciseSets) {
        if (set.reps != null) {
          const reps = Number(set.reps);
          if (set.weight != null) {
            const weight = Number(set.weight);
            // If weight is 0, just use reps (bodyweight)
            if (weight === 0) {
              sumRepsWeight += reps;
            } else {
              sumRepsWeight += reps * weight;
            }
            hasValidData = true;
          } else {
            // No weight: just use reps
            sumRepsWeight += reps;
            hasValidData = true;
          }
        }
      }
      // Multiply by number of sets
      if (hasValidData) {
        tonnagePerSquare = sumRepsWeight * exerciseSets.length;
      }
    } else {
      // No weight: calculate as sum of reps × number of sets
      let sumReps = 0;
      for (const set of exerciseSets) {
        if (set.reps != null) {
          sumReps += Number(set.reps);
          hasValidData = true;
        }
      }
      // Multiply by number of sets
      if (hasValidData) {
        tonnagePerSquare = sumReps * exerciseSets.length;
      }
    }

    if (hasValidData) {
      exerciseValues.push(tonnagePerSquare);
    }
  }

  if (exerciseValues.length === 0) return null;

  // Average across all exercise squares
  const sum = exerciseValues.reduce((acc, val) => acc + val, 0);
  return sum / exerciseValues.length;
}

/**
 * Calculate Shooting % View value (Basketball)
 * Average percentage per set in bucket
 * 
 * Documentation: "Average % per set"
 * Formula: (made / attempted) × 100 for each set, then average
 * Handle division by zero: skip sets where attempted is 0 or null
 */
function calculateShootingPercentageView(
  exercises: ExerciseData[],
  sets: SetData[],
  bucket: TimeBucket
): number | null {
  const percentages: number[] = [];

  const exerciseIds = exercises.map(e => e.id);
  const bucketSets = sets.filter(s => exerciseIds.includes(s.workout_exercise_id));

  for (const set of bucketSets) {
    if (set.attempted != null && set.attempted > 0 && set.made != null) {
      // Handle division by zero
      if (Number(set.attempted) === 0) continue;
      
      const attempted = Number(set.attempted);
      const made = Number(set.made);
      // If made > attempted, treat as 100%
      const percentage = made > attempted ? 100 : (made / attempted) * 100;
      percentages.push(percentage);
    }
  }

  if (percentages.length === 0) return null;

  const sum = percentages.reduce((acc, val) => acc + val, 0);
  return sum / percentages.length;
}

/**
 * Calculate Jumpshot View value (Basketball)
 * Total attempted shots in all shooting squares in bucket
 */
function calculateJumpshotView(
  exercises: ExerciseData[],
  sets: SetData[],
  bucket: TimeBucket
): number | null {
  const exerciseIds = exercises.map(e => e.id);
  const bucketSets = sets.filter(s => exerciseIds.includes(s.workout_exercise_id));

  let totalAttempted = 0;
  let hasValidData = false;

  for (const set of bucketSets) {
    if (set.attempted != null) {
      totalAttempted += Number(set.attempted);
      hasValidData = true;
    }
  }

  return hasValidData ? totalAttempted : null;
}

/**
 * Calculate Drill View value (Basketball, Soccer, Hockey, Tennis, Football)
 * Total reps logged in bucket
 */
function calculateDrillView(
  exercises: ExerciseData[],
  sets: SetData[],
  bucket: TimeBucket
): number | null {
  const exerciseIds = exercises.map(e => e.id);
  const bucketSets = sets.filter(s => exerciseIds.includes(s.workout_exercise_id));

  let totalReps = 0;
  let hasValidData = false;
  let setsWithNullReps = 0;
  let setsWithZeroReps = 0;

  for (const set of bucketSets) {
    if (set.reps != null) {
      const repsValue = Number(set.reps);
      // Handle NaN and negative values
      if (!isNaN(repsValue) && repsValue >= 0) {
        totalReps += repsValue;
        hasValidData = true;
        if (repsValue === 0) {
          setsWithZeroReps++;
        }
      }
    } else {
      setsWithNullReps++;
    }
  }

  // Debug logging for troubleshooting
  if (exercises.length > 0 && bucketSets.length > 0) {
    const exerciseNames = exercises.map(e => e.name).join(', ');
    console.log(`🔍 [DrillView] Bucket ${bucket.bucketIndex} (${bucket.startDateStr} to ${bucket.endDateStr}):`, {
      exerciseNames,
      exerciseCount: exercises.length,
      exerciseIds: exerciseIds.length,
      totalSets: bucketSets.length,
      setsWithReps: bucketSets.filter(s => s.reps != null).length,
      setsWithNullReps,
      setsWithZeroReps,
      totalReps,
      hasValidData,
    });
  }

  return hasValidData ? totalReps : null;
}

/**
 * Calculate Completion View value (Football)
 * Average completion % per set in bucket
 * 
 * Documentation: "Average completion percentage on each set"
 * Formula: completed / reps × 100 for each set, then average
 * 
 * Handle both cases:
 * - If completed is a number: use it directly as completed reps
 * - If completed is a boolean: true = all reps completed, false = 0 reps completed
 * Percentage = (completed_reps / total_reps) × 100
 */
function calculateCompletionView(
  exercises: ExerciseData[],
  sets: SetData[],
  bucket: TimeBucket
): number | null {
  const percentages: number[] = [];

  const exerciseIds = exercises.map(e => e.id);
  const bucketSets = sets.filter(s => exerciseIds.includes(s.workout_exercise_id));

  console.log('🔍 [CompletionView] Processing sets:', {
    totalSets: bucketSets.length,
    setsWithCompleted: bucketSets.filter(s => s.completed != null && s.completed !== undefined).length,
    sampleSet: bucketSets[0] ? {
      id: bucketSets[0].id,
      reps: bucketSets[0].reps,
      completed: bucketSets[0].completed,
      completed_type: typeof bucketSets[0].completed,
    } : null,
  });

  for (const set of bucketSets) {
    // Include sets where completed is 0 (valid value meaning 0 reps completed)
    if (set.reps != null && set.reps > 0 && set.completed != null && set.completed !== undefined) {
      // Handle division by zero
      const totalReps = Number(set.reps);
      if (totalReps === 0) continue;
      
      // Determine completed reps
      // completed is now numeric (number of completed reps)
      let completedReps: number;
      if (typeof set.completed === 'number') {
        // Use the number directly
        completedReps = Number(set.completed);
      } else if (typeof set.completed === 'string') {
        // Parse string to number
        const parsed = parseFloat(set.completed);
        completedReps = isNaN(parsed) ? 0 : parsed;
      } else if (set.completed === true || set.completed === 'true') {
        // Legacy boolean true: all reps completed
        completedReps = totalReps;
      } else if (set.completed === false || set.completed === 'false') {
        // Legacy boolean false: no reps completed
        completedReps = 0;
      } else {
        // Try to parse as number
        const parsed = Number(set.completed);
        completedReps = isNaN(parsed) ? 0 : parsed;
      }
      
      // Debug logging
      console.log('🔍 [CompletionView] Set calculation:', {
        set_id: set.id,
        reps: totalReps,
        completed_raw: set.completed,
        completed_type: typeof set.completed,
        completedReps,
        percentage: completedReps > totalReps ? 100 : (completedReps / totalReps) * 100,
      });
      
      // If completed > reps, treat as 100%
      const percentage = completedReps > totalReps ? 100 : (completedReps / totalReps) * 100;
      percentages.push(percentage);
    }
  }

  if (percentages.length === 0) return null;

  const sum = percentages.reduce((acc, val) => acc + val, 0);
  return sum / percentages.length;
}

/**
 * Calculate Speed View value (Football)
 * Highest single set (distance / avg_time_sec) in bucket
 * 
 * Documentation: "Highest single set distance / avg. time"
 * Formula: distance / avg_time_sec for each set, find the maximum
 * Handle division by zero: skip sets where avg_time_sec is 0 or null
 */
function calculateSpeedView(
  exercises: ExerciseData[],
  sets: SetData[],
  bucket: TimeBucket
): number | null {
  let maxSpeed: number | null = null;

  const exerciseIds = exercises.map(e => e.id);
  const bucketSets = sets.filter(s => exerciseIds.includes(s.workout_exercise_id));

  for (const set of bucketSets) {
    if (set.distance != null && set.avg_time_sec != null && set.avg_time_sec > 0) {
      // Handle division by zero
      if (Number(set.avg_time_sec) === 0) continue;
      
      const speed = Number(set.distance) / Number(set.avg_time_sec);
      if (maxSpeed === null || speed > maxSpeed) {
        maxSpeed = speed;
      }
    }
  }

  return maxSpeed;
}

/**
 * Calculate Sprints View value (Football)
 * Total reps logged in bucket
 */
function calculateSprintsView(
  exercises: ExerciseData[],
  sets: SetData[],
  bucket: TimeBucket
): number | null {
  return calculateDrillView(exercises, sets, bucket); // Same logic as drill view
}

/**
 * Calculate Hits View value (Baseball)
 * Total reps logged in bucket
 */
function calculateHitsView(
  exercises: ExerciseData[],
  sets: SetData[],
  bucket: TimeBucket
): number | null {
  return calculateDrillView(exercises, sets, bucket); // Same logic as drill view
}

/**
 * Calculate Distance View value (Baseball Hitting)
 * Average avg_distance per set in bucket
 */
function calculateDistanceView(
  exercises: ExerciseData[],
  sets: SetData[],
  bucket: TimeBucket
): number | null {
  const distances: number[] = [];

  const exerciseIds = exercises.map(e => e.id);
  const bucketSets = sets.filter(s => exerciseIds.includes(s.workout_exercise_id));

  for (const set of bucketSets) {
    if (set.distance != null) {
      // Note: For hitting, "avg_distance" is stored in the distance field
      distances.push(Number(set.distance));
    }
  }

  if (distances.length === 0) return null;

  const sum = distances.reduce((acc, val) => acc + val, 0);
  return sum / distances.length;
}

/**
 * Calculate Fielding View value (Baseball)
 * Average (reps × distance) / sets in bucket
 * 
 * Documentation: "(reps × distance) / sets for total average distance per set"
 * Formula: For each exercise square, calculate (sum of reps×distance) / number of sets
 * Then average across all exercise squares
 * Handle division by zero: skip exercises with no sets
 */
function calculateFieldingView(
  exercises: ExerciseData[],
  sets: SetData[],
  bucket: TimeBucket
): number | null {
  const values: number[] = [];

  for (const exercise of exercises) {
    const exerciseSets = sets.filter(s => s.workout_exercise_id === exercise.id);
    
    if (exerciseSets.length === 0) continue;

    // Calculate (reps × distance) for all sets in this exercise
    let totalRepsDistance = 0;
    let hasValidData = false;

    for (const set of exerciseSets) {
      if (set.reps != null && set.distance != null) {
        totalRepsDistance += Number(set.reps) * Number(set.distance);
        hasValidData = true;
      }
    }

    if (hasValidData && exerciseSets.length > 0) {
      // Divide by number of sets to get average per set
      // Handle division by zero (shouldn't happen due to length check, but be safe)
      const avgPerSet = totalRepsDistance / exerciseSets.length;
      values.push(avgPerSet);
    }
  }

  if (values.length === 0) return null;

  // Average across all exercises
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

/**
 * Calculate Shots View value (Soccer, Hockey)
 * Total reps logged in bucket
 */
function calculateShotsView(
  exercises: ExerciseData[],
  sets: SetData[],
  bucket: TimeBucket
): number | null {
  return calculateDrillView(exercises, sets, bucket); // Same logic as drill view
}

/**
 * Calculate Shot Distance View value (Soccer, Hockey)
 * Average distance per set in bucket
 */
function calculateShotDistanceView(
  exercises: ExerciseData[],
  sets: SetData[],
  bucket: TimeBucket
): number | null {
  return calculateDistanceView(exercises, sets, bucket); // Same logic as distance view
}

/**
 * Calculate Rally View value (Tennis)
 * Average points per set in bucket
 * Note: Sets with 0 points are excluded (treated as null, consistent with other views)
 */
function calculateRallyView(
  exercises: ExerciseData[],
  sets: SetData[],
  bucket: TimeBucket
): number | null {
  const points: number[] = [];

  const exerciseIds = exercises.map(e => e.id);
  const bucketSets = sets.filter(s => exerciseIds.includes(s.workout_exercise_id));

  for (const set of bucketSets) {
    // Exclude 0 values (treat as null, consistent with other views like Tonnage)
    if (set.points != null && set.points !== 0) {
      const pointsValue = Number(set.points);
      if (!isNaN(pointsValue) && pointsValue > 0) {
        points.push(pointsValue);
      }
    }
  }

  if (points.length === 0) return null;

  const sum = points.reduce((acc, val) => acc + val, 0);
  return sum / points.length;
}

/**
 * Main calculation function
 * Routes to the appropriate calculation based on view calculation type
 */
export function calculateViewValue(
  mode: SportMode,
  calculationType: ViewCalculationType,
  exercises: ExerciseData[],
  sets: SetData[],
  bucket: TimeBucket
): number | null {
  switch (calculationType) {
    case 'performance':
      return calculatePerformanceView(exercises, sets, bucket);
    
    case 'tonnage':
      return calculateTonnageView(exercises, sets, bucket);
    
    case 'shooting_percentage':
      return calculateShootingPercentageView(exercises, sets, bucket);
    
    case 'jumpshot':
      return calculateJumpshotView(exercises, sets, bucket);
    
    case 'drill':
      return calculateDrillView(exercises, sets, bucket);
    
    case 'completion':
      return calculateCompletionView(exercises, sets, bucket);
    
    case 'speed':
      return calculateSpeedView(exercises, sets, bucket);
    
    case 'sprints':
      return calculateSprintsView(exercises, sets, bucket);
    
    case 'hits':
      return calculateHitsView(exercises, sets, bucket);
    
    case 'distance':
      return calculateDistanceView(exercises, sets, bucket);
    
    case 'fielding':
      return calculateFieldingView(exercises, sets, bucket); // DEPRECATED - kept for backwards compatibility
    case 'fielding_reps':
      return calculateDrillView(exercises, sets, bucket); // Same logic as drill view - total reps
    case 'fielding_distance':
      return calculateDistanceView(exercises, sets, bucket); // Same logic as distance view - average distance per set
    
    case 'shots':
      return calculateShotsView(exercises, sets, bucket);
    
    case 'shot_distance':
      return calculateShotDistanceView(exercises, sets, bucket);
    
    case 'rally':
      return calculateRallyView(exercises, sets, bucket);
    
    default:
      console.warn(`Unknown calculation type: ${calculationType}`);
      return null;
  }
}

/**
 * ============================================================================
 * SKILL MAP: Interval-Based Calculations
 * These functions calculate view values for the entire time interval
 * (not bucketed like progress graphs)
 * ============================================================================
 */

/**
 * Calculate Performance View value for entire time interval
 * Highest single set (reps × weight) across entire interval
 * If weight is null, use highest reps instead
 */
function calculatePerformanceViewForInterval(
  exercises: ExerciseData[],
  sets: SetData[]
): number | null {
  let maxValue: number | null = null;

  const exerciseIds = exercises.map(e => e.id);
  const intervalSets = sets.filter(s => exerciseIds.includes(s.workout_exercise_id));

  for (const set of intervalSets) {
    if (set.reps != null) {
      let value: number;
      if (set.weight != null) {
        const weight = Number(set.weight);
        // If weight is 0, just use reps (bodyweight)
        if (weight === 0) {
          value = Number(set.reps);
        } else {
          // Normal case: reps × weight
          value = Number(set.reps) * weight;
        }
      } else {
        // No weight: just use reps
        value = Number(set.reps);
      }
      if (maxValue === null || value > maxValue) {
        maxValue = value;
      }
    }
  }

  return maxValue;
}

/**
 * Calculate Tonnage View value for entire time interval
 * Average (reps × weight × sets) per exercise square across entire interval
 * If weight is null, calculate as (reps × sets) instead
 */
function calculateTonnageViewForInterval(
  exercises: ExerciseData[],
  sets: SetData[]
): number | null {
  const exerciseValues: number[] = [];

  for (const exercise of exercises) {
    const exerciseSets = sets.filter(s => s.workout_exercise_id === exercise.id);
    
    if (exerciseSets.length === 0) continue;

    // Check if any set has weight (to determine calculation method)
    const hasWeight = exerciseSets.some(s => s.weight != null);
    
    let tonnagePerSquare = 0;
    let hasValidData = false;

    if (hasWeight) {
      // Calculate sum of (reps × weight) for all sets in this exercise square
      // If weight is 0, treat as bodyweight (just use reps)
      let sumRepsWeight = 0;
      for (const set of exerciseSets) {
        if (set.reps != null) {
          const reps = Number(set.reps);
          if (set.weight != null) {
            const weight = Number(set.weight);
            // If weight is 0, just use reps (bodyweight)
            if (weight === 0) {
              sumRepsWeight += reps;
            } else {
              sumRepsWeight += reps * weight;
            }
            hasValidData = true;
          } else {
            // No weight: just use reps
            sumRepsWeight += reps;
            hasValidData = true;
          }
        }
      }
      // Multiply by number of sets
      if (hasValidData) {
        tonnagePerSquare = sumRepsWeight * exerciseSets.length;
      }
    } else {
      // No weight: calculate as sum of reps × number of sets
      let sumReps = 0;
      for (const set of exerciseSets) {
        if (set.reps != null) {
          sumReps += Number(set.reps);
          hasValidData = true;
        }
      }
      // Multiply by number of sets
      if (hasValidData) {
        tonnagePerSquare = sumReps * exerciseSets.length;
      }
    }

    if (hasValidData) {
      exerciseValues.push(tonnagePerSquare);
    }
  }

  if (exerciseValues.length === 0) return null;

  const sum = exerciseValues.reduce((acc, val) => acc + val, 0);
  return sum / exerciseValues.length;
}

/**
 * Calculate Shooting % View value for entire time interval
 * Average percentage per set across entire interval
 */
function calculateShootingPercentageViewForInterval(
  exercises: ExerciseData[],
  sets: SetData[]
): number | null {
  const percentages: number[] = [];

  const exerciseIds = exercises.map(e => e.id);
  const intervalSets = sets.filter(s => exerciseIds.includes(s.workout_exercise_id));

  for (const set of intervalSets) {
    if (set.attempted != null && set.attempted > 0 && set.made != null) {
      if (Number(set.attempted) === 0) continue;
      
      const attempted = Number(set.attempted);
      const made = Number(set.made);
      // If made > attempted, treat as 100%
      const percentage = made > attempted ? 100 : (made / attempted) * 100;
      percentages.push(percentage);
    }
  }

  if (percentages.length === 0) return null;

  const sum = percentages.reduce((acc, val) => acc + val, 0);
  return sum / percentages.length;
}

/**
 * Calculate Jumpshot View value for entire time interval
 * Average attempted per shooting square across entire interval
 */
function calculateJumpshotViewForInterval(
  exercises: ExerciseData[],
  sets: SetData[]
): number | null {
  // Group by exercise (each exercise = one shooting square)
  const squareTotals: number[] = [];

  for (const exercise of exercises) {
    const exerciseSets = sets.filter(s => s.workout_exercise_id === exercise.id);
    
    if (exerciseSets.length === 0) continue;

    let totalAttempted = 0;
    let hasValidData = false;

    for (const set of exerciseSets) {
      if (set.attempted != null) {
        totalAttempted += Number(set.attempted);
        hasValidData = true;
      }
    }

    if (hasValidData) {
      squareTotals.push(totalAttempted);
    }
  }

  if (squareTotals.length === 0) return null;

  const sum = squareTotals.reduce((acc, val) => acc + val, 0);
  return sum / squareTotals.length;
}

/**
 * Calculate Drill View value for entire time interval
 * Total reps logged across entire interval
 */
function calculateDrillViewForInterval(
  exercises: ExerciseData[],
  sets: SetData[]
): number | null {
  const exerciseIds = exercises.map(e => e.id);
  const intervalSets = sets.filter(s => exerciseIds.includes(s.workout_exercise_id));

  let totalReps = 0;
  let hasValidData = false;
  let setsWithNullReps = 0;
  let setsWithZeroReps = 0;

  for (const set of intervalSets) {
    if (set.reps != null) {
      const repsValue = Number(set.reps);
      // Handle NaN and negative values
      if (!isNaN(repsValue) && repsValue >= 0) {
        totalReps += repsValue;
        hasValidData = true;
        if (repsValue === 0) {
          setsWithZeroReps++;
        }
      }
    } else {
      setsWithNullReps++;
    }
  }

  // Debug logging for troubleshooting
  if (exercises.length > 0 && intervalSets.length > 0) {
    const exerciseNames = exercises.map(e => e.name).join(', ');
    console.log(`🔍 [DrillViewForInterval]:`, {
      exerciseNames,
      exerciseCount: exercises.length,
      exerciseIds: exerciseIds.length,
      totalSets: intervalSets.length,
      setsWithReps: intervalSets.filter(s => s.reps != null).length,
      setsWithNullReps,
      setsWithZeroReps,
      totalReps,
      hasValidData,
    });
  }

  return hasValidData ? totalReps : null;
}

/**
 * Calculate Completion View value for entire time interval
 * Average completion % per set across entire interval
 */
function calculateCompletionViewForInterval(
  exercises: ExerciseData[],
  sets: SetData[]
): number | null {
  const percentages: number[] = [];

  const exerciseIds = exercises.map(e => e.id);
  const intervalSets = sets.filter(s => exerciseIds.includes(s.workout_exercise_id));

  for (const set of intervalSets) {
    if (set.reps != null && set.reps > 0 && set.completed != null && set.completed !== undefined) {
      const totalReps = Number(set.reps);
      if (totalReps === 0) continue;
      
      let completedReps: number;
      if (typeof set.completed === 'number') {
        completedReps = Number(set.completed);
      } else if (typeof set.completed === 'boolean') {
        completedReps = set.completed ? totalReps : 0;
      } else {
        continue;
      }
      
      // If completed > reps, treat as 100%
      const percentage = completedReps > totalReps ? 100 : (completedReps / totalReps) * 100;
      percentages.push(percentage);
    }
  }

  if (percentages.length === 0) return null;

  const sum = percentages.reduce((acc, val) => acc + val, 0);
  return sum / percentages.length;
}

/**
 * Calculate Speed View value for entire time interval
 * Highest single set (distance / avg_time_sec) across entire interval
 */
function calculateSpeedViewForInterval(
  exercises: ExerciseData[],
  sets: SetData[]
): number | null {
  let maxSpeed: number | null = null;

  const exerciseIds = exercises.map(e => e.id);
  const intervalSets = sets.filter(s => exerciseIds.includes(s.workout_exercise_id));

  for (const set of intervalSets) {
    if (set.distance != null && set.avg_time_sec != null) {
      const distance = Number(set.distance);
      const timeSec = Number(set.avg_time_sec);
      
      if (timeSec > 0) {
        const speed = distance / timeSec;
        if (maxSpeed === null || speed > maxSpeed) {
          maxSpeed = speed;
        }
      }
    }
  }

  return maxSpeed;
}

/**
 * Calculate Sprints View value for entire time interval
 * Total reps logged across entire interval
 */
function calculateSprintsViewForInterval(
  exercises: ExerciseData[],
  sets: SetData[]
): number | null {
  return calculateDrillViewForInterval(exercises, sets); // Same logic
}

/**
 * Calculate Hits View value for entire time interval
 * Total reps logged across entire interval
 */
function calculateHitsViewForInterval(
  exercises: ExerciseData[],
  sets: SetData[]
): number | null {
  return calculateDrillViewForInterval(exercises, sets); // Same logic
}

/**
 * Calculate Distance View value for entire time interval
 * Average avg_distance per set across entire interval
 */
function calculateDistanceViewForInterval(
  exercises: ExerciseData[],
  sets: SetData[]
): number | null {
  const distances: number[] = [];

  const exerciseIds = exercises.map(e => e.id);
  const intervalSets = sets.filter(s => exerciseIds.includes(s.workout_exercise_id));

  for (const set of intervalSets) {
    if (set.distance != null) {
      distances.push(Number(set.distance));
    }
  }

  if (distances.length === 0) return null;

  const sum = distances.reduce((acc, val) => acc + val, 0);
  return sum / distances.length;
}

/**
 * Calculate Fielding View value for entire time interval
 * Average (reps × distance) / sets across entire interval
 */
function calculateFieldingViewForInterval(
  exercises: ExerciseData[],
  sets: SetData[]
): number | null {
  const values: number[] = [];

  for (const exercise of exercises) {
    const exerciseSets = sets.filter(s => s.workout_exercise_id === exercise.id);
    
    if (exerciseSets.length === 0) continue;

    let totalRepsDistance = 0;
    let hasValidData = false;

    for (const set of exerciseSets) {
      if (set.reps != null && set.distance != null) {
        totalRepsDistance += Number(set.reps) * Number(set.distance);
        hasValidData = true;
      }
    }

    if (hasValidData && exerciseSets.length > 0) {
      const avgPerSet = totalRepsDistance / exerciseSets.length;
      values.push(avgPerSet);
    }
  }

  if (values.length === 0) return null;

  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

/**
 * Calculate Shots View value for entire time interval
 * Total reps logged across entire interval
 */
function calculateShotsViewForInterval(
  exercises: ExerciseData[],
  sets: SetData[]
): number | null {
  return calculateDrillViewForInterval(exercises, sets); // Same logic
}

/**
 * Calculate Shot Distance View value for entire time interval
 * Average distance per set across entire interval
 */
function calculateShotDistanceViewForInterval(
  exercises: ExerciseData[],
  sets: SetData[]
): number | null {
  return calculateDistanceViewForInterval(exercises, sets); // Same logic
}

/**
 * Calculate Rally View value for entire time interval
 * Average points per set across entire interval
 * Note: Sets with 0 points are excluded (treated as null, consistent with other views)
 */
function calculateRallyViewForInterval(
  exercises: ExerciseData[],
  sets: SetData[]
): number | null {
  const points: number[] = [];

  const exerciseIds = exercises.map(e => e.id);
  const intervalSets = sets.filter(s => exerciseIds.includes(s.workout_exercise_id));

  for (const set of intervalSets) {
    // Exclude 0 values (treat as null, consistent with other views like Tonnage)
    if (set.points != null && set.points !== 0) {
      const pointsValue = Number(set.points);
      if (!isNaN(pointsValue) && pointsValue > 0) {
        points.push(pointsValue);
      }
    }
  }

  if (points.length === 0) return null;

  const sum = points.reduce((acc, val) => acc + val, 0);
  return sum / points.length;
}

/**
 * Main calculation function for Skill Map (entire time interval)
 * Routes to the appropriate calculation based on view calculation type
 */
export function calculateViewValueForInterval(
  mode: SportMode,
  calculationType: ViewCalculationType,
  exercises: ExerciseData[],
  sets: SetData[]
): number | null {
  switch (calculationType) {
    case 'performance':
      return calculatePerformanceViewForInterval(exercises, sets);
    
    case 'tonnage':
      return calculateTonnageViewForInterval(exercises, sets);
    
    case 'shooting_percentage':
      return calculateShootingPercentageViewForInterval(exercises, sets);
    
    case 'jumpshot':
      return calculateJumpshotViewForInterval(exercises, sets);
    
    case 'drill':
      return calculateDrillViewForInterval(exercises, sets);
    
    case 'completion':
      return calculateCompletionViewForInterval(exercises, sets);
    
    case 'speed':
      return calculateSpeedViewForInterval(exercises, sets);
    
    case 'sprints':
      return calculateSprintsViewForInterval(exercises, sets);
    
    case 'hits':
      return calculateHitsViewForInterval(exercises, sets);
    
    case 'distance':
      return calculateDistanceViewForInterval(exercises, sets);
    
    case 'fielding':
      return calculateFieldingViewForInterval(exercises, sets); // DEPRECATED - kept for backwards compatibility
    case 'fielding_reps':
      return calculateDrillViewForInterval(exercises, sets); // Same logic - total reps across interval
    case 'fielding_distance':
      return calculateDistanceViewForInterval(exercises, sets); // Same logic - average distance per set across interval
    
    case 'shots':
      return calculateShotsViewForInterval(exercises, sets);
    
    case 'shot_distance':
      return calculateShotDistanceViewForInterval(exercises, sets);
    
    case 'rally':
      return calculateRallyViewForInterval(exercises, sets);
    
    default:
      console.warn(`Unknown calculation type: ${calculationType}`);
      return null;
  }
}
