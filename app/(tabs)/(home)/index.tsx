// app/(tabs)/(home)/index.tsx
import React, { useState, useCallback } from "react";
import { SafeAreaView, View, Text, Pressable, Modal, ScrollView, StyleSheet, Image } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { router, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets, SafeAreaProvider } from "react-native-safe-area-context";

import { useMode } from "../../../providers/ModeContext";
import { theme } from "../../../constants/theme";
import { useAvailableModes } from "../../../hooks/useAvailableModes";
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
  const { mode, setMode, modeLoading } = useMode();
  const { canUseAITrainer } = useFeatures();
  const { user } = useAuth();
  const [showChooser, setShowChooser] = useState(false);
  const [showAITrainer, setShowAITrainer] = useState(false);
  const { availableModes, refresh: refreshAvailableModes } = useAvailableModes();

  // Refresh available modes when screen comes into focus (e.g., after adding a sport)
  useFocusEffect(
    useCallback(() => {
      refreshAvailableModes();
    }, [refreshAvailableModes])
  );
  
  // Convert available modes to format with React node icons
  const availableModesWithIcons = availableModes.map((m) => {
    const iconMap: Record<string, React.ReactNode> = {
      "lifting": <MaterialCommunityIcons name="dumbbell" size={18} color={theme.colors.textHi} />,
      "basketball": <Ionicons name="basketball-outline" size={18} color={theme.colors.textHi} />,
      "football": <Ionicons name="american-football-outline" size={18} color={theme.colors.textHi} />,
      "baseball": <MaterialCommunityIcons name="baseball" size={18} color={theme.colors.textHi} />,
      "soccer": <Ionicons name="football-outline" size={18} color={theme.colors.textHi} />,
      "hockey": <MaterialCommunityIcons name="hockey-sticks" size={18} color={theme.colors.textHi} />,
      "tennis": <Ionicons name="tennisball-outline" size={18} color={theme.colors.textHi} />,
    };
    return {
      key: m.key,
      label: m.label,
      icon: iconMap[m.key] || <MaterialCommunityIcons name="dumbbell" size={18} color={theme.colors.textHi} />,
    };
  });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const insets = useSafeAreaInsets();

  const m = (mode || "lifting").toLowerCase() as ModeKey;
  const isDedicated = DEDICATED.includes(m);

  // Animation for spinning star loading
  const starRotation = useSharedValue(0);
  
  // Hide loading overlay after initial mount
  React.useEffect(() => {
    if (isInitialLoad) {
      starRotation.value = withRepeat(
        withTiming(360, {
          duration: 800,
          easing: Easing.linear,
        }),
        -1,
        false
      );
    } else {
      starRotation.value = 0;
    }
  }, [isInitialLoad]);

  const starAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${starRotation.value}deg` }],
  }));

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
    }, 2000); // Show loading for 2 seconds on initial load
    return () => clearTimeout(timer);
  }, []);

  // Wait for mode to load before rendering sport-specific screens
  // This ensures we start in the correct mode (primary sport) instead of defaulting to lifting
  if (modeLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0B0E10", justifyContent: 'center', alignItems: 'center' }}>
        <Animated.View style={starAnimatedStyle}>
          <Image
            source={require("../../../assets/star.png")}
            style={{ width: 150, height: 150 }}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    );
  }

  // Inline header only for inline pages (right now: none)
  // For lifting, basketball, football, soccer, baseball, hockey, and tennis modes, use View instead of SafeAreaView to allow calendar to extend to top
  if (isDedicated && (m === "lifting" || m === "basketball" || m === "football" || m === "soccer" || m === "baseball" || m === "hockey" || m === "tennis")) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0B0E10" }}>
        {isInitialLoad && (
          <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
            <View style={{ flex: 1, backgroundColor: "#0B0E10", justifyContent: 'center', alignItems: 'center' }}>
              <Animated.View style={starAnimatedStyle}>
                <Image
                  source={require("../../../assets/star.png")}
                  style={{ width: 150, height: 150 }}
                  resizeMode="contain"
                />
              </Animated.View>
            </View>
          </View>
        )}
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
        <Pressable onPress={() => setShowChooser(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.2)" }} />
        <View
          style={{
            position: "absolute",
            right: 12,
            top: 92,
            alignItems: "flex-end",
          }}
        >
          {/* Triangle Arrow pointing to button */}
          <View
            style={{
              width: 0,
              height: 0,
              backgroundColor: "transparent",
              borderStyle: "solid",
              borderLeftWidth: 12,
              borderRightWidth: 12,
              borderBottomWidth: 12,
              borderLeftColor: "transparent",
              borderRightColor: "transparent",
              borderBottomColor: "rgba(0, 0, 0, 0.6)",
              marginBottom: -1,
              marginRight: 8,
              zIndex: 1,
            }}
          />
          <BlurView
            intensity={120}
            tint="dark"
            style={{
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.25)",
                borderRadius: 16,
                paddingVertical: 8,
                paddingHorizontal: 8,
                minWidth: 180,
              }}
            >
              <Text style={{ fontSize: 12, color: theme.colors.textLo, marginBottom: 6, marginLeft: 6, fontWeight: "700" }}>
                Switch mode
              </Text>
              {availableModesWithIcons.map(({ key, label, icon }) => (
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
          </BlurView>
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
































