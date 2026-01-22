// app/onboarding/_layout.tsx
// Onboarding flow layout - Stack navigator for all onboarding screens
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade', // Smooth fade transitions between screens
      }}
    >
      {/* Screen 1: Welcome/Auth Selection */}
      <Stack.Screen name="welcome" />
      
      {/* Screen 2: Email Entry */}
      <Stack.Screen name="email-entry" />
      
      {/* Screen 3: Email Verification */}
      <Stack.Screen name="email-verification" />
      
      {/* Screen 4: Account Basics (Name, Age) */}
      <Stack.Screen name="account-basics" />
      
      {/* Screen 5: Sport Selection */}
      <Stack.Screen name="sport-selection" />
      
      {/* Screen 6: Training Intent */}
      <Stack.Screen name="training-intent" />
      
      {/* Screen 7: App Introduction */}
      <Stack.Screen name="app-intro" />
      
      {/* Screen 8: Notifications */}
      <Stack.Screen name="notifications" />
      
      {/* Screen 9: Premium Offer */}
      <Stack.Screen name="premium-offer" />
      
      {/* Screen 10: Completion */}
      <Stack.Screen name="completion" />
    </Stack>
  );
}
