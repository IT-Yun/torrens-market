import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from './supabase';

/**
 * Registers this device's Expo push token for the user. Best-effort:
 * remote push requires a physical device, granted permission, and an EAS
 * project id (dev builds / store builds — not Expo Go on Android).
 */
export async function registerPushToken(userId: string): Promise<void> {
  try {
    if (!Device.isDevice) return;

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return;

    const projectId =
      Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );

    await supabase
      .from('push_tokens')
      .upsert({ user_id: userId, token, updated_at: new Date().toISOString() });
  } catch {
    // push unavailable in this environment (e.g. simulator / Expo Go Android) — silently skip
  }
}
