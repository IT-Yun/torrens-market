import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Field, Screen } from '../src/components/ui';
import { signInWithEmailPassword, signInWithProvider } from '../src/lib/auth';
import { colors, spacing } from '../src/theme';

export default function AuthScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      if ((e as Error).message !== 'auth_cancelled') Alert.alert(t('auth.error'));
    } finally {
      setBusy(null);
    }
  }

  const oauth = (provider: 'google' | 'apple') =>
    run(provider, async () => {
      await signInWithProvider(provider);
      router.replace('/');
    });

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.logo}>🏞️</Text>
        <Text style={styles.title}>Torrens Market</Text>
        <Text style={styles.tagline}>{t('auth.tagline')}</Text>

        <View style={{ gap: spacing.sm, alignSelf: 'stretch', marginTop: spacing.xl }}>
          <Button
            title={t('auth.continueWithGoogle')}
            variant="outline"
            loading={busy === 'google'}
            onPress={() => oauth('google')}
          />
          {Platform.OS === 'ios' && (
            <Button
              title={t('auth.continueWithApple')}
              variant="outline"
              loading={busy === 'apple'}
              onPress={() => oauth('apple')}
            />
          )}

          <Text style={styles.divider}>{t('auth.orEmail')}</Text>

          <Field
            placeholder={t('auth.emailPlaceholder')}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Field
            placeholder={t('auth.passwordPlaceholder')}
            secureTextEntry
            autoCapitalize="none"
            value={password}
            onChangeText={setPassword}
          />
          <Text style={styles.hint}>{t('auth.passwordHint')}</Text>
          <Button
            title={t('auth.signIn')}
            loading={busy === 'email'}
            disabled={!email.includes('@') || password.length < 6}
            onPress={() =>
              run('email', async () => {
                await signInWithEmailPassword(email.trim(), password);
                router.replace('/');
              })
            }
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: 56 },
  title: { fontSize: 28, fontWeight: '700', color: colors.primary, marginTop: spacing.sm },
  tagline: { fontSize: 15, color: colors.textSecondary, marginTop: spacing.sm },
  divider: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 13,
    marginVertical: spacing.sm,
  },
  hint: { textAlign: 'center', color: colors.textSecondary, fontSize: 14 },
});
