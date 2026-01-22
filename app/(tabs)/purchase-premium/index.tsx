// app/(tabs)/purchase-premium.tsx
// Premium Upgrade Screen - Full screen redesign
// NOTE: Payment integration with Stripe will be added later

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../../constants/theme";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

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
  const [geistLoaded] = useGeist({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
  });
  const fontsReady = geistLoaded;

  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("yearly");

  // Animation for Continue button
  const continueButtonScale = useSharedValue(1);
  const continueButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: continueButtonScale.value }],
  }));

  const handleContinue = () => {
    // TODO: Navigate to payment screen when implemented
    console.log("Continue pressed - payment flow not yet implemented");
  };

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
        <Text style={styles.title}>Upgrade to Potential Pro</Text>

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
                <Text style={styles.pricingCardPrice}>$9.99</Text>
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
            {/* Save 50% Badge */}
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
                <Text style={styles.pricingCardPrice}>$59.99</Text>
                <Text style={styles.pricingCardPeriod}>/yr</Text>
              </View>
            </View>
          </Pressable>
        </View>

        {/* Continue Button */}
        <AnimatedPressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            handleContinue();
          }}
          onPressIn={() => {
            continueButtonScale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
          }}
          onPressOut={() => {
            continueButtonScale.value = withSpring(1, { damping: 15, stiffness: 300 });
          }}
          style={[styles.continueButton, continueButtonAnimatedStyle]}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
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
