// hooks/useMacroProgressGraph.ts
// Hook for fetching macro progress graph data

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import { ProgressDataPoint } from './useExerciseProgressGraph';

export type MacroMetric = 'calories' | 'protein' | 'carbs' | 'fats' | 'sugar' | 'sodium';

export function useMacroProgressGraph(params: {
  metric: MacroMetric;
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

    setLoading(true);
    setError(null);

    supabase
      .rpc('get_macro_progress', {
        p_user_id: user.id,
        p_metric: params.metric,
        p_days: params.days,
      })
      .then(({ data: result, error: rpcError }) => {
        setLoading(false);
        if (rpcError) {
          setError(rpcError);
          setData(null);
        } else {
          setData(result || []);
          setError(null);
        }
      });
  }, [user?.id, params.metric, params.days]);

  return { data, loading, error };
}


