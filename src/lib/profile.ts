import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

/** Permanently delete the signed-in account (server verifies the JWT). */
export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-account');
  if (error) throw error;
  await supabase.auth.signOut();
}

/** Pick a single square-cropped avatar image, or null if cancelled. */
export async function pickAvatar(): Promise<ImagePicker.ImagePickerAsset | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'images',
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });
  return result.canceled ? null : result.assets[0];
}

/** Upload the avatar to storage and return its public URL. */
export async function uploadAvatar(
  userId: string,
  asset: ImagePicker.ImagePickerAsset,
): Promise<string> {
  const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const response = await fetch(asset.uri);
  const arrayBuffer = await response.arrayBuffer();
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, arrayBuffer, { contentType: asset.mimeType ?? 'image/jpeg' });
  if (error) throw error;
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}
