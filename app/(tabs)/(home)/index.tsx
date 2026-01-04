// app/(tabs)/(home)/index.tsx
import React, { useState } from "react";
import { SafeAreaView, View, Text, Pressable, Modal, ScrollView, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets, SafeAreaProvider } from "react-native-safe-area-context";

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

  // Inline header only for inline pages (right now: none)
  // For lifting, basketball, football, soccer, baseball, hockey, and tennis modes, use View instead of SafeAreaView to allow calendar to extend to top
  if (isDedicated && (m === "lifting" || m === "basketball" || m === "football" || m === "soccer" || m === "baseball" || m === "hockey" || m === "tennis")) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0B0E10" }}>
        {m === "lifting" ? <LiftingHomeScreen /> : 
         m === "basketball" ? <BasketballHomeScreen /> : 
         m === "football" ? <FootballHomeScreen /> : 
         m === "soccer" ? <SoccerHomeScreen /> :
         m === "baseball" ? <BaseballHomeScreen /> :
         m === "hockey" ? <HockeyHomeScreen /> :
         <TennisHomeScreen />}
      </View>
    );
  }

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
        m === "lifting" || m === "basketball" || m === "football" || m === "soccer" || m === "baseball" || m === "hockey" || m === "tennis" ? (
          // Lifting, basketball, football, soccer, baseball, hockey, and tennis are handled in early return above
          null
        ) : null
      ) : null}

      {/* Floating mode switcher (kept for dedicated pages, but NOT for lifting, basketball, football, soccer, baseball, hockey, or tennis mode) */}
      {isDedicated && m !== "lifting" && m !== "basketball" && m !== "football" && m !== "soccer" && m !== "baseball" && m !== "hockey" && m !== "tennis" && (
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

      {/* AI Trainer Button - Sticky bottom left (hidden for lifting, basketball, football, soccer, baseball, hockey, and tennis mode) */}
      {m !== "lifting" && m !== "basketball" && m !== "football" && m !== "soccer" && m !== "baseball" && m !== "hockey" && m !== "tennis" && (
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
      )}

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

/* ------------------------ Small shared helpers ------------------------ */
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
































