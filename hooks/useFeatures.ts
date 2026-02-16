/**
 * Premium Features Hook
 * Prefers FeaturesContext (loaded once at app root) so all screens get premium state
 * instantly. Falls back to local fetch only when used outside FeaturesProvider.
 */

import { useFeaturesContext } from '../providers/FeaturesContext';
import { useFeaturesFallback } from './useFeaturesFallback';

export type { FeatureAccess } from '../providers/FeaturesContext';

/**
 * Hook to check premium feature access.
 * When inside FeaturesProvider (normal app usage), returns app-level state so Home,
 * Settings, Progress, etc. show unlocked immediately with no per-tab delay.
 */
export function useFeatures(): ReturnType<typeof useFeaturesFallback> {
  const context = useFeaturesContext();
  const fallback = useFeaturesFallback();
  return context ?? fallback;
}

