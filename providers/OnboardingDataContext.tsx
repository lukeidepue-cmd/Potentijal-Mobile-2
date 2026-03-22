import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@potentijal_onboarding_preauth';

export interface FirstExerciseData {
  name: string;
  kind: string;
  mode: string;
  field1: string;
  field2: string;
  value1: number;
  value2: number;
  label1: string;
  label2: string;
}

interface OnboardingPreAuthData {
  selectedSports: string[];
  primarySport: string | null;
  firstExercise: FirstExerciseData | null;
}

interface OnboardingDataContextType {
  data: OnboardingPreAuthData;
  setSports: (sports: string[], primarySport: string) => void;
  setFirstExercise: (exercise: FirstExerciseData) => void;
  clearOnboardingData: () => Promise<void>;
}

const DEFAULT_DATA: OnboardingPreAuthData = {
  selectedSports: [],
  primarySport: null,
  firstExercise: null,
};

const OnboardingDataContext = createContext<OnboardingDataContextType | undefined>(undefined);

export function OnboardingDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<OnboardingPreAuthData>(DEFAULT_DATA);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(stored => {
      if (stored) {
        try {
          setData(JSON.parse(stored));
        } catch {}
      }
    });
  }, []);

  const setSports = useCallback((sports: string[], primarySport: string) => {
    setData(prev => {
      const next = { ...prev, selectedSports: sports, primarySport };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const setFirstExercise = useCallback((exercise: FirstExerciseData) => {
    setData(prev => {
      const next = { ...prev, firstExercise: exercise };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const clearOnboardingData = useCallback(async () => {
    setData(DEFAULT_DATA);
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  return (
    <OnboardingDataContext.Provider value={{ data, setSports, setFirstExercise, clearOnboardingData }}>
      {children}
    </OnboardingDataContext.Provider>
  );
}

export function useOnboardingData() {
  const context = useContext(OnboardingDataContext);
  if (!context) {
    throw new Error('useOnboardingData must be used within an OnboardingDataProvider');
  }
  return context;
}
