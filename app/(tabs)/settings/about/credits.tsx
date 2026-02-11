// app/(tabs)/settings/about/credits.tsx
// Credits Screen — third-party and open-source attribution for Potentijal
import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../../../../constants/theme";

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

export default function Credits() {
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
      <LinearGradient
        colors={["#1A4A3A", "rgba(18, 48, 37, 0.5)", "transparent", theme.colors.bg0]}
        locations={[0, 0.2, 0.4, 0.7]}
        style={styles.gradientBackground}
      />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={10}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.textHi} />
        </Pressable>
        <Text style={styles.headerTitle}>Credits</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}>
        <Text style={styles.introText}>
          Potentijal is a multi-sport athlete development app that helps you track training, games, practices, and progress. It is built with third-party tools and open-source software. We are grateful to the developers and communities that make this possible.
        </Text>

        <Text style={styles.sectionTitle}>Core Technologies</Text>
        <Text style={styles.contentText}>
          • React Native & Expo (mobile framework){"\n"}
          • Expo Router (file-based navigation){"\n"}
          • React Navigation (tabs and stack){"\n"}
          • Supabase (database, authentication, storage, and edge functions)
        </Text>

        <Text style={styles.sectionTitle}>Progress Tab & Charts</Text>
        <Text style={styles.contentText}>
          The Progress tab (Progress Graphs, Skill Map, Consistency Score, Training Statistics) uses:{"\n"}
          • react-native-svg (charts and graph rendering){"\n"}
          • react-native-reanimated (animations){"\n"}
          • react-native-gesture-handler (interactions)
        </Text>

        <Text style={styles.sectionTitle}>Icons and Fonts</Text>
        <Text style={styles.contentText}>
          • @expo/vector-icons — Ionicons, Material Community Icons{"\n"}
          • expo-symbols — SF Symbols on iOS{"\n"}
          • Geist — UI typography (Google Fonts / Vercel){"\n"}
          • Space Grotesk — display typography (Google Fonts)
        </Text>

        <Text style={styles.sectionTitle}>Subscriptions</Text>
        <Text style={styles.contentText}>
          • RevenueCat (react-native-purchases) — in-app subscriptions and Premium entitlement management
        </Text>

        <Text style={styles.sectionTitle}>AI Trainer</Text>
        <Text style={styles.contentText}>
          • OpenAI — AI-powered training guidance (used via Supabase Edge Functions; see Privacy Policy for data handling)
        </Text>

        <Text style={styles.sectionTitle}>Analytics</Text>
        <Text style={styles.contentText}>
          • PostHog — product analytics (privacy-respecting; see Privacy Policy)
        </Text>

        <Text style={styles.sectionTitle}>Open-Source Licenses</Text>
        <Text style={styles.contentText}>
          Where required by open-source licenses, Potentijal provides attribution and complies with applicable terms. Full license texts for dependencies are available from the respective projects (e.g. npm, GitHub) or in the app repository.
        </Text>
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
  backButton: {},
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
  },
  introText: {
    fontSize: 16,
    color: theme.colors.textHi,
    lineHeight: 24,
    marginBottom: 24,
    fontFamily: FONT.uiRegular,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.textHi,
    marginTop: 24,
    marginBottom: 12,
    fontFamily: FONT.uiBold,
  },
  contentText: {
    fontSize: 15,
    color: theme.colors.textHi,
    lineHeight: 22,
    marginBottom: 16,
    fontFamily: FONT.uiRegular,
  },
});
