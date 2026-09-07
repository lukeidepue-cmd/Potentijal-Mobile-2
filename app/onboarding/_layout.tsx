// app/onboarding/_layout.tsx
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      <Stack.Screen name="identity" />
      <Stack.Screen name="sport-selection" />
      <Stack.Screen name="email-entry" />
      <Stack.Screen name="email-verification" />
      <Stack.Screen name="name-entry" />
    </Stack>
  );
}
