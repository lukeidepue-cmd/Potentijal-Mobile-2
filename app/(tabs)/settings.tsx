// app/(tabs)/settings.tsx
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
import { theme } from "../../constants/theme";
import { useFeatures } from "../../hooks/useFeatures";

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
      >
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <Pressable
            style={styles.settingItem}
            onPress={() => router.push("/(tabs)/profile/edit")}
          >
            <Ionicons name="person-outline" size={20} color={theme.colors.textHi} />
            <Text style={styles.settingText}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textLo} />
          </Pressable>

          <Pressable
            style={styles.settingItem}
            onPress={() => {
              // TODO: Navigate to payment settings when implemented
              alert("Payment settings coming soon");
            }}
          >
            <Ionicons name="card-outline" size={20} color={theme.colors.textHi} />
            <Text style={styles.settingText}>Payment & Billing</Text>
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
        </View>

        {/* Features Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>
          
          <Pressable
            style={[
              styles.settingItem,
              !canAddMoreSports && { opacity: 0.6 }
            ]}
            onPress={() => {
              if (canAddMoreSports) {
                // TODO: Navigate to Add More Sports screen when implemented
                alert("Add More Sports feature coming soon");
              }
            }}
            disabled={!canAddMoreSports}
          >
            <Ionicons name="add-circle-outline" size={20} color={theme.colors.textHi} />
            <Text style={styles.settingText}>Add More Sports</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {!canAddMoreSports && (
                <Ionicons name="lock-closed" size={16} color={theme.colors.textLo} />
              )}
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textLo} />
            </View>
          </Pressable>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <Pressable
            style={styles.settingItem}
            onPress={() => {
              // TODO: Navigate to help/support when implemented
              alert("Help & Support coming soon");
            }}
          >
            <Ionicons name="help-circle-outline" size={20} color={theme.colors.textHi} />
            <Text style={styles.settingText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textLo} />
          </Pressable>

          <Pressable
            style={styles.settingItem}
            onPress={() => {
              // TODO: Navigate to about/privacy when implemented
              alert("About & Privacy coming soon");
            }}
          >
            <Ionicons name="information-circle-outline" size={20} color={theme.colors.textHi} />
            <Text style={styles.settingText}>About & Privacy</Text>
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
});

