// app/(tabs)/settings/support-legal/help.tsx
// Help Screen (Static Content)
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

export default function Help() {
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
        <Text style={styles.headerTitle}>Help</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.introText}>
          Welcome to AthleteCraft.
        </Text>
        <Text style={styles.contentText}>
          This guide explains how the app works, why things behave the way they do, and how to get the most out of your training data.
        </Text>
        <Text style={styles.contentText}>
          If you're ever unsure whether something is working correctly, chances are it's explained below.
        </Text>

        <Text style={styles.sectionTitle}>Getting Started</Text>

        <Text style={styles.subsectionTitle}>What is AthleteCraft?</Text>
        <Text style={styles.contentText}>
          AthleteCraft is a multi-sport athlete development app designed to help athletes see, measure, and trust their progress.
        </Text>
        <Text style={styles.contentText}>
          Progress in sports often feels invisible. AthleteCraft turns your training, games, and practices into structured data and visual trends so you can see whether your work is paying off and what to adjust next.
        </Text>

        <Text style={styles.subsectionTitle}>How sport modes work</Text>
        <Text style={styles.contentText}>
          When you sign up, you choose up to two sport modes (more are available with Pro).
        </Text>
        <Text style={styles.contentText}>Each sport mode:</Text>
        <Text style={styles.bulletPoint}>• Has its own Home tab</Text>
        <Text style={styles.bulletPoint}>• Tracks different types of data</Text>
        <Text style={styles.bulletPoint}>• Uses sport-specific exercises and metrics</Text>
        <Text style={styles.bulletPoint}>• Shows only data logged in that mode</Text>
        <Text style={styles.contentText}>For example:</Text>
        <Text style={styles.bulletPoint}>• Basketball mode tracks shooting, drills, and games</Text>
        <Text style={styles.bulletPoint}>• Running mode tracks distance, pace, and time</Text>
        <Text style={styles.bulletPoint}>• Strength mode tracks reps, weight, and volume</Text>
        <Text style={styles.contentText}>
          Data never mixes between sport modes.
        </Text>

        <Text style={styles.sectionTitle}>Home Tab</Text>

        <Text style={styles.subsectionTitle}>Weekly schedules & checkmarks</Text>
        <Text style={styles.contentText}>
          If you schedule a workout:
        </Text>
        <Text style={styles.bulletPoint}>• Logging a workout that day = ✅</Text>
        <Text style={styles.bulletPoint}>• Missing it = ❌</Text>
        <Text style={styles.bulletPoint}>• Scheduling "Rest" or leaving it blank = ✅</Text>
        <Text style={styles.contentText}>
          Rest days count as completed days.
        </Text>

        <Text style={styles.sectionTitle}>Workouts</Text>

        <Text style={styles.subsectionTitle}>How workouts are saved</Text>
        <Text style={styles.contentText}>
          Workouts become immutable history once finished.
        </Text>
        <Text style={styles.contentText}>This means:</Text>
        <Text style={styles.bulletPoint}>• You can view them anytime in History</Text>
        <Text style={styles.bulletPoint}>• They contribute to graphs, goals, and streaks</Text>
        <Text style={styles.bulletPoint}>• They cannot be edited afterward</Text>
        <Text style={styles.contentText}>
          This ensures your progress data stays accurate.
        </Text>

        <Text style={styles.subsectionTitle}>Exercise types matter</Text>
        <Text style={styles.contentText}>
          Different sport modes support different exercise types:
        </Text>
        <Text style={styles.bulletPoint}>• Strength: reps & weight</Text>
        <Text style={styles.bulletPoint}>• Basketball: shooting, drills, exercises</Text>
        <Text style={styles.bulletPoint}>• Football: drills, sprints, exercises</Text>
        <Text style={styles.bulletPoint}>• Running: distance, pace, time</Text>
        <Text style={styles.contentText}>
          Graphs automatically adapt based on how an exercise is usually logged.
        </Text>

        <Text style={styles.sectionTitle}>Progress Tab</Text>

        <Text style={styles.subsectionTitle}>What the Progress tab includes</Text>
        <Text style={styles.contentText}>
          The Progress tab gives you three ways to view your training data:
        </Text>
        <Text style={styles.bulletPoint}>• Progress Graph — View performance trends over time. Select your sport mode, choose a view type, then search for an exercise. The graph shows averages over time so you can see trends. (Available to all users.)</Text>
        <Text style={styles.bulletPoint}>• Consistency Score — See how consistent your training has been. (Pro.)</Text>
        <Text style={styles.bulletPoint}>• Training Stats — Dive into detailed training statistics and summaries. (Pro.)</Text>
        <Text style={styles.contentText}>
          All of these use the workout and performance data you log. Data is separated by sport mode, so each view only uses data from the mode you select.
        </Text>

        <Text style={styles.subsectionTitle}>Why a graph or view might look empty</Text>
        <Text style={styles.contentText}>
          Usually because you haven't logged that exercise or metric in the selected time range, or you're in the wrong sport mode. Try a longer time range, confirm you're in the correct sport mode, or search a different exercise name. AthleteCraft uses fuzzy matching (e.g., "Bench Press" and "bench press" connect), so small spelling differences are usually fine.
        </Text>

        <Text style={styles.sectionTitle}>History Tab</Text>

        <Text style={styles.subsectionTitle}>What appears in History</Text>
        <Text style={styles.contentText}>
          History stores workouts, practices (Pro), and games (Pro). You can search, filter by category, and view full details. Nothing in History can be edited — it's a record of what happened.
        </Text>

        <Text style={styles.subsectionTitle}>Streaks & totals</Text>
        <Text style={styles.contentText}>
          Streaks are based on consecutive days with logged activity (and wins for game win streaks). Displayed numbers may be capped for clarity, but your data keeps tracking.
        </Text>

        <Text style={styles.sectionTitle}>AI Trainer (Pro)</Text>

        <Text style={styles.subsectionTitle}>What the AI Trainer does</Text>
        <Text style={styles.contentText}>
          The AI Trainer is a personalized assistant that uses your sport modes, logged workouts, games, and practices to give guidance tailored to your history. It is not a substitute for a coach or medical professional.
        </Text>

        <Text style={styles.subsectionTitle}>What the AI Trainer is not</Text>
        <Text style={styles.contentText}>
          • Not a medical professional
        </Text>
        <Text style={styles.contentText}>
          • Not a replacement for coaches or healthcare providers
        </Text>
        <Text style={styles.contentText}>
          • Not aware of information you haven't logged or shared
        </Text>
        <Text style={styles.contentText}>
          Always use judgment when applying suggestions.
        </Text>

        <Text style={styles.sectionTitle}>Pro Features</Text>

        <Text style={styles.contentText}>
          Pro (AthleteCraft Pro) unlocks: AI Trainer, game and practice logging, Consistency Score, Training Statistics, and expanded sport access. Locked features appear grayed out with a lock icon.
        </Text>

        <Text style={styles.subsectionTitle}>Subscriptions & billing</Text>
        <Text style={styles.contentText}>
          Pro is purchased in the app via the App Store or Google Play. Subscriptions automatically renew at the end of each period (monthly or yearly) unless you cancel. You can manage or cancel in your device's App Store or Play Store subscription settings. To restore a purchase (e.g., after reinstall), use Settings → Restore Purchases.
        </Text>

        <Text style={styles.sectionTitle}>Account & Troubleshooting</Text>

        <Text style={styles.subsectionTitle}>Why data doesn't cross sport modes</Text>
        <Text style={styles.contentText}>
          Each sport mode tracks different metrics. Basketball data doesn't feed into strength or running views, and vice versa. This separation keeps your Progress tab and History accurate per sport.
        </Text>

        <Text style={styles.subsectionTitle}>If something looks wrong</Text>
        <Text style={styles.contentText}>Try:</Text>
        <Text style={styles.bulletPoint}>• Switching sport modes</Text>
        <Text style={styles.bulletPoint}>• Changing time ranges</Text>
        <Text style={styles.bulletPoint}>• Checking spelling</Text>
        <Text style={styles.bulletPoint}>• Restarting the app</Text>
        <Text style={styles.contentText}>
          If it still doesn't look right, contact support.
        </Text>

        <Text style={styles.sectionTitle}>Contact us</Text>
        <Text style={styles.contentText}>
          For account issues, billing questions, or feedback, use the Contact option in Settings or email potentijal@gmail.com. We'll get back to you as soon as we can.
        </Text>

        <Text style={styles.sectionTitle}>Final note</Text>
        <Text style={styles.contentText}>
          AthleteCraft is built to grow with you.
        </Text>
        <Text style={styles.contentText}>
          The more consistently you log, the clearer your progress becomes.
        </Text>
        <Text style={styles.contentText}>
          If something feels confusing, it's not a failure — it's feedback.
        </Text>
        <Text style={styles.contentText}>
          And we're always improving.
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
  introText: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.textHi,
    marginBottom: 16,
    fontFamily: FONT.uiBold,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.textHi,
    marginTop: 32,
    marginBottom: 12,
    fontFamily: FONT.uiBold,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.textHi,
    marginTop: 20,
    marginBottom: 8,
    fontFamily: FONT.uiSemi,
  },
  contentText: {
    fontSize: 15,
    color: theme.colors.textHi,
    lineHeight: 22,
    marginBottom: 12,
    fontFamily: FONT.uiRegular,
  },
  bulletPoint: {
    fontSize: 15,
    color: theme.colors.textHi,
    lineHeight: 22,
    marginBottom: 6,
    marginLeft: 16,
    fontFamily: FONT.uiRegular,
  },
});
