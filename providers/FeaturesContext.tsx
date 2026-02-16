/**
 * FeaturesContext
 * Loads premium/creator state once at app root so all screens get it instantly
 * (no 5–7s delay per tab). Uses in-memory "last known" for instant first paint
 * when possible; then persisted cache; then getMyProfile().
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import { getPremiumCacheItem, setPremiumCacheItem } from '../lib/premium-cache-storage';
import { getMyProfile, type Profile } from '../lib/api/profile';
import { useAuth } from './AuthProvider';
import { useProfileRefresh } from './ProfileRefreshContext';

const PREMIUM_CACHE_KEY_PREFIX = '@app_profile_premium_';

export interface FeatureAccess {
  isPremium: boolean;
  isCreator: boolean;
  canLogGames: boolean;
  canLogPractices: boolean;
  canUseAITrainer: boolean;
  canAddHighlights: boolean;
  canViewCreatorWorkouts: boolean;
  canAddMoreSports: boolean;
}

export interface FeaturesContextValue extends FeatureAccess {
  loading: boolean;
}

// In-memory cache: last known premium state per user (survives re-mounts in same session)
const lastKnownByUserId: Record<
  string,
  { is_premium: boolean; plan: string; is_creator: boolean }
> = {};

function stubProfileFromCache(
  userId: string,
  cached: { is_premium?: boolean; plan?: string; is_creator?: boolean }
): Profile {
  return {
    id: userId,
    username: '',
    display_name: '',
    bio: '',
    profile_image_url: null,
    is_premium: !!cached.is_premium,
    is_creator: !!cached.is_creator,
    plan: (cached.plan === 'premium' || cached.plan === 'creator' ? cached.plan : 'free') as
      | 'free'
      | 'premium'
      | 'creator',
    sports: [],
    primary_sport: null,
  };
}

function profileToFeatureAccess(profile: Profile | null, loading: boolean): FeatureAccess {
  const isPremium =
    !loading && profile
      ? profile.plan === 'premium' ||
        profile.is_premium === true ||
        profile.plan === 'creator' ||
        profile.is_creator === true
      : false;
  const isCreator =
    !loading && profile ? profile.plan === 'creator' || profile.is_creator === true : false;
  return {
    isPremium,
    isCreator,
    canLogGames: isPremium,
    canLogPractices: isPremium,
    canUseAITrainer: isPremium,
    canAddHighlights: isPremium,
    canViewCreatorWorkouts: isPremium,
    canAddMoreSports: isPremium,
  };
}

const FeaturesContext = createContext<FeaturesContextValue | null>(null);

export function FeaturesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const profileRefresh = useProfileRefresh();
  const refreshKey = profileRefresh?.refreshKey ?? 0;
  const [profile, setProfile] = useState<Profile | null>(() => {
    // First paint: use in-memory last known so returning users see unlocked immediately
    if (user?.id && lastKnownByUserId[user.id]) {
      const c = lastKnownByUserId[user.id];
      return stubProfileFromCache(user.id, c);
    }
    return null;
  });
  const [loading, setLoading] = useState(!user?.id || !lastKnownByUserId[user.id]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const run = async () => {
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const cacheKey = PREMIUM_CACHE_KEY_PREFIX + user.id;

      // If we already have in-memory state, show it and only set loading false after we've tried cache
      const fromMemory = lastKnownByUserId[user.id];
      if (fromMemory) {
        setProfile(stubProfileFromCache(user.id, fromMemory));
        setLoading(false);
      } else {
        setLoading(true);
      }

      // Read persisted cache so premium users see unlocks quickly (SecureStore / AsyncStorage)
      try {
        const raw = await getPremiumCacheItem(cacheKey);
        if (mountedRef.current && raw) {
          const parsed = JSON.parse(raw) as {
            is_premium?: boolean;
            plan?: string;
            is_creator?: boolean;
          };
          if (parsed && (typeof parsed.is_premium === 'boolean' || parsed.plan)) {
            lastKnownByUserId[user.id] = {
              is_premium: !!parsed.is_premium,
              plan: parsed.plan ?? 'free',
              is_creator: !!parsed.is_creator,
            };
            setProfile(stubProfileFromCache(user.id, parsed));
            setLoading(false);
          }
        }
      } catch (_) {
        // Ignore cache parse errors
      }

      // Fetch fresh profile; server is source of truth for authorization
      try {
        const { data } = await getMyProfile();
        if (!mountedRef.current) return;
        setProfile(data);
        if (data) {
          lastKnownByUserId[user.id] = {
            is_premium: data.is_premium,
            plan: data.plan ?? 'free',
            is_creator: data.is_creator,
          };
          const toCache = {
            is_premium: data.is_premium,
            plan: data.plan,
            is_creator: data.is_creator,
          };
          setPremiumCacheItem(cacheKey, JSON.stringify(toCache)).catch(() => {});
        }
      } catch (_error) {
        if (mountedRef.current) setProfile((p) => p ?? null);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };

    run();
    return () => {
      mountedRef.current = false;
    };
  }, [user?.id, refreshKey]);

  const value = useMemo<FeaturesContextValue>(() => {
    const access = profileToFeatureAccess(profile, loading);
    return { ...access, loading };
  }, [profile, loading]);

  return (
    <FeaturesContext.Provider value={value}>{children}</FeaturesContext.Provider>
  );
}

export function useFeaturesContext(): FeaturesContextValue | null {
  return useContext(FeaturesContext);
}
