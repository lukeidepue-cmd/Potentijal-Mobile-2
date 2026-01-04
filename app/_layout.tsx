// app/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';

// these paths match what I see in your tree
import { AuthProvider } from '../providers/AuthProvider';
import { ModeProvider } from '../providers/ModeContext';
import { SettingsProvider } from '../providers/SettingsContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <ModeProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </ModeProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}





