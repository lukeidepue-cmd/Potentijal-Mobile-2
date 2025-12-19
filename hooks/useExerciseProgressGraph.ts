// hooks/useExerciseProgressGraph.ts
// Hook for fetching exercise progress graph data

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
  bucketIndex?: number;
  bucket_index?: number;
  bucketStart?: string;
  bucket_start?: string;
  bucketEnd?: string;
  bucket_end?: string;
  value: number | null;
}

export function useExerciseProgressGraph(params: {
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

    // Only fetch if query is not empty
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

    supabase
      .rpc('get_exercise_progress', {
        p_user_id: user.id,
        p_mode: sportMode,
        p_query: params.query.trim(),
        p_metric: params.metric,
        p_days: params.days,
      })
      .then(({ data: result, error: rpcError }) => {
        setLoading(false);
        if (rpcError) {
          console.error('Progress graph RPC error:', rpcError);
          setError(rpcError);
          setData(null);
        } else {
          // Supabase automatically converts snake_case to camelCase, but handle both just in case
          const transformed = (result || []).map((r: any) => ({
            bucketIndex: r.bucketIndex ?? r.bucket_index ?? 0,
            bucketStart: r.bucketStart ?? r.bucket_start ?? '',
            bucketEnd: r.bucketEnd ?? r.bucket_end ?? '',
            value: r.value ?? null,
          }));
          setData(transformed);
          setError(null);
        }
      });
  }, [user?.id, params.mode, params.query, params.metric, params.days]);

  return { data, loading, error };
}


