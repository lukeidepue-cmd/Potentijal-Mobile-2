// app/(tabs)/settings/about/credits.tsx
// Credits Screen (Static Content)
import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textHi} />
        </Pressable>
        <Text style={styles.headerTitle}>Credits</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.introText}>
          Potentijal is built using third-party tools and open-source software. We are grateful to the developers and communities that make modern app development possible.
        </Text>

        <Text style={styles.sectionTitle}>Core Technologies</Text>
        <Text style={styles.contentText}>
          • React Native / Expo (mobile framework){"\n"}
          • Expo Router (navigation){"\n"}
          • Supabase (database, authentication, storage){"\n"}
          • [Other SDKs/Packages Placeholder]
        </Text>

        <Text style={styles.sectionTitle}>Icons, Fonts, and Visual Assets</Text>
        <Text style={styles.contentText}>
          • [Icon pack placeholder]{"\n"}
          • [Font licenses placeholder]
        </Text>

        <Text style={styles.sectionTitle}>Food Search / Barcode / Nutrition Data</Text>
        <Text style={styles.contentText}>
          • Food database provider: [FOOD API PLACEHOLDER]{"\n"}
          • Barcode scanning: [BARCODE PROVIDER PLACEHOLDER]
        </Text>

        <Text style={styles.sectionTitle}>Payments and Subscriptions</Text>
        <Text style={styles.contentText}>
          • Subscription provider: [PAYMENT PROVIDER PLACEHOLDER]
        </Text>

        <Text style={styles.sectionTitle}>AI Trainer</Text>
        <Text style={styles.contentText}>
          • AI provider: [AI PROVIDER PLACEHOLDER]
        </Text>

        <Text style={styles.sectionTitle}>Content Moderation</Text>
        <Text style={styles.contentText}>
          • Moderation provider: [MODERATION PROVIDER PLACEHOLDER]
        </Text>

        <Text style={styles.sectionTitle}>Open-Source Licenses</Text>
        <Text style={styles.contentText}>
          Where required by open-source licenses, Potentijal provides attribution and includes applicable license texts.
        </Text>
        <Text style={styles.contentText}>
          Full license list and attributions: [OPEN-SOURCE LICENSE SCREEN / LINK PLACEHOLDER]
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
