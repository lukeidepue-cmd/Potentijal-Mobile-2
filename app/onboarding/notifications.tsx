// app/onboarding/notifications.tsx
// Notifications Screen - Request notification permissions
import React, { useState, useEffect } from 'react';
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
import * as Notifications from 'expo-notifications';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../constants/theme';
import { updateOnboardingStep, updatePreferencesFromOnboarding } from '../../lib/api/onboarding';

const TOTAL_STEPS = 10; // Total number of onboarding steps
const CURRENT_STEP = 8; // This is step 8

// Purple color for this screen
const PURPLE_COLOR = theme.colors.purple; // #A78BFA

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const [permissionStatus, setPermissionStatus] = useState<Notifications.PermissionStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const progressPercentage = (CURRENT_STEP / TOTAL_STEPS) * 100;

  // Check current permission status on mount
  useEffect(() => {
    checkPermissionStatus();
  }, []);

  const checkPermissionStatus = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setPermissionStatus(status);
  };

  const requestPermissions = async () => {
    try {
      // Request permissions - this will show the system popup
      const { status } = await Notifications.requestPermissionsAsync();
      setPermissionStatus(status);
      
      // Save notification preference immediately after user responds
      const notificationsEnabled = status === 'granted';
      
      // Update user preferences
      const { error: prefsError } = await updatePreferencesFromOnboarding({
        notifications_enabled: notificationsEnabled,
      });
      
      if (prefsError) {
        console.warn('⚠️ [Notifications] Failed to save preferences:', prefsError);
      } else {
        console.log('✅ [Notifications] Preferences saved:', notificationsEnabled);
      }
      
      if (status === 'granted') {
        // Permissions granted
        console.log('✅ Notifications permission granted');
      } else {
        // Permissions denied
        console.log('❌ Notifications permission denied');
      }
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      Alert.alert('Error', 'Failed to request notification permissions');
    }
  };

  const handleNext = async () => {
    setLoading(true);
    try {
      // Save notification preference (use current status or default to false)
      const notificationsEnabled = permissionStatus === 'granted';
      
      // Update user preferences if not already saved
      if (permissionStatus !== null) {
        const { error: prefsError } = await updatePreferencesFromOnboarding({
          notifications_enabled: notificationsEnabled,
        });
        
        if (prefsError) {
          console.warn('⚠️ [Notifications] Failed to save preferences:', prefsError);
          const isNetworkError = prefsError.message?.toLowerCase().includes('network') || 
                                prefsError.message?.toLowerCase().includes('fetch') ||
                                prefsError.message?.toLowerCase().includes('connection');
          
          if (isNetworkError) {
            Alert.alert(
              'Connection Error',
              'Unable to save notification preferences. Please check your internet connection and try again.',
              [
                { text: 'Cancel', style: 'cancel', onPress: () => setLoading(false) },
                { text: 'Retry', onPress: () => handleNext() },
              ]
            );
            return;
          }
        }
      }

      // Save progress: mark notifications step as completed
      const { error: progressError } = await updateOnboardingStep('notifications', {
        notifications_enabled: notificationsEnabled,
      });
      
      if (progressError) {
        console.warn('⚠️ [Notifications] Failed to save progress:', progressError);
        const isNetworkError = progressError.message?.toLowerCase().includes('network') || 
                              progressError.message?.toLowerCase().includes('fetch') ||
                              progressError.message?.toLowerCase().includes('connection');
        
        if (isNetworkError) {
          Alert.alert(
            'Connection Error',
            'Unable to save progress. Please check your internet connection and try again.',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => setLoading(false) },
              { text: 'Retry', onPress: () => handleNext() },
            ]
          );
          return;
        }
        // Don't block navigation on progress save failure, but log it
      } else {
        console.log('✅ [Notifications] Progress saved: notifications, enabled =', notificationsEnabled);
      }

      // Navigate to next screen
      router.push('/onboarding/premium-offer');
    } catch (error: any) {
      console.error('❌ [Notifications] Exception:', error);
      const isNetworkError = error.message?.toLowerCase().includes('network') || 
                            error.message?.toLowerCase().includes('fetch') ||
                            error.message?.toLowerCase().includes('connection');
      
      if (isNetworkError) {
        Alert.alert(
          'Connection Error',
          'Unable to save your preferences. Please check your internet connection and try again.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Retry', onPress: () => handleNext() },
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
      {/* Layer A: Base gradient - Purple version */}
      <LinearGradient
        colors={['#0B0A15', '#1A0F2A', '#2A0F3B', '#070B0A']}
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
          <Text style={styles.heading}>Notifications</Text>

          {/* Description Text */}
          <Text style={styles.descriptionText}>
            You're more likely to complete your workouts with notifications turned on. You are also invited to receive emails from the Potential Team. You can always change this later.
          </Text>

          {/* Request Permissions Button */}
          {permissionStatus !== 'granted' && (
            <TouchableOpacity
              style={styles.requestButton}
              onPress={requestPermissions}
              activeOpacity={0.8}
            >
              <Text style={styles.requestButtonText}>
                {permissionStatus === 'denied' ? 'Open Settings' : 'Enable Notifications'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Status Message */}
          {permissionStatus === 'granted' && (
            <View style={styles.statusContainer}>
              <Ionicons name="checkmark-circle" size={24} color={PURPLE_COLOR} />
              <Text style={styles.statusText}>Notifications enabled</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Next Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20, zIndex: 10 }]}>
        <TouchableOpacity
          style={[styles.nextButton, loading && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <Text style={styles.nextButtonText}>Saving...</Text>
          ) : (
            <Text style={styles.nextButtonText}>Next</Text>
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
    backgroundColor: PURPLE_COLOR, // Purple
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
    marginBottom: 32,
  },
  requestButton: {
    width: '100%',
    backgroundColor: PURPLE_COLOR,
    paddingVertical: 18,
    borderRadius: theme.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: PURPLE_COLOR,
        shadowOpacity: 0.4,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
      },
      android: {
        elevation: 12,
      },
    }),
  },
  nextButtonDisabled: {
    opacity: 0.7,
  },
  requestButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 24,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: theme.colors.surface1,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: PURPLE_COLOR,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  nextButton: {
    width: '100%',
    backgroundColor: PURPLE_COLOR, // Purple
    paddingVertical: 18,
    borderRadius: theme.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: PURPLE_COLOR,
        shadowOpacity: 0.4,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
      },
      android: {
        elevation: 12,
      },
    }),
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
