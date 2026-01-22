// app/(tabs)/settings/ai-trainer/index.tsx
// AI Trainer Settings (Premium)
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, ActivityIndicator, Alert, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/constants/theme";
import { useFeatures } from "@/hooks/useFeatures";
import { getAITrainerSettings, updateAITrainerSettings, clearAIMemory } from "@/lib/api/settings";
import UpgradeModal from "@/components/UpgradeModal";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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

export default function AITrainerSettings() {
  const insets = useSafeAreaInsets();
  const { isPremium, isCreator } = useFeatures();
  const [geistLoaded] = useGeist({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
  });
  const fontsReady = geistLoaded;

  const [loading, setLoading] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [settings, setSettings] = useState({
    enabled: true,
    personality: 'balanced' as 'strict' | 'balanced' | 'supportive',
    data_access_permissions: {
      use_workouts: true,
      use_games: true,
      use_practices: true,
    },
    persistent_memory_enabled: true,
  });

  const [containerWidth, setContainerWidth] = useState(0);
  const indicatorPosition = useSharedValue(settings.personality === 'strict' ? 0 : settings.personality === 'balanced' ? 1 : 2);

  useEffect(() => {
    if (isPremium || isCreator) {
      loadSettings();
    } else {
      setLoading(false);
    }
  }, [isPremium, isCreator]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data } = await getAITrainerSettings();
      if (data) {
        setSettings({
          enabled: data.enabled,
          personality: data.personality,
          data_access_permissions: data.data_access_permissions,
          persistent_memory_enabled: data.persistent_memory_enabled,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const personalityIndex = settings.personality === 'strict' ? 0 : settings.personality === 'balanced' ? 1 : 2;
    indicatorPosition.value = withTiming(personalityIndex, {
      duration: 250,
    });
  }, [settings.personality]);

  const animatedIndicatorStyle = useAnimatedStyle(() => {
    if (containerWidth === 0) return {};
    const segmentWidth = (containerWidth - 8) / 3;
    return {
      transform: [{ translateX: indicatorPosition.value * segmentWidth }],
    };
  });

  const updateSetting = async (key: string, value: any) => {
    // Optimistic update for instant feedback
    setSettings(prev => ({ ...prev, [key]: value }));
    
    const updates = { [key]: value };
    const { error } = await updateAITrainerSettings(updates);
    if (error) {
      Alert.alert("Error", "Failed to update setting");
      loadSettings();
    }
  };

  if (!fontsReady) {
    return null;
  }

  if (!isPremium && !isCreator) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={["#1A4A3A", "rgba(18, 48, 37, 0.5)", "transparent", theme.colors.bg0]}
          locations={[0, 0.2, 0.4, 0.7]}
          style={styles.gradientBackground}
        />
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={{ width: 40, alignItems: "flex-start" }}>
            <Ionicons name="chevron-back" size={20} color={theme.colors.textHi} />
          </Pressable>
          <Text style={styles.headerTitle}>AI Trainer Settings</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.lockedContainer}>
          <Ionicons name="lock-closed" size={64} color={theme.colors.textLo} />
          <Text style={styles.lockedText}>Premium Feature</Text>
          <Text style={styles.lockedSubtext}>Upgrade to access AI Trainer settings</Text>
          <Pressable style={styles.upgradeButton} onPress={() => setShowUpgrade(true)}>
            <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
          </Pressable>
        </View>
        <UpgradeModal visible={showUpgrade} onClose={() => setShowUpgrade(false)} />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
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
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ width: 40, alignItems: "flex-start" }}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.textHi} />
        </Pressable>
        <Text style={styles.headerTitle}>AI Trainer Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Enable AI Trainer Card */}
        <View style={styles.notificationCard}>
          <View style={styles.cardContent}>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>Enable AI Trainer</Text>
              <Text style={styles.cardDescription}>
                Turn on the AI Trainer to get personalized coaching and insights
              </Text>
            </View>
            <View style={styles.switchContainer}>
              <Switch
                value={settings.enabled}
                onValueChange={(v) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateSetting('enabled', v);
                }}
                trackColor={{ false: "#767577", true: theme.colors.primary600 }}
                thumbColor="#fff"
                ios_backgroundColor="#767577"
                style={styles.switch}
              />
            </View>
          </View>
        </View>

        {settings.enabled && (
          <>
            {/* Access to Workouts Card */}
            <View style={styles.notificationCard}>
              <View style={styles.cardContent}>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>Access to Workouts</Text>
                  <Text style={styles.cardDescription}>
                    Allow AI Trainer to analyze your workout data for better insights
                  </Text>
                </View>
                <View style={styles.switchContainer}>
                  <Switch
                    value={settings.data_access_permissions.use_workouts}
                    onValueChange={(v) => updateSetting('data_access_permissions', { ...settings.data_access_permissions, use_workouts: v })}
                    trackColor={{ false: "#767577", true: theme.colors.primary600 }}
                    thumbColor="#fff"
                    ios_backgroundColor="#767577"
                    style={styles.switch}
                  />
                </View>
              </View>
            </View>

            {/* Access to Games Card */}
            <View style={styles.notificationCard}>
              <View style={styles.cardContent}>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>Access to Games</Text>
                  <Text style={styles.cardDescription}>
                    Allow AI Trainer to analyze your game performance and statistics
                  </Text>
                </View>
                <View style={styles.switchContainer}>
                  <Switch
                    value={settings.data_access_permissions.use_games}
                    onValueChange={(v) => updateSetting('data_access_permissions', { ...settings.data_access_permissions, use_games: v })}
                    trackColor={{ false: "#767577", true: theme.colors.primary600 }}
                    thumbColor="#fff"
                    ios_backgroundColor="#767577"
                    style={styles.switch}
                  />
                </View>
              </View>
            </View>

            {/* Access to Practices Card */}
            <View style={styles.notificationCard}>
              <View style={styles.cardContent}>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>Access to Practices</Text>
                  <Text style={styles.cardDescription}>
                    Allow AI Trainer to analyze your practice sessions and training data
                  </Text>
                </View>
                <View style={styles.switchContainer}>
                  <Switch
                    value={settings.data_access_permissions.use_practices}
                    onValueChange={(v) => updateSetting('data_access_permissions', { ...settings.data_access_permissions, use_practices: v })}
                    trackColor={{ false: "#767577", true: theme.colors.primary600 }}
                    thumbColor="#fff"
                    ios_backgroundColor="#767577"
                    style={styles.switch}
                  />
                </View>
              </View>
            </View>

            {/* Trainer Personality Segmented Control */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Trainer Personality</Text>
              
              <View
                style={styles.segmentedControl}
                onLayout={(event) => {
                  const { width } = event.nativeEvent.layout;
                  setContainerWidth(width);
                }}
              >
                {/* Animated Indicator */}
                <Animated.View
                  style={[
                    styles.segmentIndicator,
                    { width: containerWidth > 0 ? (containerWidth - 8) / 3 : 0 },
                    animatedIndicatorStyle,
                  ]}
                />
                
                <Pressable
                  style={styles.segment}
                  onPress={() => updateSetting('personality', 'strict')}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      settings.personality === 'strict' && styles.segmentTextSelected,
                    ]}
                  >
                    Strict
                  </Text>
                </Pressable>
                
                <Pressable
                  style={styles.segment}
                  onPress={() => updateSetting('personality', 'balanced')}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      settings.personality === 'balanced' && styles.segmentTextSelected,
                    ]}
                  >
                    Balanced
                  </Text>
                </Pressable>
                
                <Pressable
                  style={styles.segment}
                  onPress={() => updateSetting('personality', 'supportive')}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      settings.personality === 'supportive' && styles.segmentTextSelected,
                    ]}
                  >
                    Supportive
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Clear AI Memory Button */}
            <Pressable
              style={styles.clearButton}
              onPress={() => {
                Alert.alert("Clear Memory", "This will clear all AI memory. Continue?", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Clear",
                    style: "destructive",
                    onPress: async () => {
                      const { error } = await clearAIMemory();
                      if (error) Alert.alert("Error", "Failed to clear memory");
                      else Alert.alert("Success", "AI memory cleared");
                    },
                  },
                ]);
              }}
            >
              <Text style={styles.clearButtonText}>Clear AI Memory</Text>
            </Pressable>
          </>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  notificationCard: {
    backgroundColor: theme.colors.surface1,
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
  },
  cardText: {
    flex: 1,
    marginRight: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.textHi,
    fontFamily: FONT.uiSemi,
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 14,
    color: theme.colors.textLo,
    fontFamily: FONT.uiRegular,
    lineHeight: 20,
  },
  switchContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  switch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  section: {
    marginBottom: 32,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textLo,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
    marginTop: 4,
    fontFamily: FONT.uiSemi,
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface1,
    borderRadius: 12,
    padding: 4,
    position: "relative",
  },
  segmentIndicator: {
    position: "absolute",
    top: 4,
    bottom: 4,
    backgroundColor: theme.colors.primary600,
    borderRadius: 8,
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  segmentText: {
    fontSize: 16,
    color: theme.colors.textHi,
    fontFamily: FONT.uiRegular,
  },
  segmentTextSelected: {
    color: "#06160D",
    fontFamily: FONT.uiSemi,
    fontWeight: "600",
  },
  clearButton: {
    backgroundColor: theme.colors.danger,
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    fontFamily: FONT.uiSemi,
  },
});

