// app/(tabs)/settings/support-legal/privacy-policy.tsx
// Privacy Policy (Static Content)
import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { PRIVACY_POLICY_URL } from "../../../../constants/links";
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

export default function PrivacyPolicy() {
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
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.effectiveDate}>
          Effective Date: January 1, 2025{"\n"}
          Last Updated: January 1, 2025
        </Text>
        <Pressable
          onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
          style={styles.viewOnlineRow}
        >
          <Ionicons name="open-outline" size={18} color={theme.colors.primary500} />
          <Text style={styles.viewOnlineText}>View full policy online</Text>
        </Pressable>

        <Text style={styles.introText}>
          This Privacy Policy explains how Potentijal ("we," "us," "our") collects, uses, discloses, and protects information when you use the Potentijal app and related services (the "Service"). By using the Service, you agree to this policy.
        </Text>

        <Text style={styles.sectionTitle}>1. Information We Collect</Text>
        
        <Text style={styles.subsectionTitle}>A) Information You Provide</Text>
        <Text style={styles.contentText}>
          • Account information: email, password (or third-party sign-in such as Apple or Google){"\n"}
          • Sport modes you select (e.g., basketball, lifting, running){"\n"}
          • Training data: workouts, exercises, sets, reps, weight, shooting attempts/made, drill metrics, running distance/pace/time, notes{"\n"}
          • Scheduling and weekly goals{"\n"}
          • Game and practice logs (Premium){"\n"}
          • Data used for the Progress tab: workout and performance history used to generate Progress Graphs, Skill Map, Consistency Score, and Training Statistics{"\n"}
          • AI Trainer messages and prompts (Premium)
        </Text>

        <Text style={styles.subsectionTitle}>B) Information Collected Automatically</Text>
        <Text style={styles.contentText}>
          • Device and app usage data (e.g., app version, crash logs, performance data) to improve stability and fix issues{"\n"}
          • We may use analytics and crash-reporting services to understand how the app is used; you can limit tracking in your device settings. We do not require precise location for core features.
        </Text>

        <Text style={styles.subsectionTitle}>C) Information From Third Parties</Text>
        <Text style={styles.contentText}>
          • Sign-in providers (e.g., Apple, Google) provide account identifiers needed to create and secure your account{"\n"}
          • The app store and our subscription provider share purchase and subscription status so we can grant or remove Premium access{"\n"}
          • AI Trainer responses are generated using third-party AI services; we send relevant context (e.g., your sport modes, workout summaries) solely to produce personalized guidance
        </Text>

        <Text style={styles.sectionTitle}>2. How We Use Information</Text>
        <Text style={styles.contentText}>We use information to:</Text>
        <Text style={styles.bulletPoint}>• Create and manage your account</Text>
        <Text style={styles.bulletPoint}>• Provide sport modes, workout logging, and game/practice logging (Premium)</Text>
        <Text style={styles.bulletPoint}>• Power the Progress tab: Progress Graphs, Skill Map, Consistency Score, and Training Statistics (using your logged workout and performance data)</Text>
        <Text style={styles.bulletPoint}>• Generate streaks, weekly goal tracking, and History</Text>
        <Text style={styles.bulletPoint}>• Provide the AI Trainer (Premium) with context to give personalized guidance</Text>
        <Text style={styles.bulletPoint}>• Maintain security, prevent abuse, and enforce our terms</Text>
        <Text style={styles.bulletPoint}>• Improve app performance, fix bugs, and develop new features</Text>

        <Text style={styles.sectionTitle}>3. AI Trainer and Data Use</Text>
        <Text style={styles.contentText}>
          If you use the AI Trainer (Premium), we process relevant data—such as your sport modes, workouts, games, practices, notes, goals, and history—to generate personalized guidance. That data is sent to our AI service provider only to produce responses and is handled according to our and the provider's data practices. We do not use AI conversations for marketing or to train general-purpose models on your content.
        </Text>
        <Text style={styles.contentText}>
          You should avoid sharing sensitive personal information (e.g., medical details) in AI chats. The AI Trainer is for informational and motivational use only and is not medical or professional advice.
        </Text>

        <Text style={styles.sectionTitle}>4. How We Share Information</Text>
        <Text style={styles.contentText}>We may share information:</Text>
        <Text style={styles.bulletPoint}>• With service providers that help run the app (hosting, databases, analytics, crash reporting)</Text>
        <Text style={styles.bulletPoint}>• With our AI provider to generate AI Trainer responses</Text>
        <Text style={styles.bulletPoint}>• With the app store and subscription provider to confirm subscription status</Text>
        <Text style={styles.bulletPoint}>• If required by law, court order, or to protect safety and rights</Text>
        <Text style={styles.bulletPoint}>• In connection with a merger, acquisition, or sale of assets</Text>
        <Text style={styles.contentText}>
          We do not sell your personal information.
        </Text>

        <Text style={styles.sectionTitle}>5. Data Retention and Deletion</Text>
        <Text style={styles.contentText}>
          We retain your information while your account is active and as needed to provide the Service, resolve disputes, and comply with legal obligations. Workout and training history are stored so you can use features such as Progress Graphs, Skill Map, Consistency Score, Training Statistics, and History.
        </Text>
        <Text style={styles.contentText}>
          You may request deletion of your account and associated personal data at any time through the app (e.g., Settings → Account) or by contacting us. After we process the request, we will delete or anonymize your data in line with our retention practices and applicable law, except where we must retain it for legal or safety reasons.
        </Text>

        <Text style={styles.sectionTitle}>6. Security</Text>
        <Text style={styles.contentText}>
          We use reasonable administrative, technical, and physical safeguards to protect information. However, no system is 100% secure, and we cannot guarantee absolute security.
        </Text>

        <Text style={styles.sectionTitle}>7. Children's Privacy</Text>
        <Text style={styles.contentText}>
          Potentijal is not intended for children under 13. If we learn we collected personal information from a child under 13, we will delete it.
        </Text>

        <Text style={styles.sectionTitle}>8. Your Rights and Choices</Text>
        <Text style={styles.contentText}>
          Depending on your location, you may have rights to:
        </Text>
        <Text style={styles.bulletPoint}>• Access, correct, or delete your data</Text>
        <Text style={styles.bulletPoint}>• Export your data</Text>
        <Text style={styles.bulletPoint}>• Opt out of certain processing (where applicable)</Text>
        <Text style={styles.contentText}>
          To exercise these rights, contact us at the email or address below. We will respond within a reasonable time as required by applicable law.
        </Text>

        <Text style={styles.sectionTitle}>9. International Users</Text>
        <Text style={styles.contentText}>
          The Service may be operated from and your data stored in the United States or other countries where our service providers operate. If you use Potentijal from outside that country, your information may be transferred to and processed in those jurisdictions, which may have different data protection laws. By using the Service, you consent to such transfer and processing.
        </Text>

        <Text style={styles.sectionTitle}>10. Changes to This Policy</Text>
        <Text style={styles.contentText}>
          We may update this Privacy Policy. If changes are material, we will provide notice in the app or by other reasonable means.
        </Text>

        <Text style={styles.sectionTitle}>11. Contact</Text>
        <Text style={styles.contentText}>
          For privacy-related questions, access or deletion requests, or complaints:{"\n\n"}
          Email: lukeidepue@gmail.com
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
    paddingBottom: 40,
  },
  effectiveDate: {
    fontSize: 12,
    color: theme.colors.textLo,
    marginBottom: 8,
    fontFamily: FONT.uiRegular,
  },
  viewOnlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 24,
  },
  viewOnlineText: {
    fontSize: 15,
    color: theme.colors.primary500,
    fontFamily: FONT.uiMedium,
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
  subsectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.textHi,
    marginTop: 16,
    marginBottom: 8,
    fontFamily: FONT.uiSemi,
  },
  contentText: {
    fontSize: 15,
    color: theme.colors.textHi,
    lineHeight: 22,
    marginBottom: 16,
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
});
