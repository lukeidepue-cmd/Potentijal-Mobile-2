import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import { useAuth } from "./AuthProvider";
import { getMyProfile } from "../lib/api/profile";
import AsyncStorage from "@react-native-async-storage/async-storage";

const MODE_STORAGE_KEY = "@app_mode";

export type Mode = "lifting" | "basketball" | "football" | "baseball" | "soccer" | "hockey" | "tennis";
type ModeContextType = {
  mode: Mode;
  setMode: (m: Mode) => void;
  modeLoading: boolean;
};

const ModeContext = createContext<ModeContextType | undefined>(undefined);

// Map primary_sport from database to Mode type
const mapPrimarySportToMode = (primarySport: string | null | undefined, fallbackSport?: string): Mode => {
  const sportMap: Record<string, Mode> = {
    workout: "lifting",
    lifting: "lifting",
    basketball: "basketball",
    football: "football",
    baseball: "baseball",
    soccer: "soccer",
    hockey: "hockey",
    tennis: "tennis",
  };
  
  if (primarySport) {
    const mapped = sportMap[primarySport.toLowerCase()];
    if (mapped) return mapped;
  }
  
  // If no primary sport or mapping failed, try fallback (first selected sport)
  if (fallbackSport) {
    const mapped = sportMap[fallbackSport.toLowerCase()];
    if (mapped) return mapped;
  }
  
  // Last resort: default to lifting only if no other option
  return "lifting";
};

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const { user, needsOnboarding } = useAuth();
  // Initialize with cached mode if available, otherwise "lifting"
  const [mode, setMode] = useState<Mode>(() => {
    // Try to load from cache synchronously on mount
    // This is a workaround - we'll update it properly in useEffect
    return "lifting";
  });
  const [modeLoading, setModeLoading] = useState(true);
  
  // Load mode from profile - reload when user changes OR when onboarding completes
  // This ensures we reload after onboarding when sports are saved
  useEffect(() => {
    if (!user) {
      // Reset to default when user logs out
      setMode("lifting");
      setModeLoading(false);
      AsyncStorage.removeItem(MODE_STORAGE_KEY);
      return;
    }

    let isMounted = true;
    setModeLoading(true);
    
    const loadModeFromProfile = async () => {
      try {
        // First, try to load from cache for instant startup
        const cachedMode = await AsyncStorage.getItem(MODE_STORAGE_KEY);
        if (cachedMode && isMounted) {
          const validModes: Mode[] = ["lifting", "basketball", "football", "baseball", "soccer", "hockey", "tennis"];
          if (validModes.includes(cachedMode as Mode)) {
            setMode(cachedMode as Mode);
            console.log('✅ [ModeContext] Loaded mode from cache:', cachedMode);
            // Don't set modeLoading to false yet - we still need to verify with profile
          }
        }
        
        // Then load from profile to get the correct mode based on primary_sport
        const { data: profile, error } = await getMyProfile();
        
        if (!isMounted) return;
        
        if (error) {
          console.error('❌ [ModeContext] Error loading profile:', error);
          setModeLoading(false);
          return;
        }
        
        if (!profile) {
          console.warn('⚠️ [ModeContext] No profile found');
          setModeLoading(false);
          return;
        }
        
        console.log('🔵 [ModeContext] Profile loaded:', { 
          primary_sport: profile.primary_sport, 
          sports: profile.sports 
        });
        
        let targetMode: Mode;
        
        if (profile.primary_sport) {
          // Use primary sport, with first selected sport as fallback
          const firstSport = profile.sports && profile.sports.length > 0 ? profile.sports[0] : undefined;
          targetMode = mapPrimarySportToMode(profile.primary_sport, firstSport);
          console.log('✅ [ModeContext] Using primary_sport:', profile.primary_sport, '-> mode:', targetMode);
        } else if (profile.sports && profile.sports.length > 0) {
          // If no primary sport but has sports, use first sport
          targetMode = mapPrimarySportToMode(null, profile.sports[0]);
          console.log('✅ [ModeContext] Using first sport from sports array:', profile.sports[0], '-> mode:', targetMode);
        } else {
          // No sports at all - shouldn't happen after onboarding, but keep lifting as fallback
          targetMode = "lifting";
          console.warn('⚠️ [ModeContext] No primary_sport or sports found, keeping default lifting');
        }
        
        // Always set the mode from profile (this is the source of truth)
        if (isMounted) {
          setMode(targetMode);
          // Cache the mode for next app start
          await AsyncStorage.setItem(MODE_STORAGE_KEY, targetMode);
          console.log('✅ [ModeContext] Mode set to:', targetMode);
          setModeLoading(false);
        }
      } catch (error) {
        console.error('❌ [ModeContext] Exception loading primary sport:', error);
        if (isMounted) {
          setModeLoading(false);
        }
      }
    };
    
    // Load immediately - don't wait for anything
    loadModeFromProfile();
    
    return () => {
      isMounted = false;
    };
  }, [user, needsOnboarding]); // Reload when user changes OR when onboarding status changes
  
  // Save mode to cache whenever it changes (for manual switches)
  useEffect(() => {
    if (user && mode) {
      AsyncStorage.setItem(MODE_STORAGE_KEY, mode).catch(err => {
        console.error('❌ [ModeContext] Error saving mode to cache:', err);
      });
    }
  }, [mode, user]);
  
  const value = useMemo(() => ({ mode, setMode, modeLoading }), [mode, modeLoading]);
  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

export function useMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error("useMode must be used within a ModeProvider");
  return ctx;
}
