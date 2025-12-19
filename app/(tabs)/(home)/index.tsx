// app/(tabs)/(home)/index.tsx
import React, { useState } from "react";
import { SafeAreaView, View, Text, Pressable, Modal, ScrollView } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useMode } from "../../../providers/ModeContext";
import { theme } from "../../../constants/theme";
import AppHeader from "../../../components/AppHeader";
import PrimaryButton from "../../../components/Button";
import ProgressBar from "../../../components/ProgressBar";
import AITrainerChat from "../../../components/AITrainerChat";
import { useFeatures } from "../../../hooks/useFeatures";
import UpgradeModal from "../../../components/UpgradeModal";
import { useAuth } from "../../../providers/AuthProvider";

/* ======== Dedicated sport home screens ======== */
import LiftingHomeScreen from "./lifting";
import BasketballHomeScreen from "./basketball";
import FootballHomeScreen from "./football";
import BaseballHomeScreen from "./baseball";
import SoccerHomeScreen from "./soccer";
import HockeyHomeScreen from "./hockey";
import TennisHomeScreen from "./tennis";

/* ======== Mode keys ======== */
type ModeKey =
  | "lifting"
  | "basketball"
  | "football"
  | "running"
  | "baseball"
  | "soccer"
  | "hockey"
  | "tennis";

/* Mark which modes use dedicated pages (no inline header/body) */
const DEDICATED: ModeKey[] = [
  "lifting",   // ⬅️ added: route Lifting to the new screen
  "basketball",
  "football",
  "baseball",
  "soccer",
  "hockey",
  "tennis",
];

/** Central list for the switcher */
const ALL_MODES: { key: ModeKey; label: string; icon: React.ReactNode }[] = [
  {
    key: "lifting",
    label: "Lifting",
    icon: <MaterialCommunityIcons name="dumbbell" size={18} color={theme.colors.textHi} />,
  },
  {
    key: "basketball",
    label: "Basketball",
    icon: <Ionicons name="basketball-outline" size={18} color={theme.colors.textHi} />,
  },
  {
    key: "football",
    label: "Football",
    icon: <Ionicons name="american-football-outline" size={18} color={theme.colors.textHi} />,
  },
  {
    key: "running",
    label: "Running",
    icon: <MaterialCommunityIcons name="run" size={18} color={theme.colors.textHi} />,
  },
  {
    key: "baseball",
    label: "Baseball",
    icon: <MaterialCommunityIcons name="baseball" size={18} color={theme.colors.textHi} />,
  },
  {
    key: "soccer",
    label: "Soccer",
    icon: <Ionicons name="football-outline" size={18} color={theme.colors.textHi} />,
  },
  {
    key: "hockey",
    label: "Hockey",
    icon: <MaterialCommunityIcons name="hockey-sticks" size={18} color={theme.colors.textHi} />,
  },
  {
    key: "tennis",
    label: "Tennis",
    icon: <Ionicons name="tennisball-outline" size={18} color={theme.colors.textHi} />,
  },
];

