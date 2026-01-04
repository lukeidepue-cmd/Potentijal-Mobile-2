// app/(tabs)/settings/sports-training/add-sports.tsx
// Add Sports Screen (Premium)
import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../../../constants/theme";
import { useFeatures } from "../../../../hooks/useFeatures";
import { addSports } from "../../../../lib/api/settings";
import UpgradeModal from "../../../../components/UpgradeModal";

const FONT = { uiRegular: "Geist_400Regular", uiSemi: "Geist_600SemiBold", uiBold: "Geist_700Bold" };

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

  if (!canAddMoreSports && !isPremium) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.textHi} />
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

  const handleAddSport = async (sportId: string) => {
    const { error } = await addSports([sportId]);
    if (error) {
      Alert.alert("Error", "Failed to add sport");
    } else {
      Alert.alert("Success", "Sport added successfully");
      router.back();
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textHi} />
        </Pressable>
        <Text style={styles.headerTitle}>Add Sports</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {AVAILABLE_SPORTS.map((sport) => (
          <Pressable key={sport.id} style={styles.sportItem} onPress={() => handleAddSport(sport.id)}>
            <Text style={styles.sportName}>{sport.name}</Text>
            <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary600} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg0 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.strokeSoft },
  backButton: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", backgroundColor: "rgba(0,0,0,0.3)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontWeight: "700", color: theme.colors.textHi, fontFamily: FONT.uiBold },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sportItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 16, paddingHorizontal: 16, backgroundColor: theme.colors.surface1, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.strokeSoft, marginBottom: 8 },
  sportName: { fontSize: 16, color: theme.colors.textHi, fontFamily: FONT.uiRegular },
  lockedContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  lockedText: { fontSize: 18, fontWeight: "600", color: theme.colors.textHi, marginTop: 16, fontFamily: FONT.uiSemi },
  lockedSubtext: { fontSize: 14, color: theme.colors.textLo, marginTop: 8, fontFamily: FONT.uiRegular },
  upgradeButton: { marginTop: 24, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, backgroundColor: theme.colors.primary600 },
  upgradeButtonText: { fontSize: 16, fontWeight: "600", color: "#06160D", fontFamily: FONT.uiSemi },
});

