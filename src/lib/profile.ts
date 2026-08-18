import * as ImagePicker from 'expo-image-picker';
import { compressForUpload } from './images';
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
  const compressed = await compressForUpload(asset, 512);
  const path = `${userId}/avatar-${Date.now()}.jpg`;
  const response = await fetch(compressed.uri);
  const arrayBuffer = await response.arrayBuffer();
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, arrayBuffer, { contentType: compressed.mimeType });
  if (error) throw error;
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}
