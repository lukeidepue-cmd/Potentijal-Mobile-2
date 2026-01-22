// app/(tabs)/meals/_layout.tsx
import { Stack } from "expo-router";

export default function MealsStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* index.tsx is the Progress main screen */}
      <Stack.Screen name="index" />
      {/* Progress sub-screens with fade animations */}
      <Stack.Screen 
        name="progress-graphs" 
        options={{
          animation: 'fade',
        }}
      />
      <Stack.Screen 
        name="skill-map" 
        options={{
          animation: 'fade',
        }}
      />
      <Stack.Screen 
        name="consistency-score" 
        options={{
          animation: 'fade',
        }}
      />
      <Stack.Screen 
        name="training-statistics" 
        options={{
          animation: 'fade',
        }}
      />
      <Stack.Screen 
        name="purchase-premium" 
        options={{
          animation: 'fade',
        }}
      />
    </Stack>
  );
}

