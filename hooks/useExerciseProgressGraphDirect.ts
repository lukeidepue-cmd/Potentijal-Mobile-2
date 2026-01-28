// hooks/useExerciseProgressGraphDirect.ts
// Direct query approach - bypasses RPC entirely
// This is a workaround for the RPC type issues

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import { SportMode, mapModeKeyToSportMode } from '../lib/types';

export type ProgressMetric =
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

export interface ProgressDataPoint {
  bucketIndex: number;
  bucketStart: string;
  bucketEnd: string;
  value: number | null;
}

export function useExerciseProgressGraphDirect(params: {
  mode: SportMode | string;
  query: string;
  metric: ProgressMetric;
  days: 7 | 30 | 90 | 180 | 360;
}) {
  const { user } = useAuth();
  const [data, setData] = useState<ProgressDataPoint[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      setData(null);
      return;
    }

    if (!params.query.trim()) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const sportMode = typeof params.mode === 'string' 
      ? mapModeKeyToSportMode(params.mode) 
      : params.mode;

    // Calculate bucket configuration
    let bucketCount: number;
    let bucketSizeDays: number;
    switch (params.days) {
      case 7: bucketCount = 7; bucketSizeDays = 1; break;
      case 30: bucketCount = 4; bucketSizeDays = 7; break;
      case 90: bucketCount = 6; bucketSizeDays = 15; break;
      case 180: bucketCount = 6; bucketSizeDays = 30; break;
      case 360: bucketCount = 6; bucketSizeDays = 60; break;
      default: bucketCount = 7; bucketSizeDays = 1;
    }

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999); // End of today
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (bucketCount * bucketSizeDays));
    startDate.setHours(0, 0, 0, 0); // Start of day

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    console.log('🔍 Querying workouts:', {
      mode: sportMode,
      query: params.query,
      metric: params.metric,
      days: params.days,
      dateRange: `${startDateStr} to ${endDateStr}`,
    });

    // Query workouts directly - use separate queries to avoid nested query issues
    supabase
      .from('workouts')
      .select('id, performed_at')
      .eq('user_id', user.id)
      .eq('mode', sportMode)
      .gte('performed_at', startDateStr)
      .lte('performed_at', endDateStr)
      .order('performed_at', { ascending: false })
      .limit(1000) // Reasonable limit to ensure we get all recent workouts
      .then(async ({ data: workouts, error: workoutError }) => {
        if (workoutError) {
          console.error('❌ Workout query error:', workoutError);
          setError(workoutError);
          setLoading(false);
          return;
        }

        console.log('✅ Found workouts:', workouts?.length || 0);

        if (!workouts || workouts.length === 0) {
          setData([]);
          setLoading(false);
          return;
        }

        // Get all exercises for these workouts
        const workoutIds = workouts.map(w => w.id);
        const { data: exercises, error: exercisesError } = await supabase
          .from('workout_exercises')
          .select('id, workout_id, name, exercise_type')
          .in('workout_id', workoutIds);

        if (exercisesError) {
          console.error('❌ Exercises query error:', exercisesError);
          setError(exercisesError);
          setLoading(false);
          return;
        }

        console.log('✅ Found exercises:', exercises?.length || 0);

        // Filter exercises by fuzzy name match - EXTREMELY lenient
        const queryLower = params.query.toLowerCase().trim();
        const matchingExercises: any[] = [];
        
        exercises?.forEach((exercise: any) => {
          const exerciseNameLower = (exercise.name || '').toLowerCase();
          // EXTREMELY lenient fuzzy matching - match if any significant word matches
          const exerciseNameNoSpaces = exerciseNameLower.replace(/\s+/g, '');
          const queryNoSpaces = queryLower.replace(/\s+/g, '');
          
          // Split into words for better matching
          const exerciseWords = exerciseNameLower.split(/\s+/).filter(w => w.length > 2);
          const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
          
          let matches = false;
          
          // Exact or substring match
          if (exerciseNameLower.includes(queryLower) || 
              queryLower.includes(exerciseNameLower) ||
              exerciseNameNoSpaces.includes(queryNoSpaces) ||
              queryNoSpaces.includes(exerciseNameNoSpaces)) {
            matches = true;
          }
          
          // Word-based matching (e.g., "pulldowns" matches "pulldown" or "pull downs")
          if (!matches && queryWords.length > 0) {
            matches = queryWords.some(qw => 
              exerciseWords.some(ew => ew.includes(qw) || qw.includes(ew))
            );
          }
          
          // Starts with match
          if (!matches && (
            exerciseNameLower.startsWith(queryLower) ||
            queryLower.startsWith(exerciseNameLower) ||
            exerciseWords.some(ew => ew.startsWith(queryLower)) ||
            queryWords.some(qw => exerciseWords.some(ew => ew.startsWith(qw)))
          )) {
            matches = true;
          }
          
          if (matches) {
            const workout = workouts.find(w => w.id === exercise.workout_id);
            matchingExercises.push({
              ...exercise,
              performed_at: workout?.performed_at,
            });
          }
        });

        console.log('✅ Matching exercises:', matchingExercises.length);

        if (matchingExercises.length === 0) {
          setData([]);
          setLoading(false);
          return;
        }

        // Get sets for matching exercises
        const exerciseIds = matchingExercises.map(e => e.id);
        const { data: sets, error: setsError } = await supabase
          .from('workout_sets')
          .select('id, workout_exercise_id, reps, weight, attempted, made, distance, time_min, avg_time_sec, completed, points')
          .in('workout_exercise_id', exerciseIds)
          .order('set_index');

        if (setsError) {
          console.error('❌ Sets query error:', setsError);
          setError(setsError);
          setLoading(false);
          return;
        }

        console.log('✅ Found sets:', sets?.length || 0);

        // Create a map of exercise_id -> sets
        const setsByExercise = new Map<string, any[]>();
        sets?.forEach((set: any) => {
          if (!setsByExercise.has(set.workout_exercise_id)) {
            setsByExercise.set(set.workout_exercise_id, []);
          }
          setsByExercise.get(set.workout_exercise_id)!.push(set);
        });

        // Calculate metric values
        const metricValues: Array<{ date: string; value: number }> = [];
        
        matchingExercises.forEach((exercise) => {
          const exerciseSets = setsByExercise.get(exercise.id) || [];
          exerciseSets.forEach((set: any) => {
            let value: number | null = null;
            
            switch (params.metric) {
              case 'reps':
                value = set.reps ? Number(set.reps) : null;
                break;
              case 'weight':
                value = set.weight ? Number(set.weight) : null;
                break;
              case 'reps_x_weight':
                value = (set.reps && set.weight) ? Number(set.reps) * Number(set.weight) : null;
                break;
              case 'attempted':
                value = set.attempted ? Number(set.attempted) : null;
                break;
              case 'made':
                value = set.made ? Number(set.made) : null;
                break;
              case 'percentage':
                if (set.attempted && set.made && set.attempted > 0) {
                  const attempted = Number(set.attempted);
                  const made = Number(set.made);
                  // If made > attempted, treat as 100%
                  value = made > attempted ? 100 : (made / attempted) * 100;
                } else {
                  value = null;
                }
                break;
              case 'distance':
                value = set.distance ? Number(set.distance) : null;
                break;
              case 'time_min':
                value = set.time_min ? Number(set.time_min) : null;
                break;
              case 'avg_time_sec':
                value = set.avg_time_sec ? Number(set.avg_time_sec) : null;
                break;
              case 'completed':
                value = set.completed ? 1 : 0;
                break;
              case 'points':
                value = set.points ? Number(set.points) : null;
                break;
            }

            if (value !== null) {
              metricValues.push({
                date: exercise.performed_at,
                value,
              });
            }
          });
        });

        console.log('✅ Metric values calculated:', metricValues.length);

        // Bucket the data
        const buckets: Map<number, number[]> = new Map();
        const bucketStartDates: Map<number, string> = new Map();
        const bucketEndDates: Map<number, string> = new Map();

        // Initialize all buckets first
        for (let i = 0; i < bucketCount; i++) {
          const bucketStart = new Date();
          bucketStart.setDate(bucketStart.getDate() - ((i + 1) * bucketSizeDays));
          const bucketEnd = new Date(bucketStart);
          bucketEnd.setDate(bucketEnd.getDate() + bucketSizeDays - 1);
          bucketStartDates.set(i, bucketStart.toISOString().split('T')[0]);
          bucketEndDates.set(i, bucketEnd.toISOString().split('T')[0]);
          buckets.set(i, []);
        }

        metricValues.forEach(({ date, value }) => {
          if (!date) return;
          
          const workoutDate = new Date(date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          workoutDate.setHours(0, 0, 0, 0);
          
          const daysAgo = Math.floor((today.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24));
          const bucketIndex = Math.floor(daysAgo / bucketSizeDays);
          
          if (bucketIndex >= 0 && bucketIndex < bucketCount) {
            buckets.get(bucketIndex)!.push(value);
          }
        });

        // Calculate averages for each bucket
        const result: ProgressDataPoint[] = [];
        for (let i = 0; i < bucketCount; i++) {
          const values = buckets.get(i);
          if (values && values.length > 0) {
            const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
            result.push({
              bucketIndex: i,
              bucketStart: bucketStartDates.get(i) || '',
              bucketEnd: bucketEndDates.get(i) || '',
              value: Math.round(avg * 100) / 100, // Round to 2 decimals
            });
          }
        }

        console.log('✅ Final result:', result.length, 'buckets with data');
        console.log('📊 Result data:', result);

        setData(result.sort((a, b) => a.bucketIndex - b.bucketIndex));
        setLoading(false);
        setError(null);
      })
      .catch((err) => {
        console.error('Unexpected error in progress graph:', err);
        setError(err);
        setLoading(false);
      });
  }, [user?.id, params.mode, params.query, params.metric, params.days]);

  return { data, loading, error };
}

