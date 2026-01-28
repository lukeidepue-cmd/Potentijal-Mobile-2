/**
 * Most Logged Exercises Hook
 * Fetches and manages most logged exercises data for a time interval
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getMostLoggedExercises,
  MostLoggedExercise,
  TimeInterval,
} from '../lib/api/most-logged-exercises';
import { SportMode } from '../lib/types';

/**
 * Hook return type
 */
export interface UseMostLoggedExercisesResult {
  exercises: MostLoggedExercise[];
  isLoading: boolean;
  error: any;
  timeInterval: TimeInterval;
  setTimeInterval: (interval: TimeInterval) => void;
  mode: SportMode | string;
  setMode: (mode: SportMode | string) => void;
  refetch: () => Promise<void>;
}

/**
 * Hook parameters
 */
export interface UseMostLoggedExercisesParams {
  initialTimeInterval?: TimeInterval; // Default: 30
  initialMode?: SportMode | string; // Default: 'workout'
  limit?: number; // Default: 10
}

/**
 * Hook to fetch and manage most logged exercises data
 */
export function useMostLoggedExercises(
  params: UseMostLoggedExercisesParams = {}
): UseMostLoggedExercisesResult {
  const {
    initialTimeInterval = 30,
    initialMode = 'workout',
    limit = 10,
  } = params;

  const [exercises, setExercises] = useState<MostLoggedExercise[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<any>(null);
  const [timeInterval, setTimeIntervalState] = useState<TimeInterval>(initialTimeInterval);
  const [mode, setModeState] = useState<SportMode | string>(initialMode);

  /**
   * Fetch most logged exercises
   */
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: exercisesData, error: exercisesError } = await getMostLoggedExercises(
        mode,
        timeInterval,
        limit
      );

      if (exercisesError) {
        console.error(
          '❌ [useMostLoggedExercises] Error fetching most logged exercises:',
          exercisesError
        );
        setError(exercisesError);
        setExercises([]);
      } else {
        setExercises(exercisesData || []);
        setError(null);
      }
    } catch (err: any) {
      console.error('❌ [useMostLoggedExercises] Exception:', err);
      setError(err);
      setExercises([]);
    } finally {
      setIsLoading(false);
    }
  }, [mode, timeInterval, limit]);

  /**
   * Set time interval and trigger refetch
   */
  const setTimeInterval = useCallback((interval: TimeInterval) => {
    setTimeIntervalState(interval);
  }, []);

  /**
   * Set mode and trigger refetch
   */
  const setMode = useCallback((newMode: SportMode | string) => {
    setModeState(newMode);
  }, []);

  /**
   * Refetch data
   */
  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // Fetch data on mount and when dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    exercises,
    isLoading,
    error,
    timeInterval,
    setTimeInterval,
    mode,
    setMode,
    refetch,
  };
}
