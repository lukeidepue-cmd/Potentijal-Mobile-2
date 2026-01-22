// app/onboarding/premium-offer.tsx
// Premium Offer Screen - Show premium features and offer
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../constants/theme';
import { updateOnboardingStep } from '../../lib/api/onboarding';

const TOTAL_STEPS = 10; // Total number of onboarding steps
const CURRENT_STEP = 9; // This is step 9

export default function PremiumOfferScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = React.useState(false);

  const progressPercentage = (CURRENT_STEP / TOTAL_STEPS) * 100;

  const handlePurchasePremium = async () => {
    // TODO: Navigate to purchase process when implemented
    console.log('Purchase Premium clicked - purchase flow not yet implemented');
    
    // For now, mark premium offer as shown and navigate to completion
    // When purchase flow is implemented, this will be called after successful purchase
    setLoading(true);
    try {
      const { error: progressError } = await updateOnboardingStep('premium_offer', {
        premium_offer_shown: true,
      });
      
      if (progressError) {
        console.warn('⚠️ [PremiumOffer] Failed to save progress:', progressError);
        const isNetworkError = progressError.message?.toLowerCase().includes('network') || 
                              progressError.message?.toLowerCase().includes('fetch') ||
                              progressError.message?.toLowerCase().includes('connection');
        
        if (isNetworkError) {
          Alert.alert(
            'Connection Error',
            'Unable to save progress. Please check your internet connection and try again.',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => setLoading(false) },
              { text: 'Retry', onPress: () => handlePurchasePremium() },
            ]
          );
          return;
        }
        // Don't block navigation on progress save failure, but log it
      } else {
        console.log('✅ [PremiumOffer] Progress saved: premium_offer');
      }
      
      // Navigate to completion screen
      router.push('/onboarding/completion');
    } catch (error: any) {
      console.error('❌ [PremiumOffer] Exception:', error);
      const isNetworkError = error.message?.toLowerCase().includes('network') || 
                            error.message?.toLowerCase().includes('fetch') ||
                            error.message?.toLowerCase().includes('connection');
      
      if (isNetworkError) {
        Alert.alert(
          'Connection Error',
          'Unable to process your request. Please check your internet connection and try again.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Retry', onPress: () => handlePurchasePremium() },
          ]
        );
      } else {
        Alert.alert('Error', error.message || 'Something went wrong. Please try again.');
      }
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      // Mark premium offer as shown (even if skipped)
      const { error: progressError } = await updateOnboardingStep('premium_offer', {
        premium_offer_shown: true,
      });
      
      if (progressError) {
        console.warn('⚠️ [PremiumOffer] Failed to save progress:', progressError);
        const isNetworkError = progressError.message?.toLowerCase().includes('network') || 
                              progressError.message?.toLowerCase().includes('fetch') ||
                              progressError.message?.toLowerCase().includes('connection');
        
        if (isNetworkError) {
          Alert.alert(
            'Connection Error',
            'Unable to save progress. Please check your internet connection and try again.',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => setLoading(false) },
              { text: 'Retry', onPress: () => handleSkip() },
            ]
          );
          return;
        }
        // Don't block navigation on progress save failure, but log it
      } else {
        console.log('✅ [PremiumOffer] Progress saved: premium_offer (skipped)');
      }

      // Navigate to completion screen
      router.push('/onboarding/completion');
    } catch (error: any) {
      console.error('❌ [PremiumOffer] Exception:', error);
      const isNetworkError = error.message?.toLowerCase().includes('network') || 
                            error.message?.toLowerCase().includes('fetch') ||
                            error.message?.toLowerCase().includes('connection');
      
      if (isNetworkError) {
        Alert.alert(
          'Connection Error',
          'Unable to process your request. Please check your internet connection and try again.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Retry', onPress: () => handleSkip() },
          ]
        );
      } else {
        Alert.alert('Error', error.message || 'Something went wrong. Please try again.');
      }
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Layer A: Base gradient - Green version */}
      <LinearGradient
        colors={['#0B1513', '#0F2A22', '#0F3B2E', '#070B0A']}
        locations={[0, 0.3, 0.6, 1]}
        style={styles.baseGradient}
      />
      
      {/* Layer B: Vignette overlay - EXACT same as email-entry screen */}
      <LinearGradient
        colors={['rgba(0,0,0,0.4)', 'transparent', 'transparent', 'rgba(0,0,0,0.5)']}
        locations={[0, 0.15, 0.85, 1]}
        style={styles.vignetteGradient}
        pointerEvents="none"
      />
      
      {/* Layer C: Subtle grain - EXACT same as email-entry screen */}
      <View style={styles.grainOverlay} pointerEvents="none" />

      {/* Header with Back Button and Progress Bar */}
      <View style={[styles.header, { zIndex: 10 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.textHi} />
        </TouchableOpacity>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} />
          </View>
          <Text style={styles.progressText}>{CURRENT_STEP}/{TOTAL_STEPS}</Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.content, { zIndex: 10 }]}>
          {/* Heading */}
          <Text style={styles.heading}>Premium Offer</Text>

          {/* Description Text */}
          <Text style={styles.descriptionText}>
            With Premium you'll get:
          </Text>

          {/* Feature List */}
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary600} />
              <Text style={styles.featureText}>Unlock Advanced Progress Insights</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary600} />
              <Text style={styles.featureText}>A Personalized AI Trainer</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary600} />
              <Text style={styles.featureText}>Unlimited Sport Modes</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary600} />
              <Text style={styles.featureText}>Game and Practice Logging</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Buttons */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20, zIndex: 10 }]}>
        {/* Purchase Premium Button */}
        <TouchableOpacity
          style={[styles.purchaseButton, loading && styles.buttonDisabled]}
          onPress={handlePurchasePremium}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <Text style={styles.purchaseButtonText}>Processing...</Text>
          ) : (
            <Text style={styles.purchaseButtonText}>Purchase Premium</Text>
          )}
        </TouchableOpacity>

        {/* Skip Button */}
        <TouchableOpacity
          style={[styles.skipButton, loading && styles.buttonDisabled]}
          onPress={handleSkip}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <Text style={styles.skipButtonText}>Saving...</Text>
          ) : (
            <Text style={styles.skipButtonText}>Skip for now</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg0,
    position: 'relative',
  },
  baseGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  vignetteGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  grainOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.02)',
    opacity: 0.06,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginLeft: 20,
  },
  progressBarBackground: {
    flex: 1,
    height: 4,
    backgroundColor: theme.colors.strokeSoft,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary600, // Green
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textLo,
    minWidth: 30,
    textAlign: 'right',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  heading: {
    fontSize: 28,
    fontWeight: '900',
    color: theme.colors.textHi,
    marginBottom: 20,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.5,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 8,
      },
    }),
  },
  descriptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textLo,
    lineHeight: 24,
    marginBottom: 24,
  },
  featureList: {
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textHi,
    flex: 1,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    gap: 12,
  },
  purchaseButton: {
    width: '100%',
    backgroundColor: theme.colors.primary600, // Green
    paddingVertical: 18,
    borderRadius: theme.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary600,
        shadowOpacity: 0.4,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
      },
      android: {
        elevation: 12,
      },
    }),
  },
  purchaseButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  skipButton: {
    width: '100%',
    backgroundColor: theme.colors.strokeSoft,
    paddingVertical: 18,
    borderRadius: theme.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    opacity: 1,
  },
  skipButtonText: {
    color: theme.colors.textHi,
    fontSize: 18,
    fontWeight: '700',
  },
});
