// app/(tabs)/settings/support-legal/privacy-policy.tsx
// Privacy Policy (Static Content)
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
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textHi} />
        </Pressable>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.effectiveDate}>
          Effective Date: [DATE PLACEHOLDER]{"\n"}
          Last Updated: [DATE PLACEHOLDER]
        </Text>

        <Text style={styles.introText}>
          This Privacy Policy explains how [COMPANY/DEVELOPER LEGAL NAME PLACEHOLDER] ("Potentijal," "we," "us," "our") collects, uses, discloses, and protects information when you use the Potentijal app and services (the "Service").
        </Text>

        <Text style={styles.sectionTitle}>1. Information We Collect</Text>
        
        <Text style={styles.subsectionTitle}>A) Information You Provide</Text>
        <Text style={styles.contentText}>
          • Account information: email, username, display name, password (or third-party sign-in token){"\n"}
          • Sport selections (sport modes){"\n"}
          • Training logs: workouts, exercises, sets, reps, weight, shooting attempts/made, drill metrics, running distance/pace/time, notes{"\n"}
          • Scheduling entries and weekly goals{"\n"}
          • Game and practice logs (Premium){"\n"}
          • Nutrition logs: meals, servings, macro totals, burned calories, macro goals{"\n"}
          • Profile data: bio, profile picture, highlights (Premium){"\n"}
          • Social data: follows/followers, creator-related interactions{"\n"}
          • AI Trainer messages and prompts (Premium)
        </Text>

        <Text style={styles.subsectionTitle}>B) Information Collected Automatically</Text>
        <Text style={styles.contentText}>
          • Device and app usage data (e.g., app version, crash logs, performance data){"\n"}
          • Approximate location may be collected by platform services depending on device settings (we do not require precise location by default){"\n"}
          • Analytics tooling: [ANALYTICS PLACEHOLDER INFORMATION]
        </Text>

        <Text style={styles.subsectionTitle}>C) Information From Third Parties</Text>
        <Text style={styles.contentText}>
          • Apple/Google sign-in providers (basic account identifiers){"\n"}
          • Payment providers / app marketplaces for subscription status{"\n"}
          • Food API providers for food search/macros{"\n"}
          • Content moderation providers for filtering inappropriate images/videos{"\n"}
          • AI model/API providers for AI Trainer responses{"\n"}
          • Third-party providers list: [THIRD-PARTY PROVIDERS PLACEHOLDER INFORMATION]
        </Text>

        <Text style={styles.sectionTitle}>2. How We Use Information</Text>
        <Text style={styles.contentText}>We use information to:</Text>
        <Text style={styles.bulletPoint}>• Create and manage accounts</Text>
        <Text style={styles.bulletPoint}>• Provide sport mode features and training/nutrition tracking</Text>
        <Text style={styles.bulletPoint}>• Generate progress graphs, streaks, goal updates, and history archives</Text>
        <Text style={styles.bulletPoint}>• Provide Premium features (AI Trainer, games/practices, highlights, etc.)</Text>
        <Text style={styles.bulletPoint}>• Personalize the experience based on logged data and sport modes</Text>
        <Text style={styles.bulletPoint}>• Maintain safety, prevent abuse, and enforce policies</Text>
        <Text style={styles.bulletPoint}>• Improve performance, debugging, and feature quality</Text>

        <Text style={styles.sectionTitle}>3. AI Trainer and Data Use</Text>
        <Text style={styles.contentText}>
          If you use the AI Trainer, we process relevant account/log data to generate context-aware guidance. This may include your sports, workouts, nutrition entries, notes, goals, and history.
        </Text>
        <Text style={styles.contentText}>
          AI provider + retention policy: [AI TRAINER PROVIDER/RETENTION PLACEHOLDER INFORMATION]
        </Text>
        <Text style={styles.contentText}>
          You should avoid sharing sensitive personal information in AI chats (e.g., medical records). The AI Trainer is not medical advice.
        </Text>

        <Text style={styles.sectionTitle}>4. How We Share Information</Text>
        <Text style={styles.contentText}>We may share information:</Text>
        <Text style={styles.bulletPoint}>• With service providers who help run the app (hosting, databases, analytics, crash reporting)</Text>
        <Text style={styles.bulletPoint}>• With AI providers (Premium) to generate responses</Text>
        <Text style={styles.bulletPoint}>• With payment platforms to confirm subscription status</Text>
        <Text style={styles.bulletPoint}>• With moderation providers to detect inappropriate content</Text>
        <Text style={styles.bulletPoint}>• If required by law, subpoena, or to protect safety and rights</Text>
        <Text style={styles.bulletPoint}>• In a business transfer (merger, acquisition, asset sale)</Text>
        <Text style={styles.contentText}>
          We do not sell your personal information.
        </Text>

        <Text style={styles.sectionTitle}>5. Social Features and Visibility</Text>
        <Text style={styles.contentText}>Depending on your settings and usage:</Text>
        <Text style={styles.bulletPoint}>• Your profile (display name, username, profile picture, bio) may be visible to other users</Text>
        <Text style={styles.bulletPoint}>• Highlights (Premium) may be visible to others</Text>
        <Text style={styles.bulletPoint}>• Followers/following counts may be visible</Text>
        <Text style={styles.bulletPoint}>• Creator accounts may display special indicators</Text>
        <Text style={styles.contentText}>
          Privacy controls: [PRIVACY CONTROLS PLACEHOLDER INFORMATION]
        </Text>

        <Text style={styles.sectionTitle}>6. Data Retention</Text>
        <Text style={styles.contentText}>
          We retain your information as long as necessary to provide the Service and comply with legal obligations. Workout history, nutrition history, and related metrics are stored so you can view long-term progress.
        </Text>
        <Text style={styles.contentText}>
          Retention and deletion mechanics: [DATA DELETION PLACEHOLDER INFORMATION]
        </Text>

        <Text style={styles.sectionTitle}>7. Security</Text>
        <Text style={styles.contentText}>
          We use reasonable administrative, technical, and physical safeguards to protect information. However, no system is 100% secure, and we cannot guarantee absolute security.
        </Text>

        <Text style={styles.sectionTitle}>8. Children's Privacy</Text>
        <Text style={styles.contentText}>
          Potentijal is not intended for children under 13. If we learn we collected personal information from a child under 13, we will delete it.
        </Text>

        <Text style={styles.sectionTitle}>9. Your Rights and Choices</Text>
        <Text style={styles.contentText}>
          Depending on your location, you may have rights to:
        </Text>
        <Text style={styles.bulletPoint}>• Access, correct, or delete your data</Text>
        <Text style={styles.bulletPoint}>• Export your data</Text>
        <Text style={styles.bulletPoint}>• Opt out of certain processing (where applicable)</Text>
        <Text style={styles.contentText}>
          Requests can be sent to: [SUPPORT EMAIL PLACEHOLDER]
        </Text>

        <Text style={styles.sectionTitle}>10. International Users</Text>
        <Text style={styles.contentText}>
          If you use Potentijal outside the country where our servers are located, your information may be transferred and processed in other jurisdictions.
        </Text>
        <Text style={styles.contentText}>
          Hosting region: [HOSTING REGION PLACEHOLDER INFORMATION]
        </Text>

        <Text style={styles.sectionTitle}>11. Changes to This Policy</Text>
        <Text style={styles.contentText}>
          We may update this Privacy Policy. If changes are material, we will provide notice in the app or by other reasonable means.
        </Text>

        <Text style={styles.sectionTitle}>12. Contact</Text>
        <Text style={styles.contentText}>
          Email: [SUPPORT EMAIL PLACEHOLDER]{"\n"}
          Address: [BUSINESS ADDRESS PLACEHOLDER]
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
  effectiveDate: {
    fontSize: 12,
    color: theme.colors.textLo,
    marginBottom: 24,
    fontFamily: FONT.uiRegular,
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
