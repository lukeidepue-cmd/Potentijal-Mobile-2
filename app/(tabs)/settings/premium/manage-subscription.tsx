// app/(tabs)/settings/premium/manage-subscription.tsx
// Manage Subscription — open Apple subscription settings (steps 37–38)

import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Linking, Alert, Platform, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { theme } from "../../../../constants/theme";

const FONT = { uiRegular: "Geist_400Regular", uiBold: "Geist_700Bold", uiSemi: "Geist_600SemiBold" };

const APPLE_SUBSCRIPTIONS_URL = "https://apps.apple.com/account/subscriptions";

export default function ManageSubscription() {
  const insets = useSafeAreaInsets();
  const [opening, setOpening] = useState(false);

  const handleOpenSubscriptionSettings = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setOpening(true);
    try {
      const canOpen = await Linking.canOpenURL(APPLE_SUBSCRIPTIONS_URL);
      if (!canOpen) {
        Alert.alert(
          "Can't open link",
          "Open Safari and go to: apps.apple.com/account/subscriptions to cancel, change your plan, or update payment.",
          [{ text: "OK" }]
        );
        return;
      }
      await Linking.openURL(APPLE_SUBSCRIPTIONS_URL);
    } catch {
      Alert.alert(
        "Couldn't open subscription settings",
        "Open Safari and go to: apps.apple.com/account/subscriptions to cancel, change your plan, or update payment.",
        [{ text: "OK" }]
      );
    } finally {
      setOpening(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={["#1A4A3A", "rgba(18, 48, 37, 0.5)", "transparent", theme.colors.bg0]}
        locations={[0, 0.2, 0.4, 0.7]}
        style={styles.gradientBackground}
      />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={10}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.textHi} />
        </Pressable>
        <Text style={styles.headerTitle}>Manage Subscription</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={handleOpenSubscriptionSettings}
          disabled={opening}
          style={[styles.primaryButton, opening && styles.primaryButtonDisabled]}
        >
          <Text style={styles.primaryButtonText}>
            {opening ? "Opening…" : "Open Subscription Settings"}
          </Text>
        </Pressable>
        <Text style={styles.subtext}>
          Cancel, change plan, or update payment in your Apple account.
        </Text>
        {Platform.OS === "ios" && (
          <Text style={styles.hint}>
            You may need to sign in with your Apple ID.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg0 },
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
  backButton: {},
  headerTitle: { fontSize: 20, fontWeight: "700", color: theme.colors.textHi, fontFamily: FONT.uiBold },
  scrollView: { flex: 1 },
  content: {
    paddingTop: 18,
    paddingHorizontal: 16,
    alignItems: "flex-start",
  },
  subtext: {
    fontSize: 14,
    color: theme.colors.textLo,
    marginTop: 12,
    fontFamily: FONT.uiRegular,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary600,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignSelf: "flex-start",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: { fontSize: 16, fontWeight: "600", color: "#06160D", fontFamily: FONT.uiSemi },
  hint: {
    marginTop: 12,
    fontSize: 12,
    color: theme.colors.textLo,
    fontFamily: FONT.uiRegular,
  },
});
