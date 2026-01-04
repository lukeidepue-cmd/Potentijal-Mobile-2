// app/(tabs)/settings/support-legal/help.tsx
// Help Screen (Static Content)
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
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textHi} />
        </Pressable>
        <Text style={styles.headerTitle}>Help</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.introText}>
          Welcome to Potentijal.
        </Text>
        <Text style={styles.contentText}>
          This guide explains how the app works, why things behave the way they do, and how to get the most out of your training data.
        </Text>
        <Text style={styles.contentText}>
          If you're ever unsure whether something is working correctly, chances are it's explained below.
        </Text>

        <Text style={styles.sectionTitle}>Getting Started</Text>

        <Text style={styles.subsectionTitle}>What is Potentijal?</Text>
        <Text style={styles.contentText}>
          Potentijal is a multi-sport athlete development app designed to help athletes see, measure, and trust their progress.
        </Text>
        <Text style={styles.contentText}>
          Progress in sports often feels invisible. Potentijal turns your training, games, practices, and nutrition into structured data and visual trends so you can understand whether your work is paying off — and what to adjust next.
        </Text>

        <Text style={styles.subsectionTitle}>How sport modes work</Text>
        <Text style={styles.contentText}>
          When you sign up, you choose up to two sport modes (more are available with Premium).
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

        <Text style={styles.sectionTitle}>Home Tab & Progress Graphs</Text>

        <Text style={styles.subsectionTitle}>How progress graphs work</Text>
        <Text style={styles.contentText}>
          Progress graphs show average performance trends over time, not single workouts.
        </Text>
        <Text style={styles.contentText}>You:</Text>
        <Text style={styles.bulletPoint}>• Search for an exercise or metric</Text>
        <Text style={styles.bulletPoint}>• Choose what to measure (left dropdown)</Text>
        <Text style={styles.bulletPoint}>• Choose a time range (right dropdown)</Text>
        <Text style={styles.contentText}>The graph then:</Text>
        <Text style={styles.bulletPoint}>• Looks at all logged data for that exercise</Text>
        <Text style={styles.bulletPoint}>• Groups it into time intervals</Text>
        <Text style={styles.bulletPoint}>• Averages the values in each interval</Text>
        <Text style={styles.bulletPoint}>• Displays only intervals where data exists</Text>
        <Text style={styles.contentText}>
          This is intentional — it shows trends, not noise.
        </Text>

        <Text style={styles.subsectionTitle}>Why graphs sometimes look empty</Text>
        <Text style={styles.contentText}>
          This usually happens for one of these reasons:
        </Text>
        <Text style={styles.bulletPoint}>• You haven't logged that exercise in the selected time range</Text>
        <Text style={styles.bulletPoint}>• You're viewing the graph in the wrong sport mode</Text>
        <Text style={styles.bulletPoint}>• The exercise name hasn't been logged yet</Text>
        <Text style={styles.contentText}>Try:</Text>
        <Text style={styles.bulletPoint}>• Switching time ranges (e.g., 360 days)</Text>
        <Text style={styles.bulletPoint}>• Checking you're in the correct sport mode</Text>
        <Text style={styles.bulletPoint}>• Searching a different variation of the exercise name</Text>

        <Text style={styles.subsectionTitle}>Fuzzy matching (important)</Text>
        <Text style={styles.contentText}>
          Potentijal uses fuzzy matching, meaning:
        </Text>
        <Text style={styles.bulletPoint}>• Uppercase vs lowercase doesn't matter</Text>
        <Text style={styles.bulletPoint}>• Minor spelling differences are okay</Text>
        <Text style={styles.bulletPoint}>• Similar phrasing still connects</Text>
        <Text style={styles.contentText}>For example:</Text>
        <Text style={styles.bulletPoint}>• "Bench Press", "bench press", and "bench" will connect</Text>
        <Text style={styles.bulletPoint}>• "3 point shot" and "3 pointers" can still match</Text>
        <Text style={styles.contentText}>
          You don't need perfect naming — just be reasonably consistent.
        </Text>

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

        <Text style={styles.sectionTitle}>History Tab</Text>

        <Text style={styles.subsectionTitle}>What appears in History</Text>
        <Text style={styles.contentText}>
          History stores:
        </Text>
        <Text style={styles.bulletPoint}>• Workouts</Text>
        <Text style={styles.bulletPoint}>• Practices (Premium)</Text>
        <Text style={styles.bulletPoint}>• Games (Premium)</Text>
        <Text style={styles.contentText}>You can:</Text>
        <Text style={styles.bulletPoint}>• Search by name</Text>
        <Text style={styles.bulletPoint}>• Filter by category</Text>
        <Text style={styles.bulletPoint}>• View full details of any entry</Text>
        <Text style={styles.contentText}>
          Nothing in History can be edited — it's a record of what happened.
        </Text>

        <Text style={styles.subsectionTitle}>Streaks & totals</Text>
        <Text style={styles.contentText}>
          Streaks are calculated based on:
        </Text>
        <Text style={styles.bulletPoint}>• Consecutive days with logged activity</Text>
        <Text style={styles.bulletPoint}>• Wins for game win streaks</Text>
        <Text style={styles.contentText}>
          Numbers are capped visually to keep the interface clean, but your data continues tracking beyond that.
        </Text>

        <Text style={styles.sectionTitle}>Profile, Social & Creators</Text>

        <Text style={styles.subsectionTitle}>Profiles & followers</Text>
        <Text style={styles.contentText}>
          Your profile shows:
        </Text>
        <Text style={styles.bulletPoint}>• Display name & username</Text>
        <Text style={styles.bulletPoint}>• Bio</Text>
        <Text style={styles.bulletPoint}>• Followers & following</Text>
        <Text style={styles.bulletPoint}>• Highlights (Premium)</Text>
        <Text style={styles.contentText}>
          You can follow other athletes and creators.
        </Text>

        <Text style={styles.subsectionTitle}>Highlights</Text>
        <Text style={styles.contentText}>
          Highlights are short videos uploaded from your device.
        </Text>
        <Text style={styles.contentText}>You can:</Text>
        <Text style={styles.bulletPoint}>• View highlights on any profile</Text>
        <Text style={styles.bulletPoint}>• Upload highlights to your own profile with Premium</Text>
        <Text style={styles.bulletPoint}>• Delete your own highlights anytime</Text>

        <Text style={styles.subsectionTitle}>Creator accounts</Text>
        <Text style={styles.contentText}>
          Creator accounts may have:
        </Text>
        <Text style={styles.bulletPoint}>• A gold glowing profile ring</Text>
        <Text style={styles.bulletPoint}>• Public workouts</Text>
        <Text style={styles.bulletPoint}>• Creator codes</Text>
        <Text style={styles.bulletPoint}>• Premium access</Text>
        <Text style={styles.contentText}>
          You can copy creator workouts directly into your own workout tab if you have that sport mode unlocked.
        </Text>

        <Text style={styles.sectionTitle}>AI Trainer (Premium)</Text>

        <Text style={styles.subsectionTitle}>What the AI Trainer does</Text>
        <Text style={styles.contentText}>
          The AI Trainer is a personalized assistant that:
        </Text>
        <Text style={styles.bulletPoint}>• Understands your sports</Text>
        <Text style={styles.bulletPoint}>• Uses your logged workouts, nutrition, games, and practices</Text>
        <Text style={styles.bulletPoint}>• Adapts advice based on your history</Text>
        <Text style={styles.contentText}>
          It's designed to help you, not give generic advice.
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

        <Text style={styles.sectionTitle}>Premium Features</Text>

        <Text style={styles.contentText}>
          Premium unlocks:
        </Text>
        <Text style={styles.bulletPoint}>• AI Trainer</Text>
        <Text style={styles.bulletPoint}>• Game & practice logging</Text>
        <Text style={styles.bulletPoint}>• Highlights uploading</Text>
        <Text style={styles.bulletPoint}>• Creator workout viewing</Text>
        <Text style={styles.bulletPoint}>• Expanded sport access</Text>
        <Text style={styles.contentText}>
          Locked features appear grayed out with a lock icon.
        </Text>

        <Text style={styles.subsectionTitle}>Discounts & creator codes</Text>
        <Text style={styles.contentText}>
          Some users may receive:
        </Text>
        <Text style={styles.bulletPoint}>• Discounted Premium access</Text>
        <Text style={styles.bulletPoint}>• Creator referral benefits</Text>
        <Text style={styles.contentText}>
          Eligibility depends on valid codes and active promotions.
        </Text>

        <Text style={styles.sectionTitle}>Account, Data & Troubleshooting</Text>

        <Text style={styles.subsectionTitle}>Why data doesn't cross sport modes</Text>
        <Text style={styles.contentText}>
          Each sport mode tracks different metrics.
        </Text>
        <Text style={styles.contentText}>To keep data accurate:</Text>
        <Text style={styles.bulletPoint}>• Basketball shooting doesn't affect strength graphs</Text>
        <Text style={styles.bulletPoint}>• Running pace doesn't affect lifting progress</Text>
        <Text style={styles.contentText}>
          This separation is intentional.
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

        <Text style={styles.sectionTitle}>Final note</Text>
        <Text style={styles.contentText}>
          Potentijal is built to grow with you.
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
