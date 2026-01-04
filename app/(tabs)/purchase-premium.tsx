// app/(tabs)/purchase-premium.tsx
// Stub screen for purchasing premium
// NOTE: Payment integration with Stripe will be added later

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../constants/theme";
import { LinearGradient } from "expo-linear-gradient";

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

export default function PurchasePremium() {
  const insets = useSafeAreaInsets();
  const [geistLoaded] = useGeist({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
  });
  const fontsReady = geistLoaded;

  const [loading, setLoading] = useState(false);

  const handlePurchase = async () => {
    // TODO: Integrate with Stripe when payment system is set up
    setLoading(true);
    
    // Simulate payment processing
    setTimeout(() => {
      setLoading(false);
      // For now, just show an alert
      // In production, this will:
      // 1. Process payment through Stripe
      // 2. Update user's profile.is_premium = true
      // 3. Update user's profile.plan = 'premium'
      // 4. Navigate back to previous screen
      alert("Payment integration coming soon! This is a placeholder screen.");
    }, 1000);
  };

  if (!fontsReady) {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
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
        <Text style={styles.headerTitle}>Upgrade to Premium</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Premium Badge */}
        <View style={styles.badgeContainer}>
          <LinearGradient
            colors={[theme.colors.primary600, "#3BAA6F"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.badge}
          >
            <Ionicons name="star" size={32} color="#06160D" />
            <Text style={styles.badgeText}>PREMIUM</Text>
          </LinearGradient>
        </View>

        {/* Title */}
        <Text style={styles.title}>Unlock All Features</Text>
        <Text style={styles.subtitle}>
          Get access to everything FitPilot has to offer
        </Text>

        {/* Features List */}
        <View style={styles.featuresContainer}>
          <FeatureItem
            icon="trophy"
            title="Log Games & Practices"
            description="Track your game performance and team practices"
          />
          <FeatureItem
            icon="sparkles"
            title="AI Trainer"
            description="Get personalized training advice powered by AI"
          />
          <FeatureItem
            icon="videocam"
            title="Add Highlights"
            description="Showcase your best moments on your profile"
          />
          <FeatureItem
            icon="people"
            title="View Creator Workouts"
            description="Learn from top athletes and trainers"
          />
          <FeatureItem
            icon="add-circle"
            title="Add More Sports"
            description="Track unlimited sports and activities"
          />
        </View>

        {/* Pricing */}
        <View style={styles.pricingContainer}>
          <Text style={styles.pricingLabel}>Monthly Subscription</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>$9.99</Text>
            <Text style={styles.pricePeriod}>/month</Text>
          </View>
          <Text style={styles.pricingNote}>
            Cancel anytime. No commitment.
          </Text>
        </View>

        {/* Payment Form Placeholder */}
        <View style={styles.paymentPlaceholder}>
          <Ionicons
            name="card-outline"
            size={48}
            color={theme.colors.textLo}
          />
          <Text style={styles.placeholderText}>
            Payment integration coming soon
          </Text>
          <Text style={styles.placeholderSubtext}>
            Stripe integration will be added when payment system is ready
          </Text>
        </View>

        {/* Purchase Button */}
        <Pressable
          onPress={handlePurchase}
          disabled={loading}
          style={styles.purchaseButton}
        >
          <LinearGradient
            colors={[theme.colors.primary600, "#3BAA6F"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.purchaseGradient}
          >
            {loading ? (
              <ActivityIndicator color="#06160D" />
            ) : (
              <Text style={styles.purchaseButtonText}>
                Purchase Premium
              </Text>
            )}
          </LinearGradient>
        </Pressable>

        {/* Note */}
        <Text style={styles.note}>
          ⚠️ This is a placeholder screen. Payment processing will be
          implemented when Stripe is integrated.
        </Text>
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
      <View style={styles.featureIconContainer}>
        <Ionicons name={icon as any} size={24} color={theme.colors.primary600} />
      </View>
      <View style={styles.featureContent}>
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
    padding: 24,
    paddingBottom: 40,
  },
  badgeContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#06160D",
    fontFamily: FONT.uiBold,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: theme.colors.textHi,
    textAlign: "center",
    marginBottom: 8,
    fontFamily: FONT.uiBold,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textLo,
    textAlign: "center",
    marginBottom: 32,
    fontFamily: FONT.uiRegular,
  },
  featuresContainer: {
    gap: 16,
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    padding: 16,
    backgroundColor: theme.colors.surface1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.strokeSoft,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.textHi,
    marginBottom: 4,
    fontFamily: FONT.uiSemi,
  },
  featureDescription: {
    fontSize: 14,
    color: theme.colors.textLo,
    fontFamily: FONT.uiRegular,
  },
  pricingContainer: {
    alignItems: "center",
    padding: 24,
    backgroundColor: theme.colors.surface1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.strokeSoft,
    marginBottom: 24,
  },
  pricingLabel: {
    fontSize: 14,
    color: theme.colors.textLo,
    marginBottom: 8,
    fontFamily: FONT.uiRegular,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginBottom: 8,
  },
  price: {
    fontSize: 48,
    fontWeight: "700",
    color: theme.colors.textHi,
    fontFamily: FONT.uiBold,
  },
  pricePeriod: {
    fontSize: 18,
    color: theme.colors.textLo,
    fontFamily: FONT.uiRegular,
  },
  pricingNote: {
    fontSize: 12,
    color: theme.colors.textLo,
    fontFamily: FONT.uiRegular,
  },
  paymentPlaceholder: {
    alignItems: "center",
    padding: 32,
    backgroundColor: theme.colors.surface2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.strokeSoft,
    borderStyle: "dashed",
    marginBottom: 24,
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.textHi,
    marginTop: 16,
    marginBottom: 8,
    fontFamily: FONT.uiSemi,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: theme.colors.textLo,
    textAlign: "center",
    fontFamily: FONT.uiRegular,
  },
  purchaseButton: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
  },
  purchaseGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  purchaseButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#06160D",
    fontFamily: FONT.uiBold,
  },
  note: {
    fontSize: 12,
    color: theme.colors.textLo,
    textAlign: "center",
    fontStyle: "italic",
    fontFamily: FONT.uiRegular,
  },
});

