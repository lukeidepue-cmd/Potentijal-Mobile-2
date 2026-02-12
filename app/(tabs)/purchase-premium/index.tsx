// app/(tabs)/purchase-premium.tsx
// Premium Upgrade Screen — RevenueCat IAP (steps 20–26)

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../../constants/theme";
import { useProfileRefresh } from "../../../providers/ProfileRefreshContext";
import { useAuth } from "../../../providers/AuthProvider";
import { getMyProfile } from "../../../lib/api/profile";
import { recordPaywallCodeEntered } from "../../../lib/api/settings";
import { completeOnboarding } from "../../../lib/api/onboarding";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import Purchases from "react-native-purchases";
import { supabase } from "../../../lib/supabase";

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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function PurchasePremium() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ fromOnboarding?: string }>();
  const fromOnboarding = params.fromOnboarding === "1";
  const refreshProfile = useProfileRefresh()?.refreshProfile;
  const { refreshOnboardingStatus } = useAuth();
  const [geistLoaded] = useGeist({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
  });
  const fontsReady = geistLoaded;

  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("yearly");
  const [offeringsLoading, setOfferingsLoading] = useState(true);
  const [offeringsError, setOfferingsError] = useState<string | null>(null);
  const [currentOffering, setCurrentOffering] = useState<{ monthly: any; annual: any } | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);

  const loadOfferings = useCallback(async () => {
    setOfferingsError(null);
    setOfferingsLoading(true);
    try {
      const offerings = await Purchases.getOfferings();
      const current = offerings.current;
      if (!current?.availablePackages?.length) {
        setOfferingsError("Plans are not available right now. Please try again later.");
        setCurrentOffering(null);
        return;
      }
      const packages = current.availablePackages;
      const monthly = packages.find((p: any) => p.packageType === Purchases.PACKAGE_TYPE.MONTHLY || p.identifier === "$monthly" || p.identifier?.toLowerCase().includes("monthly"));
      const annual = packages.find((p: any) => p.packageType === Purchases.PACKAGE_TYPE.ANNUAL || p.identifier === "$annual" || p.identifier?.toLowerCase().includes("annual"));
      setCurrentOffering({ monthly: monthly ?? null, annual: annual ?? null });
    } catch (e: any) {
      setOfferingsError(e?.message ?? "Unable to load plans. Pull down to retry.");
      setCurrentOffering(null);
    } finally {
      setOfferingsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOfferings();
  }, [loadOfferings]);

  const selectedPackage = currentOffering ? (selectedPlan === "monthly" ? currentOffering.monthly : currentOffering.annual) : null;

  const handleContinue = async () => {
    setPurchaseError(null);
    setCodeError(null);
    setPurchasing(true);
    const trimmedCode = code.trim();
    if (trimmedCode) {
      recordPaywallCodeEntered(trimmedCode).catch(() => {});
    }
    try {
      // If user already has an active subscription or is premium (e.g. creator), don't present purchase
      const { data: profile } = await getMyProfile();
      const alreadyPremiumFromProfile = profile?.is_premium === true || profile?.plan === "creator" || profile?.is_creator === true;
      if (alreadyPremiumFromProfile) {
        setPurchasing(false);
        const onOk = async () => {
          if (fromOnboarding && refreshOnboardingStatus) {
            const { error } = await completeOnboarding();
            if (!error) await refreshOnboardingStatus();
            router.replace("/(tabs)");
          } else {
            router.back();
          }
        };
        Alert.alert(
          "You're already premium",
          "Your account has premium access. To manage a subscription, go to Settings → Manage Subscription.",
          [{ text: "OK", onPress: onOk }]
        );
        return;
      }
      const existingCustomerInfo = await Purchases.getCustomerInfo();
      const hasActivePremium = existingCustomerInfo?.entitlements?.active?.premium != null;
      if (hasActivePremium) {
        setPurchasing(false);
        const onOk = async () => {
          if (fromOnboarding && refreshOnboardingStatus) {
            const { error } = await completeOnboarding();
            if (!error) await refreshOnboardingStatus();
            router.replace("/(tabs)");
          } else {
            router.back();
          }
        };
        Alert.alert(
          "You're currently subscribed",
          "Your subscription is active. To manage or cancel, go to Settings → Manage Subscription.",
          [{ text: "OK", onPress: onOk }]
        );
        return;
      }

      // Purchase selected plan (1-week free is configured as introductory offer in App Store Connect)
      let customerInfo: any;
      if (selectedPackage) {
        const result = await Purchases.purchasePackage(selectedPackage);
        customerInfo = result.customerInfo;
      } else {
        const productId = selectedPlan === "monthly" ? "premium_monthly" : "premium_yearly";
        const result = await Purchases.purchaseProduct(productId);
        customerInfo = result.customerInfo;
      }

      if (customerInfo?.entitlements?.active?.premium != null) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setCode("");
        try {
          await supabase.functions.invoke("sync-subscription");
        } catch (_) {}
        if (refreshProfile) {
          setTimeout(() => refreshProfile(), 400);
        }
        const onSuccess = async () => {
          if (fromOnboarding && refreshOnboardingStatus) {
            const { error } = await completeOnboarding();
            if (!error) await refreshOnboardingStatus();
            router.replace("/(tabs)");
          } else {
            router.back();
          }
        };
        Alert.alert("You're premium!", "Thanks for upgrading. Enjoy Potentijal Premium.", [
          { text: "OK", onPress: onSuccess },
        ]);
      } else {
        try {
          await supabase.functions.invoke("sync-subscription");
        } catch (_) {}
        if (refreshProfile) setTimeout(() => refreshProfile(), 400);
        const onSuccess = async () => {
          if (fromOnboarding && refreshOnboardingStatus) {
            const { error } = await completeOnboarding();
            if (!error) await refreshOnboardingStatus();
            router.replace("/(tabs)");
          } else {
            router.back();
          }
        };
        Alert.alert("Success", "Purchase completed.", [{ text: "OK", onPress: onSuccess }]);
      }
    } catch (e: any) {
      if (e?.userCancelled) {
        setPurchaseError(null);
      } else {
        setPurchaseError(e?.message ?? "Purchase failed. Please try again.");
      }
    } finally {
      setPurchasing(false);
    }
  };

  // Animation for Continue button
  const continueButtonScale = useSharedValue(1);
  const continueButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: continueButtonScale.value }],
  }));

  if (!fontsReady) {
    return null;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Base dark background */}
      <View style={styles.baseBackground} />

      {/* Radial gradient effect at top - simulated with overlapping gradients */}
      {/* Green gradient layer - more prominent */}
      <LinearGradient
        colors={["rgba(34, 197, 94, 0.5)", "rgba(34, 197, 94, 0.2)", "rgba(34, 197, 94, 0.05)", "transparent"]}
        start={{ x: 0.4, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={styles.radialGradientGreen}
      />
      {/* Purple gradient layer - more prominent */}
      <LinearGradient
        colors={["rgba(168, 85, 247, 0.45)", "rgba(168, 85, 247, 0.18)", "rgba(168, 85, 247, 0.04)", "transparent"]}
        start={{ x: 0.6, y: 0 }}
        end={{ x: 0.4, y: 1 }}
        style={styles.radialGradientPurple}
      />
      {/* Subtle blue accent - reduced */}
      <LinearGradient
        colors={["rgba(59, 130, 246, 0.15)", "rgba(59, 130, 246, 0.04)", "transparent"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
        style={styles.radialGradientBlue}
      />

      {/* Vignette overlay */}
      <LinearGradient
        colors={["rgba(0,0,0,0.4)", "transparent", "transparent", "rgba(0,0,0,0.5)"]}
        locations={[0, 0.15, 0.85, 1]}
        style={styles.vignetteGradient}
        pointerEvents="none"
      />

      {/* Grain overlay */}
      <View style={styles.grainOverlay} pointerEvents="none" />

      {/* Header with Back Button */}
      <View style={[styles.header, { zIndex: 10 }]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.textHi} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Star Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require("../../../assets/pro-star.png")}
            style={styles.logoStar}
            resizeMode="contain"
          />
        </View>

        {/* Title */}
        <Text style={styles.title}>Upgrade to Potentijal Premium</Text>

        {/* Features - Floating icons and descriptions */}
        <View style={styles.featuresContainer}>
          <FeatureItem
            icon="sparkles"
            title="AI Trainer"
            description="Receive guidance and feedback personalized to your training"
          />
          <FeatureItem
            icon="stats-chart"
            title="Advanced Progress Metrics"
            description="Gain more valuable insights on your training and where you can improve"
          />
          <FeatureItem
            icon="trophy"
            title="Log Games and Practices"
            description="Keep track of all of your reps and performances"
          />
          <FeatureItem
            icon="infinite"
            title="Unlimited Sports"
            description="Switch between as many sport modes the app has to offer"
          />
        </View>

        {/* Pricing Cards */}
        {offeringsLoading ? (
          <View style={styles.pricingContainer}>
            <View style={[styles.pricingCard, { opacity: 0.7 }]}>
              <ActivityIndicator size="small" color={theme.colors.primary600} />
              <Text style={[styles.pricingCardLabel, { marginTop: 8 }]}>Loading plans…</Text>
            </View>
          </View>
        ) : offeringsError ? (
          <View style={styles.pricingContainer}>
            <View style={[styles.pricingCard, { opacity: 0.7 }]}>
              <Ionicons name="alert-circle-outline" size={24} color={theme.colors.textLo} />
              <Text style={[styles.pricingCardLabel, { marginTop: 8, color: theme.colors.textLo }]}>{offeringsError}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.pricingContainer}>
            {/* Monthly Plan */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedPlan("monthly");
              }}
              style={[
                styles.pricingCard,
                selectedPlan === "monthly" && styles.pricingCardSelected,
              ]}
            >
              <View style={styles.pricingCardContent}>
                <View style={styles.pricingCardHeader}>
                  <Text style={styles.pricingCardLabel}>Monthly</Text>
                  {selectedPlan === "monthly" && (
                    <View style={styles.checkmarkContainer}>
                      <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary600} />
                    </View>
                  )}
                </View>
                <View style={styles.pricingCardPriceRow}>
                  <Text style={styles.pricingCardPrice}>{currentOffering?.monthly?.product?.priceString ?? "—"}</Text>
                  <Text style={styles.pricingCardPeriod}>/mo</Text>
                </View>
              </View>
            </Pressable>

            {/* Yearly Plan */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedPlan("yearly");
              }}
              style={[
                styles.pricingCard,
                selectedPlan === "yearly" && styles.pricingCardSelected,
              ]}
            >
              <View style={styles.saveBadge}>
                <Text style={styles.saveBadgeText}>Save 50%</Text>
              </View>

              <View style={styles.pricingCardContent}>
                <View style={styles.pricingCardHeader}>
                  <Text style={styles.pricingCardLabel}>Yearly</Text>
                  {selectedPlan === "yearly" && (
                    <View style={styles.checkmarkContainer}>
                      <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary600} />
                    </View>
                  )}
                </View>
                <View style={styles.pricingCardPriceRow}>
                  <Text style={styles.pricingCardPrice}>{currentOffering?.annual?.product?.priceString ?? "—"}</Text>
                  <Text style={styles.pricingCardPeriod}>/yr</Text>
                </View>
              </View>
            </Pressable>
          </View>
        )}

        {/* Enter Code line (same style as email settings screen): under plans, above Continue */}
        <View style={styles.inputLine}>
          <TextInput
            style={styles.lineInput}
            value={code}
            onChangeText={(t) => { setCode(t); setCodeError(null); setPurchaseError(null); }}
            placeholder="Enter Code"
            placeholderTextColor={theme.colors.textLo}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!purchasing}
          />
          <View style={styles.lineUnderline} />
        </View>
        {codeError ? (
          <Text style={[styles.pricingCardLabel, { color: theme.colors.error ?? "#ef4444", marginBottom: 8 }]}>{codeError}</Text>
        ) : null}

        {purchaseError ? (
          <Text style={[styles.pricingCardLabel, { color: theme.colors.error ?? "#ef4444", marginBottom: 12 }]}>{purchaseError}</Text>
        ) : null}

        {/* Continue Button */}
        <AnimatedPressable
          onPress={() => {
            if (purchasing) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            handleContinue();
          }}
          disabled={purchasing}
          style={[styles.continueButton, continueButtonAnimatedStyle, purchasing && { opacity: 0.7 }]}
          onPressIn={() => {
            continueButtonScale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
          }}
          onPressOut={() => {
            continueButtonScale.value = withSpring(1, { damping: 15, stiffness: 300 });
          }}
        >
          <Text style={styles.continueButtonText}>{purchasing ? "Processing…" : "Continue"}</Text>
        </AnimatedPressable>
      </ScrollView>
    </View>
  );
}

