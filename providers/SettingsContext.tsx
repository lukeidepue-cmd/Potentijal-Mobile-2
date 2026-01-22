/**
 * Settings Context Provider
 * Manages app-wide settings like theme, units, and preferences
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthProvider';
import {
  getUserPreferences,
  updateUserPreferences,
  UserPreferences,
} from '../lib/api/settings';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

type Theme = 'light' | 'dark' | 'system';

interface SettingsContextType {
  // Theme
  theme: Theme;
  effectiveTheme: 'light' | 'dark'; // Resolved theme (system -> light/dark)
  setTheme: (theme: Theme) => Promise<void>;
  
  // Units
  unitsWeight: 'lbs' | 'kg';
  unitsDistance: 'miles' | 'km';
  setUnitsWeight: (units: 'lbs' | 'kg') => Promise<void>;
  setUnitsDistance: (units: 'miles' | 'km') => Promise<void>;
  
  // Other preferences
  preferences: UserPreferences | null;
  loading: boolean;
  refreshPreferences: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const PREFERENCES_STORAGE_KEY = '@app_preferences';

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const systemColorScheme = useColorScheme();
  
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setThemeState] = useState<Theme>('system');

  // Resolve effective theme (system -> actual light/dark)
  const effectiveTheme: 'light' | 'dark' = theme === 'system' 
    ? (systemColorScheme === 'dark' ? 'dark' : 'light')
    : theme;

  // Load preferences from API
  const loadPreferences = useCallback(async () => {
    if (!user) {
      setPreferences(null);
      setLoading(false);
      // Clear cached preferences when user logs out
      try {
        await AsyncStorage.removeItem(PREFERENCES_STORAGE_KEY);
      } catch (error) {
        // Ignore errors
      }
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await getUserPreferences();
      
      if (error) {
        console.error('❌ [SettingsContext] Error loading preferences:', error);
        // Don't load from cache - always use fresh data from API
        // Clear any stale cache
        try {
          await AsyncStorage.removeItem(PREFERENCES_STORAGE_KEY);
        } catch (e) {
          // Ignore errors
        }
      } else if (data) {
        setPreferences(data);
        setThemeState(data.theme || 'system');
        // Cache preferences (but they'll be fresh from API with correct defaults)
        await AsyncStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(data));
      }
    } catch (error) {
      console.error('❌ [SettingsContext] Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load on mount and when user changes
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Set theme
  const setTheme = useCallback(async (newTheme: Theme) => {
    setThemeState(newTheme);
    
    if (user) {
      try {
        const { error } = await updateUserPreferences({ theme: newTheme });
        if (error) {
          console.error('❌ [SettingsContext] Error updating theme:', error);
          // Revert on error
          setThemeState(theme);
        } else {
          // Update local preferences
          if (preferences) {
            const updated = { ...preferences, theme: newTheme };
            setPreferences(updated);
            await AsyncStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(updated));
          }
        }
      } catch (error) {
        console.error('❌ [SettingsContext] Error updating theme:', error);
        setThemeState(theme);
      }
    }
  }, [user, theme, preferences]);

  // Set weight units
  const setUnitsWeight = useCallback(async (units: 'lbs' | 'kg') => {
    if (user) {
      try {
        const { error } = await updateUserPreferences({ units_weight: units });
        if (error) {
          console.error('❌ [SettingsContext] Error updating weight units:', error);
        } else {
          if (preferences) {
            const updated = { ...preferences, units_weight: units };
            setPreferences(updated);
            await AsyncStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(updated));
          }
        }
      } catch (error) {
        console.error('❌ [SettingsContext] Error updating weight units:', error);
      }
    }
  }, [user, preferences]);

  // Set distance units
  const setUnitsDistance = useCallback(async (units: 'miles' | 'km') => {
    if (user) {
      try {
        const { error } = await updateUserPreferences({ units_distance: units });
        if (error) {
          console.error('❌ [SettingsContext] Error updating distance units:', error);
        } else {
          if (preferences) {
            const updated = { ...preferences, units_distance: units };
            setPreferences(updated);
            await AsyncStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(updated));
          }
        }
      } catch (error) {
        console.error('❌ [SettingsContext] Error updating distance units:', error);
      }
    }
  }, [user, preferences]);

  const value: SettingsContextType = {
    theme,
    effectiveTheme,
    setTheme,
    unitsWeight: preferences?.units_weight || 'lbs',
    unitsDistance: preferences?.units_distance || 'miles',
    setUnitsWeight,
    setUnitsDistance,
    preferences,
    loading,
    refreshPreferences: loadPreferences,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

