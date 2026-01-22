// app/(tabs)/settings/sports-training/my-sports.tsx
// My Sports Settings Screen
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../../../constants/theme";
import { getUserSports, reorderSports } from "../../../../lib/api/settings";
import { Alert } from "react-native";
import { useMode } from "../../../../providers/ModeContext";
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const SPORT_NAMES: Record<string, string> = {
  workout: "Workout",
  basketball: "Basketball",
  football: "Football",
  baseball: "Baseball",
  soccer: "Soccer",
  hockey: "Hockey",
  tennis: "Tennis",
  running: "Running",
};

export default function MySportsSettings() {
  const insets = useSafeAreaInsets();
  const { setMode } = useMode();
  const [geistLoaded] = useGeist({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
  });
  const fontsReady = geistLoaded;

  const [loading, setLoading] = useState(true);
  const [sports, setSports] = useState<string[]>([]);

  useEffect(() => {
    loadSports();
  }, []);

  const loadSports = async () => {
    setLoading(true);
    try {
      const { data, error } = await getUserSports();
      if (data) {
        setSports(data);
      }
    } catch (error) {
      console.error('Error loading sports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetPrimary = async (sport: string) => {
    try {
      // Reorder sports array with the selected sport as primary (first in array)
      const reorderedSports = [sport, ...sports.filter(s => s !== sport)];
      const { error } = await reorderSports(reorderedSports, sport);
      if (error) {
        console.error('Error setting primary sport:', error);
        Alert.alert("Error", error.message || "Failed to set primary sport");
      } else {
        // Update mode context immediately
        const sportMap: Record<string, "lifting" | "basketball" | "football" | "baseball" | "soccer" | "hockey" | "tennis"> = {
          workout: "lifting",
          lifting: "lifting",
          basketball: "basketball",
          football: "football",
          baseball: "baseball",
          soccer: "soccer",
          hockey: "hockey",
          tennis: "tennis",
        };
        const newMode = sportMap[sport.toLowerCase()] || "lifting";
        setMode(newMode);
        
        // Reload sports to reflect the change
        await loadSports();
        Alert.alert("Success", `${SPORT_NAMES[sport] || sport} is now your primary sport. Restart the app to see it on the home tab.`);
      }
    } catch (error: any) {
      console.error('Exception setting primary sport:', error);
      Alert.alert("Error", error.message || "Failed to set primary sport");
    }
  };

  if (!fontsReady || loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        {/* Gradient Background */}
        <LinearGradient
          colors={["#1A4A3A", "rgba(18, 48, 37, 0.5)", "transparent", theme.colors.bg0]}
          locations={[0, 0.2, 0.4, 0.7]}
          style={styles.gradientBackground}
        />
        <ActivityIndicator size="large" color={theme.colors.primary600} />
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
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={20} color={theme.colors.textHi} />
        </Pressable>
        <Text style={styles.headerTitle}>My Sports</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Sports List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {sports.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Image
              source={require("../../../../assets/empty-star.png")}
              style={styles.emptyStar}
              resizeMode="contain"
            />
            <Text style={styles.emptyText}>No sports selected</Text>
          </View>
        ) : (
          sports.map((sport, index) => (
            <View key={sport} style={styles.sportCard}>
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
                <View style={styles.sportInfo}>
                  <Text style={styles.sportNumber}>{index + 1}</Text>
                  <Text style={styles.sportName}>{SPORT_NAMES[sport] || sport}</Text>
                  {index === 0 && (
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryBadgeText}>Primary</Text>
                    </View>
                  )}
                </View>
                {index !== 0 && (
                  <Pressable
                    style={styles.setPrimaryButton}
                    onPress={() => handleSetPrimary(sport)}
                  >
                    <Text style={styles.setPrimaryButtonText}>Set Primary</Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))
        )}
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
    height: 360, // Extended from 320 to go farther down
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8, // Moved up by reducing padding
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
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 400,
    paddingVertical: 60,
  },
  emptyStar: {
    width: 182,
    height: 182,
    marginBottom: -30,
  },
  emptyText: {
    fontSize: 26,
    color: theme.colors.textLo,
    fontFamily: FONT.uiSemi,
  },
  sportCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20, // More spacing between cards
    height: 96, // Bigger card height
    borderRadius: 24, // Premium feel
    backgroundColor: theme.colors.surface1,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)", // Subtle border for edge definition
    position: "relative",
    // Enhanced floating effects with depth
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 }, // Stronger offset for lift
    shadowOpacity: 0.35, // Strong shadow for depth
    shadowRadius: 22, // Larger radius for soft spread
    elevation: 12, // Android elevation
    overflow: "hidden", // For gradient clipping
  },
  cardContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 20,
    zIndex: 10, // Above gradient layers
  },
  sportInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  sportNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.primary600,
    fontFamily: FONT.uiBold,
    width: 24,
  },
  sportName: {
    fontSize: 16,
    color: theme.colors.textHi,
    fontFamily: FONT.uiSemi,
  },
  primaryBadge: {
    backgroundColor: theme.colors.primary600 + "20",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 4,
  },
  primaryBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: theme.colors.primary600,
    fontFamily: FONT.uiSemi,
    textTransform: "uppercase",
  },
  setPrimaryButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: theme.colors.surface2,
    borderWidth: 1,
    borderColor: theme.colors.strokeSoft,
  },
  setPrimaryButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textHi,
    fontFamily: FONT.uiSemi,
  },
});

