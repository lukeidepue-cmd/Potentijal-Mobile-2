// app/(tabs)/history/_layout.tsx
import React from "react";
import { Stack } from "expo-router";

export default function HistoryStack() {
  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}