/**
 * Consistency Score Hook
 * Fetches and manages consistency score data for the current week and historical weeks
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getConsistencyScore,
  getMostRecentCompleteWeek,
  getHistoricalConsistencyScores,
  getAverageConsistencyScore,
  ConsistencyScore,
  HistoricalScore,
} from '../lib/api/consistency-score';

/**
 * Hook return type
 */
export interface UseConsistencyScoreResult {
  currentWeek: ConsistencyScore | null;
  historicalWeeks: (HistoricalScore & { percentageChange: number | null })[];
  averageScore: number | null;
  isLoading: boolean;
  error: any;
  refetch: () => Promise<void>;
}

/**
 * Hook parameters (optional, for future customization)
 */
export interface UseConsistencyScoreParams {
  historicalLimit?: number; // Number of historical weeks to fetch (default: 10)
  weeksLimitForAverage?: number | null; // Number of weeks to use for average (default: 52)
}

/**
 * Hook to fetch and manage consistency score data
 */
export function useConsistencyScore(
  params: UseConsistencyScoreParams = {}
): UseConsistencyScoreResult {
  const { historicalLimit = 10, weeksLimitForAverage = 52 } = params;

  const [currentWeek, setCurrentWeek] = useState<ConsistencyScore | null>(null);
  const [historicalWeeks, setHistoricalWeeks] = useState<
    (HistoricalScore & { percentageChange: number | null })[]
  >([]);
  const [averageScore, setAverageScore] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<any>(null);

  /**
   * Fetch all consistency score data
   */
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 1. Get most recent complete week
      const weekStartDate = getMostRecentCompleteWeek();

      // 2. Fetch current week score
      const { data: currentWeekData, error: currentWeekError } =
        await getConsistencyScore(weekStartDate);

      if (currentWeekError) {
        console.error(
          '❌ [useConsistencyScore] Error fetching current week:',
          currentWeekError
        );
        setError(currentWeekError);
        setCurrentWeek(null);
      } else {
        setCurrentWeek(currentWeekData);
      }

      // 3. Fetch historical weeks
      const { data: historicalData, error: historicalError } =
        await getHistoricalConsistencyScores(historicalLimit);

      if (historicalError) {
        console.error(
          '❌ [useConsistencyScore] Error fetching historical weeks:',
          historicalError
        );
        // Don't set error here - we might still have current week data
        setHistoricalWeeks([]);
      } else {
        setHistoricalWeeks(historicalData || []);
      }

      // 4. Fetch average score
      const { data: averageData, error: averageError } =
        await getAverageConsistencyScore(weeksLimitForAverage);

      if (averageError) {
        console.error(
          '❌ [useConsistencyScore] Error fetching average score:',
          averageError
        );
        // Don't set error here - we might still have other data
        setAverageScore(null);
      } else {
        setAverageScore(averageData);
      }
    } catch (err: any) {
      console.error('❌ [useConsistencyScore] Exception:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [historicalLimit, weeksLimitForAverage]);

  /**
   * Refetch all data
   */
  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    currentWeek,
    historicalWeeks,
    averageScore,
    isLoading,
    error,
    refetch,
  };
}