function FeatureItem({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.featureItem}>
      <Ionicons
        name={icon as any}
        size={22}
        color={theme.colors.primary600}
        style={styles.featureIcon}
      />
      <View style={styles.featureTextContainer}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg0,
    position: "relative",
  },
  baseBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#0B0B0C",
  },
  radialGradientGreen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 500,
  },
  radialGradientBlue: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 450,
  },
  radialGradientPurple: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 500,
  },
  vignetteGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  grainOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.03)",
    opacity: 0.12,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  logoContainer: {
    alignItems: "center",
    marginTop: -42,
    marginBottom: 32,
  },
  logoStar: {
    width: 200,
    height: 200,
  },
  title: {
    fontSize: 36,
    fontWeight: "900",
    color: theme.colors.textHi,
    textAlign: "center",
    marginTop: -26,
    marginBottom: 48,
    fontFamily: FONT.uiBold,
    letterSpacing: -0.5,
    ...Platform.select({
      ios: {
        textShadowColor: "rgba(0, 0, 0, 0.75)",
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 8,
      },
    }),
  },
  featuresContainer: {
    gap: 32,
    marginTop: -10,
    marginBottom: 48,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  featureIcon: {
    marginTop: 2,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.textHi,
    marginBottom: 3,
    fontFamily: FONT.uiBold,
  },
  featureDescription: {
    fontSize: 13,
    color: theme.colors.textLo,
    fontFamily: FONT.uiRegular,
    lineHeight: 18,
  },
  pricingContainer: {
    gap: 16,
    marginTop: -4,
    marginBottom: 32,
  },
  pricingCard: {
    backgroundColor: theme.colors.surface1,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: theme.colors.strokeSoft,
    padding: 20,
    position: "relative",
    overflow: "visible",
    opacity: 0.5,
  },
  pricingCardSelected: {
    borderColor: theme.colors.primary600,
    backgroundColor: "rgba(34, 197, 94, 0.05)",
    opacity: 1,
  },
  pricingCardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pricingCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pricingCardLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.textHi,
    fontFamily: FONT.uiSemi,
  },
  checkmarkContainer: {
    // Checkmark is positioned in header
  },
  pricingCardPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  pricingCardPrice: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.colors.textHi,
    fontFamily: FONT.uiBold,
  },
  pricingCardPeriod: {
    fontSize: 16,
    color: theme.colors.textLo,
    fontFamily: FONT.uiRegular,
  },
  saveBadge: {
    position: "absolute",
    top: -12,
    right: 16,
    backgroundColor: theme.colors.primary600,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary600,
        shadowOpacity: 0.5,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 8,
      },
    }),
  },
  saveBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#06160D",
    fontFamily: FONT.uiBold,
    letterSpacing: 0.5,
  },
  inputLine: {
    marginBottom: 24,
  },
  lineInput: {
    fontSize: 16,
    color: theme.colors.textHi,
    fontFamily: FONT.uiRegular,
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  lineUnderline: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginTop: 4,
  },
  continueButton: {
    width: "100%",
    backgroundColor: theme.colors.primary600,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.3)",
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary600,
        shadowOpacity: 0.4,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
      },
      android: {
        elevation: 12,
      },
    }),
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#06160D",
    fontFamily: FONT.uiBold,
  },
});
