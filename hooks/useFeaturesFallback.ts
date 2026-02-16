/**
 * Fallback premium/features logic when useFeatures is used outside FeaturesProvider.
 * Duplicates the load-once logic so tests or edge cases still work.
 */

import { useState, useEffect, useRef } from 'react';
import { getPremiumCacheItem, setPremiumCacheItem } from '../lib/premium-cache-storage';
import { getMyProfile, type Profile } from '../lib/api/profile';
import { useAuth } from '../providers/AuthProvider';
import { useProfileRefresh } from '../providers/ProfileRefreshContext';

const PREMIUM_CACHE_KEY_PREFIX = '@app_profile_premium_';

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

export function useFeaturesFallback(): {
  isPremium: boolean;
  isCreator: boolean;
  canLogGames: boolean;
  canLogPractices: boolean;
  canUseAITrainer: boolean;
  canAddHighlights: boolean;
  canViewCreatorWorkouts: boolean;
  canAddMoreSports: boolean;
  loading: boolean;
} {
  const { user } = useAuth();
  const profileRefresh = useProfileRefresh();
  const refreshKey = profileRefresh?.refreshKey ?? 0;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
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
      setLoading(true);

      try {
        const raw = await getPremiumCacheItem(cacheKey);
        if (mountedRef.current && raw) {
          const parsed = JSON.parse(raw) as {
            is_premium?: boolean;
            plan?: string;
            is_creator?: boolean;
          };
          if (parsed && (typeof parsed.is_premium === 'boolean' || parsed.plan)) {
            setProfile(stubProfileFromCache(user.id, parsed));
            setLoading(false);
          }
        }
      } catch (_) {}

      try {
        const { data } = await getMyProfile();
        if (!mountedRef.current) return;
        setProfile(data);
        if (data) {
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
    loading,
  };
}
