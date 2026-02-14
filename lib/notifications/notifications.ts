// lib/notifications/notifications.ts
// Notification management for the app

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getScheduleWithStatus, getCurrentWeekStart } from '../api/schedule';
import { SportMode } from '../types';
import { getMyProfile } from '../api/profile';
import { getUserPreferences } from '../api/settings';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Notification identifiers
export const NOTIFICATION_IDS = {
  SCHEDULED_WORKOUT: 'scheduled-workout',
  CONSISTENCY_SCORE: 'consistency-score',
  AI_TRAINER_REMINDER: 'ai-trainer-reminder',
} as const;

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return false;
    }

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Cancel a specific notification by identifier
 */
export async function cancelNotification(identifier: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {
    // ignore
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // ignore
  }
}

/**
 * Schedule workout notifications for all days in the current week that have scheduled workouts
 */
export async function scheduleWorkoutNotification(mode: SportMode | string): Promise<void> {
  try {
    // Check if workout reminders are enabled in user preferences
    const { data: preferences } = await getUserPreferences();
    if (!preferences?.notification_preferences?.workout_reminders) {
      // Cancel any existing workout notifications for this mode
      const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
      const modeIdentifier = `${NOTIFICATION_IDS.SCHEDULED_WORKOUT}-${mode}`;
      for (const notification of allScheduled) {
        if (notification.identifier.startsWith(modeIdentifier)) {
          await cancelNotification(notification.identifier);
        }
      }
      return;
    }

    // Request permissions first
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return;
    }

    // Cancel all existing scheduled workout notifications for this mode
    // We'll reschedule all of them
    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
    const modeIdentifier = `${NOTIFICATION_IDS.SCHEDULED_WORKOUT}-${mode}`;
    for (const notification of allScheduled) {
      if (notification.identifier.startsWith(modeIdentifier)) {
        await cancelNotification(notification.identifier);
      }
    }

    // Get current week start
    const weekStart = getCurrentWeekStart();
    
    // Get schedule with status
    const { data: schedule, error } = await getScheduleWithStatus({
      mode,
      weekStartDate: weekStart,
    });

    if (error) {
      return;
    }

    if (!schedule) {
      return;
    }

    // Get today's date for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayDayIndex = today.getDay(); // 0 = Sunday, 6 = Saturday

    // Calculate week start date
    const [year, month, day] = weekStart.split('-').map(Number);
    const weekStartDate = new Date(year, month - 1, day);
    weekStartDate.setHours(0, 0, 0, 0);

    // Find today's schedule item
    const todayScheduleItem = schedule.find(item => item.dayIndex === todayDayIndex);
    
    if (!todayScheduleItem) {
      return;
    }

    // Check if today has a scheduled workout (has label, not rest)
    const hasLabel = todayScheduleItem.label && todayScheduleItem.label.trim() !== '';
    const isRest = todayScheduleItem.status === 'rest';
    const isCompleted = todayScheduleItem.status === 'completed';

    // Only schedule if:
    // 1. Today has a scheduled workout (has label, not rest)
    // 2. Today does NOT have a workout logged (status is not 'completed')
    // Note: status='empty' with a label means they have a planned workout but haven't logged it yet - this is when we want to send the notification!
    if (!hasLabel || isRest || isCompleted) {
      return;
    }

    // Check if notification is already scheduled for today
    const yearStr = today.getFullYear();
    const monthStr = String(today.getMonth() + 1).padStart(2, '0');
    const dayStr = String(today.getDate()).padStart(2, '0');
    const dateStr = `${yearStr}-${monthStr}-${dayStr}`;
    const identifier = `${modeIdentifier}-${dateStr}`;
    
    const allScheduledCheck = await Notifications.getAllScheduledNotificationsAsync();
    const existingNotification = allScheduledCheck.find(n => n.identifier === identifier);
    
    if (existingNotification) {
      return;
    }

    // Calculate today's date at 11:21 PM in local timezone
    // Create a new date object for today at midnight, then set to 11:21 PM
    const dayDate = new Date();
    dayDate.setHours(0, 0, 0, 0); // Start with today at midnight
    dayDate.setHours(23, 21, 0, 0); // 11:21 PM (TESTING - will revert to 12:00 PM)

    // Only schedule if the notification time hasn't passed yet
    const now = new Date();
    const timeUntilNotification = dayDate.getTime() - now.getTime();
    const minutesUntilNotification = Math.floor(timeUntilNotification / (1000 * 60));
    
    if (dayDate < now) {
      return;
    }

    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: 'Your Workout Awaits!',
        body: "Don't forget to complete your scheduled workout for today.",
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: dayDate,
      },
    });
  } catch {
    // ignore
  }
}

/**
 * Schedule workout notifications for all modes that have scheduled workouts today
 */
