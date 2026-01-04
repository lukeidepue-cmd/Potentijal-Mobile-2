import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import { useAuth } from "./AuthProvider";
import { getMyProfile } from "../lib/api/profile";

export type Mode = "lifting" | "basketball" | "football" | "baseball" | "soccer" | "hockey" | "tennis";
type ModeContextType = {
  mode: Mode;
  setMode: (m: Mode) => void;
};

const ModeContext = createContext<ModeContextType | undefined>(undefined);

// Map primary_sport from database to Mode type
const mapPrimarySportToMode = (primarySport: string | null | undefined): Mode => {
  if (!primarySport) return "lifting";
  
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
  
  return sportMap[primarySport.toLowerCase()] || "lifting";
};

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("lifting");
  
  // Load primary sport from profile when user logs in
  useEffect(() => {
    if (user) {
      const loadPrimarySport = async () => {
        try {
          const { data: profile } = await getMyProfile();
          if (profile?.primary_sport) {
            const primaryMode = mapPrimarySportToMode(profile.primary_sport);
            setMode(primaryMode);
          } else if (profile?.sports && profile.sports.length > 0) {
            // If no primary sport but has sports, use first sport
            const firstSportMode = mapPrimarySportToMode(profile.sports[0]);
            setMode(firstSportMode);
          }
        } catch (error) {
          console.error('Error loading primary sport:', error);
          // Keep default "lifting" if error
        }
      };
      loadPrimarySport();
    } else {
      // Reset to default when user logs out
      setMode("lifting");
    }
  }, [user]);
  
  const value = useMemo(() => ({ mode, setMode }), [mode]);
  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

export function useMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error("useMode must be used within a ModeProvider");
  return ctx;
}
