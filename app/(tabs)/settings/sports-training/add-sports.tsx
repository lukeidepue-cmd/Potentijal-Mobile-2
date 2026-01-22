// app/(tabs)/settings/sports-training/add-sports.tsx
// Add Sports Screen (Premium)
import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../../../constants/theme";
import { useFeatures } from "../../../../hooks/useFeatures";
import { addSports } from "../../../../lib/api/settings";
import UpgradeModal from "../../../../components/UpgradeModal";
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

const AVAILABLE_SPORTS = [
  { id: "workout", name: "Workout" },
  { id: "basketball", name: "Basketball" },
  { id: "football", name: "Football" },
  { id: "baseball", name: "Baseball" },
  { id: "soccer", name: "Soccer" },
  { id: "hockey", name: "Hockey" },
  { id: "tennis", name: "Tennis" },
];

export default function AddSports() {
  const insets = useSafeAreaInsets();
  const { canAddMoreSports, isPremium } = useFeatures();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [geistLoaded] = useGeist({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
  });
  const fontsReady = geistLoaded;

  const handleAddSport = async (sportId: string) => {
    const { error } = await addSports([sportId]);
    if (error) {
      Alert.alert("Error", "Failed to add sport");
    } else {
      Alert.alert("Success", "Sport added successfully");
      router.back();
    }
  };

  if (!fontsReady) {
    return null;
  }

  if (!canAddMoreSports && !isPremium) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Gradient Background */}
        <LinearGradient
          colors={["#1A4A3A", "rgba(18, 48, 37, 0.5)", "transparent", theme.colors.bg0]}
          locations={[0, 0.2, 0.4, 0.7]}
          style={styles.gradientBackground}
        />

        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={20} color={theme.colors.textHi} />
          </Pressable>
          <Text style={styles.headerTitle}>Add Sports</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.lockedContainer}>
          <Ionicons name="lock-closed" size={64} color={theme.colors.textLo} />
          <Text style={styles.lockedText}>Premium Feature</Text>
          <Text style={styles.lockedSubtext}>Upgrade to add more sports</Text>
          <Pressable style={styles.upgradeButton} onPress={() => setShowUpgrade(true)}>
            <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
          </Pressable>
        </View>
        <UpgradeModal visible={showUpgrade} onClose={() => setShowUpgrade(false)} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Gradient Background */}
      <LinearGradient
        colors={["#1A4A3A", "rgba(18, 48, 37, 0.5)", "transparent", theme.colors.bg0]}
        locations={[0, 0.2, 0.4, 0.7]}
        style={styles.gradientBackground}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.textHi} />
        </Pressable>
        <Text style={styles.headerTitle}>Add Sports</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Sports List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {AVAILABLE_SPORTS.map((sport) => (
          <Pressable
            key={sport.id}
            style={styles.sportCard}
            onPress={() => handleAddSport(sport.id)}
          >
            {/* Gradient Background for Depth */}
            <LinearGradient
              colors={["rgba(255,255,255,0.08)", "rgba(0,0,0,0.04)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            
            {/* Top Sheen Highlight */}
            <LinearGradient
              colors={["rgba(255,255,255,0.10)", "transparent"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 0.4 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            {/* Card Content */}
            <View style={styles.cardContent}>
              <Text style={styles.sportName}>{sport.name}</Text>
              <Ionicons name="add-circle" size={24} color={theme.colors.primary600} />
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.textHi,
    fontFamily: FONT.uiBold,
  },
  scrollView: {
    flex: 1,
    // No overflow: 'hidden' - shadows need to render
  },
  scrollContent: {
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sportCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    height: 96,
    borderRadius: 24,
    backgroundColor: theme.colors.surface1,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    position: "relative",
    // Enhanced floating effects with depth
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 22,
    elevation: 12,
    overflow: "hidden",
  },
  cardContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 20,
    zIndex: 10,
  },
  sportName: {
    fontSize: 16,
    color: theme.colors.textHi,
    fontFamily: FONT.uiSemi,
  },
  lockedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  lockedText: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.textHi,
    marginTop: 16,
    fontFamily: FONT.uiSemi,
  },
  lockedSubtext: {
    fontSize: 14,
    color: theme.colors.textLo,
    marginTop: 8,
    fontFamily: FONT.uiRegular,
  },
  upgradeButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary600,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#06160D",
    fontFamily: FONT.uiSemi,
  },
});

