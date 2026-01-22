/**
 * Progress Graph View Hook
 * Fetches and calculates progress graph data using the new view system
 */

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import { SportMode, mapModeKeyToSportMode, ExerciseType } from '../lib/types';
import { getViewConfig, getCalculationTypeForView, getExerciseTypeRestrictionForView } from '../lib/api/progress-views';
import { calculateTimeBuckets, TimeInterval, TimeBucket } from '../lib/utils/time-intervals';
import { calculateViewValue, ExerciseData, SetData } from '../lib/api/progress-view-calculations';

/**
 * Data point for the graph
 */
export interface ProgressGraphDataPoint {
  bucketIndex: number; // 0-5 (0 is most recent, 5 is oldest)
  value: number | null;
  bucketStart: string; // YYYY-MM-DD
  bucketEnd: string;   // YYYY-MM-DD
}

/**
 * Hook return type
 */
export interface UseProgressGraphViewResult {
  data: ProgressGraphDataPoint[];
  minValue: number | null;
  maxValue: number | null;
  loading: boolean;
  error: any;
}

/**
 * Hook parameters
 */
export interface UseProgressGraphViewParams {
  mode: SportMode | string;
  view: string; // View name (e.g., "Performance", "Tonnage", "Shooting %")
  exercise?: string; // Optional exercise name filter
  timeInterval: TimeInterval;
}

/**
 * Fuzzy match exercise names (similar to existing logic)
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

/**
 * Main hook for progress graph view
 */
