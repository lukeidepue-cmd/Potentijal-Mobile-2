// app/(tabs)/(home)/_layout.tsx
import { Stack } from "expo-router";

export default function HomeStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* index.tsx is the Home screen */}
      <Stack.Screen name="index" />
      {/* basketball sub-screens use their own headers or custom UI */}
      <Stack.Screen name="basketball/weekly-goals" />
      <Stack.Screen name="basketball/add-practice" />
      <Stack.Screen name="basketball/add-game" />
      <Stack.Screen name="schedule-week" />
      <Stack.Screen name="add-weekly-goal" />
    </Stack>
  );
}
