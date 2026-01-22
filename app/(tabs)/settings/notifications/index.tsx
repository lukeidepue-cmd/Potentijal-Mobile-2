// app/(tabs)/settings/notifications/index.tsx
// Notifications Settings Screen
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../../../constants/theme";
import { getUserPreferences, updateUserPreferences } from "../../../../lib/api/settings";
import { Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { PROFILE_FEATURES_ENABLED } from "../../../../constants/features";
import * as Haptics from "expo-haptics";
import * as Notifications from 'expo-notifications';
import { 
  cancelNotification, 
  cancelAllNotifications,
  NOTIFICATION_IDS,
  scheduleAllWorkoutNotifications,
  scheduleConsistencyScoreNotification,
} from "../../../../lib/notifications/notifications";

/* ---- Fonts ---- */
import {
  useFonts as useGeist,
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
} from "@expo-google-fonts/geist";

const FONT = {
  uiRegular: "Geist_400Regular",
  uiMedium: "Geist_500Medium",
  uiSemi: "Geist_600SemiBold",
  uiBold: "Geist_700Bold",
};

export default function NotificationsSettings() {
  const insets = useSafeAreaInsets();
  const [geistLoaded] = useGeist({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
  });
  const fontsReady = geistLoaded;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notifications, setNotifications] = useState({
    push_enabled: true,
    workout_reminders: true,
    email_notifications: true,
    ai_trainer_insights: true,
  });

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const { data, error } = await getUserPreferences();
      if (data?.notification_preferences) {
        // Map old structure to new structure, defaulting to true for missing fields
        const prefs = data.notification_preferences;
        setNotifications({
          push_enabled: prefs.push_enabled ?? true,
          workout_reminders: prefs.workout_reminders ?? true,
          email_notifications: prefs.email_notifications ?? true,
          ai_trainer_insights: prefs.ai_trainer_insights ?? true,
        });
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateNotification = async (key: string, value: boolean) => {
    // Optimistic update - update UI immediately for instant feedback
    const updated = { ...notifications, [key]: value };
    setNotifications(updated);
    
    setSaving(true);
    try {
      const { error } = await updateUserPreferences({
        notification_preferences: updated,
      });
      if (error) {
        // Revert on error
        Alert.alert("Error", "Failed to update notification setting");
        loadNotifications();
      } else {
        // Handle notification cancellation/scheduling based on setting changes
        if (key === 'workout_reminders' && !value) {
          // Cancel all workout-related notifications (scheduled workouts and consistency score)
          const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
          for (const notification of allScheduled) {
            if (notification.identifier.startsWith(NOTIFICATION_IDS.SCHEDULED_WORKOUT) || 
                notification.identifier === NOTIFICATION_IDS.CONSISTENCY_SCORE) {
              await cancelNotification(notification.identifier);
            }
          }
          console.log('✅ [Notifications] Canceled all workout reminder notifications');
        } else if (key === 'workout_reminders' && value) {
          // Reschedule workout notifications if re-enabled
          scheduleAllWorkoutNotifications().catch((error) => {
            console.error('❌ [Notifications] Error rescheduling workout notifications:', error);
          });
          scheduleConsistencyScoreNotification().catch((error) => {
            console.error('❌ [Notifications] Error rescheduling consistency score notification:', error);
          });
        } else if (key === 'ai_trainer_insights' && !value) {
          // Cancel AI Trainer reminder notification
          await cancelNotification(NOTIFICATION_IDS.AI_TRAINER_REMINDER);
          console.log('✅ [Notifications] Canceled AI Trainer reminder notification');
        }
      }
    } catch (error) {
      // Revert on error
      Alert.alert("Error", "Failed to update notification setting");
      loadNotifications();
    } finally {
      setSaving(false);
    }
  };

  if (!fontsReady || loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary600} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Gradient Background */}
      <LinearGradient
        colors={["#1A4A3A", "rgba(18, 48, 37, 0.5)", "transparent", theme.colors.bg0]}
        locations={[0, 0.2, 0.4, 0.7]}
        style={styles.gradientBackground}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={{ width: 40, alignItems: "flex-start" }}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
          >
            <Ionicons name="chevron-back" size={20} color={theme.colors.textHi} />
          </Pressable>
        </View>
        <Text style={styles.headerTitle}>Notification Preferences</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Push Notifications Card */}
        <View style={styles.notificationCard}>
          <View style={styles.cardContent}>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>Push Notifications</Text>
              <Text style={styles.cardDescription}>
                Receive notifications on your device for app updates and new features
              </Text>
            </View>
            <View style={styles.switchContainer}>
              <Switch
                value={notifications.push_enabled}
                onValueChange={(value) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateNotification('push_enabled', value);
                }}
                trackColor={{ false: "#767577", true: theme.colors.primary600 }}
                thumbColor="#fff"
                ios_backgroundColor="#767577"
                style={styles.switch}
              />
            </View>
          </View>
        </View>

        {/* Workout Reminders Card */}
        <View style={styles.notificationCard}>
          <View style={styles.cardContent}>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>Workout Reminders</Text>
              <Text style={styles.cardDescription}>
                Get reminded about your scheduled workouts and training sessions
              </Text>
            </View>
            <View style={styles.switchContainer}>
              <Switch
                value={notifications.workout_reminders}
                onValueChange={(value) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateNotification('workout_reminders', value);
                }}
                trackColor={{ false: "#767577", true: theme.colors.primary600 }}
                thumbColor="#fff"
                ios_backgroundColor="#767577"
                style={styles.switch}
              />
            </View>
          </View>
        </View>

        {/* Email Notifications Card */}
        <View style={styles.notificationCard}>
          <View style={styles.cardContent}>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>Email Notifications</Text>
              <Text style={styles.cardDescription}>
                Receive emails from the Potential team about the app and special deals
              </Text>
            </View>
            <View style={styles.switchContainer}>
              <Switch
                value={notifications.email_notifications}
                onValueChange={(value) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateNotification('email_notifications', value);
                }}
                trackColor={{ false: "#767577", true: theme.colors.primary600 }}
                thumbColor="#fff"
                ios_backgroundColor="#767577"
                style={styles.switch}
              />
            </View>
          </View>
        </View>

        {/* AI Trainer Insights Card */}
        <View style={styles.notificationCard}>
          <View style={styles.cardContent}>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>AI Trainer Insights</Text>
              <Text style={styles.cardDescription}>
                Get notified about personalized training insights and recommendations
              </Text>
            </View>
            <View style={styles.switchContainer}>
              <Switch
                value={notifications.ai_trainer_insights}
                onValueChange={(value) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateNotification('ai_trainer_insights', value);
                }}
                trackColor={{ false: "#767577", true: theme.colors.primary600 }}
                thumbColor="#fff"
                ios_backgroundColor="#767577"
                style={styles.switch}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg0,
  },
  gradientBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 360,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.textHi,
    fontFamily: FONT.uiBold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  notificationCard: {
    backgroundColor: theme.colors.surface1,
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
  },
  cardText: {
    flex: 1,
    marginRight: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.textHi,
    fontFamily: FONT.uiSemi,
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 14,
    color: theme.colors.textLo,
    fontFamily: FONT.uiRegular,
    lineHeight: 20,
  },
  switchContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  switch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
});