export function useProgressGraphView(params: UseProgressGraphViewParams): UseProgressGraphViewResult {
  const { user } = useAuth();
  const [data, setData] = useState<ProgressGraphDataPoint[]>([]);
  const [minValue, setMinValue] = useState<number | null>(null);
  const [maxValue, setMaxValue] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      setData([]);
      setMinValue(null);
      setMaxValue(null);
      return;
    }

    // Don't fetch if no view selected
    if (!params.view) {
      setData([]);
      setMinValue(null);
      setMaxValue(null);
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

    // Calculate time buckets
    const buckets = calculateTimeBuckets(params.timeInterval);
    const oldestBucket = buckets[0]; // First bucket is oldest
    const newestBucket = buckets[buckets.length - 1]; // Last bucket is newest

    // Fetch workouts for this mode within the time range
    const startDateStr = oldestBucket.startDateStr;
    const endDateStr = newestBucket.endDateStr;

    console.log('🔍 [ProgressGraphView] Fetching data:', {
      mode: sportMode,
      view: params.view,
      exercise: params.exercise,
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
          console.error('❌ [ProgressGraphView] Workout query error:', workoutError);
          setError(workoutError);
          setLoading(false);
          return;
        }

        if (!workouts || workouts.length === 0) {
          console.log('✅ [ProgressGraphView] No workouts found');
          setData([]);
          setMinValue(null);
          setMaxValue(null);
          setLoading(false);
          return;
        }

        const workoutIds = workouts.map(w => w.id);
        const workoutDateMap = new Map(workouts.map(w => [w.id, w.performed_at]));

        // Step 2: Fetch exercises
        const { data: exercises, error: exercisesError } = await supabase
          .from('workout_exercises')
          .select('id, workout_id, name, exercise_type')
          .in('workout_id', workoutIds)
          .eq('exercise_type', exerciseTypeRestriction);

        if (exercisesError) {
          console.error('❌ [ProgressGraphView] Exercises query error:', exercisesError);
          setError(exercisesError);
          setLoading(false);
          return;
        }

        if (!exercises || exercises.length === 0) {
          console.log('✅ [ProgressGraphView] No exercises found for exercise type:', exerciseTypeRestriction);
          setData([]);
          setMinValue(null);
          setMaxValue(null);
          setLoading(false);
          return;
        }

        // Step 3: Filter exercises by name if provided
        let matchingExercises = exercises;
        if (params.exercise && params.exercise.trim()) {
          matchingExercises = exercises.filter(ex => 
            fuzzyMatchExerciseName(ex.name, params.exercise!)
          );
        }

        if (matchingExercises.length === 0) {
          console.log('✅ [ProgressGraphView] No matching exercises found');
          setData([]);
          setMinValue(null);
          setMaxValue(null);
          setLoading(false);
          return;
        }

        // Add performed_at to exercises for bucket filtering
        const exercisesWithDates: ExerciseData[] = matchingExercises.map(ex => ({
          id: ex.id,
          workout_id: ex.workout_id,
          name: ex.name,
          exercise_type: ex.exercise_type as ExerciseType,
          performed_at: workoutDateMap.get(ex.workout_id) || '',
        }));

        // Step 4: Fetch sets for matching exercises
        const exerciseIds = matchingExercises.map(e => e.id);
        const { data: sets, error: setsError } = await supabase
          .from('workout_sets')
          .select('id, workout_exercise_id, set_index, reps, weight, attempted, made, distance, time_min, avg_time_sec, completed, points')
          .in('workout_exercise_id', exerciseIds)
          .order('set_index');

        if (setsError) {
          console.error('❌ [ProgressGraphView] Sets query error:', setsError);
          setError(setsError);
          setLoading(false);
          return;
        }

        const setsData: SetData[] = (sets || []).map(s => ({
          id: s.id,
          workout_exercise_id: s.workout_exercise_id,
          set_index: s.set_index,
          reps: s.reps ? Number(s.reps) : null,
          weight: s.weight ? Number(s.weight) : null,
          attempted: s.attempted ? Number(s.attempted) : null,
          made: s.made ? Number(s.made) : null,
          distance: s.distance ? Number(s.distance) : null,
          time_min: s.time_min ? Number(s.time_min) : null,
          avg_time_sec: s.avg_time_sec ? Number(s.avg_time_sec) : null,
          completed: s.completed === true || s.completed === 'true',
          points: s.points ? Number(s.points) : null,
        }));

        // Step 5: Calculate value for each bucket
        const dataPoints: ProgressGraphDataPoint[] = [];
        const values: number[] = [];

        for (const bucket of buckets) {
          // Filter exercises and sets that fall within this bucket's date range
          // Parse dates as local dates to avoid timezone issues
          const bucketExercises = exercisesWithDates.filter(ex => {
            // Parse performed_at as local date (YYYY-MM-DD format from database)
            // This avoids timezone issues where "2024-01-21" might be interpreted as UTC
            const performedAtParts = ex.performed_at.split('-');
            if (performedAtParts.length !== 3) {
              console.warn(`⚠️ [ProgressGraphView] Invalid date format: ${ex.performed_at}`);
              return false;
            }
            
            const exerciseDate = new Date(
              parseInt(performedAtParts[0], 10), // year
              parseInt(performedAtParts[1], 10) - 1, // month (0-indexed)
              parseInt(performedAtParts[2], 10) // day
            );
            exerciseDate.setHours(0, 0, 0, 0);
            
            // Use bucket dates directly (already calculated as local dates)
            const bucketStart = new Date(bucket.startDate);
            bucketStart.setHours(0, 0, 0, 0);
            const bucketEnd = new Date(bucket.endDate);
            bucketEnd.setHours(23, 59, 59, 999);
            
            return exerciseDate >= bucketStart && exerciseDate <= bucketEnd;
          });

          // Get sets for bucket exercises
          const bucketExerciseIds = bucketExercises.map(e => e.id);
          const bucketSets = setsData.filter(s => bucketExerciseIds.includes(s.workout_exercise_id));

          // Calculate view-specific value for this bucket
          const bucketValue = calculateViewValue(
            sportMode,
            calculationType,
            bucketExercises,
            bucketSets,
            bucket
          );

          dataPoints.push({
            bucketIndex: bucket.bucketIndex,
            value: bucketValue,
            bucketStart: bucket.startDateStr,
            bucketEnd: bucket.endDateStr,
          });

          if (bucketValue !== null) {
            values.push(bucketValue);
          }
        }

        // Step 6: Calculate min/max for y-axis scaling
        // Find lowest and highest non-null values across all 6 data points
        let min: number | null = null;
        let max: number | null = null;

        if (values.length > 0) {
          min = Math.min(...values);
          max = Math.max(...values);
          
          // Edge case: If min === max (all values are the same)
          // Keep them as-is, the graph component will handle this
          // by centering the line and adding small padding for visual clarity
        }
        
        // Edge case: All values are null - min and max remain null
        // This is handled in the graph component by showing "No data available"

        console.log('✅ [ProgressGraphView] Data calculated:', {
          dataPoints: dataPoints.length,
          values: values.length,
          min,
          max,
        });

        setData(dataPoints);
        setMinValue(min);
        setMaxValue(max);
        setLoading(false);
        setError(null);
      })
      .catch((err) => {
        console.error('❌ [ProgressGraphView] Unexpected error:', err);
        setError(err);
        setLoading(false);
      });
  }, [user?.id, params.mode, params.view, params.exercise, params.timeInterval]);

  return { data, minValue, maxValue, loading, error };
}
