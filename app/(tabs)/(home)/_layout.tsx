// app/(tabs)/(home)/_layout.tsx
import { Stack } from "expo-router";

export default function HomeStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* index.tsx is the Home screen */}
      <Stack.Screen name="index" />
      {/* basketball sub-screens use their own headers or custom UI */}
      <Stack.Screen name="basketball/weekly-goals" />
      <Stack.Screen 
        name="basketball/add-practice" 
        options={{
          animation: 'fade', // Fade in quickly so our custom animation is visible
          // Don't use transparentModal - it hides the tab bar
        }}
      />
      <Stack.Screen 
        name="basketball/add-game" 
        options={{
          animation: 'fade', // Fade in quickly so our custom animation is visible
          // Don't use transparentModal - it hides the tab bar
        }}
      />
      {/* football sub-screens use their own headers or custom UI */}
      <Stack.Screen 
        name="football/add-practice" 
        options={{
          animation: 'fade', // Fade in quickly so our custom animation is visible
          // Don't use transparentModal - it hides the tab bar
        }}
      />
      <Stack.Screen 
        name="football/add-game" 
        options={{
          animation: 'fade', // Fade in quickly so our custom animation is visible
          // Don't use transparentModal - it hides the tab bar
        }}
      />
      {/* baseball sub-screens use their own headers or custom UI */}
      <Stack.Screen 
        name="baseball/add-practice" 
        options={{
          animation: 'fade', // Fade in quickly so our custom animation is visible
          // Don't use transparentModal - it hides the tab bar
        }}
      />
      <Stack.Screen 
        name="baseball/add-game" 
        options={{
          animation: 'fade', // Fade in quickly so our custom animation is visible
          // Don't use transparentModal - it hides the tab bar
        }}
      />
      {/* soccer sub-screens use their own headers or custom UI */}
      <Stack.Screen 
        name="soccer/add-practice" 
        options={{
          animation: 'fade', // Fade in quickly so our custom animation is visible
          // Don't use transparentModal - it hides the tab bar
        }}
      />
      <Stack.Screen 
        name="soccer/add-game" 
        options={{
          animation: 'fade', // Fade in quickly so our custom animation is visible
          // Don't use transparentModal - it hides the tab bar
        }}
      />
      {/* hockey sub-screens use their own headers or custom UI */}
      <Stack.Screen 
        name="hockey/add-practice" 
        options={{
          animation: 'fade', // Fade in quickly so our custom animation is visible
          // Don't use transparentModal - it hides the tab bar
        }}
      />
      <Stack.Screen 
        name="hockey/add-game" 
        options={{
          animation: 'fade', // Fade in quickly so our custom animation is visible
          // Don't use transparentModal - it hides the tab bar
        }}
      />
      {/* tennis sub-screens use their own headers or custom UI */}
      <Stack.Screen 
        name="tennis/add-practice" 
        options={{
          animation: 'fade', // Fade in quickly so our custom animation is visible
          // Don't use transparentModal - it hides the tab bar
        }}
      />
      <Stack.Screen 
        name="tennis/add-game" 
        options={{
          animation: 'fade', // Fade in quickly so our custom animation is visible
          // Don't use transparentModal - it hides the tab bar
        }}
      />
      <Stack.Screen 
        name="schedule-week" 
        options={{
          animation: 'fade', // Fade in quickly so our custom animation is visible
        }}
      />
      <Stack.Screen name="add-weekly-goal" />
    </Stack>
  );
}
