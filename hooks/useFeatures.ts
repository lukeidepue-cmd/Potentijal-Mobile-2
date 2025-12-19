/**
 * Premium Features Hook
 * Checks user's premium/creator status and determines feature access
 */

import { useState, useEffect } from 'react';
import { getMyProfile, type Profile } from '../lib/api/profile';
import { useAuth } from '../providers/AuthProvider';

export interface FeatureAccess {
  isPremium: boolean;
  isCreator: boolean;
  canLogGames: boolean;
  canLogPractices: boolean;
  canUseAITrainer: boolean;
  canAddHighlights: boolean;
  canSeeMealsGraph: boolean;
  canViewCreatorWorkouts: boolean;
  canAddMoreSports: boolean;
}

/**
 * Hook to check premium feature access
 * Returns feature access based on user's premium/creator status
 */
export function useFeatures(): FeatureAccess & { loading: boolean } {
  const { user } = useAuth();
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
        console.log('✅ [useFeatures] Profile loaded:', {
          is_premium: data?.is_premium,
          plan: data?.plan,
          is_creator: data?.is_creator,
        });
      } catch (error) {
        console.error('❌ [useFeatures] Error loading profile:', error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user?.id]); // Reload when user changes

  // Check premium status: user is premium if plan is 'premium' OR is_premium is true
  // OR if they're a creator (creators get free premium)
  // Default to false if profile is not loaded yet or profile is null (safer for premium gating)
  const isPremium = !loading && profile 
    ? (profile.plan === 'premium' || profile.is_premium === true || profile.plan === 'creator' || profile.is_creator === true)
    : false;
  const isCreator = !loading && profile
    ? (profile.plan === 'creator' || profile.is_creator === true)
    : false;

  // Debug logging
  if (__DEV__ && !loading) {
    console.log('🔒 [useFeatures] Premium check:', {
      hasProfile: !!profile,
      plan: profile?.plan,
      is_premium: profile?.is_premium,
      is_creator: profile?.is_creator,
      calculatedIsPremium: isPremium,
      calculatedIsCreator: isCreator,
    });
  }

  return {
    isPremium,
    isCreator,
    canLogGames: isPremium,
    canLogPractices: isPremium,
    canUseAITrainer: isPremium,
    canAddHighlights: isPremium,
    canSeeMealsGraph: isPremium,
    canViewCreatorWorkouts: isPremium,
    canAddMoreSports: isPremium,
    loading,
  };
}

