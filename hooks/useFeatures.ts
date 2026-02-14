/**
 * Premium Features Hook
 * Checks user's premium/creator status and determines feature access.
 * Creator accounts get all premium features for free (set manually in DB); no subscription required.
 */

import { useState, useEffect } from 'react';
import { getMyProfile, type Profile } from '../lib/api/profile';
import { useAuth } from '../providers/AuthProvider';
import { useProfileRefresh } from '../providers/ProfileRefreshContext';

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

/**
 * Hook to check premium feature access
 * Returns feature access based on user's premium/creator status
 */
export function useFeatures(): FeatureAccess & { loading: boolean } {
  const { user } = useAuth();
  const profileRefresh = useProfileRefresh();
  const refreshKey = profileRefresh?.refreshKey ?? 0;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data } = await getMyProfile();
        setProfile(data);
      } catch (_error) {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user?.id, refreshKey]); // Reload when user changes or profile refresh requested (e.g. after purchase)

  // Premium access: subscription (plan 'premium' / is_premium) OR creator (plan 'creator' / is_creator).
  // Creators are set manually in the database and get all premium features without subscribing.
  const isPremium = !loading && profile
    ? (profile.plan === "premium" || profile.is_premium === true || profile.plan === "creator" || profile.is_creator === true)
    : false;
  const isCreator = !loading && profile
    ? (profile.plan === 'creator' || profile.is_creator === true)
    : false;

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

