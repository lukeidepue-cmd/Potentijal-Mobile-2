// lib/expo-env.ts
// Runtime checks for which Expo environment we're in.
//
// `isExpoGo()` returns true when the app is running inside the Expo Go sandbox
// (i.e. `expo start --go`). Expo Go ships a fixed set of native modules and
// **does not** include react-native-purchases (RevenueCat), so any Purchases.*
// call there throws. Use this guard around RevenueCat configure / login /
// purchase calls so dev in Expo Go doesn't crash the auth flow.

import Constants from 'expo-constants';

export function isExpoGo(): boolean {
  return Constants.executionEnvironment === 'storeClient';
}
