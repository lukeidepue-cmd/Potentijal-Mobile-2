/**
 * Personal Records Hook
 * Fetches and manages personal records data for a searched exercise
 */

import { useState, useCallback } from 'react';
import { getPersonalRecords, PersonalRecord } from '../lib/api/personal-records';
import { SportMode } from '../lib/types';

/**
 * Hook return type
 */
export interface UsePersonalRecordsResult {
  record: PersonalRecord | null;
  isLoading: boolean;
  error: any;
  searchExercise: (exerciseName: string, mode: SportMode | string) => Promise<void>;
  clearSearch: () => void;
  currentSearch: string | null;
  currentMode: SportMode | null;
}

/**
 * Hook to fetch and manage personal records data
 */
export function usePersonalRecords(): UsePersonalRecordsResult {
  const [record, setRecord] = useState<PersonalRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<any>(null);
  const [currentSearch, setCurrentSearch] = useState<string | null>(null);
  const [currentMode, setCurrentMode] = useState<SportMode | null>(null);

  /**
   * Search for personal records of an exercise
   */
  const searchExercise = useCallback(async (
    exerciseName: string,
    mode: SportMode | string
  ) => {
    if (!exerciseName || !exerciseName.trim()) {
      setRecord(null);
      setCurrentSearch(null);
      setCurrentMode(null);
      setError(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setCurrentSearch(exerciseName.trim());
      setCurrentMode(typeof mode === 'string' ? mode : mode);

      const { data: recordData, error: recordError } = await getPersonalRecords(
        exerciseName.trim(),
        mode
      );

      if (recordError) {
        console.error(
          '❌ [usePersonalRecords] Error fetching personal records:',
          recordError
        );
        setError(recordError);
        setRecord(null);
      } else {
        setRecord(recordData);
        setError(null);
      }
    } catch (err: any) {
      console.error('❌ [usePersonalRecords] Exception:', err);
      setError(err);
      setRecord(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Clear search and reset state
   */
  const clearSearch = useCallback(() => {
    setRecord(null);
    setCurrentSearch(null);
    setCurrentMode(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    record,
    isLoading,
    error,
    searchExercise,
    clearSearch,
    currentSearch,
    currentMode,
  };
}
