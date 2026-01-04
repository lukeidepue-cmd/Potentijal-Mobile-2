// app/(tabs)/settings/_layout.tsx
// Settings Layout - All settings screens are nested and not shown as tabs
import { Stack } from "expo-router";

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="account/email-password" />
      <Stack.Screen name="account/delete-account" />
      <Stack.Screen name="sports-training/my-sports" />
      <Stack.Screen name="sports-training/add-sports" />
      <Stack.Screen name="ai-trainer/index" />
      <Stack.Screen name="notifications/index" />
      <Stack.Screen name="privacy-security/index" />
      <Stack.Screen name="privacy-security/blocked-users" />
      <Stack.Screen name="premium/manage-subscription" />
      <Stack.Screen name="premium/restore-purchases" />
      <Stack.Screen name="premium/redeem-code" />
      <Stack.Screen name="app-preferences/units" />
      <Stack.Screen name="support-legal/help" />
      <Stack.Screen name="support-legal/contact" />
      <Stack.Screen name="support-legal/privacy-policy" />
      <Stack.Screen name="support-legal/terms" />
      <Stack.Screen name="about/credits" />
    </Stack>
  );
}

