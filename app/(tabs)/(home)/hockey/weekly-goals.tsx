// app/(tabs)/(home)/hockey/weekly-goals.tsx
import React, { useState, useEffect } from "react";
import { SafeAreaView, View, Text, Pressable, ScrollView, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";

import { theme } from "../../../../constants/theme";
import { Card } from "../../../../components/Card";
import { PrimaryButton } from "../../../../components/Button";
import ProgressBar from "../../../../components/ProgressBar";
import { listWeeklyGoals, getWeeklyGoalProgress, deleteWeeklyGoal, type WeeklyGoal } from "../../../../lib/api/goals";
import { getWeeklyGoalProgressDirect } from "../../../../lib/api/goals-direct";
import { useMode } from "../../../../providers/ModeContext";

type GoalWithProgress = WeeklyGoal & { currentValue: number; progress: number };

export default function WeeklyGoalsScreen() {
  const { mode } = useMode();
  const m = (mode || "hockey").toLowerCase();
  
  const [goals, setGoals] = useState<GoalWithProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGoals();
  }, [m]);

  // Reload goals when screen comes into focus (after logging workouts)
  useFocusEffect(
    React.useCallback(() => {
      loadGoals();
    }, [m])
  );

  const loadGoals = async () => {
    setLoading(true);
    const { data, error } = await listWeeklyGoals({ mode: m });
    
    if (error) {
      Alert.alert("Error", "Failed to load goals.");
      setLoading(false);
      return;
    }

    // Load progress for each goal - using direct query to bypass RPC
    const goalsWithProgress = await Promise.all(
      (data || []).map(async (goal) => {
        const { data: progress } = await getWeeklyGoalProgressDirect(goal.id);
        const currentValue = progress?.currentValue || 0;
        const targetValue = goal.targetValue || 1;
        const progressPct = Math.min(1, currentValue / targetValue);
        
        return {
          ...goal,
          currentValue,
          progress: progressPct,
        };
      })
    );

    setGoals(goalsWithProgress);
    setLoading(false);
  };

  const addGoal = () => {
    Haptics.selectionAsync();
    router.push({
      pathname: "/(tabs)/(home)/add-weekly-goal",
      params: { mode: m },
    });
  };

  const handleDelete = async (goalId: string) => {
    Alert.alert(
      "Delete Goal",
      "Are you sure you want to delete this goal?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await deleteWeeklyGoal(goalId);
            if (error) {
              Alert.alert("Error", "Failed to delete goal.");
            } else {
              loadGoals(); // Reload list
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.bg }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", padding: 16, gap: 8 }}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={{
            width: 40, height: 40, borderRadius: 10,
            alignItems: "center", justifyContent: "center",
            backgroundColor: "#0f1317", borderWidth: 1, borderColor: "#1a222b",
          }}
        >
          <Ionicons name="chevron-back" size={20} color={theme.color.text} />
        </Pressable>
        <Text style={{ color: theme.color.text, fontSize: 20, fontWeight: "900" }}>
          Weekly Goals
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}
      >
        <Card>
          <Text style={{ fontSize: 20, fontWeight: "900", color: "#111", marginBottom: 12 }}>
            Your Goals
          </Text>

          {loading ? (
            <View style={{ padding: 20, alignItems: "center" }}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : (
            <>
              <View style={{ gap: 14 }}>
                {goals.map((g) => {
                  const clamped = Math.max(0, Math.min(1, g.progress));
                  return (
                    <View key={g.id} style={{ gap: 6 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <Text style={{ color: "#111", fontWeight: "800", flex: 1 }} numberOfLines={1}>
                          {g.name}
                        </Text>
                        <Text style={{ color: "#111", fontWeight: "900" }}>
                          {Math.round(g.currentValue)}/{Math.round(g.targetValue)}
                        </Text>
                        <Pressable onPress={() => handleDelete(g.id)}>
                          <Ionicons name="trash-outline" size={18} color="#F14D4D" />
                        </Pressable>
                      </View>
                      <ProgressBar value={clamped} height={12} />
                    </View>
                  );
                })}
                {goals.length === 0 && (
                  <Text style={{ color: theme.colors.textLo, textAlign: "center", padding: 20 }}>
                    No goals yet. Add one to get started!
                  </Text>
                )}
              </View>

              <View style={{ alignItems: "flex-end", marginTop: 14 }}>
                <PrimaryButton label="+ Add Weekly Goal" onPress={addGoal} />
              </View>
            </>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