export default function HomeIndex() {
  const { mode, setMode } = useMode();
  const { canUseAITrainer } = useFeatures();
  const { user } = useAuth();
  const [showChooser, setShowChooser] = useState(false);
  const [showAITrainer, setShowAITrainer] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const insets = useSafeAreaInsets();

  const m = (mode || "lifting").toLowerCase() as ModeKey;
  const isDedicated = DEDICATED.includes(m);

  // Inline header only for inline pages (right now: running)
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg0 }}>
      {!isDedicated && (
        <AppHeader
          title="Home"
          icon={{ lib: "ion", name: "time", color: theme.colors.textHi }}
          right={
            <View style={{ flexDirection: "row", gap: theme.layout.lg }}>
              <Pressable
                onPress={() => setShowChooser(true)}
                style={({ pressed }) => ({
                  width: 48,
                  height: 48,
                  borderRadius: theme.radii.pill,
                  backgroundColor: pressed ? theme.colors.surface2 : theme.colors.surface1,
                  borderWidth: 1,
                  borderColor: theme.colors.strokeSoft,
                  alignItems: "center",
                  justifyContent: "center",
                  ...theme.shadow.soft,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                })}
              >
                <MaterialCommunityIcons name="dumbbell" size={24} color={theme.colors.textHi} />
              </Pressable>
              <Pressable
                onPress={() => {}}
                style={({ pressed }) => ({
                  width: 48,
                  height: 48,
                  borderRadius: theme.radii.lg,
                  backgroundColor: pressed ? theme.colors.surface2 : theme.colors.surface1,
                  borderWidth: 1,
                  borderColor: theme.colors.strokeSoft,
                  alignItems: "center",
                  justifyContent: "center",
                  ...theme.shadow.soft,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                })}
              >
                <Ionicons name="settings-outline" size={22} color={theme.colors.textHi} />
              </Pressable>
            </View>
          }
        />
      )}

      {/* Body */}
      {isDedicated ? (
        m === "lifting" ? (
          <LiftingHomeScreen />
        ) : m === "basketball" ? (
          <BasketballHomeScreen />
        ) : m === "football" ? (
          <FootballHomeScreen />
        ) : m === "baseball" ? (
          <BaseballHomeScreen />
        ) : m === "soccer" ? (
          <SoccerHomeScreen />
        ) : m === "hockey" ? (
          <HockeyHomeScreen />
        ) : (
          <TennisHomeScreen />
        )
      ) : (
        <RunningHome />
      )}

      {/* Floating mode switcher (kept for dedicated pages) */}
      {isDedicated && (
        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            right: 16,
            top: 12,
            zIndex: 50,
            flexDirection: "row",
            gap: theme.layout.lg,
          }}
        >
          {/* Login/Logout Button */}
          <Pressable
            onPress={() => router.push("/(tabs)/test-auth")}
            style={({ pressed }) => ({
              width: 48,
              height: 48,
              borderRadius: theme.radii.lg,
              backgroundColor: pressed ? theme.colors.surface2 : theme.colors.surface1,
              borderWidth: 1,
              borderColor: theme.colors.strokeSoft,
              alignItems: "center",
              justifyContent: "center",
              ...theme.shadow.soft,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <Ionicons 
              name={user ? "log-out-outline" : "log-in-outline"} 
              size={22} 
              color={theme.colors.textHi} 
            />
          </Pressable>
          {/* Sport Mode Button */}
          <Pressable
            onPress={() => setShowChooser(true)}
            style={({ pressed }) => ({
              width: 48,
              height: 48,
              borderRadius: theme.radii.pill,
              backgroundColor: pressed ? theme.colors.surface2 : theme.colors.surface1,
              borderWidth: 1,
              borderColor: theme.colors.strokeSoft,
              alignItems: "center",
              justifyContent: "center",
              ...theme.shadow.soft,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <MaterialCommunityIcons name="dumbbell" size={24} color={theme.colors.textHi} />
          </Pressable>
          {/* Settings Button */}
          <Pressable
            onPress={() => router.push("/(tabs)/settings")}
            style={({ pressed }) => ({
              width: 48,
              height: 48,
              borderRadius: theme.radii.lg,
              backgroundColor: pressed ? theme.colors.surface2 : theme.colors.surface1,
              borderWidth: 1,
              borderColor: theme.colors.strokeSoft,
              alignItems: "center",
              justifyContent: "center",
              ...theme.shadow.soft,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <Ionicons name="settings-outline" size={22} color={theme.colors.textHi} />
          </Pressable>
        </View>
      )}

      {/* AI Trainer Button - Sticky bottom left */}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          if (canUseAITrainer) {
            setShowAITrainer(true);
          } else {
            setShowUpgradeModal(true);
          }
        }}
        style={({ pressed }) => ({
          position: "absolute",
          left: 16,
          bottom: insets.bottom + 16,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: canUseAITrainer
            ? pressed
              ? theme.colors.primary700
              : theme.colors.primary600
            : pressed
            ? "#4A4A4A"
            : "#2A2A2A",
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOpacity: 0.3,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
          zIndex: 100,
          opacity: canUseAITrainer ? 1 : 0.6,
        })}
      >
        {canUseAITrainer ? (
          <Ionicons name="sparkles" size={28} color="#fff" />
        ) : (
          <Ionicons name="lock-closed" size={24} color="#fff" />
        )}
      </Pressable>

      {/* Upgrade Modal for AI Trainer */}
      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        featureName="AI Trainer"
      />

      {/* Mode chooser */}
      <Modal visible={showChooser} transparent animationType="fade" onRequestClose={() => setShowChooser(false)}>
        <Pressable onPress={() => setShowChooser(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.25)" }} />
        <View
          style={{
            position: "absolute",
            right: 12,
            top: 92,
            backgroundColor: "#0f1317",
            borderRadius: 16,
            paddingVertical: 8,
            paddingHorizontal: 8,
            borderWidth: 1,
            borderColor: "#1a222b",
            minWidth: 220,
          }}
        >
          <Text style={{ fontSize: 12, color: theme.colors.textLo, marginBottom: 6, marginLeft: 6, fontWeight: "700" }}>
            Switch mode
          </Text>
          {ALL_MODES.map(({ key, label, icon }) => (
            <ModeItem
              key={key}
              icon={icon}
              label={label}
              onPress={() => {
                Haptics.selectionAsync();
                setMode(key as any);
                setShowChooser(false);
              }}
            />
          ))}
        </View>
      </Modal>

      {/* AI Trainer Chat Modal */}
      <Modal
        visible={showAITrainer}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowAITrainer(false)}
      >
        <AITrainerChat onClose={() => setShowAITrainer(false)} />
      </Modal>
    </SafeAreaView>
  );
}

/* ======================= RUNNING (inline, unchanged) ======================= */
function RunningHome() {
  const weekly = { milesGoal: 10, milesDone: 2, paceGoal: "7:50" };
  const progressMiles = weekly.milesGoal > 0 ? Math.min(1, weekly.milesDone / weekly.milesGoal) : 0;

  const runs: Array<{ dateISO: string; miles: number; minutes: number; where: string }> = [
    { dateISO: new Date().toISOString(), miles: 4.8, minutes: 70, where: "Central Park" },
    { dateISO: new Date(Date.now() - 86400000).toISOString(), miles: 2.2, minutes: 40, where: "Times Square" },
  ];

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 120,
          paddingTop: 26,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Card>
          <Text
            style={{
              ...theme.text.h1,
              color: theme.colors.textHi,
              textAlign: "center",
              marginBottom: theme.layout.lg,
            }}
          >
            Weekly Goals
          </Text>

          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6, gap: 10 }}>
              <Text style={{ color: "#111", fontWeight: "900", flex: 1 }}>{weekly.milesGoal} miles</Text>
              <Text style={{ color: "#111", fontWeight: "900" }}>{Math.round(progressMiles * 100)}%</Text>
            </View>
            <ProgressBar value={progressMiles} />
          </View>

          <View>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6, gap: 10 }}>
              <Text style={{ color: "#111", fontWeight: "900", flex: 1 }}>{`Better than ${weekly.paceGoal} pace`}</Text>
              <Text style={{ color: "#111", fontWeight: "900" }}>{weekly.paceGoal}</Text>
            </View>
            <ProgressBar value={0} />
          </View>

          <View style={{ alignItems: "flex-end", marginTop: 12 }}>
            <PrimaryButton label="+ Add Weekly Goal" onPress={() => router.push("/(tabs)/(home)/running/weekly-goals")} />
          </View>
        </Card>

        <Card>
          <CardTitle>Weekly Progress</CardTitle>
          <Muted>PRs and improvements (e.g., fastest 5K, best weekly distance) will appear here.</Muted>
        </Card>

        <Card>
          <CardTitle>Runs this week</CardTitle>
          <View style={{ gap: 10 }}>
            {runs.map((r, i) => (
              <View
                key={i}
                style={{
                  borderWidth: 1,
                  borderColor: "#e8e8e8",
                  backgroundColor: "#fff",
                  borderRadius: 12,
                  padding: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <View
                  style={{
                    minWidth: 60,
                    paddingVertical: 8,
                    paddingHorizontal: 10,
                    borderRadius: 999,
                    backgroundColor: "#0b0b0c",
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "900", textAlign: "center" }}>{fmtDate(r.dateISO)}</Text>
                </View>
                <Text style={{ color: "#111", fontWeight: "700", flexShrink: 1 }} numberOfLines={2}>
                  {`${r.miles.toFixed(1)} miles in ${Math.floor(r.minutes / 60)} hr ${r.minutes % 60} min at ${r.where}`}
                </Text>
              </View>
            ))}
            {runs.length === 0 && <Text style={{ color: "#666", fontWeight: "700" }}>No runs logged this week yet.</Text>}
          </View>
        </Card>
      </ScrollView>

      <Fab
        label="Log run"
        onPress={() => {
          Haptics.selectionAsync();
        }}
      />
    </>
  );
}

