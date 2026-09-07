// app/(tabs)/(home)/_layout.tsx
import { Stack } from "expo-router";

export default function HomeStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      {/* No stack animation for add-game / add-practice — the custom
          shared-element animation in those screens handles the entire visual
          transition. contentStyle: transparent removes the native stack's
          opaque screen background, so the source screen stays visible through
          the one-frame gap before the destination's animated image paints. */}
      <Stack.Screen
        name="add-game"
        options={{ animation: "none", contentStyle: { backgroundColor: "transparent" } }}
      />
      <Stack.Screen
        name="add-practice"
        options={{ animation: "none", contentStyle: { backgroundColor: "transparent" } }}
      />
      <Stack.Screen name="schedule-week" options={{ animation: "fade" }} />
      <Stack.Screen name="build-preset" options={{ animation: "fade" }} />
      <Stack.Screen name="build-view" options={{ animation: "fade" }} />
    </Stack>
  );
}
