// app/(tabs)/settings/support-legal/terms.tsx
// Terms of Service (Static Content)
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

export default function Terms() {
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
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.effectiveDate}>
          Effective Date: [DATE PLACEHOLDER]{"\n"}
          Last Updated: [DATE PLACEHOLDER]
        </Text>

        <Text style={styles.introText}>
          These Terms of Service ("Terms") govern your access to and use of the Potentijal mobile application and related services (collectively, the "Service"). The Service is operated by [COMPANY/DEVELOPER LEGAL NAME PLACEHOLDER] ("Potentijal," "we," "us," or "our"). By creating an account, accessing, or using the Service, you agree to these Terms.
        </Text>

        <Text style={styles.sectionTitle}>1. Eligibility</Text>
        <Text style={styles.contentText}>
          You must be at least 13 years old to use the Service. If you are under the age of majority in your jurisdiction, you may use the Service only with the consent of a parent or legal guardian.
        </Text>

        <Text style={styles.sectionTitle}>2. Accounts and Authentication</Text>
        <Text style={styles.contentText}>
          To use certain features, you must create an account. You agree to provide accurate information and keep it updated. You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account.
        </Text>
        <Text style={styles.contentText}>
          Potentijal may support third-party login providers (e.g., Apple, Google). Your use of those sign-in methods is also subject to the provider's terms.
        </Text>

        <Text style={styles.sectionTitle}>3. The Service and Sport Modes</Text>
        <Text style={styles.contentText}>
          Potentijal is a multi-sport athlete development app designed to help athletes track training, nutrition, performance, and progress trends. The Service includes sport modes (e.g., strength training, running, basketball, football, baseball, soccer, hockey, tennis). Features may vary by mode and subscription tier.
        </Text>
        <Text style={styles.contentText}>
          Some features are Premium-only, including (but not limited to): AI Trainer, game/practice logging, highlights uploading, creator tools, expanded sport access, and deeper analytics.
        </Text>

        <Text style={styles.sectionTitle}>4. Health and Training Disclaimer</Text>
        <Text style={styles.contentText}>
          Potentijal provides tools for logging and visualizing training and athletic performance. Potentijal is not a medical device and does not provide medical advice. Any training guidance or AI-generated outputs are provided for informational purposes only.
        </Text>
        <Text style={styles.contentText}>
          You should consult a qualified professional before beginning any exercise, training, diet, or recovery program, especially if you have any injury, condition, or limitation. You assume full responsibility for your training decisions and outcomes.
        </Text>

        <Text style={styles.sectionTitle}>5. User Content</Text>
        <Text style={styles.contentText}>
          You may be able to submit content such as workouts, exercise names, notes, game/practice entries, nutrition entries, profile text, and highlights ("User Content").
        </Text>
        <Text style={styles.contentText}>
          You retain ownership of your User Content. However, you grant Potentijal a worldwide, non-exclusive, royalty-free license to host, store, reproduce, display, and process your User Content solely for the purpose of operating, improving, and providing the Service (including generating progress graphs, streaks, personalization, and AI Trainer responses).
        </Text>

        <Text style={styles.sectionTitle}>6. Prohibited Conduct</Text>
        <Text style={styles.contentText}>You agree not to:</Text>
        <Text style={styles.bulletPoint}>• Use the Service for illegal purposes</Text>
        <Text style={styles.bulletPoint}>• Attempt to gain unauthorized access to systems or accounts</Text>
        <Text style={styles.bulletPoint}>• Upload content that is unlawful, abusive, harassing, hateful, sexually explicit, or otherwise inappropriate</Text>
        <Text style={styles.bulletPoint}>• Upload highlights or profile media that violate law or infringe intellectual property rights</Text>
        <Text style={styles.bulletPoint}>• Reverse engineer, scrape, or misuse the Service in a manner that disrupts operations</Text>
        <Text style={styles.contentText}>
          We may remove content and/or suspend accounts that violate these Terms.
        </Text>

        <Text style={styles.sectionTitle}>7. Premium Subscriptions, Billing, and Discounts</Text>
        <Text style={styles.contentText}>
          Premium features may require a paid subscription. Pricing, billing frequency, renewal terms, and cancellation methods will be displayed at purchase time and managed through the platform marketplace (e.g., Apple App Store / Google Play) or another processor.
        </Text>
        <Text style={styles.contentText}>
          Creator/discount codes: Potentijal may offer promotional codes (e.g., percentage discounts). Codes are subject to eligibility rules and may expire or change.
        </Text>
        <Text style={styles.contentText}>
          Payment & billing implementation: [PAYMENT SYSTEM PLACEHOLDER INFORMATION]
        </Text>

        <Text style={styles.sectionTitle}>8. Creator Accounts and Codes</Text>
        <Text style={styles.contentText}>
          Potentijal may offer "Creator" program features, including creator identification, access to creator tools, and/or premium benefits unlocked by a valid code.
        </Text>
        <Text style={styles.contentText}>
          Creator code issuance/administration: [CREATOR CODE SYSTEM PLACEHOLDER INFORMATION]
        </Text>
        <Text style={styles.contentText}>
          We reserve the right to modify or revoke creator status and associated benefits if misuse or policy violations occur.
        </Text>

        <Text style={styles.sectionTitle}>9. Content Moderation</Text>
        <Text style={styles.contentText}>
          Potentijal may use automated and/or human review to help enforce content rules and prevent inappropriate content in profile pictures and highlights.
        </Text>
        <Text style={styles.contentText}>
          Moderation tooling: [CONTENT MODERATION PLACEHOLDER INFORMATION]
        </Text>

        <Text style={styles.sectionTitle}>10. Intellectual Property</Text>
        <Text style={styles.contentText}>
          The Service, including its design, software, logos, trademarks, and related materials, are owned by Potentijal or its licensors and are protected by intellectual property laws. You may not copy, modify, distribute, or create derivative works except as explicitly permitted.
        </Text>

        <Text style={styles.sectionTitle}>11. Service Availability and Changes</Text>
        <Text style={styles.contentText}>
          We may modify, suspend, or discontinue any part of the Service at any time, including features, sport modes, or subscription tiers. We may also impose limits on usage to maintain stability and performance.
        </Text>

        <Text style={styles.sectionTitle}>12. Termination</Text>
        <Text style={styles.contentText}>
          You may stop using the Service at any time. We may suspend or terminate access if you violate these Terms or if we reasonably believe your use poses risk to the Service or other users.
        </Text>

        <Text style={styles.sectionTitle}>13. Disclaimers</Text>
        <Text style={styles.contentText}>
          THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE." TO THE MAXIMUM EXTENT PERMITTED BY LAW, POTENTIJAL DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING FITNESS FOR A PARTICULAR PURPOSE, MERCHANTABILITY, AND NON-INFRINGEMENT.
        </Text>

        <Text style={styles.sectionTitle}>14. Limitation of Liability</Text>
        <Text style={styles.contentText}>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, POTENTIJAL WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF DATA, PROFITS, OR REVENUE, ARISING FROM OR RELATED TO YOUR USE OF THE SERVICE.
        </Text>
        <Text style={styles.contentText}>
          TOTAL LIABILITY FOR ANY CLAIM WILL NOT EXCEED THE AMOUNT YOU PAID TO POTENTIJAL FOR THE SERVICE IN THE 12 MONTHS BEFORE THE CLAIM, OR $100 IF YOU PAID NOTHING.
        </Text>

        <Text style={styles.sectionTitle}>15. Governing Law</Text>
        <Text style={styles.contentText}>
          These Terms are governed by the laws of [GOVERNING LAW / STATE / COUNTRY PLACEHOLDER], without regard to conflict-of-laws principles.
        </Text>

        <Text style={styles.sectionTitle}>16. Changes to These Terms</Text>
        <Text style={styles.contentText}>
          We may update these Terms from time to time. If changes are material, we will provide notice within the Service or by other reasonable means. Continued use after changes means you accept the updated Terms.
        </Text>

        <Text style={styles.sectionTitle}>17. Contact</Text>
        <Text style={styles.contentText}>
          Questions about these Terms can be sent to:{"\n"}
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
