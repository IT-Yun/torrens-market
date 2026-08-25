import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { AdelaideHero } from '../src/components/AdelaideHero';
import { GoogleLogo } from '../src/components/GoogleLogo';
import { Button, Field, Screen } from '../src/components/ui';
import { ChevronLeft } from 'lucide-react-native';
import { sendEmailCode, signInWithApple, signInWithProvider, verifyEmailCode } from '../src/lib/auth';
import { colors, spacing } from '../src/theme';

export default function AuthScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  // Resend cooldown: cost defense against OTP email hammering (spec-abuse-cost-defense)
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown > 0]);

  const sendCode = () =>
    run('send', async () => {
      await sendEmailCode(email.trim());
      setCodeSent(true);
      setCooldown(60);
    });

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      const msg = (e as Error).message ?? '';
      if (msg === 'auth_cancelled') return;
      if (/rate limit|too many|429/i.test(msg)) Alert.alert(t('auth.rateLimited'));
      else Alert.alert(t('auth.error'));
    } finally {
      setBusy(null);
    }
  }

  const oauth = (provider: 'google' | 'apple') =>
    run(provider, async () => {
      await signInWithProvider(provider);
      router.replace('/');
    });

  const appleNative = () =>
    run('apple', async () => {
      await signInWithApple();
      router.replace('/');
    });

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        {router.canGoBack() && (
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            accessibilityRole="button"
            style={{ alignSelf: 'flex-start' }}
          >
            <ChevronLeft size={28} color={colors.text} />
          </Pressable>
        )}
        <AdelaideHero width={280} height={157} />
        <Text style={styles.title}>Torrens Market</Text>
        <Text style={styles.tagline}>{t('auth.tagline')}</Text>

        <View style={{ gap: spacing.sm, alignSelf: 'stretch', marginTop: spacing.xl }}>
          <Pressable
            style={styles.googleButton}
            disabled={busy === 'google'}
            onPress={() => oauth('google')}
            accessibilityRole="button"
            accessibilityLabel={t('auth.continueWithGoogle')}
          >
            <GoogleLogo size={18} />
            <Text style={styles.googleText}>{t('auth.continueWithGoogle')}</Text>
          </Pressable>
          {Platform.OS === 'ios' && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={12}
              style={styles.appleButton}
              onPress={appleNative}
            />
          )}

          <Text style={styles.divider}>{t('auth.orEmail')}</Text>

          {!codeSent ? (
            <>
              <Field
                placeholder={t('auth.emailPlaceholder')}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
              <Button
                title={t('auth.sendCode')}
                loading={busy === 'send'}
                disabled={!email.includes('@') || cooldown > 0}
                onPress={sendCode}
              />
            </>
          ) : (
            <>
              <Text style={styles.hint}>{t('auth.codeSent')}</Text>
              <Field
                placeholder={t('auth.codePlaceholder')}
                keyboardType="number-pad"
                value={code}
                onChangeText={setCode}
                maxLength={6}
              />
              <Button
                title={t('auth.verifyCode')}
                loading={busy === 'verify'}
                disabled={code.length !== 6}
                onPress={() =>
                  run('verify', async () => {
                    await verifyEmailCode(email.trim(), code.trim());
                    router.replace('/');
                  })
                }
              />
              <Button
                title={cooldown > 0 ? t('auth.resendIn', { s: cooldown }) : t('auth.resend')}
                variant="secondary"
                disabled={cooldown > 0}
                loading={busy === 'send'}
                onPress={sendCode}
              />
            </>
          )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: colors.primary, marginTop: spacing.md },
  tagline: { fontSize: 15, color: colors.textSecondary, marginTop: spacing.sm },
  divider: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 13,
    marginVertical: spacing.sm,
  },
  hint: { textAlign: 'center', color: colors.textSecondary, fontSize: 14 },
  appleButton: { alignSelf: 'stretch', height: 50 },
  googleButton: {
    alignSelf: 'stretch',
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleText: { fontSize: 17, fontWeight: '600', color: colors.text },
});
