// app/(tabs)/settings/support-legal/terms.tsx
// Terms of Service (Static Content)
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
      <LinearGradient
        colors={["#1A4A3A", "rgba(18, 48, 37, 0.5)", "transparent", theme.colors.bg0]}
        locations={[0, 0.2, 0.4, 0.7]}
        style={styles.gradientBackground}
      />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={10}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.textHi} />
        </Pressable>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.effectiveDate}>
          Effective Date: January 1, 2026{"\n"}
          Last Updated: January 1, 2026
        </Text>

        <Text style={styles.introText}>
          These Terms of Service ("Terms") govern your access to and use of the Potentijal mobile application available on the Apple App Store and Google Play Store (the "App") and related services (collectively, the "Service"). The Service is operated by Potentijal ("we," "us," or "our"). By downloading, installing, or using the App, you accept and agree to these Terms. If you do not agree, do not use the Service. These Terms should be read alongside our Privacy Policy.
        </Text>

        <Text style={styles.sectionTitle}>1. Eligibility</Text>
        <Text style={styles.contentText}>
          You must be at least 13 years old to use the Service. If you are under the age of majority in your jurisdiction, you may use the Service only with the consent of a parent or legal guardian.
        </Text>

        <Text style={styles.sectionTitle}>2. Accounts and Authentication</Text>
        <Text style={styles.contentText}>
          To use the Service, you must create an account. You agree to provide accurate information and keep it updated. You are responsible for your login credentials and for all activity under your account. We may support sign-in with Apple or Google; use of those methods is also subject to the provider's terms.
        </Text>

        <Text style={styles.sectionTitle}>3. App Updates and Availability</Text>
        <Text style={styles.contentText}>
          We may update the App from time to time (e.g., to add features or fix bugs). We recommend keeping the App updated. The App is provided over the internet; quality and availability may be affected by factors outside our control. We do not guarantee that the App will be error-free or that any errors will be corrected.
        </Text>

        <Text style={styles.sectionTitle}>4. Third-Party Store Rules</Text>
        <Text style={styles.contentText}>
          You agree to comply with the Apple Media Services Terms and Conditions or Google Play Terms of Service, as applicable. You acknowledge that: (a) these Terms are between you and Potentijal, not Apple or Google; (b) Apple and Google have no obligation to provide maintenance, support, or warranty for the App; and (c) Apple and Google are third-party beneficiaries of these Terms and may enforce them against you.
        </Text>

        <Text style={styles.sectionTitle}>5. The Service and Sport Modes</Text>
        <Text style={styles.contentText}>
          Potentijal is a multi-sport athlete development app that helps you track training, games, practices, and performance. The Service includes sport modes (e.g., strength training, running, basketball, football, baseball, soccer, hockey, tennis). You can log workouts, view the Progress tab (Progress Graphs, Skill Map, Consistency Score, Training Statistics), manage weekly schedules and goals, and view History.
        </Text>
        <Text style={styles.contentText}>
          Some features require a Premium subscription, including (but not limited to): AI Trainer, game and practice logging, Skill Map, Consistency Score, Training Statistics, and expanded sport access.
        </Text>

        <Text style={styles.sectionTitle}>6. Not Medical or Professional Advice</Text>
        <Text style={styles.contentText}>
          The App and its content are for informational purposes only and are not a substitute for professional medical advice, diagnosis, or treatment, or for professional coaching or training advice. We do not provide medical or professional advice. You should seek the advice of your physician or other qualified health or fitness provider with any questions about a medical condition or training program. Do not disregard professional advice or delay seeking it because of something in the App. Your use of the Service does not create a doctor-patient or coach-athlete relationship between you and Potentijal. You assume full responsibility for your training and health decisions.
        </Text>

        <Text style={styles.sectionTitle}>7. User Content</Text>
        <Text style={styles.contentText}>
          You may submit content such as workouts, exercises, sets, notes, game and practice entries, and scheduling data ("User Content").
        </Text>
        <Text style={styles.contentText}>
          You retain ownership of your User Content. You grant Potentijal a worldwide, non-exclusive, royalty-free license to host, store, reproduce, display, and process your User Content to operate and provide the Service, including the Progress tab (Progress Graphs, Skill Map, Consistency Score, Training Statistics), streaks, goals, History, and AI Trainer responses.
        </Text>

        <Text style={styles.sectionTitle}>8. Prohibited Conduct</Text>
        <Text style={styles.contentText}>You agree not to:</Text>
        <Text style={styles.bulletPoint}>• Use the Service for illegal purposes</Text>
        <Text style={styles.bulletPoint}>• Attempt to gain unauthorized access to systems or accounts</Text>
        <Text style={styles.bulletPoint}>• Upload content that is unlawful, abusive, harassing, hateful, sexually explicit, or otherwise inappropriate</Text>
        <Text style={styles.bulletPoint}>• Upload content that violates law or infringes others' intellectual property rights</Text>
        <Text style={styles.bulletPoint}>• Reverse engineer, scrape, or misuse the Service in a manner that disrupts operations</Text>
        <Text style={styles.contentText}>
          We may remove content and/or suspend accounts that violate these Terms.
        </Text>

        <Text style={styles.sectionTitle}>9. Premium Subscriptions and Billing</Text>
        <Text style={styles.contentText}>
          Some features require a paid subscription ("Premium" or "Potentijal Premium"). Subscriptions are offered through the Apple App Store or Google Play (as applicable). Payment is charged to your Apple ID or Google account at confirmation of purchase. Subscriptions automatically renew at the end of each period (e.g., one month or one year) unless you cancel. You can manage your subscription, turn off auto-renewal, or request refunds through your device's App Store or Play Store settings; refunds are subject to Apple's or Google's policies.
        </Text>

        <Text style={styles.sectionTitle}>10. Content and Conduct</Text>
        <Text style={styles.contentText}>
          We may remove content and suspend or terminate accounts that violate these Terms or that we reasonably believe harm the Service or other users.
        </Text>

        <Text style={styles.sectionTitle}>11. Intellectual Property</Text>
        <Text style={styles.contentText}>
          The Service, including its design, software, logos, trademarks, and related materials, are owned by Potentijal or its licensors and are protected by intellectual property laws. You may not copy, modify, distribute, or create derivative works except as explicitly permitted.
        </Text>

        <Text style={styles.sectionTitle}>12. Service Availability and Changes</Text>
        <Text style={styles.contentText}>
          We may modify, suspend, or discontinue any part of the Service at any time, including features, sport modes, or subscription tiers. We may also impose limits on usage to maintain stability and performance.
        </Text>

        <Text style={styles.sectionTitle}>13. Termination</Text>
        <Text style={styles.contentText}>
          You may stop using the Service at any time. We may suspend or terminate access if you violate these Terms or if we reasonably believe your use poses risk to the Service or other users.
        </Text>

        <Text style={styles.sectionTitle}>14. Disclaimers</Text>
        <Text style={styles.contentText}>
          THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE." TO THE MAXIMUM EXTENT PERMITTED BY LAW, POTENTIJAL DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING FITNESS FOR A PARTICULAR PURPOSE, MERCHANTABILITY, AND NON-INFRINGEMENT.
        </Text>

        <Text style={styles.sectionTitle}>15. Limitation of Liability</Text>
        <Text style={styles.contentText}>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, POTENTIJAL WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF DATA, PROFITS, OR REVENUE, ARISING FROM OR RELATED TO YOUR USE OF THE SERVICE.
        </Text>
        <Text style={styles.contentText}>
          TOTAL LIABILITY FOR ANY CLAIM WILL NOT EXCEED THE AMOUNT YOU PAID TO POTENTIJAL FOR THE SERVICE IN THE 12 MONTHS BEFORE THE CLAIM, OR $100 IF YOU PAID NOTHING.
        </Text>

        <Text style={styles.sectionTitle}>16. Governing Law</Text>
        <Text style={styles.contentText}>
          These Terms are governed by the laws of the State of Delaware, United States, without regard to its conflict-of-laws principles. Any dispute arising from these Terms or the Service shall be resolved in the state or federal courts located in Delaware, and you consent to the personal jurisdiction of such courts. If you are in a country other than the United States, mandatory consumer protection laws in your jurisdiction may still apply.
        </Text>

        <Text style={styles.sectionTitle}>17. Changes to These Terms</Text>
        <Text style={styles.contentText}>
          We may update these Terms from time to time. If changes are material, we will provide notice within the Service or by other reasonable means. Continued use after changes means you accept the updated Terms.
        </Text>

        <Text style={styles.sectionTitle}>18. Contact</Text>
        <Text style={styles.contentText}>
          For questions about these Terms or the Service:{"\n\n"}
          Email: potentijal@gmail.com
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
