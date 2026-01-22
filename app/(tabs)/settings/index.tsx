// app/(tabs)/settings/index.tsx
// Main Settings Screen - Lists all settings sections
import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "@/constants/theme";
import { useFeatures } from "@/hooks/useFeatures";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/providers/AuthProvider";
import Constants from "expo-constants";
import { PROFILE_FEATURES_ENABLED } from "@/constants/features";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");


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
  const { user, signOut } = useAuth();
  const [geistLoaded] = useGeist({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
  });
  const fontsReady = geistLoaded;

  // Fade-in animation
  const opacity = useSharedValue(0.85);

  // Animate fade-in every time screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      // Start from 0.85 and fade in to 1 (very subtle, no flash)
      opacity.value = 0.85;
      opacity.value = withTiming(1, { duration: 400 });
      
      // Return cleanup function for fade-out when leaving
      return () => {
        opacity.value = withTiming(0.85, { duration: 250 });
      };
    }, [opacity])
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  if (!fontsReady) {
    return null;
  }

  const appVersion = Constants.expoConfig?.version || "1.0.0";

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      {/* Gradient Background */}
      <LinearGradient
        colors={["#1A4A3A", "rgba(18, 48, 37, 0.5)", "transparent", theme.colors.bg0]}
        locations={[0, 0.2, 0.4, 0.7]}
        style={styles.gradientBackground}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          <View style={styles.groupCard}>
            <Pressable
              style={[styles.settingRow, styles.settingRowFirst]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/(tabs)/settings/sports-training/my-sports");
              }}
            >
              <Ionicons name="basketball-outline" size={20} color={theme.colors.textHi} />
              <Text style={styles.settingRowText}>My Sports</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textLo} />
            </Pressable>

            <View style={styles.settingRowSeparator} />
            <Pressable
              style={styles.settingRow}
              onPress={() => {
                if (canAddMoreSports) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/(tabs)/settings/sports-training/add-sports");
                }
              }}
              disabled={!canAddMoreSports}
            >
              <Ionicons name="add-circle-outline" size={20} color={theme.colors.textHi} />
              <Text style={styles.settingRowText}>Add Sports</Text>
              <View style={styles.settingRowRight}>
                {!canAddMoreSports && (
                  <View style={styles.lockPill}>
                    <Ionicons name="lock-closed" size={12} color={theme.colors.textLo} />
                    <Text style={styles.lockPillText}>Locked</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textLo} />
              </View>
            </Pressable>

            <View style={styles.settingRowSeparator} />
            <Pressable
              style={styles.settingRow}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/(tabs)/settings/notifications");
              }}
            >
              <Ionicons name="notifications-outline" size={20} color={theme.colors.textHi} />
              <Text style={styles.settingRowText}>Notification Preferences</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textLo} />
            </Pressable>

            <View style={styles.settingRowSeparator} />
            <Pressable
              style={styles.settingRow}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/(tabs)/settings/account/email-password");
              }}
            >
              <Ionicons name="mail-outline" size={20} color={theme.colors.textHi} />
              <Text style={styles.settingRowText}>Email & Password</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textLo} />
            </Pressable>

            <View style={styles.settingRowSeparator} />
            <Pressable
              style={[styles.settingRow, styles.settingRowLast]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/(tabs)/settings/app-preferences/units");
              }}
            >
              <Ionicons name="resize-outline" size={20} color={theme.colors.textHi} />
              <Text style={styles.settingRowText}>Units</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textLo} />
            </Pressable>
          </View>
        </View>

        {/* Premium Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PREMIUM</Text>
          <View style={styles.groupCard}>
            {(isPremium || isCreator) && (
              <>
                <Pressable
                  style={[styles.settingRow, styles.settingRowFirst]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push("/(tabs)/settings/ai-trainer");
                  }}
                >
                  <Ionicons name="sparkles-outline" size={20} color={theme.colors.textHi} />
                  <Text style={styles.settingRowText}>AI Trainer Settings</Text>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textLo} />
                </Pressable>
                <View style={styles.settingRowSeparator} />
              </>
            )}

            {/* Plan Card */}
            <View style={styles.planCard}>
              <View style={styles.planCardContent}>
                <Ionicons name="star-outline" size={20} color={theme.colors.textHi} />
                <View style={styles.planCardInfo}>
                  <Text style={styles.planCardTitle}>
                    {isPremium || isCreator ? "Premium Active" : "Free Plan"}
                  </Text>
                  {isCreator && (
                    <Text style={styles.planCardSubtitle}>Creator Account</Text>
                  )}
                  {!isPremium && !isCreator && (
                    <Text style={styles.planCardSubtitle}>Unlock advanced analytics + pro tools</Text>
                  )}
                </View>
              </View>
              {!isPremium && !isCreator && (
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push("/(tabs)/purchase-premium");
                  }}
                  style={styles.upgradeButtonNew}
                >
                  <Text style={styles.upgradeButtonTextNew}>Upgrade</Text>
                </Pressable>
              )}
            </View>

            {(isPremium || isCreator) && (
              <>
                <View style={styles.settingRowSeparator} />
                <Pressable
                  style={styles.settingRow}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push("/(tabs)/settings/premium/manage-subscription");
                  }}
                >
                  <Ionicons name="card-outline" size={20} color={theme.colors.textHi} />
                  <Text style={styles.settingRowText}>Manage Subscription</Text>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textLo} />
                </Pressable>

                <View style={styles.settingRowSeparator} />
                <Pressable
                  style={styles.settingRow}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push("/(tabs)/settings/premium/restore-purchases");
                  }}
                >
                  <Ionicons name="refresh-outline" size={20} color={theme.colors.textHi} />
                  <Text style={styles.settingRowText}>Restore Purchases</Text>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textLo} />
                </Pressable>
              </>
            )}

            <View style={styles.settingRowSeparator} />
            <Pressable
              style={[styles.settingRow, styles.settingRowLast]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/(tabs)/settings/premium/redeem-code");
              }}
            >
              <Ionicons name="gift-outline" size={20} color={theme.colors.textHi} />
              <Text style={styles.settingRowText}>Redeem Code</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textLo} />
            </Pressable>
          </View>
        </View>

        {/* Support & Legal Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SUPPORT & LEGAL</Text>
          <View style={styles.groupCard}>
            <Pressable
              style={[styles.settingRow, styles.settingRowFirst]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/(tabs)/settings/support-legal/help");
              }}
            >
              <Ionicons name="help-circle-outline" size={20} color={theme.colors.textHi} />
              <Text style={styles.settingRowText}>Help</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textLo} />
            </Pressable>

            <View style={styles.settingRowSeparator} />
            <Pressable
              style={styles.settingRow}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/(tabs)/settings/support-legal/contact");
              }}
            >
              <Ionicons name="mail-outline" size={20} color={theme.colors.textHi} />
              <Text style={styles.settingRowText}>Contact Support</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textLo} />
            </Pressable>

            <View style={styles.settingRowSeparator} />
            <Pressable
              style={styles.settingRow}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/(tabs)/settings/support-legal/privacy-policy");
              }}
            >
              <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.textHi} />
              <Text style={styles.settingRowText}>Privacy Policy</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textLo} />
            </Pressable>

            <View style={styles.settingRowSeparator} />
            <Pressable
              style={[styles.settingRow, styles.settingRowLast]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/(tabs)/settings/support-legal/terms");
              }}
            >
              <Ionicons name="document-text-outline" size={20} color={theme.colors.textHi} />
              <Text style={styles.settingRowText}>Terms of Service</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textLo} />
            </Pressable>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ABOUT</Text>
          <View style={styles.groupCard}>
            <View style={[styles.settingRow, styles.settingRowFirst]}>
              <Ionicons name="information-circle-outline" size={20} color={theme.colors.textHi} />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingRowText}>App Version</Text>
                <Text style={styles.settingRowSubtext}>{appVersion}</Text>
              </View>
            </View>

            <View style={styles.settingRowSeparator} />
            <Pressable
              style={[styles.settingRow, styles.settingRowLast]}
              onPress={() => router.push("/(tabs)/settings/about/credits")}
            >
              <Ionicons name="people-outline" size={20} color={theme.colors.textHi} />
              <Text style={styles.settingRowText}>Credits</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textLo} />
            </Pressable>
          </View>
        </View>

        {/* Delete Account - Isolated */}
        <View style={styles.section}>
          <View style={styles.groupCard}>
            <Pressable
              style={[styles.settingRow, styles.settingRowFirst, styles.settingRowLast]}
              onPress={() => router.push("/(tabs)/settings/account/delete-account")}
            >
              <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
              <Text style={[styles.settingRowText, { color: theme.colors.danger }]}>Delete Account</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textLo} />
            </Pressable>
          </View>
        </View>

        {/* Log Out */}
        <View style={styles.section}>
          <View style={styles.groupCard}>
            <Pressable
              style={[styles.settingRow, styles.settingRowFirst, styles.settingRowLast]}
              onPress={async () => {
                await signOut();
                router.replace("/(tabs)/(home)");
              }}
            >
              <Ionicons name="log-out-outline" size={20} color={theme.colors.danger} />
              <Text style={[styles.settingRowText, { color: theme.colors.danger }]}>Log Out</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </Animated.View>
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
    height: 320,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 10,
  },
  backButton: {
    // No box styling - matches onboarding screens
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
    paddingBottom: 16,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textLo,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingHorizontal: 16,
    fontFamily: FONT.uiSemi,
  },
  groupCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 0,
    borderWidth: 0,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    paddingVertical: 4,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 16,
    minHeight: 56,
    gap: 12,
  },
  settingRowFirst: {
    paddingTop: 12,
  },
  settingRowLast: {
    paddingBottom: 12,
  },
  settingRowSeparator: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginHorizontal: 18,
  },
  settingRowText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.textHi,
    fontFamily: FONT.uiSemi,
  },
  settingRowSubtext: {
    fontSize: 13,
    color: theme.colors.textLo,
    marginTop: 2,
    fontFamily: FONT.uiRegular,
  },
  settingRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  lockPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  lockPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.textLo,
    fontFamily: FONT.uiSemi,
  },
  planCard: {
    padding: 16,
  },
  planCardContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  planCardInfo: {
    flex: 1,
  },
  planCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.textHi,
    fontFamily: FONT.uiSemi,
    marginBottom: 2,
  },
  planCardSubtitle: {
    fontSize: 13,
    color: theme.colors.textLo,
    fontFamily: FONT.uiRegular,
  },
  upgradeButtonNew: {
    alignSelf: "flex-end",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: theme.colors.primary600,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  upgradeButtonTextNew: {
    fontSize: 14,
    fontWeight: "700",
    color: "#06160D",
    fontFamily: FONT.uiBold,
  },
});

