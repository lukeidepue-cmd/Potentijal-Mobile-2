// app/(tabs)/history/[id].tsx
import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card } from "../../../components/Card";
import { theme } from "../../../constants/theme";
import {
  getWorkoutDetail,
  getPracticeDetail,
  getGameDetail,
  type HistoryPractice,
  type HistoryGame,
} from "../../../lib/api/history";
import { type WorkoutDetails, copyWorkoutSkeleton } from "../../../lib/api/workouts";
import { type ExerciseType } from "../../../lib/types";
import { useAuth } from "../../../providers/AuthProvider";
import { getMyProfile } from "../../../lib/api/profile";
import { Alert } from "react-native";

const iconFor: Record<string, React.ReactNode> = {
  workout: <MaterialCommunityIcons name="dumbbell" size={16} color="#111" />,
  basketball: <Ionicons name="basketball-outline" size={16} color="#111" />,
  running: <MaterialCommunityIcons name="run" size={16} color="#111" />,
  football: <Ionicons name="american-football-outline" size={16} color="#111" />,
  soccer: <Ionicons name="football-outline" size={16} color="#111" />,
  baseball: <MaterialCommunityIcons name="baseball" size={16} color="#111" />,
  hockey: <MaterialCommunityIcons name="hockey-sticks" size={16} color="#111" />,
  tennis: <MaterialCommunityIcons name="tennisball" size={16} color="#111" />,
  lifting: <MaterialCommunityIcons name="dumbbell" size={16} color="#111" />,
};

