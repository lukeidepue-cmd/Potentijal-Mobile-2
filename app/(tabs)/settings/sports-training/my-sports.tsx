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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../../../constants/theme";
import { getUserSports, reorderSports } from "../../../../lib/api/settings";
import { Alert } from "react-native";
import { useMode } from "../../../../providers/ModeContext";

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
        <ActivityIndicator size="large" color={theme.colors.primary600} />
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
        <Text style={styles.headerTitle}>My Sports</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {sports.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="basketball-outline" size={64} color={theme.colors.textLo} />
            <Text style={styles.emptyText}>No sports selected</Text>
            <Text style={styles.emptySubtext}>
              Add sports from the "Add Sports" section
            </Text>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Sports</Text>
            {sports.map((sport, index) => (
              <View key={sport} style={styles.sportItem}>
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
            ))}
            <Text style={styles.helpText}>
              Drag to reorder (coming soon). Primary sport determines default home screen.
            </Text>
          </View>
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
    padding: 16,
    paddingBottom: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    minHeight: 400,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.textHi,
    marginTop: 16,
    fontFamily: FONT.uiSemi,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textLo,
    marginTop: 8,
    textAlign: "center",
    fontFamily: FONT.uiRegular,
  },
  section: {
    marginBottom: 32,
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
  sportItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.surface1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.strokeSoft,
    marginBottom: 8,
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
    fontFamily: FONT.uiRegular,
  },
  primaryBadge: {
    backgroundColor: theme.colors.primary600 + "20",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  primaryBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: theme.colors.primary600,
    fontFamily: FONT.uiSemi,
    textTransform: "uppercase",
  },
  setPrimaryButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
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
  helpText: {
    fontSize: 12,
    color: theme.colors.textLo,
    marginTop: 12,
    fontFamily: FONT.uiRegular,
    fontStyle: "italic",
  },
});

