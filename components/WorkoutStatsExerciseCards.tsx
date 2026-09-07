// Matches exercise boxes in History → workout detail (history/[id].tsx), blue "exercise" type.
import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "@/constants/theme";

const EXERCISE_BOX_BLUE = "#5AA6FF";

function ExerciseStyleStatCard({
  kicker,
  title,
  value,
  trailing,
}: {
  kicker: string;
  title: string;
  value: number;
  trailing?: React.ReactNode;
}) {
  return (
    <View style={styles.cardFlex}>
      <View style={[styles.exerciseBox, { borderColor: EXERCISE_BOX_BLUE }]}>
        <LinearGradient
          colors={["rgba(255,255,255,0.08)", "transparent", "rgba(0,0,0,0.15)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <LinearGradient
          colors={["rgba(255,255,255,0.12)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 0.3 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={styles.exerciseBoxContent}>
          <View style={styles.exerciseBoxLeft}>
            <Text style={styles.exerciseBoxSets}>{kicker}</Text>
            <Text style={styles.exerciseBoxName}>{title}</Text>
          </View>
          <View style={styles.exerciseBoxRight}>
            <Text style={styles.statValue}>{value}</Text>
            {trailing}
          </View>
        </View>
      </View>
    </View>
  );
}

export function WorkoutStatsExerciseCards({ total, streak }: { total: number; streak: number }) {
  return (
    <View style={styles.statsSection}>
      <ExerciseStyleStatCard kicker="Total" title="Workouts" value={total} />
      <ExerciseStyleStatCard
        kicker="Workout"
        title="Streak"
        value={streak}
        trailing={<MaterialCommunityIcons name="fire" size={16} color={EXERCISE_BOX_BLUE} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  statsSection: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 24,
    gap: 12,
  },
  cardFlex: {
    flex: 1,
  },
  exerciseBox: {
    backgroundColor: theme.color.bg,
    borderRadius: 16,
    borderWidth: 2,
    overflow: "hidden",
    position: "relative",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.4,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
      },
      android: {
        elevation: 10,
      },
    }),
  },
  exerciseBoxContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    position: "relative",
  },
  exerciseBoxLeft: {
    flex: 1,
    gap: 4,
  },
  exerciseBoxName: {
    color: theme.color.text,
    fontSize: 18,
    fontWeight: "700",
  },
  exerciseBoxSets: {
    color: theme.color.dim,
    fontSize: 14,
  },
  exerciseBoxRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 16,
  },
  statValue: {
    color: theme.color.text,
    fontSize: 24,
    fontWeight: "700",
  },
});
