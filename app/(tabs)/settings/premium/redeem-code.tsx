// app/(tabs)/settings/premium/redeem-code.tsx
// Redeem Code — RevenueCat offer codes + promoter_codes fallback (steps 43–46)

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { theme } from "../../../../constants/theme";
import { redeemCode as redeemPromoterCode } from "../../../../lib/api/settings";
import { setPendingDiscountOfferId } from "../../../../lib/api/profile";
import { useProfileRefresh } from "../../../../providers/ProfileRefreshContext";
import { supabase } from "../../../../lib/supabase";
import Purchases from "react-native-purchases";

const FONT = { uiRegular: "Geist_400Regular", uiSemi: "Geist_600SemiBold", uiBold: "Geist_700Bold" };

export default function RedeemCode() {
  const insets = useSafeAreaInsets();
  const refreshProfile = useProfileRefresh()?.refreshProfile;
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRedeemWithApple = async () => {
    if (Platform.OS !== "ios") return;
    setError(null);
    setRedeeming(true);
    try {
      await Purchases.presentCodeRedemptionSheet();
      const { data: syncData } = await supabase.functions.invoke("sync-subscription");
      refreshProfile?.();
      Alert.alert(
        "Code redeemed",
        syncData?.is_premium ? "Your subscription has been updated." : "If you redeemed a code, your subscription has been updated.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (rcError: unknown) {
      const isCancel = rcError && typeof rcError === "object" && "userCancelled" in rcError && (rcError as { userCancelled?: boolean }).userCancelled;
      if (!isCancel) setError("Redeem was cancelled or the code was not valid.");
    } finally {
      setRedeeming(false);
    }
  };

  const handleRedeem = async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      Alert.alert("Enter a code", "Please enter a code to redeem.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setError(null);
    setRedeeming(true);

    try {
      // Try our promoter_codes first (creator codes, discount codes). Only use Apple's sheet for Apple offer codes.
      const { data, error: apiError } = await redeemPromoterCode(trimmed.toUpperCase());
      if (apiError) {
        setError(apiError.message || "Invalid or expired code.");
        return;
      }
      if (data) {
        const offerId = (data as { offer_identifier?: string }).offer_identifier;
        if (data.type === "discount" && offerId) {
          const { error: updateErr } = await setPendingDiscountOfferId(offerId);
          if (updateErr) {
            setError(updateErr.message ?? "Code applied but could not save discount. Try opening the paywall.");
            return;
          }
        }
        refreshProfile?.();
        Alert.alert("Success", data.message);
        setCode("");
        router.back();
        return;
      }

      setError("Invalid or expired code.");
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "Invalid or expired code.";
      setError(msg);
    } finally {
      setRedeeming(false);
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
        <Text style={styles.headerTitle}>Redeem Code</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>CODE</Text>
        <TextInput
          style={styles.input}
          value={code}
          onChangeText={(t) => { setCode(t); setError(null); }}
          placeholder="Enter code"
          placeholderTextColor={theme.colors.textLo}
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!redeeming}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <Pressable
          style={[styles.redeemButton, redeeming && styles.redeemButtonDisabled]}
          onPress={handleRedeem}
          disabled={redeeming}
        >
          {redeeming ? (
            <ActivityIndicator size="small" color="#06160D" />
          ) : (
            <Text style={styles.redeemButtonText}>Redeem</Text>
          )}
        </Pressable>
        {Platform.OS === "ios" ? (
          <Pressable onPress={handleRedeemWithApple} disabled={redeeming} style={styles.appleLink}>
            <Text style={styles.appleLinkText}>Redeem with Apple (App Store offer code)</Text>
          </Pressable>
        ) : null}
        <View style={styles.helpSection}>
          <Text style={styles.helpText}>
            Enter a creator code or premium discount code above. Creator codes unlock your creator account; discount codes apply a discount on your next purchase.
          </Text>
        </View>
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
  scrollContent: {
    paddingTop: 18,
    paddingHorizontal: 16,
    alignItems: "flex-start",
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
  input: {
    width: "100%",
    backgroundColor: theme.colors.surface1,
    borderWidth: 1,
    borderColor: theme.colors.strokeSoft,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.textHi,
    fontFamily: FONT.uiRegular,
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.error ?? "#ef4444",
    marginTop: 12,
    fontFamily: FONT.uiRegular,
  },
  redeemButton: {
    marginTop: 16,
    backgroundColor: theme.colors.primary600,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignSelf: "flex-start",
    minWidth: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  redeemButtonDisabled: { opacity: 0.7 },
  redeemButtonText: { fontSize: 16, fontWeight: "600", color: "#06160D", fontFamily: FONT.uiSemi },
  appleLink: { marginTop: 20 },
  appleLinkText: { fontSize: 14, color: theme.colors.primary500 ?? theme.colors.primary600, fontFamily: FONT.uiSemi },
  helpSection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: theme.colors.surface1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.strokeSoft,
    width: "100%",
  },
  helpText: {
    fontSize: 14,
    color: theme.colors.textLo,
    lineHeight: 20,
    fontFamily: FONT.uiRegular,
  },
});
