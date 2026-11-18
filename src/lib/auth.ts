import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
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
 * Native Sign in with Apple (App Store review expects the native sheet).
 * Uses the id-token flow: Apple returns an identity token bound to a nonce,
 * which Supabase verifies against our bundle id (no client secret needed).
 */
export async function signInWithApple(): Promise<void> {
  const rawNonce = Crypto.randomUUID().replace(/-/g, '');
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );

  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED')
      throw new Error('auth_cancelled');
    throw e;
  }
  if (!credential.identityToken) throw new Error('auth_no_token');

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  });
  if (error) throw error;

  // Apple sends the name only on first authorization — persist it then.
  const name = credential.fullName?.givenName
    ? `${credential.fullName.givenName} ${credential.fullName.familyName ?? ''}`.trim()
    : null;
  if (name) {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      await supabase.from('profiles').update({ display_name: name }).eq('id', data.user.id);
    }
  }
}

/** Email OTP fallback: sends a 6-digit code to the address. */
export async function sendEmailCode(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) throw error;
}

export async function verifyEmailCode(email: string, token: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
