/**
 * ProfileRefreshContext
 * Allows triggering a refetch of the current user's profile (e.g. after purchase)
 * so useFeatures() and other consumers get fresh is_premium / plan data.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

interface ProfileRefreshContextValue {
  refreshKey: number;
  refreshProfile: () => void;
}

const ProfileRefreshContext = createContext<ProfileRefreshContextValue | null>(null);

export function ProfileRefreshProvider({ children }: { children: React.ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const refreshProfile = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);
  return (
    <ProfileRefreshContext.Provider value={{ refreshKey, refreshProfile }}>
      {children}
    </ProfileRefreshContext.Provider>
  );
}

export function useProfileRefresh(): ProfileRefreshContextValue | null {
  return useContext(ProfileRefreshContext);
}
