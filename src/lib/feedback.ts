import Constants from 'expo-constants';
import { supabase } from './supabase';

export type FeedbackKind = 'bug' | 'suggestion' | 'other';

/** File an in-app bug/suggestion report (RLS: own rows only). */
export async function submitFeedback(
  userId: string,
  kind: FeedbackKind,
  message: string,
): Promise<void> {
  const appVersion = `${Constants.expoConfig?.version ?? '?'} (${Constants.nativeBuildVersion ?? '?'})`;
  const { error } = await supabase.from('feedback').insert({
    user_id: userId,
    kind,
    message: message.trim(),
    app_version: appVersion,
  });
  if (error) throw error;
}
