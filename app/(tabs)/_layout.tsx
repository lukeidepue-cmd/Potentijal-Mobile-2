// app/(tabs)/_layout.tsx
import { Tabs, router, usePathname, type Href } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { PROFILE_FEATURES_ENABLED } from "../../constants/features";
import { Platform, View } from "react-native";
import { useEffect } from "react";
import TabBarBackground from "../../components/ui/TabBarBackground";
import AnimatedTabBarIcon from "../../components/ui/AnimatedTabBarIcon";
import { useTutorial } from "../../providers/TutorialContext";
import { BuildPresetTutorialOverlay } from "../../components/BuildPresetTutorialOverlay";
import { SpotlightTutorialOverlay } from "../../components/SpotlightTutorialOverlay";
import { TutorialSkipButton } from "../../components/TutorialSkipButton";
import type { TutorialStep } from "../../lib/tutorial";

// Steps whose spotlight targets a piece of screen content (as opposed to a tab
// button or a full-screen intro). These only work while their owning screen is
// mounted to publish a contentRect via TutorialContext.
//
// `href` is where to send the user; `match` is what usePathname() reports when
// they're already there (expo-router strips group segments like (tabs)/(home)).
const CONTENT_STEP_SCREEN: Partial<
  Record<TutorialStep, { href: Href; match: string }>
> = {
  workouts_preset: { href: "/(tabs)/workouts", match: "/workouts" },
  workouts_exercise_box: { href: "/(tabs)/workouts", match: "/workouts" },
  workouts_progress_tab: { href: "/(tabs)/workouts", match: "/workouts" },
  progress_graph_button: { href: "/(tabs)/meals", match: "/meals" },
  progress_build_view_button: {
    href: "/(tabs)/meals/progress-graphs",
    match: "/meals/progress-graphs",
  },
};

