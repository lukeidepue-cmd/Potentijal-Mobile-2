// lib/supabase.ts
// H8: Auth session uses SecureStore on native (iOS/Android) when available; AsyncStorage on web; no-op for SSR.

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Prefer .env (process.env). Fallback to app.json extra so TestFlight/builds can connect.
const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? extra.supabaseUrl ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? extra.supabaseAnonKey ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  // Missing URL or anon key - set in .env or app.json extra
}

const safeUrl = supabaseUrl || 'https://placeholder.supabase.co';
const safeKey = supabaseAnonKey || 'placeholder-key';

// Supabase auth storage interface: getItem, setItem, removeItem (all async).
const noOpStorage = {
  getItem: async (): Promise<string | null> => null,
  setItem: async (): Promise<void> => {},
  removeItem: async (): Promise<void> => {},
};

// SecureStore adapter for Supabase auth (iOS Keychain). Tokens not in plaintext app storage.
// Android has a ~2KB value limit per key; Supabase session often exceeds it, so we use AsyncStorage on Android.
const secureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

// SSR: no-op so auth init doesn't throw; client rehydrates in browser.
// iOS: SecureStore (Keychain). Android + Web: AsyncStorage.
const isWebSSR = typeof window === 'undefined';
const isIOS = !isWebSSR && Platform.OS === 'ios';
const authStorage = isWebSSR
  ? noOpStorage
  : isIOS
    ? secureStoreAdapter
    : AsyncStorage;

export const supabase = createClient(safeUrl, safeKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
