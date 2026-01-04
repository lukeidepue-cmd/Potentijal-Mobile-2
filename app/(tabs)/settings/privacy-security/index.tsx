// app/(tabs)/settings/privacy-security/index.tsx
// Privacy & Security Settings Screen
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
import { getPrivacySettings, updatePrivacySettings } from "../../../../lib/api/settings";
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

export default function PrivacySecuritySettings() {
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
  const [settings, setSettings] = useState({
    is_private_account: false,
    who_can_see_profile: 'everyone' as 'everyone' | 'followers' | 'none',
    who_can_see_highlights: 'everyone' as 'everyone' | 'followers' | 'none',
    who_can_find_me: 'everyone' as 'everyone' | 'followers' | 'none',
    who_can_follow_me: 'everyone' as 'everyone' | 'none',
    suggest_me_to_others: true,
    email_visibility: 'private' as 'public' | 'private',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await getPrivacySettings();
      if (data) {
        setSettings({
          is_private_account: data.is_private_account,
          who_can_see_profile: data.who_can_see_profile,
          who_can_see_highlights: data.who_can_see_highlights,
          who_can_find_me: data.who_can_find_me,
          who_can_follow_me: data.who_can_follow_me,
          suggest_me_to_others: data.suggest_me_to_others,
          email_visibility: data.email_visibility,
        });
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    setSaving(true);
    try {
      const updates = { [key]: value };
      const { error } = await updatePrivacySettings(updates);
      if (error) {
        Alert.alert("Error", "Failed to update setting");
        // Revert change
        loadSettings();
      } else {
        setSettings(prev => ({ ...prev, [key]: value }));
      }
    } catch (error) {
      Alert.alert("Error", "Failed to update setting");
      loadSettings();
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
        <Text style={styles.headerTitle}>Privacy & Security</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Privacy</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Private Account</Text>
              <Text style={styles.settingDescription}>
                Only approved followers can see your content
              </Text>
            </View>
            <Switch
              value={settings.is_private_account}
              onValueChange={(value) => updateSetting('is_private_account', value)}
              trackColor={{ false: theme.colors.strokeSoft, true: theme.colors.primary600 }}
              thumbColor="#fff"
            />
          </View>

          <Pressable
            style={styles.settingItem}
            onPress={() => {
              // Show picker for who can see profile
              Alert.alert(
                "Who can see your profile?",
                "",
                [
                  { text: "Everyone", onPress: () => updateSetting('who_can_see_profile', 'everyone') },
                  { text: "Followers", onPress: () => updateSetting('who_can_see_profile', 'followers') },
                  { text: "None", onPress: () => updateSetting('who_can_see_profile', 'none') },
                  { text: "Cancel", style: "cancel" },
                ]
              );
            }}
          >
            <Ionicons name="eye-outline" size={20} color={theme.colors.textHi} />
            <View style={styles.settingInfo}>
              <Text style={styles.settingText}>Who can see profile</Text>
              <Text style={styles.settingSubtext}>{settings.who_can_see_profile}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textLo} />
          </Pressable>

          <Pressable
            style={styles.settingItem}
            onPress={() => {
              Alert.alert(
                "Who can see your highlights?",
                "",
                [
                  { text: "Everyone", onPress: () => updateSetting('who_can_see_highlights', 'everyone') },
                  { text: "Followers", onPress: () => updateSetting('who_can_see_highlights', 'followers') },
                  { text: "None", onPress: () => updateSetting('who_can_see_highlights', 'none') },
                  { text: "Cancel", style: "cancel" },
                ]
              );
            }}
          >
            <Ionicons name="videocam-outline" size={20} color={theme.colors.textHi} />
            <View style={styles.settingInfo}>
              <Text style={styles.settingText}>Who can see highlights</Text>
              <Text style={styles.settingSubtext}>{settings.who_can_see_highlights}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textLo} />
          </Pressable>
        </View>

        {/* Discovery */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Discovery</Text>
          
          <Pressable
            style={styles.settingItem}
            onPress={() => {
              Alert.alert(
                "Who can find you?",
                "",
                [
                  { text: "Everyone", onPress: () => updateSetting('who_can_find_me', 'everyone') },
                  { text: "Followers", onPress: () => updateSetting('who_can_find_me', 'followers') },
                  { text: "None", onPress: () => updateSetting('who_can_find_me', 'none') },
                  { text: "Cancel", style: "cancel" },
                ]
              );
            }}
          >
            <Ionicons name="search-outline" size={20} color={theme.colors.textHi} />
            <View style={styles.settingInfo}>
              <Text style={styles.settingText}>Who can find me</Text>
              <Text style={styles.settingSubtext}>{settings.who_can_find_me}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textLo} />
          </Pressable>

          <Pressable
            style={styles.settingItem}
            onPress={() => {
              Alert.alert(
                "Who can follow you?",
                "",
                [
                  { text: "Everyone", onPress: () => updateSetting('who_can_follow_me', 'everyone') },
                  { text: "None", onPress: () => updateSetting('who_can_follow_me', 'none') },
                  { text: "Cancel", style: "cancel" },
                ]
              );
            }}
          >
            <Ionicons name="people-outline" size={20} color={theme.colors.textHi} />
            <View style={styles.settingInfo}>
              <Text style={styles.settingText}>Who can follow me</Text>
              <Text style={styles.settingSubtext}>{settings.who_can_follow_me}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textLo} />
          </Pressable>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Suggest me to others</Text>
              <Text style={styles.settingDescription}>
                Allow others to find you through suggestions
              </Text>
            </View>
            <Switch
              value={settings.suggest_me_to_others}
              onValueChange={(value) => updateSetting('suggest_me_to_others', value)}
              trackColor={{ false: theme.colors.strokeSoft, true: theme.colors.primary600 }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Email Visibility */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Email</Text>
          
          <Pressable
            style={styles.settingItem}
            onPress={() => {
              Alert.alert(
                "Email Visibility",
                "",
                [
                  { text: "Private", onPress: () => updateSetting('email_visibility', 'private') },
                  { text: "Public", onPress: () => updateSetting('email_visibility', 'public') },
                  { text: "Cancel", style: "cancel" },
                ]
              );
            }}
          >
            <Ionicons name="mail-outline" size={20} color={theme.colors.textHi} />
            <View style={styles.settingInfo}>
              <Text style={styles.settingText}>Email Visibility</Text>
              <Text style={styles.settingSubtext}>{settings.email_visibility}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textLo} />
          </Pressable>
        </View>

        {/* Blocked Users */}
        <View style={styles.section}>
          <Pressable
            style={styles.settingItem}
            onPress={() => router.push("/(tabs)/settings/privacy-security/blocked-users")}
          >
            <Ionicons name="ban-outline" size={20} color={theme.colors.textHi} />
            <Text style={styles.settingText}>Blocked Users</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textLo} />
          </Pressable>
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
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.surface1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.strokeSoft,
    marginBottom: 8,
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
  settingText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.textHi,
    fontFamily: FONT.uiRegular,
  },
  settingLabel: {
    fontSize: 16,
    color: theme.colors.textHi,
    fontFamily: FONT.uiRegular,
    marginBottom: 4,
  },
  settingSubtext: {
    fontSize: 12,
    color: theme.colors.textLo,
    marginTop: 2,
    fontFamily: FONT.uiRegular,
  },
  settingDescription: {
    fontSize: 12,
    color: theme.colors.textLo,
    fontFamily: FONT.uiRegular,
  },
});

