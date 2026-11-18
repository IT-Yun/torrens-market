import 'react-native-url-polyfill/auto';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

// Session tokens belong in the device keychain, not plaintext storage
// (ops-roadmap hardening). Falls back to AsyncStorage where SecureStore
// is unavailable, and migrates any pre-existing AsyncStorage session.
const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      const secure = await SecureStore.getItemAsync(key);
      if (secure != null) return secure;
      const legacy = await AsyncStorage.getItem(key);
      if (legacy != null) {
        await SecureStore.setItemAsync(key, legacy).catch(() => {});
        await AsyncStorage.removeItem(key).catch(() => {});
      }
      return legacy;
    } catch {
      return AsyncStorage.getItem(key);
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      await AsyncStorage.setItem(key, value);
    }
  },
  async removeItem(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key).catch(() => {});
    await AsyncStorage.removeItem(key).catch(() => {});
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase config. Copy .env.example to .env and fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

// Keep the access token fresh while the app is foregrounded so a signed-in
// user stays signed in indefinitely (Supabase's documented RN pattern).
supabase.auth.startAutoRefresh();
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
