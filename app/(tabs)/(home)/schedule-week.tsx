// app/(tabs)/(home)/schedule-week.tsx
// Screen for editing weekly schedule (current week only)
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  ImageBackground,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {
  useFonts as useSpaceGrotesk,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { theme } from '../../../constants/theme';
import { useMode } from '../../../providers/ModeContext';
import {
  getWeeklySchedule,
  upsertWeeklySchedule,
  getCurrentWeekStart,
  type ScheduleItem,
} from '../../../lib/api/schedule';
import { SuccessToast } from '../../../components/SuccessToast';
import { ErrorToast } from '../../../components/ErrorToast';
import * as Haptics from 'expo-haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getWeekDates(weekStart: string): Date[] {
  // Parse weekStart as local date (YYYY-MM-DD) to avoid timezone issues
  // Split the string and create a date using local components
  const [year, month, day] = weekStart.split('-').map(Number);
  const start = new Date(year, month - 1, day); // month is 0-indexed in Date constructor
  start.setHours(0, 0, 0, 0); // Ensure it's at midnight local time
  
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push(date);
  }
  return dates;
}

function formatDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export default function ScheduleWeekScreen() {
  const { mode } = useMode();
  const m = (mode || 'lifting').toLowerCase();
  const insets = useSafeAreaInsets();
  const [sgLoaded] = useSpaceGrotesk({ SpaceGrotesk_700Bold });
  
  const [currentWeekSchedule, setCurrentWeekSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [shouldNavigate, setShouldNavigate] = useState(false);

  const currentWeekStart = getCurrentWeekStart();
  const currentWeekDates = getWeekDates(currentWeekStart);

  // Animation: slide down from top
  const screenY = useSharedValue(-SCREEN_HEIGHT);

  useEffect(() => {
    // Animate screen sliding down from top - higher damping for less bounce
    screenY.value = withSpring(0, { damping: 35, stiffness: 100 });
  }, []);

  const screenAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: screenY.value }],
    };
  });

  useEffect(() => {
    loadSchedules();
  }, [m]);

  const loadSchedules = async () => {
    setLoading(true);
    
    const currentResult = await getWeeklySchedule({ mode: m, weekStartDate: currentWeekStart });

    if (currentResult.data) {
      setCurrentWeekSchedule(currentResult.data);
    } else {
      // Initialize empty schedule
      setCurrentWeekSchedule(
        Array.from({ length: 7 }, (_, i) => ({ dayIndex: i, label: null }))
      );
    }

    setLoading(false);
  };

  const updateCurrentWeekLabel = useCallback((dayIndex: number, label: string) => {
    setCurrentWeekSchedule((prev) =>
      prev.map((item) =>
        item.dayIndex === dayIndex ? { ...item, label: label || null } : item
      )
    );
  }, []);

  const handleSave = async () => {
    setSaving(true);

    const currentError = await upsertWeeklySchedule({
      mode: m,
      weekStartDate: currentWeekStart,
      items: currentWeekSchedule,
    });

    setSaving(false);

    if (currentError.error) {
      setErrorMessage('Failed to save schedule. Please try again.');
      setShowError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    // Reschedule workout notifications after saving schedule
    const { scheduleWorkoutNotification } = await import('../../../lib/notifications/notifications');
    scheduleWorkoutNotification(m).catch((error) => {
      console.error('❌ [Schedule] Error rescheduling notifications:', error);
    });

    setShowSuccess(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Set flag to navigate after toast animation
    setTimeout(() => {
      setShouldNavigate(true);
    }, 2000);
  };

  // Handle navigation after success toast
  useEffect(() => {
    if (shouldNavigate) {
      // Use a small delay to ensure the component is fully mounted
      const timer = setTimeout(() => {
        try {
          router.back();
        } catch (error) {
          console.error('Navigation error:', error);
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [shouldNavigate]);

  if (loading) {
    return (
      <ImageBackground
        source={require('../../../assets/schedule-background.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Uniform blur across entire screen - pointerEvents none so it doesn't block touches */}
        <BlurView 
          intensity={20} 
          tint="dark" 
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        
        {/* Smooth gradient overlay - fades from darker at edges to lighter in middle - slightly brighter - pointerEvents none so it doesn't block touches */}
        <LinearGradient
          colors={[
            'rgba(0,0,0,0.32)',      // Top edge - darker (slightly brighter)
            'rgba(0,0,0,0.25)',      // Fading
            'rgba(0,0,0,0.20)',      // Middle - lighter
            'rgba(0,0,0,0.20)',      // Middle - lighter (extended)
            'rgba(0,0,0,0.25)',      // Fading
            'rgba(0,0,0,0.32)',      // Bottom edge - darker (slightly brighter)
          ]}
          locations={[0, 0.15, 0.35, 0.65, 0.85, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <Animated.View style={[styles.container, { paddingTop: insets.top }, screenAnimatedStyle]}>
          <LinearGradient
            colors={['rgba(0,0,0,0.85)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.3)', 'transparent']}
            locations={[0, 0.3, 0.6, 1]}
            style={[styles.headerGradient, { paddingTop: insets.top }]}
          >
            <View style={styles.header}>
              <Pressable 
                onPress={() => router.back()} 
                style={[styles.backButton, { position: 'absolute', left: 16 }]}
              >
                <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
              </Pressable>
              <Text style={[styles.headerTitle, !sgLoaded && { fontFamily: undefined }]}>
                Schedule Your Week
              </Text>
            </View>
          </LinearGradient>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        </Animated.View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={require('../../../assets/schedule-background.jpg')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <SuccessToast
        message="Schedule saved!"
        visible={showSuccess}
        onHide={() => setShowSuccess(false)}
      />
      <ErrorToast
        message={errorMessage}
        visible={showError}
        onHide={() => setShowError(false)}
      />
      {/* Uniform blur across entire screen - pointerEvents none so it doesn't block touches */}
      <BlurView 
        intensity={20} 
        tint="dark" 
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      
      {/* Smooth gradient overlay - fades from darker at edges to lighter in middle - slightly brighter - pointerEvents none so it doesn't block touches */}
      <LinearGradient
        colors={[
          'rgba(0,0,0,0.32)',      // Top edge - darker (slightly brighter)
          'rgba(0,0,0,0.25)',      // Fading
          'rgba(0,0,0,0.20)',      // Middle - lighter
          'rgba(0,0,0,0.20)',      // Middle - lighter (extended)
          'rgba(0,0,0,0.25)',      // Fading
          'rgba(0,0,0,0.32)',      // Bottom edge - darker (slightly brighter)
        ]}
        locations={[0, 0.15, 0.35, 0.65, 0.85, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      
      <Animated.View style={[styles.container, { paddingTop: insets.top }, screenAnimatedStyle]}>
        {/* STEP 5: Header with top fade - extends to very top for smooth gradient */}
        <LinearGradient
          colors={['rgba(0,0,0,0.85)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.3)', 'transparent']}
          locations={[0, 0.3, 0.6, 1]}
          style={[styles.headerGradient, { paddingTop: insets.top }]}
        >
          <View style={styles.header}>
            <Pressable 
              onPress={() => router.back()} 
              style={[styles.backButton, { position: 'absolute', left: 16 }]}
            >
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </Pressable>
            <Text style={[styles.headerTitle, !sgLoaded && { fontFamily: undefined }]}>
              Schedule Your Week
            </Text>
          </View>
        </LinearGradient>

        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* STEP 1: Days float directly on background - NO container */}
          {currentWeekDates.map((date, idx) => {
            const hasValue = currentWeekSchedule[idx]?.label?.trim();
            
            return (
              <View 
                key={idx} 
                style={styles.dayRowContainer}
              >
                {/* STEP 2: Two-column rhythm - day anchor + lightweight interaction */}
                <View style={styles.dayRow}>
                  <View style={styles.dayInfo}>
                    <Text style={styles.dayName} numberOfLines={1}>
                      {DAY_NAMES[idx]}
                    </Text>
                    <Text style={styles.dayDate}>
                      {formatDate(date)}
                    </Text>
                  </View>
                  
                  {/* Simple TextInput - stable structure */}
                  <View style={styles.entryPillBase}>
                    <TextInput
                      style={styles.inputBase}
                      placeholder="Rest"
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                      value={currentWeekSchedule[idx]?.label || ''}
                      onChangeText={(text) => updateCurrentWeekLabel(idx, text)}
                      autoCorrect={false}
                      autoCapitalize="words"
                      returnKeyType="done"
                    />
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* STEP 7: Save button in detached action layer with bottom fade */}
        <View style={styles.footerFade} pointerEvents="box-none">
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.85)']}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={[styles.footerContainer, { paddingBottom: insets.bottom }]} pointerEvents="auto">
            <BlurView intensity={25} tint="dark" style={styles.footerBlur}>
              <Pressable
                onPress={handleSave}
                disabled={saving}
                style={styles.saveButton}
              >
                {saving ? (
                  <ActivityIndicator color="#000000" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </Pressable>
            </BlurView>
          </View>
        </View>
      </Animated.View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
  },
  // STEP 5: Header with top fade - extends to top for smooth gradient
  headerGradient: {
    paddingBottom: 12,
    marginTop: -100, // Extend upward to ensure smooth fade to top
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Center the title
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 100, // Offset the negative margin above
  },
  backButton: {
    padding: 8,
    marginTop: -124, // Move arrow up by 124px total
  },
  headerTitle: {
    fontSize: 32, // 4px smaller than 36
    fontFamily: 'SpaceGrotesk_700Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -1,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    marginBottom: 6,
    marginTop: 18, // Move text down by 18px
    transform: [{ skewX: '-5deg' }], // Same tilt as Log Game/Practice
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 200, // Extra space for keyboard and footer
  },
  // STEP 4: Increased vertical spacing (30-40% more)
  dayRowContainer: {
    marginBottom: 20, // Increased from ~4 to 20 for abstraction
  },
  // STEP 2: Two-column rhythm unit
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  dayInfo: {
    width: 110, // Slightly wider to prevent wrapping
  },
  dayName: {
    fontSize: 15, // Reduced from 17 to prevent wrapping
    fontWeight: '700', // Bold anchor
    color: '#FFFFFF',
    marginBottom: 3,
  },
  dayDate: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)', // Muted secondary
    fontWeight: '400',
  },
  // STEP 3: Base pill container - always same structure
  entryPillBase: {
    flex: 1,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  // Single input style - no conditional changes
  inputBase: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  // STEP 7: Footer with bottom fade and detached action
  footerFade: {
    position: 'absolute',
    bottom: 44,
    left: 0,
    right: 0,
    paddingTop: 40, // Fade starts higher
  },
  footerContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  footerBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    // Strong floating shadow - detached feeling
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  saveButtonText: {
    color: '#000000',
    fontSize: 17,
    fontWeight: '600',
  },
});


