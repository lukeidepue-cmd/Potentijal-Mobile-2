// hooks/useAvailableModes.ts
// Hook to get the list of available sport modes based on user's selected sports from onboarding

import { useState, useEffect, useCallback } from 'react';
import { getMyProfile } from '../lib/api/profile';

export type ModeKey =
  | "lifting"
  | "basketball"
  | "football"
  | "baseball"
  | "soccer"
  | "hockey"
  | "tennis";

export interface ModeOption {
  key: ModeKey;
  label: string;
  icon: string;
}

// Map database sport IDs to mode keys
const SPORT_ID_TO_MODE_KEY: Record<string, ModeKey> = {
  'workout': 'lifting',
  'lifting': 'lifting',
  'basketball': 'basketball',
  'football': 'football',
  'baseball': 'baseball',
  'soccer': 'soccer',
  'hockey': 'hockey',
  'tennis': 'tennis',
};

// All available modes with their labels and icons
const ALL_MODES: ModeOption[] = [
  { key: "lifting", label: "Lifting", icon: "dumbbell" },
  { key: "basketball", label: "Basketball", icon: "basketball-outline" },
  { key: "football", label: "Football", icon: "american-football-outline" },
  { key: "baseball", label: "Baseball", icon: "baseball" },
  { key: "soccer", label: "Soccer", icon: "football-outline" },
  { key: "hockey", label: "Hockey", icon: "hockey-sticks" },
  { key: "tennis", label: "Tennis", icon: "tennisball-outline" },
];

export function useAvailableModes() {
  const [availableModes, setAvailableModes] = useState<ModeOption[]>(ALL_MODES);
  const [loading, setLoading] = useState(true);

  const loadAvailableModes = useCallback(async () => {
    try {
      const { data: profile, error } = await getMyProfile();
      
      if (error || !profile) {
        console.warn('⚠️ [useAvailableModes] Failed to load profile, showing all modes:', error);
        // Default to all modes if profile can't be loaded
        setAvailableModes(ALL_MODES);
        setLoading(false);
        return;
      }

      // Get user's selected sports from profile
      const userSports = profile.sports || [];
      
      // If no sports selected, default to all modes (shouldn't happen after onboarding, but handle gracefully)
      if (userSports.length === 0) {
        console.warn('⚠️ [useAvailableModes] No sports in profile, showing all modes');
        setAvailableModes(ALL_MODES);
        setLoading(false);
        return;
      }

      // Convert sport IDs to mode keys - only include sports the user actually selected
      const availableModeKeys = userSports
        .map(sportId => SPORT_ID_TO_MODE_KEY[sportId.toLowerCase()])
        .filter((modeKey): modeKey is ModeKey => modeKey !== undefined);

      // Filter ALL_MODES to only include available modes (no automatic "lifting")
      const filteredModes = ALL_MODES.filter(mode => 
        availableModeKeys.includes(mode.key)
      );

      console.log('✅ [useAvailableModes] Available modes:', filteredModes.map(m => m.key));
      setAvailableModes(filteredModes);
    } catch (error) {
      console.error('❌ [useAvailableModes] Error loading available modes:', error);
      // Default to all modes on error
      setAvailableModes(ALL_MODES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAvailableModes();
  }, [loadAvailableModes]);

  return { availableModes, loading, refresh: loadAvailableModes };
}
