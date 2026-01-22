// app/(tabs)/settings/app-preferences/units.tsx
// Units Settings Screen
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../../../constants/theme";
import { useSettings } from "../../../../providers/SettingsContext";
import { LinearGradient } from "expo-linear-gradient";
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

export default function UnitsSettings() {
  const insets = useSafeAreaInsets();
  const { unitsWeight, setUnitsWeight } = useSettings();
  const [geistLoaded] = useGeist({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
  });
  const fontsReady = geistLoaded;

  const [containerWidth, setContainerWidth] = useState(0);

  // Animation for sliding indicator
  const indicatorPosition = useSharedValue(unitsWeight === 'lbs' ? 0 : 1);

  useEffect(() => {
    indicatorPosition.value = withTiming(unitsWeight === 'lbs' ? 0 : 1, {
      duration: 250,
    });
  }, [unitsWeight]);

  const animatedIndicatorStyle = useAnimatedStyle(() => {
    if (containerWidth === 0) return {};
    const segmentWidth = (containerWidth - 8) / 2; // Container width minus padding (4px on each side)
    return {
      transform: [{ translateX: indicatorPosition.value * segmentWidth }],
    };
  });

  if (!fontsReady) {
    return null;
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
        <Text style={styles.headerTitle}>Units</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Weight Units Segmented Control */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weight</Text>
          
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
                { width: containerWidth > 0 ? (containerWidth - 8) / 2 : 0 },
                animatedIndicatorStyle,
              ]}
            />
            
            <Pressable
              style={styles.segment}
              onPress={() => setUnitsWeight('lbs')}
            >
              <Text
                style={[
                  styles.segmentText,
                  unitsWeight === 'lbs' && styles.segmentTextSelected,
                ]}
              >
                lbs
              </Text>
            </Pressable>
            
            <Pressable
              style={styles.segment}
              onPress={() => setUnitsWeight('kg')}
            >
              <Text
                style={[
                  styles.segmentText,
                  unitsWeight === 'kg' && styles.segmentTextSelected,
                ]}
              >
                kg
              </Text>
            </Pressable>
          </View>
        </View>
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
  },
  scrollContent: {
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 16,
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
    marginBottom: 16,
    fontFamily: FONT.uiSemi,
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface1,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    position: "relative",
  },
  segmentIndicator: {
    position: "absolute",
    top: 4,
    left: 4,
    bottom: 4,
    backgroundColor: theme.colors.primary600,
    borderRadius: 8,
    zIndex: 0,
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    zIndex: 1,
  },
  segmentText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.textHi,
    fontFamily: FONT.uiSemi,
  },
  segmentTextSelected: {
    color: "#06160D", // Dark green text on light green background (complementary)
    fontFamily: FONT.uiBold,
  },
});