/* ------------------------ Small shared helpers ------------------------ */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        borderRadius: 16,
        backgroundColor: "#0E1216",
        padding: 16,
        borderWidth: (StyleSheet as any).hairlineWidth,
        borderColor: "rgba(255,255,255,0.06)",
      }}
    >
      {children}
    </View>
  );
}
function CardTitle({ children }: { children: React.ReactNode }) {
  return <Text style={{ ...theme.text.h2, color: theme.colors.textHi, marginBottom: theme.layout.sm }}>{children}</Text>;
}
function Muted({ children }: { children: React.ReactNode }) {
  return <Text style={{ ...theme.text.muted, color: theme.colors.textLo }}>{children}</Text>;
}
function Fab({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        position: "absolute",
        right: 16,
        bottom: 20,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 999,
        backgroundColor: pressed ? theme.colors.brandDim : theme.colors.brand,
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
      })}
    >
      <Ionicons name="add" size={18} color="#fff" />
      <Text style={{ color: "#fff", fontWeight: "900" }}>{label}</Text>
    </Pressable>
  );
}
function ModeItem({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderRadius: 12,
        backgroundColor: pressed ? "#151b22" : "transparent",
      })}
    >
      {icon}
      <Text style={{ fontSize: 16, fontWeight: "700", color: theme.colors.textHi, flex: 1 }}>{label}</Text>
    </Pressable>
  );
}
































