// app/(tabs)/settings/premium/restore-purchases.tsx
// Restore Purchases — RevenueCat restore + sync-subscription (step 36, 39–42)

import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { theme } from "../../../../constants/theme";
import { supabase } from "../../../../lib/supabase";
import { useProfileRefresh } from "../../../../providers/ProfileRefreshContext";
import Purchases from "react-native-purchases";

const FONT = { uiRegular: "Geist_400Regular", uiBold: "Geist_700Bold", uiSemi: "Geist_600SemiBold" };

export default function RestorePurchases() {
  const insets = useSafeAreaInsets();
  const refreshProfile = useProfileRefresh()?.refreshProfile;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRestore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setError(null);
    setLoading(true);
    try {
      await Purchases.restorePurchases();
      const { data, error: syncError } = await supabase.functions.invoke("sync-subscription");
      if (syncError) {
        setError(syncError.message || "Could not sync subscription. Try again.");
        return;
      }
      refreshProfile?.();
      Alert.alert(
        "Purchases restored",
        data?.is_premium ? "Your premium access has been restored." : "No active subscription was found. If you recently purchased, it may take a moment.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "Restore failed. Try again.";
      setError(msg);
    } finally {
      setLoading(false);
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
        <Text style={styles.headerTitle}>Restore Purchases</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={handleRestore}
          disabled={loading}
          style={[styles.restoreButton, loading && styles.restoreButtonDisabled]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#06160D" />
          ) : (
            <Text style={styles.restoreButtonText}>Restore purchases</Text>
          )}
        </Pressable>
        <Text style={styles.placeholderSubtext}>
          If you subscribed on this Apple ID or another device, use the button above to restore access.
        </Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
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
  placeholderSubtext: {
    fontSize: 14,
    color: theme.colors.textLo,
    marginTop: 12,
    fontFamily: FONT.uiRegular,
    lineHeight: 20,
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.error ?? "#ef4444",
    marginTop: 12,
    fontFamily: FONT.uiRegular,
  },
  restoreButton: {
    backgroundColor: theme.colors.primary600,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignSelf: "flex-start",
    alignItems: "center",
    justifyContent: "center",
  },
  restoreButtonDisabled: { opacity: 0.7 },
  restoreButtonText: { fontSize: 16, fontWeight: "600", color: "#06160D", fontFamily: FONT.uiSemi },
});
