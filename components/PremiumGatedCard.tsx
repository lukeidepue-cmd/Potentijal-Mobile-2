// components/PremiumGatedCard.tsx
// Reusable component for premium-gated features with gray out and lock icon

import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Image, ImageSourcePropType } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../constants/theme";
import UpgradeModal from "./UpgradeModal";

interface PremiumGatedCardProps {
  image: ImageSourcePropType;
  title: string;
  subtitle: string;
  buttonText: string;
  onPress: () => void;
  isPremium: boolean;
  featureName: string;
  children?: React.ReactNode; // For custom button content
}

export default function PremiumGatedCard({
  image,
  title,
  subtitle,
  buttonText,
  onPress,
  isPremium,
  featureName,
  children,
}: PremiumGatedCardProps) {
  const [showModal, setShowModal] = useState(false);

  const handlePress = () => {
    if (isPremium) {
      onPress();
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <Pressable
        onPress={handlePress}
        style={[styles.bigCard, !isPremium && styles.grayedOut]}
      >
        <Image source={image} style={[styles.heroImageTop, !isPremium && styles.grayedImage]} resizeMode="cover" />
        
        {/* Lock Icon Overlay */}
        {!isPremium && (
          <View style={styles.lockOverlay}>
            <Ionicons name="lock-closed" size={32} color={theme.colors.textHi} />
          </View>
        )}

        <View style={styles.bigContent}>
          <Text style={[styles.bigTitle, !isPremium && styles.grayedText]}>{title}</Text>
          <Text style={[styles.bigSub, !isPremium && styles.grayedText]}>{subtitle}</Text>
          <Pressable
            style={{ alignSelf: "flex-start", marginTop: 12 }}
            onPress={handlePress}
          >
            {isPremium ? (
              children || (
                <LinearGradient
                  colors={[theme.colors.primary600, "#3BAA6F"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cta}
                >
                  <Text style={styles.ctaText}>{buttonText}</Text>
                </LinearGradient>
              )
            ) : (
              <LinearGradient
                colors={["#4A4A4A", "#2A2A2A"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cta}
              >
                <Text style={styles.ctaTextGrayed}>{buttonText}</Text>
              </LinearGradient>
            )}
          </Pressable>
        </View>
      </Pressable>

      <UpgradeModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        featureName={featureName}
      />
    </>
  );
}

const styles = StyleSheet.create({
  bigCard: {
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: theme.colors.surface1,
    borderWidth: 1,
    borderColor: theme.colors.strokeSoft,
    position: "relative",
  },
  grayedOut: {
    opacity: 0.5,
  },
  heroImageTop: {
    width: "100%",
    height: 180,
  },
  grayedImage: {
    opacity: 0.3,
  },
  lockOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -16 }, { translateY: -16 }],
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  bigContent: {
    padding: 20,
  },
  bigTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.textHi,
    marginBottom: 4,
  },
  bigSub: {
    fontSize: 14,
    color: theme.colors.textLo,
    marginBottom: 12,
  },
  grayedText: {
    color: theme.colors.textLo,
    opacity: 0.6,
  },
  cta: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  ctaText: {
    color: "#06160D",
    fontWeight: "700",
    fontSize: 16,
  },
  ctaTextGrayed: {
    color: theme.colors.textLo,
    fontWeight: "700",
    fontSize: 16,
  },
});

