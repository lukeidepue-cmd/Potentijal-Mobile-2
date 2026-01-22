// app/(tabs)/settings/support-legal/contact.tsx
// Contact Support Screen
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

export default function ContactSupport() {
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

  const supportEmail = "support@potentijal.app";

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textHi} />
        </Pressable>
        <Text style={styles.headerTitle}>Contact Support</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.introText}>
          Running into something that doesn't look right?
        </Text>
        <Text style={styles.introText}>
          Have a question we didn't cover in Help?
        </Text>
        <Text style={styles.contentText}>
          We're here to help.
        </Text>

        <Text style={styles.sectionTitle}>You can reach us at:</Text>
        
        <Text style={styles.contentText}>
          <Text style={styles.emailText}>{supportEmail}</Text>
          <Text style={styles.placeholderNote}> (placeholder)</Text>
        </Text>

        <Text style={styles.sectionTitle}>When you email us, it helps if you include:</Text>
        
        <Text style={styles.bulletPoint}>• Your username</Text>
        <Text style={styles.bulletPoint}>• What you were trying to do</Text>
        <Text style={styles.bulletPoint}>• What happened instead</Text>
        <Text style={styles.bulletPoint}>• Screenshots, if you have them</Text>

        <Text style={styles.responseTime}>
          We typically respond within 24–48 hours.
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
    // No box styling - matches onboarding screens
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
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.textHi,
    marginBottom: 12,
    fontFamily: FONT.uiSemi,
  },
  contentText: {
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
  emailText: {
    fontSize: 16,
    color: theme.colors.primary600,
    fontFamily: FONT.uiSemi,
  },
  placeholderNote: {
    fontSize: 16,
    color: theme.colors.textLo,
    fontStyle: "italic",
    fontFamily: FONT.uiRegular,
  },
  bulletPoint: {
    fontSize: 15,
    color: theme.colors.textHi,
    lineHeight: 22,
    marginBottom: 8,
    marginLeft: 16,
    fontFamily: FONT.uiRegular,
  },
  responseTime: {
    fontSize: 15,
    color: theme.colors.textLo,
    lineHeight: 22,
    marginTop: 24,
    fontStyle: "italic",
    fontFamily: FONT.uiRegular,
  },
});