export async function scheduleAllWorkoutNotifications(): Promise<void> {
  const modes: SportMode[] = ['workout', 'basketball', 'football', 'baseball', 'soccer', 'hockey', 'tennis'];
  
  // Schedule for all modes (each will check if there's a workout for today)
  await Promise.all(modes.map(mode => scheduleWorkoutNotification(mode)));
}

/**
 * Schedule Consistency Score notification for end of week
 * Only schedules for premium/pro users
 * Sends notification on Sunday at 8AM (end of previous week)
 */
export async function scheduleConsistencyScoreNotification(): Promise<void> {
  try {
    // Check if workout reminders are enabled in user preferences
    const { data: preferences } = await getUserPreferences();
    if (!preferences?.notification_preferences?.workout_reminders) {
      // Cancel any existing consistency score notification
      await cancelNotification(NOTIFICATION_IDS.CONSISTENCY_SCORE);
      return;
    }

    // Request permissions first
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return;
    }

    // Check if user is premium or pro
    const { data: profile, error: profileError } = await getMyProfile();
    if (profileError || !profile) {
      return;
    }

    // Check if user is premium or creator (creators get free premium)
    const isPremium = profile.plan === 'premium' || profile.is_premium === true;
    const isCreator = profile.plan === 'creator' || profile.is_creator === true;
    
    if (!isPremium && !isCreator) {
      // Cancel any existing consistency score notification if they're no longer premium
      await cancelNotification(NOTIFICATION_IDS.CONSISTENCY_SCORE);
      return;
    }

    // Check if notification is already scheduled
    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
    const existingNotification = allScheduled.find(n => n.identifier === NOTIFICATION_IDS.CONSISTENCY_SCORE);

    // Only schedule if it doesn't exist yet
    // Weekly trigger will automatically repeat every week
    if (!existingNotification) {
      await Notifications.scheduleNotificationAsync({
        identifier: NOTIFICATION_IDS.CONSISTENCY_SCORE,
        content: {
          title: 'New Consistency Score!',
          body: 'Check out how consistent you were this week.',
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: 1, // Sunday (1 = Sunday, 7 = Saturday per documentation)
          hour: 8,
          minute: 0,
        },
      });
    }
  } catch {
    // ignore
  }
}

/**
 * Track workout count and schedule AI Trainer reminder if needed
 * Called after a user successfully logs a workout
 * Schedules notification 1 hour after the 7th, 14th, 21st, etc. workout
 */
export async function trackWorkoutAndScheduleAITrainerReminder(): Promise<void> {
  try {
    // Check if AI Trainer insights are enabled in user preferences
    const { data: preferences } = await getUserPreferences();
    if (!preferences?.notification_preferences?.ai_trainer_insights) {
      // Cancel any existing AI Trainer reminder notification
      await cancelNotification(NOTIFICATION_IDS.AI_TRAINER_REMINDER);
      return;
    }

    // Request permissions first
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return;
    }

    // Get current workout count from AsyncStorage
    const WORKOUT_COUNT_KEY = '@ai_trainer_workout_count';
    const countStr = await AsyncStorage.getItem(WORKOUT_COUNT_KEY);
    const currentCount = countStr ? parseInt(countStr, 10) : 0;
    
    // Increment count
    const newCount = currentCount + 1;
    await AsyncStorage.setItem(WORKOUT_COUNT_KEY, newCount.toString());

    // Check if this is a multiple of 7 (7th, 14th, 21st, etc.)
    if (newCount % 7 === 0) {
      // Cancel any existing AI Trainer reminder notification
      await cancelNotification(NOTIFICATION_IDS.AI_TRAINER_REMINDER);

      // Schedule notification for 1 hour from now
      const oneHourFromNow = new Date();
      oneHourFromNow.setHours(oneHourFromNow.getHours() + 1);

      await Notifications.scheduleNotificationAsync({
        identifier: NOTIFICATION_IDS.AI_TRAINER_REMINDER,
        content: {
          title: 'Curious about your Progress?',
          body: 'Chat with your AI Trainer about anything and receive valuable insights!',
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: oneHourFromNow,
        },
      });
    }
  } catch {
    // ignore
  }
}

/**
 * Cancel today's workout notification for a specific mode
 * Called when a user logs a workout before 11:21 PM (TESTING - will revert to 12:00 PM)
 */
export async function cancelTodaysWorkoutNotification(mode: SportMode | string): Promise<void> {
  try {
    const today = new Date();
    const now = new Date();
    
    // Only cancel if it's before 11:21 PM today (TESTING - will revert to 12:00 PM)
    if (now.getHours() > 23 || (now.getHours() === 23 && now.getMinutes() >= 21)) {
      return; // Too late, notification may have already been sent
    }

    // Get today's date string (YYYY-MM-DD)
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const modeIdentifier = `${NOTIFICATION_IDS.SCHEDULED_WORKOUT}-${mode}`;
    const identifier = `${modeIdentifier}-${dateStr}`;

    await cancelNotification(identifier);
  } catch {
    // ignore
  }
}
