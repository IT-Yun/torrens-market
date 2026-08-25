import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Button } from './ui';
import { colors, spacing } from '../theme';

/** Full-screen sign-in invitation shown to guests on account-only tabs. */
export function GuestCta({ emoji }: { emoji: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.wrap}>
      <Text style={{ fontSize: 44 }}>{emoji}</Text>
      <Text style={styles.title}>{t('auth.requiredTitle')}</Text>
      <Text style={styles.body}>{t('auth.requiredBody')}</Text>
      <View style={{ alignSelf: 'stretch', marginTop: spacing.sm }}>
        <Button title={t('auth.signIn')} onPress={() => router.push('/auth')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  body: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
