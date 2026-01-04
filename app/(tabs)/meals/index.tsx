// app/(tabs)/meals/index.tsx
// Placeholder screen for future feature

import React from "react";
import {
  View,
  Text,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";

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

export default function MealsPlaceholder() {
  const insets = useSafeAreaInsets();
  const [geistLoaded] = useGeist({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
  });
  const fontsReady = geistLoaded;

  if (!fontsReady) {
    return null;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Ionicons 
          name="hourglass-outline" 
          size={64} 
          color={theme.colors.textLo} 
          style={styles.icon}
        />
        <Text style={styles.title}>Coming Soon</Text>
        <Text style={styles.subtitle}>
          This feature is under development. Check back soon!
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg0,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  icon: {
    marginBottom: 24,
    opacity: 0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.colors.textHi,
    marginBottom: 12,
    fontFamily: FONT.uiBold,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textLo,
    textAlign: "center",
    fontFamily: FONT.uiRegular,
    lineHeight: 24,
  },
});

