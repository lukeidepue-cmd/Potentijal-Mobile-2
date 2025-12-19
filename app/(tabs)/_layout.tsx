// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

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
          title: "Meals",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="fast-food-outline" color={color} size={size} />
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
        }}
      />

      <Tabs.Screen
        name="scan"
        options={{
          href: null, // Hide from tab bar (accessed from meals tab)
        }}
      />

      <Tabs.Screen
        name="purchase-premium"
        options={{
          href: null, // Hide from tab bar (accessed from upgrade modals)
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          href: null, // Hide from tab bar (accessed from home screen)
        }}
      />
    </Tabs>
  );
}














