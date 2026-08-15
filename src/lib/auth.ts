import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

const redirectTo = makeRedirectUri();

/** OAuth via Supabase (Google/Apple). Opens a browser session and exchanges the code. */
export async function signInWithProvider(provider: 'google' | 'apple'): Promise<void> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') throw new Error('auth_cancelled');

  const url = new URL(result.url);
  const code = url.searchParams.get('code');
  if (!code) throw new Error('auth_no_code');

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw exchangeError;
}

/**
 * Email + password fallback. Tries sign-in first; if the account doesn't
 * exist, signs up (auto-confirmed — no email round-trip on this project).
 */
export async function signInWithEmailPassword(email: string, password: string): Promise<void> {
  const signIn = await supabase.auth.signInWithPassword({ email, password });
  if (!signIn.error) return;

  if (signIn.error.message.includes('Invalid login credentials')) {
    const signUp = await supabase.auth.signUp({ email, password });
    if (signUp.error) throw signUp.error;
    if (!signUp.data.session) throw new Error('auth_needs_confirmation');
    return;
  }
  throw signIn.error;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
