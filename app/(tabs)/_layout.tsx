// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { PROFILE_FEATURES_ENABLED } from "../../constants/features";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#22C55E",
        tabBarStyle: { backgroundColor: "#0b0b0c", borderTopColor: "#141414" },
      }}
    >
      {/* Home tab is the (home) group */}
      <Tabs.Screen
        name="(home)"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="workouts"
        options={{
          title: "Workouts",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="dumbbell" color={color} size={size} />
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
        name="meals"
        options={{
          title: "Coming Soon",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="hourglass-outline" color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="hourglass-outline" color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" color={color} size={size} />
          ),
          href: PROFILE_FEATURES_ENABLED ? undefined : null, // Hide from tab bar if profile features disabled
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














