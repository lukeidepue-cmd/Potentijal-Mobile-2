import React from "react";
import { Stack } from "expo-router";

export default function ProfileStack() {
  return (
    <Stack 
      screenOptions={{ headerShown: false }}
      initialRouteName="index"
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="edit" />
      <Stack.Screen name="find-friends" />
      <Stack.Screen name="creator-workouts" />
      <Stack.Screen name="followers" />
      <Stack.Screen name="following" />
    </Stack>
  );
}
