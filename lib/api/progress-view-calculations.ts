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
  completed?: boolean | null;
  points?: number | null;
}

/**
 * Calculate Performance View value
 * Highest single set (reps × weight) in bucket
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
  for (const set of bucketSets) {
    if (set.reps != null && set.weight != null) {
      const value = Number(set.reps) * Number(set.weight);
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
 * 
 * Documentation: "Average reps x weight x sets per exercise type square"
 * Example: If user logged "bench press" twice in a 5-day period:
 * - Day 1: total reps x weight x sets = 3000
 * - Day 2: total reps x weight x sets = 5000
 * - Average = (3000 + 5000) / 2 = 4000
 * 
 * For each exercise square (each time exercise was logged in a workout):
 * - Calculate: sum of (reps × weight) for all sets × number of sets
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

    // Calculate sum of (reps × weight) for all sets in this exercise square
    let sumRepsWeight = 0;
    let hasValidData = false;

    for (const set of exerciseSets) {
      if (set.reps != null && set.weight != null) {
        sumRepsWeight += Number(set.reps) * Number(set.weight);
        hasValidData = true;
      }
    }

    // Multiply by number of sets to get total tonnage for this exercise square
    // Formula: (sum of reps × weight across all sets) × number of sets
    // Example: If sumRepsWeight = 1000 and there are 3 sets, tonnage = 1000 × 3 = 3000
    if (hasValidData) {
      const tonnagePerSquare = sumRepsWeight * exerciseSets.length;
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
      
      const percentage = (Number(set.made) / Number(set.attempted)) * 100;
      percentages.push(percentage);
    }
  }

  if (percentages.length === 0) return null;

  const sum = percentages.reduce((acc, val) => acc + val, 0);
  return sum / percentages.length;
}

/**
 * Calculate Jumpshot View value (Basketball)
 * Average attempted per shooting square in bucket
 */
function calculateJumpshotView(
  exercises: ExerciseData[],
  sets: SetData[],
  bucket: TimeBucket
): number | null {
  // Group sets by exercise (each exercise = one "shooting square")
  const squareAttempts: number[] = [];

  for (const exercise of exercises) {
    const exerciseSets = sets.filter(s => s.workout_exercise_id === exercise.id);
    
    // Sum all attempted shots for this shooting square
    let totalAttempted = 0;
    let hasValidData = false;

    for (const set of exerciseSets) {
      if (set.attempted != null) {
        totalAttempted += Number(set.attempted);
        hasValidData = true;
      }
    }

    if (hasValidData) {
      squareAttempts.push(totalAttempted);
    }
  }

  if (squareAttempts.length === 0) return null;

  // Average across all shooting squares
  const sum = squareAttempts.reduce((acc, val) => acc + val, 0);
  return sum / squareAttempts.length;
}

/**
 * Calculate Drill View value (Basketball, Soccer, Hockey, Tennis)
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

  for (const set of bucketSets) {
    if (set.reps != null) {
      totalReps += Number(set.reps);
      hasValidData = true;
    }
  }

  return hasValidData ? totalReps : null;
}

/**
 * Calculate Completion View value (Football)
 * Average completion % per set in bucket
 * 
 * Documentation: "Average completion percentage on each set"
 * Formula: completed / reps × 100 for each set, then average
 * Note: "completed" is a boolean, but we need to check how many reps were actually completed
 * Based on the documentation, it seems "completed" represents completed reps, not a boolean
 * But the database schema shows it as boolean. We'll use: if completed=true, count as 1 completed rep
 * Actually, re-reading: "completed" field might represent whether the set was completed
 * But the formula says "completed / reps" which suggests completed is a number
 * 
 * For now, we'll interpret: if completed=true, treat as 1 completed rep
 * If completed=false, treat as 0 completed reps
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

  for (const set of bucketSets) {
    if (set.reps != null && set.reps > 0 && set.completed !== null && set.completed !== undefined) {
      // Handle division by zero
      if (Number(set.reps) === 0) continue;
      
      // If completed is true, treat as 1 completed rep; if false, treat as 0
      // This matches the pattern: completed / reps
      const completedReps = set.completed === true ? 1 : 0;
      const percentage = (completedReps / Number(set.reps)) * 100;
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
    if (set.points != null) {
      points.push(Number(set.points));
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
      return calculateFieldingView(exercises, sets, bucket);
    
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
