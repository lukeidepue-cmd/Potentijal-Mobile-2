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
    practice_reminders: true,
    goal_reminders: true,
    social_follower: true,
    social_highlight_views: true,
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
        setNotifications(data.notification_preferences);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateNotification = async (key: string, value: boolean) => {
    setSaving(true);
    try {
      const updated = { ...notifications, [key]: value };
      const { error } = await updateUserPreferences({
        notification_preferences: updated,
      });
      if (error) {
        Alert.alert("Error", "Failed to update notification setting");
        loadNotifications();
      } else {
        setNotifications(updated);
      }
    } catch (error) {
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
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.textHi} />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Text style={styles.settingDescription}>
                Enable or disable all push notifications
              </Text>
            </View>
            <Switch
              value={notifications.push_enabled}
              onValueChange={(value) => updateNotification('push_enabled', value)}
              trackColor={{ false: theme.colors.strokeSoft, true: theme.colors.primary600 }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {notifications.push_enabled && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Workout & Training</Text>
              
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Workout Reminders</Text>
                </View>
                <Switch
                  value={notifications.workout_reminders}
                  onValueChange={(value) => updateNotification('workout_reminders', value)}
                  trackColor={{ false: theme.colors.strokeSoft, true: theme.colors.primary600 }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Practice Reminders</Text>
                </View>
                <Switch
                  value={notifications.practice_reminders}
                  onValueChange={(value) => updateNotification('practice_reminders', value)}
                  trackColor={{ false: theme.colors.strokeSoft, true: theme.colors.primary600 }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Goal Reminders</Text>
                </View>
                <Switch
                  value={notifications.goal_reminders}
                  onValueChange={(value) => updateNotification('goal_reminders', value)}
                  trackColor={{ false: theme.colors.strokeSoft, true: theme.colors.primary600 }}
                  thumbColor="#fff"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Social</Text>
              
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>New Follower</Text>
                </View>
                <Switch
                  value={notifications.social_follower}
                  onValueChange={(value) => updateNotification('social_follower', value)}
                  trackColor={{ false: theme.colors.strokeSoft, true: theme.colors.primary600 }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Highlight Views</Text>
                </View>
                <Switch
                  value={notifications.social_highlight_views}
                  onValueChange={(value) => updateNotification('social_highlight_views', value)}
                  trackColor={{ false: theme.colors.strokeSoft, true: theme.colors.primary600 }}
                  thumbColor="#fff"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>AI Trainer</Text>
              
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>AI Trainer Insights</Text>
                  <Text style={styles.settingDescription}>
                    Get notified about personalized insights
                  </Text>
                </View>
                <Switch
                  value={notifications.ai_trainer_insights}
                  onValueChange={(value) => updateNotification('ai_trainer_insights', value)}
                  trackColor={{ false: theme.colors.strokeSoft, true: theme.colors.primary600 }}
                  thumbColor="#fff"
                />
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.strokeSoft,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
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
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textLo,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
    fontFamily: FONT.uiSemi,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.surface1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.strokeSoft,
    marginBottom: 8,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: theme.colors.textHi,
    fontFamily: FONT.uiRegular,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    color: theme.colors.textLo,
    fontFamily: FONT.uiRegular,
  },
});

