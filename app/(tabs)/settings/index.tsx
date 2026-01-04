// app/(tabs)/settings/index.tsx
// Main Settings Screen - Lists all settings sections
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/constants/theme";
import { useFeatures } from "@/hooks/useFeatures";
import { useAuth } from "@/providers/AuthProvider";
import Constants from "expo-constants";
import { PROFILE_FEATURES_ENABLED } from "@/constants/features";

// Logout component
function LogoutButton() {
  const { signOut } = useAuth();
  
  return (
    <Pressable
      style={[styles.settingItem, styles.logoutButton]}
      onPress={async () => {
        await signOut();
        router.replace("/(tabs)/(home)");
      }}
    >
      <Ionicons name="log-out-outline" size={20} color={theme.colors.danger} />
      <Text style={[styles.settingText, { color: theme.colors.danger }]}>Log Out</Text>
    </Pressable>
  );
}

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

export default function Settings() {
  const insets = useSafeAreaInsets();
  const { canAddMoreSports, isPremium, isCreator } = useFeatures();
  const { user } = useAuth();
  const [geistLoaded] = useGeist({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
  });
  const fontsReady = geistLoaded;

  if (!fontsReady) {
    return null;
  }

  const appVersion = Constants.expoConfig?.version || "1.0.0";

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
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          {PROFILE_FEATURES_ENABLED && (
            <Pressable
              style={styles.settingItem}
              onPress={() => router.push("/(tabs)/profile/edit")}
            >
              <Ionicons name="person-outline" size={20} color={theme.colors.textHi} />
              <Text style={styles.settingText}>Edit Profile</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textLo} />
            </Pressable>
          )}

          <Pressable
            style={styles.settingItem}
            onPress={() => router.push("/(tabs)/settings/account/email-password")}
          >
            <Ionicons name="mail-outline" size={20} color={theme.colors.textHi} />
            <Text style={styles.settingText}>Email & Password</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textLo} />
          </Pressable>

          <Pressable
            style={styles.settingItem}
            onPress={() => router.push("/(tabs)/settings/account/delete-account")}
          >
            <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
            <Text style={[styles.settingText, { color: theme.colors.danger }]}>Delete Account</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textLo} />
          </Pressable>
        </View>

        {/* Sports & Training Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sports & Training</Text>
          
          <Pressable
            style={styles.settingItem}
            onPress={() => router.push("/(tabs)/settings/sports-training/my-sports")}
          >
            <Ionicons name="basketball-outline" size={20} color={theme.colors.textHi} />
            <Text style={styles.settingText}>My Sports</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textLo} />
          </Pressable>

          <Pressable
            style={[
              styles.settingItem,
              !canAddMoreSports && { opacity: 0.6 }
            ]}
            onPress={() => {
              if (canAddMoreSports) {
                router.push("/(tabs)/settings/sports-training/add-sports");
              }
            }}
            disabled={!canAddMoreSports}
          >
            <Ionicons name="add-circle-outline" size={20} color={theme.colors.textHi} />
            <Text style={styles.settingText}>Add Sports</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {!canAddMoreSports && (
                <Ionicons name="lock-closed" size={16} color={theme.colors.textLo} />
              )}
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textLo} />
            </View>
          </Pressable>

        </View>

        {/* AI Trainer Section (Premium) */}
        {(isPremium || isCreator) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI Trainer</Text>
            
            <Pressable
              style={styles.settingItem}
              onPress={() => router.push("/(tabs)/settings/ai-trainer")}
            >
              <Ionicons name="sparkles-outline" size={20} color={theme.colors.textHi} />
              <Text style={styles.settingText}>AI Trainer Settings</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textLo} />
            </Pressable>
          </View>
        )}

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <Pressable
            style={styles.settingItem}
            onPress={() => router.push("/(tabs)/settings/notifications")}
          >
            <Ionicons name="notifications-outline" size={20} color={theme.colors.textHi} />
            <Text style={styles.settingText}>Notification Preferences</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textLo} />
          </Pressable>
        </View>

        {/* Privacy & Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Security</Text>
          
          <Pressable
            style={styles.settingItem}
            onPress={() => router.push("/(tabs)/settings/privacy-security")}
          >
            <Ionicons name="lock-closed-outline" size={20} color={theme.colors.textHi} />
            <Text style={styles.settingText}>Privacy Settings</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textLo} />
          </Pressable>

          <Pressable
            style={styles.settingItem}
            onPress={() => router.push("/(tabs)/settings/privacy-security/blocked-users")}
          >
            <Ionicons name="ban-outline" size={20} color={theme.colors.textHi} />
            <Text style={styles.settingText}>Blocked Users</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textLo} />
          </Pressable>
        </View>

        {/* Premium Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Premium</Text>
          
          <View style={styles.settingItem}>
            <Ionicons name="star-outline" size={20} color={theme.colors.textHi} />
            <View style={{ flex: 1 }}>
              <Text style={styles.settingText}>
                {isPremium || isCreator ? "Premium Active" : "Free Plan"}
              </Text>
              {isCreator && (
                <Text style={styles.settingSubtext}>Creator Account</Text>
              )}
            </View>
            {!isPremium && !isCreator && (
              <Pressable
                onPress={() => router.push("/(tabs)/purchase-premium")}
                style={styles.upgradeButton}
              >
                <Text style={styles.upgradeButtonText}>Upgrade</Text>
              </Pressable>
            )}
          </View>

          {(isPremium || isCreator) && (
            <>
              <Pressable
                style={styles.settingItem}
                onPress={() => router.push("/(tabs)/settings/premium/manage-subscription")}
              >
                <Ionicons name="card-outline" size={20} color={theme.colors.textHi} />
                <Text style={styles.settingText}>Manage Subscription</Text>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textLo} />
              </Pressable>

              <Pressable
                style={styles.settingItem}
                onPress={() => router.push("/(tabs)/settings/premium/restore-purchases")}
              >
                <Ionicons name="refresh-outline" size={20} color={theme.colors.textHi} />
                <Text style={styles.settingText}>Restore Purchases</Text>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textLo} />
              </Pressable>
            </>
          )}

          <Pressable
            style={styles.settingItem}
            onPress={() => router.push("/(tabs)/settings/premium/redeem-code")}
          >
            <Ionicons name="gift-outline" size={20} color={theme.colors.textHi} />
            <Text style={styles.settingText}>Redeem Code</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textLo} />
          </Pressable>
        </View>

        {/* App Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Preferences</Text>
          
          <Pressable
            style={styles.settingItem}
            onPress={() => router.push("/(tabs)/settings/app-preferences/units")}
          >
            <Ionicons name="resize-outline" size={20} color={theme.colors.textHi} />
            <Text style={styles.settingText}>Units</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textLo} />
          </Pressable>
        </View>

        {/* Support & Legal Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support & Legal</Text>
          
          <Pressable
            style={styles.settingItem}
            onPress={() => router.push("/(tabs)/settings/support-legal/help")}
          >
            <Ionicons name="help-circle-outline" size={20} color={theme.colors.textHi} />
            <Text style={styles.settingText}>Help</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textLo} />
          </Pressable>

          <Pressable
            style={styles.settingItem}
            onPress={() => router.push("/(tabs)/settings/support-legal/contact")}
          >
            <Ionicons name="mail-outline" size={20} color={theme.colors.textHi} />
            <Text style={styles.settingText}>Contact Support</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textLo} />
          </Pressable>

          <Pressable
            style={styles.settingItem}
            onPress={() => router.push("/(tabs)/settings/support-legal/privacy-policy")}
          >
            <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.textHi} />
            <Text style={styles.settingText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textLo} />
          </Pressable>

          <Pressable
            style={styles.settingItem}
            onPress={() => router.push("/(tabs)/settings/support-legal/terms")}
          >
            <Ionicons name="document-text-outline" size={20} color={theme.colors.textHi} />
            <Text style={styles.settingText}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textLo} />
          </Pressable>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <View style={styles.settingItem}>
            <Ionicons name="information-circle-outline" size={20} color={theme.colors.textHi} />
            <View style={{ flex: 1 }}>
              <Text style={styles.settingText}>App Version</Text>
              <Text style={styles.settingSubtext}>{appVersion}</Text>
            </View>
          </View>

          <Pressable
            style={styles.settingItem}
            onPress={() => router.push("/(tabs)/settings/about/credits")}
          >
            <Ionicons name="people-outline" size={20} color={theme.colors.textHi} />
            <Text style={styles.settingText}>Credits</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textLo} />
          </Pressable>
        </View>

        {/* Log Out */}
        <View style={styles.section}>
          <LogoutButton />
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
  settingText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.textHi,
    fontFamily: FONT.uiRegular,
  },
  settingSubtext: {
    fontSize: 12,
    color: theme.colors.textLo,
    marginTop: 2,
    fontFamily: FONT.uiRegular,
  },
  upgradeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.primary600,
  },
  upgradeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#06160D",
    fontFamily: FONT.uiSemi,
  },
  logoutButton: {
    borderColor: theme.colors.danger + "40",
    backgroundColor: theme.colors.danger + "10",
  },
});