export default function TabsLayout() {
  const { step, setStep, setContentRect, contentRect } = useTutorial();
  const pathname = usePathname();
  const tutorialActive = step !== "done";

  // Resume the tutorial on the screen its current step belongs to.
  //
  // Without this, relaunching the app mid-tutorial restores the step but lands
  // the user on Home, where nothing publishes a contentRect. The spotlight then
  // has no hole to draw and every tab is blocked by the gating below — the user
  // is stuck with no route forward. Debounced so it can't fire during the normal
  // gap between mount and measureInWindow() resolving.
  useEffect(() => {
    const target = CONTENT_STEP_SCREEN[step];
    if (!target) return;
    if (contentRect) return; // the owning screen is mounted and measured
    if (pathname === target.match) return; // already there, just still measuring
    const t = setTimeout(() => router.replace(target.href), 600);
    return () => clearTimeout(t);
  }, [step, contentRect, pathname]);

  // The Home dim overlay only shows for step 1.
  const showHomeOverlay = step === "build_preset";
  // The spotlight overlay (content + tab holes, or a full-screen intro) covers
  // the Home→Workouts, in-Workouts, and Progress/View tutorial steps.
  const showSpotlight =
    step === "home_workout_tab" ||
    step === "workouts_preset" ||
    step === "workouts_exercise_box" ||
    step === "workouts_progress_tab" ||
    step === "progress_graph_button" ||
    step === "progress_graph_intro" ||
    step === "progress_build_view_button" ||
    step === "view_intro";

  // Per-tab press gating: during the tutorial, block every tab EXCEPT the one
  // the current step wants the user to move to. `allowStep` is the step during
  // which this tab is the intended destination (null = never the target).
  const tabListeners = (allowStep: TutorialStep | null) => ({
    tabPress: (e: { preventDefault: () => void }) => {
      if (step === "done") return; // tutorial inactive — normal behavior
      if (allowStep && step === allowStep) return; // this tab is the target — allow
      e.preventDefault(); // otherwise block
    },
  });

  return (
    <View style={{ flex: 1 }}>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#22C55E", // Brand green
        tabBarInactiveTintColor: "rgba(255, 255, 255, 0.5)", // More subtle inactive
        tabBarBackground: TabBarBackground,
        tabBarStyle: {
          backgroundColor: "transparent",
          borderTopWidth: 0,
          borderTopColor: "transparent",
          elevation: 0,
          shadowOpacity: 0,
          position: "absolute",
          paddingBottom: Platform.OS === "ios" ? 12 : 0,
          paddingTop: 12,
          height: Platform.OS === "ios" ? 80 : 56,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: -2,
          letterSpacing: 0.3,
        },
        tabBarItemStyle: {
          paddingTop: 4,
          paddingBottom: 2,
        },
        tabBarShowLabel: true,
      }}
    >
      {/* Home tab is the (home) group */}
      <Tabs.Screen
        name="(home)"
        listeners={tabListeners(null)}
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused, size }) => (
            <AnimatedTabBarIcon focused={focused}>
              <Ionicons
                name={focused ? "home" : "home-outline"}
                color={color}
                size={size}
              />
            </AnimatedTabBarIcon>
          ),
        }}
      />

      <Tabs.Screen
        name="workouts"
        listeners={tabListeners("home_workout_tab")}
        options={{
          title: "Workouts",
          tabBarIcon: ({ color, focused, size }) => (
            <AnimatedTabBarIcon focused={focused}>
              <MaterialCommunityIcons
                name="dumbbell"
                color={color}
                size={size}
              />
            </AnimatedTabBarIcon>
          ),
        }}
      />

      <Tabs.Screen
        name="workout-summary"
        options={{
          href: null, // Hide from tab bar
        }}
      />

      <Tabs.Screen
        name="meals"
        listeners={tabListeners("workouts_progress_tab")}
        options={{
          title: "Progress",
          tabBarIcon: ({ color, focused, size }) => (
            <AnimatedTabBarIcon focused={focused}>
              <Ionicons 
                name={focused ? "stats-chart" : "stats-chart-outline"} 
                color={color} 
                size={size} 
              />
            </AnimatedTabBarIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="meals/progress-graphs"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="meals/skill-map"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="meals/consistency-score"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="meals/training-statistics"
        options={{
          href: null, // Hide from tab bar
        }}
      />

      <Tabs.Screen
        name="history"
        listeners={tabListeners(null)}
        options={{
          title: "History",
          tabBarIcon: ({ color, focused, size }) => (
            <AnimatedTabBarIcon focused={focused}>
              <Ionicons 
                name={focused ? "hourglass" : "hourglass-outline"} 
                color={color} 
                size={size} 
              />
            </AnimatedTabBarIcon>
          ),
        }}
      />

      {/* profile/ now lives in _disabled-features/ — see that folder's README. */}

      <Tabs.Screen
        name="purchase-premium"
        options={{
          href: null, // Hide from tab bar (accessed from upgrade modals)
        }}
      />

      {/* Hide ALL settings screens from tab bar - they're only accessible via settings button */}
      <Tabs.Screen
        name="settings"
        options={{
          href: null, // Hide from tab bar (accessed from home screen)
        }}
      />
      <Tabs.Screen
        name="settings/ai-trainer"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="settings/notifications"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="settings/privacy-security"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="settings/account/email-password"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="settings/account/delete-account"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="settings/nutrition/units"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="settings/privacy-security/blocked-users"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="settings/premium/manage-subscription"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="settings/premium/restore-purchases"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="settings/app-preferences/units"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="settings/support-legal/help"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="settings/support-legal/contact"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="settings/support-legal/privacy-policy"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="settings/support-legal/terms"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="settings/about/credits"
        options={{ href: null }}
      />
    </Tabs>

    {/* Tutorial step 1 overlay — sits above the tab bar so the user can ONLY tap
        Build New Preset. Tapping it advances the tutorial to the New Preset
        screen's intro step and opens the builder. */}
    {showHomeOverlay && (
      <BuildPresetTutorialOverlay
        onPressBuildPreset={async () => {
          await setStep("preset_intro");
          router.push("/(tabs)/(home)/build-preset");
        }}
      />
    )}

    {/* Spotlight overlay for the Home→Workouts hop and the in-Workouts steps.
        It dims everything except the relevant screen content (reported by the
        active screen via context) and/or the real tab button (computed by step). */}
    {showSpotlight && (
      <SpotlightTutorialOverlay
        step={step}
        contentRect={contentRect}
        onIntroAdvance={() => {
          if (step === "progress_graph_intro") setStep("progress_build_view_button");
          else if (step === "view_intro") setStep("view_build");
        }}
      />
    )}

    {/* Escape hatch. Rendered last and at a higher zIndex than the overlays, so
        it stays tappable on every step — including ones that dim the screen and
        block all four tabs. Shown for the whole tutorial, not just the dimmed
        steps, so steps like preset_build (no dim, but the user is held on the
        screen until they create a preset) are escapable too. */}
    {tutorialActive && (
      <TutorialSkipButton
        onSkip={async () => {
          setContentRect(null);
          await setStep("done");
        }}
      />
    )}
    </View>
  );
}














