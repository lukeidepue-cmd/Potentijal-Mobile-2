// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { PROFILE_FEATURES_ENABLED } from "../../constants/features";
import { Platform } from "react-native";
import TabBarBackground from "../../components/ui/TabBarBackground";
import AnimatedTabBarIcon from "../../components/ui/AnimatedTabBarIcon";

export default function TabsLayout() {
  return (
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
        name="test-auth"
        options={{
          href: null, // Hide from tab bar
        }}
      />

      <Tabs.Screen
        name="test-onboarding"
        options={{
          href: null, // Hide from tab bar (testing tab - removed from frontend)
        }}
      />

      <Tabs.Screen
        name="meals"
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

      <Tabs.Screen
        name="profile"
        options={{
          href: null, // Hide from tab bar (testing tab - removed from frontend)
        }}
      />

      <Tabs.Screen
        name="scan"
        options={{
          href: null, // Hide from tab bar
        }}
      />

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
        name="settings/sports-training/my-sports"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="settings/sports-training/add-sports"
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
        name="settings/premium/redeem-code"
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
  );
}














