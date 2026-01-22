// app/(tabs)/purchase-premium/_layout.tsx
import { Stack } from "expo-router";

export default function PurchasePremiumStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* index.tsx is the Purchase Premium screen */}
      <Stack.Screen 
        name="index" 
        options={{
          animation: 'fade', // Fade animation like Progress Graphs
        }}
      />
    </Stack>
  );
}
