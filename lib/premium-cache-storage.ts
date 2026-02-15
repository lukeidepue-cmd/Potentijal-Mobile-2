/**
 * Storage for premium cache (M2). Uses SecureStore on native so premium flags
 * aren't in plaintext; AsyncStorage on web. Server always re-validates for authz.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

export async function getPremiumCacheItem(key: string): Promise<string | null> {
  if (isNative) return SecureStore.getItemAsync(key);
  return AsyncStorage.getItem(key);
}

export async function setPremiumCacheItem(key: string, value: string): Promise<void> {
  if (isNative) return SecureStore.setItemAsync(key, value);
  return AsyncStorage.setItem(key, value);
}