function formatDate(iso?: string) {
  if (!iso) return "";
  // Parse as local date to avoid timezone issues
  const parts = iso.split('T')[0].split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    return `${month}/${day}/${String(year).slice(-2)}`;
  }
  // Fallback
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(-2)}`;
}

function formatFullDate(iso?: string) {
  if (!iso) return "";
  // Parse as local date to avoid timezone issues
  const parts = iso.split('T')[0].split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[month - 1]} ${day}, ${year}`;
  }
  // Fallback
  const d = new Date(iso);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export default function HistoryDetail() {
  const params = useLocalSearchParams<{
    id: string;
    type: "workout" | "practice" | "game";
    name?: string;
    when: string;
    mode?: string;
    result?: string;
    fromCreator?: string; // "true" if viewing from creator workouts
  }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [workout, setWorkout] = useState<WorkoutDetails | null>(null);
  const [practice, setPractice] = useState<HistoryPractice | null>(null);
  const [game, setGame] = useState<HistoryGame | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canCopy, setCanCopy] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  useEffect(() => {
    loadDetail();
  }, [params.id, params.type]);

  // Check if user can copy this workout (always check for creator workouts, even own)
  useEffect(() => {
    if (params.fromCreator === "true" && workout && user) {
      checkCanCopy();
    }
  }, [workout, user, params.fromCreator]);

  const checkCanCopy = async () => {
    if (!workout || !user) return;

    console.log(`📋 [Copy Workout] ===== START Checking if workout can be copied =====`);
    console.log(`📋 [Copy Workout] Workout mode (DB): ${workout.mode}`);
    console.log(`📋 [Copy Workout] From creator: ${params.fromCreator}`);

    // Don't allow copying running mode workouts
    if (workout.mode === "running") {
      console.log(`📋 [Copy Workout] Running mode workouts cannot be copied`);
      setCanCopy(false);
      setCopyError("Cannot copy Running mode workouts");
      return;
    }

    // If viewing a creator workout, allow copying regardless of user's sports preferences
    // This allows users to discover and copy workouts from creators even if they haven't set up that sport yet
    if (params.fromCreator === 'true') {
      console.log(`✅ [Copy Workout] Creator workout - allowing copy without sport check`);
      setCanCopy(true);
      setCopyError(null);
      console.log(`📋 [Copy Workout] ===== END =====`);
      return;
    }

    // For own workouts, check if user has the required sport mode
    // Map database mode to frontend mode for comparison
    const { data: profile } = await getMyProfile();
    
    console.log(`📋 [Copy Workout] User profile sports:`, profile?.sports);
    
    // Map workout.mode (database) to frontend mode key
    // "workout" in DB corresponds to "lifting" in frontend
    const modeMapping: Record<string, string> = {
      'workout': 'lifting',
      'basketball': 'basketball',
      'football': 'football',
      'baseball': 'baseball',
      'soccer': 'soccer',
      'hockey': 'hockey',
      'tennis': 'tennis',
      'running': 'running',
    };
    
    const frontendMode = modeMapping[workout.mode] || workout.mode;
    console.log(`📋 [Copy Workout] Mapped frontend mode: ${frontendMode}`);
    
    // Check if user has the sport in their profile
    // Also check if the mode is "workout" and user has "lifting" OR if they have the exact mode
    const hasSport = profile && profile.sports && (
      profile.sports.includes(frontendMode) ||
      (workout.mode === 'workout' && profile.sports.includes('workout')) // Also allow if profile has "workout" directly
    );
    
    console.log(`📋 [Copy Workout] User has sport: ${hasSport}`);
    
    if (hasSport) {
      console.log(`✅ [Copy Workout] User can copy this workout`);
      setCanCopy(true);
      setCopyError(null);
    } else {
      console.log(`❌ [Copy Workout] User cannot copy - missing sport in profile`);
      setCanCopy(false);
      const modeName = workout.mode === 'workout' ? 'Workout' : workout.mode.charAt(0).toUpperCase() + workout.mode.slice(1);
      setCopyError(`Cannot copy workout because it was logged in ${modeName} mode`);
    }
    
    console.log(`📋 [Copy Workout] ===== END =====`);
  };

  const handleCopy = async () => {
    if (!workout || !canCopy) return;

    console.log(`📋 [Copy Workout] Starting copy process for workout: ${workout.id}`);
    
    const { data: newWorkoutId, error: copyError } = await copyWorkoutSkeleton({
      sourceWorkoutId: workout.id,
    });

    if (copyError || !newWorkoutId) {
      console.error(`❌ [Copy Workout] Copy failed:`, copyError);
      Alert.alert("Error", "Failed to copy workout");
      return;
    }

    console.log(`✅ [Copy Workout] Workout copied successfully. New workout ID: ${newWorkoutId}`);
    
    Alert.alert("Success", "Workout copied! You can now edit it in the Workouts tab.", [
      {
        text: "OK",
        onPress: () => {
          // Navigate to workouts tab with the new workout ID
          // The workouts tab should load this workout automatically
          router.replace({
            pathname: "/(tabs)/workouts",
            params: { workoutId: newWorkoutId },
          });
        },
      },
    ]);
  };

  const loadDetail = async () => {
    setLoading(true);
    setError(null);

    console.log('📋 [History Detail] Loading detail:', { id: params.id, type: params.type, fromCreator: params.fromCreator });

    try {
      // If type is missing, try to determine from workout (default to workout for creator workouts)
      let type = params.type;
      if (!type && params.fromCreator === "true") {
        type = "workout";
        console.log('📋 [History Detail] Type missing, defaulting to workout for creator workout');
      }

      if (type === "workout" || (!type && params.fromCreator === "true")) {
        console.log('📋 [History Detail] Fetching workout:', params.id);
        const { data, error: err } = await getWorkoutDetail(params.id);
        if (err || !data) {
          console.error('❌ [History Detail] Workout error:', err);
          setError("Failed to load workout");
        } else {
          console.log('✅ [History Detail] Workout loaded:', data.name);
          setWorkout(data);
        }
      } else if (type === "practice") {
        const { data, error: err } = await getPracticeDetail(params.id);
        if (err || !data) {
          setError("Failed to load practice");
        } else {
          setPractice(data);
        }
      } else if (type === "game") {
        const { data, error: err } = await getGameDetail(params.id);
        if (err || !data) {
          setError("Failed to load game");
        } else {
          setGame(data);
        }
      } else {
        console.error('❌ [History Detail] Unknown type:', type);
        setError("Unknown item type");
      }
    } catch (err: any) {
      console.error('❌ [History Detail] Exception:', err);
      setError(err?.message || "Failed to load details");
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    if (params.type === "workout" || (params.fromCreator === "true" && workout)) {
      return params.name || workout?.name || "Workout";
    } else if (params.type === "practice") {
      return "Practice";
    } else {
      return "Game";
    }
  };

  const getSubtitle = () => {
    if (params.type === "workout") {
      return formatFullDate(params.when);
    } else if (params.type === "practice") {
      return practice ? formatFullDate(practice.practiced_at) : formatFullDate(params.when);
    } else {
      return game ? formatFullDate(game.played_at) : formatFullDate(params.when);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.color.bg,
        paddingTop: insets.top,
      }}
    >
      {/* Header row */}
      <View style={{ flexDirection: "row", alignItems: "center", padding: 16, gap: 8 }}>
        <Pressable
          onPress={() => {
            // If from creator workouts, go back to creator workouts screen
            if (params.fromCreator === "true") {
              router.replace("/(tabs)/profile/creator-workouts");
            } else {
              router.back();
            }
          }}
          hitSlop={10}
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0f1317",
            borderWidth: 1,
            borderColor: "#1a222b",
          }}
        >
          <Ionicons name="chevron-back" size={20} color={theme.color.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.titleLine}>{getTitle()}</Text>
          <Text style={styles.subtitle}>{getSubtitle()}</Text>
        </View>
        {params.mode && (
          <View style={styles.sportPill}>{iconFor[params.mode] || iconFor.workout}</View>
        )}
        {/* Copy button for creator workouts */}
        {params.fromCreator === "true" && workout && canCopy && (
          <Pressable
            onPress={handleCopy}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: theme.color.brand,
              marginLeft: 8,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>Copy</Text>
          </Pressable>
        )}
        {params.fromCreator === "true" && workout && !canCopy && copyError && (
          <View style={{ marginLeft: 8, maxWidth: 120 }}>
            <Text style={{ color: theme.color.dim, fontSize: 10 }}>{copyError}</Text>
          </View>
        )}
      </View>

      <View style={styles.rule} />

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={theme.color.brand} />
        </View>
      ) : error ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 16 }}>
          <Text style={{ color: "#EF4444", fontSize: 16 }}>{error}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          {(params.type === "workout" || (params.fromCreator === "true" && workout)) && workout && (
            <>
              {workout.exercises.map((exercise, idx) => (
                <Card key={exercise.id || idx} style={{ padding: 16 }}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <View style={styles.rule} />
                  {exercise.sets.map((set, setIdx) => (
                    <View key={set.id || setIdx} style={styles.setRow}>
                      <Text style={styles.setNumber}>Set {set.setIndex || setIdx + 1}</Text>
                      <View style={styles.setData}>
                        {exercise.type === "exercise" && (
                          <>
                            {set.reps != null && (
                              <Text style={styles.setValue}>{set.reps} reps</Text>
                            )}
                            {set.weight != null && (
                              <Text style={styles.setValue}>{set.weight} lbs</Text>
                            )}
                          </>
                        )}
                        {exercise.type === "shooting" && (
                          <>
                            {/* Basketball shooting: attempted, made, percentage */}
                            {/* Soccer/Hockey shooting: reps, distance */}
                            {workout.mode === "basketball" ? (
                              <>
                                {set.attempted != null && (
                                  <Text style={styles.setValue}>{set.attempted} attempted</Text>
                                )}
                                {set.made != null && (
                                  <Text style={styles.setValue}>{set.made} made</Text>
                                )}
                                {set.attempted != null && set.made != null && (
                                  <Text style={styles.setValue}>
                                    {Math.round((set.made / set.attempted) * 100)}%
                                  </Text>
                                )}
                              </>
                            ) : (
                              <>
                                {set.reps != null && (
                                  <Text style={styles.setValue}>{set.reps} reps</Text>
                                )}
                                {set.distance != null && (
                                  <Text style={styles.setValue}>{set.distance} {workout.mode === "soccer" || workout.mode === "hockey" ? "yds" : ""}</Text>
                                )}
                              </>
                            )}
                          </>
                        )}
                        {exercise.type === "drill" && (
                          <>
                            {set.reps != null && (
                              <Text style={styles.setValue}>{set.reps} reps</Text>
                            )}
                            {set.timeMin != null && (
                              <Text style={styles.setValue}>{set.timeMin} min</Text>
                            )}
                          </>
                        )}
                        {exercise.type === "sprints" && (
                          <>
                            {set.reps != null && (
                              <Text style={styles.setValue}>{set.reps} reps</Text>
                            )}
                            {set.distance != null && (
                              <Text style={styles.setValue}>{set.distance} yds</Text>
                            )}
                            {set.avgTimeSec != null && (
                              <Text style={styles.setValue}>{set.avgTimeSec} sec</Text>
                            )}
                          </>
                        )}
                        {exercise.type === "hitting" && (
                          <>
                            {set.reps != null && (
                              <Text style={styles.setValue}>{set.reps} reps</Text>
                            )}
                            {set.distance != null && (
                              <Text style={styles.setValue}>{set.distance} ft</Text>
                            )}
                          </>
                        )}
                        {exercise.type === "fielding" && (
                          <>
                            {set.reps != null && (
                              <Text style={styles.setValue}>{set.reps} reps</Text>
                            )}
                            {set.distance != null && (
                              <Text style={styles.setValue}>{set.distance} ft</Text>
                            )}
                          </>
                        )}
                        {exercise.type === "rally" && (
                          <>
                            {set.points != null && (
                              <Text style={styles.setValue}>{set.points} points</Text>
                            )}
                            {set.timeMin != null && (
                              <Text style={styles.setValue}>{set.timeMin} min</Text>
                            )}
                          </>
                        )}
                        {exercise.type === "running" && (
                          <>
                            {set.distance != null && (
                              <Text style={styles.setValue}>{set.distance} mi</Text>
                            )}
                            {set.timeMin != null && (
                              <Text style={styles.setValue}>{set.timeMin} min</Text>
                            )}
                          </>
                        )}
                        {exercise.type === "cardio" && (
                          <>
                            {set.distance != null && (
                              <Text style={styles.setValue}>{set.distance} mi</Text>
                            )}
                            {set.timeMin != null && (
                              <Text style={styles.setValue}>{set.timeMin} min</Text>
                            )}
                          </>
                        )}
                      </View>
                    </View>
                  ))}
                </Card>
              ))}
            </>
          )}

          {params.type === "practice" && practice && (
            <>
              <Card style={{ padding: 16 }}>
                <Text style={styles.sectionTitle}>Date</Text>
                <Text style={styles.sectionValue}>{formatFullDate(practice.practiced_at)}</Text>
              </Card>
              <Card style={{ padding: 16 }}>
                <Text style={styles.sectionTitle}>Mode</Text>
                <Text style={styles.sectionValue}>{practice.mode}</Text>
              </Card>
              {practice.drill && (
                <Card style={{ padding: 16 }}>
                  <Text style={styles.sectionTitle}>Drills</Text>
                  <Text style={styles.sectionValue}>{practice.drill}</Text>
                </Card>
              )}
              {practice.notes && (
                <Card style={{ padding: 16 }}>
                  <Text style={styles.sectionTitle}>Notes</Text>
                  <Text style={styles.sectionValue}>{practice.notes}</Text>
                </Card>
              )}
            </>
          )}

          {params.type === "game" && game && (
            <>
              <Card style={{ padding: 16 }}>
                <Text style={styles.sectionTitle}>Date</Text>
                <Text style={styles.sectionValue}>{formatFullDate(game.played_at)}</Text>
              </Card>
              {game.title && (
                <Card style={{ padding: 16 }}>
                  <Text style={styles.sectionTitle}>Game Title</Text>
                  <Text style={styles.sectionValue}>{game.title}</Text>
                </Card>
              )}
              <Card style={{ padding: 16 }}>
                <Text style={styles.sectionTitle}>Result</Text>
                <Text style={[styles.sectionValue, { textTransform: "capitalize" }]}>
                  {game.result}
                </Text>
              </Card>
              <Card style={{ padding: 16 }}>
                <Text style={styles.sectionTitle}>Mode</Text>
                <Text style={styles.sectionValue}>{game.mode}</Text>
              </Card>
              {game.stats && (
                <Card style={{ padding: 16 }}>
                  <Text style={styles.sectionTitle}>Stats</Text>
                  <Text style={styles.sectionValue}>{game.stats}</Text>
                </Card>
              )}
              {game.notes && (
                <Card style={{ padding: 16 }}>
                  <Text style={styles.sectionTitle}>Notes</Text>
                  <Text style={styles.sectionValue}>{game.notes}</Text>
                </Card>
              )}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  titleLine: {
    color: theme.color.text,
    fontSize: 22,
    fontWeight: "900",
  },
  subtitle: {
    color: theme.color.dim,
    fontSize: 14,
    marginTop: 4,
  },
  rule: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginHorizontal: 16,
    marginVertical: 8,
  },
  sportPill: {
    minWidth: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: "#fef08a",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e7e4b3",
  },
  exerciseName: {
    color: theme.color.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  setNumber: {
    color: theme.color.dim,
    fontSize: 14,
    fontWeight: "600",
    minWidth: 60,
  },
  setData: {
    flexDirection: "row",
    gap: 12,
    flex: 1,
    justifyContent: "flex-end",
  },
  setValue: {
    color: theme.color.text,
    fontSize: 14,
    fontWeight: "600",
  },
  sectionTitle: {
    color: theme.color.dim,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionValue: {
    color: theme.color.text,
    fontSize: 16,
    fontWeight: "600",
  },
});
