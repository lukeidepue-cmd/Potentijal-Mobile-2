/**
 * Mint → sky blue → lavender gradient CTA with subtle sparkle layers.
 * Same palette as Settings → Upgrade and Progress → AI Trainer.
 * (No top gloss gradient — avoids a visible horizontal seam on some devices.)
 */
import React from "react";
import { View, StyleSheet, Platform, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type Props = {
  children: React.ReactNode;
  /** Merged onto root surface (e.g. width constraints) */
  style?: StyleProp<ViewStyle>;
};

export function PremiumShimmerCTASurface({ children, style }: Props) {
  return (
    <View style={[styles.surface, style]}>
      <LinearGradient
        colors={["#98FB98", "#87CEEB", "#DDA0DD"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.sparkle1} />
      <View style={styles.sparkle2} />
      <View style={styles.sparkle3} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    alignSelf: "center",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 18,
    width: "88%",
    maxWidth: 300,
    overflow: "hidden",
    position: "relative",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.4,
      },
      android: {
        elevation: 9,
      },
    }),
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    zIndex: 1,
  },
  sparkle1: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.12)",
    opacity: 0.5,
  },
  sparkle2: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.08)",
    opacity: 0.4,
  },
  sparkle3: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.06)",
    opacity: 0.3,
  },
});
