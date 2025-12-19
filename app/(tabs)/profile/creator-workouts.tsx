// app/(tabs)/profile/creator-workouts.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { listWorkoutsForProfile, type HistoryWorkout } from "../../../lib/api/history";
import { getWorkoutDetail } from "../../../lib/api/workouts";
import { getMyProfile } from "../../../lib/api/profile";
import { useAuth } from "../../../providers/AuthProvider";
import { theme } from "../../../constants/theme";
import { Alert } from "react-native";

/* ---- Fonts ---- */
import {
  useFonts as useGeist,
  Geist_700Bold,
  Geist_800ExtraBold,
} from "@expo-google-fonts/geist";

// Sport mode icons mapping
const SPORT_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  workout: "dumbbell",
  basketball: "basketball",
  football: "football",
  baseball: "baseball",
  soccer: "soccer",
  hockey: "hockey",
  tennis: "tennis-ball",
  running: "run",
};

export default function CreatorWorkouts() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { profileId } = useLocalSearchParams<{ profileId: string }>();

  const [geistLoaded] = useGeist({ Geist_700Bold, Geist_800ExtraBold });
  const fontsReady = geistLoaded;

  const [workouts, setWorkouts] = useState<HistoryWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    if (!profileId) return;

    const loadData = async () => {
      setLoading(true);
      
      // Check if current user is premium
      if (user) {
        const { data: profile } = await getMyProfile();
        setIsPremium(profile?.is_premium || profile?.plan === 'premium' || false);
      }

      // Load workouts
      console.log(`📋 [Creator Workouts] Loading workouts for profile: ${profileId}`);
      const { data, error } = await listWorkoutsForProfile({ profileId });
      if (error) {
        console.error('❌ [Creator Workouts] Error loading workouts:', error);
      }
      if (data) {
        console.log(`✅ [Creator Workouts] Loaded ${data.length} workouts:`, data.map(w => ({ id: w.id, name: w.name, mode: w.mode })));
        setWorkouts(data);
      } else {
        console.log(`⚠️ [Creator Workouts] No workouts found for profile: ${profileId}`);
      }
      setLoading(false);
    };

    loadData();
  }, [profileId, user]);

  const handleWorkoutPress = async (workoutId: string) => {
    // Navigate to workout detail (reuse history detail screen)
    // Need to pass type=workout and other required params
    const workout = workouts.find(w => w.id === workoutId);
    if (workout) {
      router.push({
        pathname: `/(tabs)/history/${workoutId}`,
        params: {
          type: 'workout',
          fromCreator: 'true',
          name: workout.name || 'Workout',
          when: workout.performed_at || new Date().toISOString(),
          mode: workout.mode || 'workout',
          creatorProfileId: profileId, // Pass creator's profileId for back navigation
        },
      });
    }
  };

  if (!fontsReady) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg0, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  // Format date helper
  const formatDate = (iso: string) => {
    const parts = iso.split('T')[0].split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      return `${month}/${day}/${String(year).slice(-2)}`;
    }
    return iso;
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg0, paddingTop: insets.top + 16 }}>
      {/* Back button */}
      <Pressable
        onPress={() => router.back()}
        style={styles.backBtn}
        hitSlop={10}
      >
        <Ionicons name="chevron-back" size={22} color={theme.colors.textHi} />
      </Pressable>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
      >
        {/* Title */}
        <Text style={styles.title}>Creator Workouts</Text>
        <View style={styles.rule} />

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator />
          </View>
        ) : workouts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No workouts available</Text>
          </View>
        ) : (
          <View style={styles.workoutsList}>
            {workouts.map((workout) => {
              const iconName = SPORT_ICONS[workout.mode] || "dumbbell";
              return (
                <Pressable
                  key={workout.id}
                  style={styles.workoutCard}
                  onPress={() => handleWorkoutPress(workout.id)}
                >
                  <View style={styles.workoutLeft}>
                    <Text style={styles.workoutDate}>{formatDate(workout.performed_at)}</Text>
                    <Text style={styles.workoutName}>{workout.name}</Text>
                  </View>
                  <MaterialCommunityIcons
                    name={iconName}
                    size={24}
                    color={theme.colors.primary600}
                  />
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 16,
    marginBottom: 16,
  },
  title: {
    color: theme.colors.textHi,
    fontSize: 28,
    marginTop: 18,
    fontFamily: "Geist_800ExtraBold",
    letterSpacing: 0.2,
  },
  rule: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 999,
    marginTop: 8,
    marginBottom: 20,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    color: theme.colors.textLo,
    fontSize: 16,
  },
  workoutsList: {
    gap: 12,
  },
  workoutCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#0E1216",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  workoutLeft: {
    flex: 1,
  },
  workoutDate: {
    color: theme.colors.textLo,
    fontSize: 14,
    marginBottom: 4,
  },
  workoutName: {
    color: theme.colors.textHi,
    fontSize: 18,
    fontWeight: "600",
  },
});

