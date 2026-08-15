import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button } from '../../src/components/ui';
import { LANGUAGES, setAppLanguage } from '../../src/lib/i18n';
import i18n from '../../src/lib/i18n';
import { signOut } from '../../src/lib/auth';
import { useSession } from '../../src/lib/session';
import { supabase } from '../../src/lib/supabase';
import { colors, radius, spacing } from '../../src/theme';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { session, profile, refreshProfile } = useSession();

  async function changeLanguage(lang: 'ko' | 'en' | 'zh') {
    await setAppLanguage(lang);
    if (session) {
      await supabase.from('profiles').update({ preferred_language: lang }).eq('id', session.user.id);
      await refreshProfile();
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(profile?.display_name ?? '?').slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.name}>
              {profile?.display_name ?? '—'}
              {profile?.is_phone_verified ? `  ✓ ${t('profile.verified')}` : ''}
            </Text>
            <Text style={styles.meta}>
              {[profile?.suburb, profile?.nationality ? t(`nationalities.${profile.nationality}`) : null]
                .filter(Boolean)
                .join(' · ') || ' '}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('profile.language')}</Text>
        <View style={styles.langRow}>
          {LANGUAGES.map((l) => {
            const selected = i18n.language === l.code;
            return (
              <Pressable
                key={l.code}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => changeLanguage(l.code)}
              >
                <Text style={[styles.chipText, selected && { color: colors.white }]}>{l.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable style={styles.menuRow} onPress={() => router.push('/my-listings')}>
          <Text style={styles.menuText}>📦 {t('profile.myListings')}</Text>
          <Text style={styles.menuArrow}>›</Text>
        </Pressable>

        <Pressable style={styles.menuRow} onPress={() => router.push('/keywords')}>
          <Text style={styles.menuText}>🔔 {t('keywords.title')}</Text>
          <Text style={styles.menuArrow}>›</Text>
        </Pressable>

        <View style={{ flex: 1 }} />
        <Button
          title={t('profile.signOut')}
          variant="outline"
          onPress={async () => {
            await signOut();
            router.replace('/');
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: spacing.lg, gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.white, fontSize: 20, fontWeight: '700' },
  name: { fontSize: 20, fontWeight: '700', color: colors.text },
  meta: { fontSize: 14, color: colors.textSecondary },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  langRow: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.white,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, color: colors.text },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  menuText: { fontSize: 15, fontWeight: '600', color: colors.text },
  menuArrow: { fontSize: 18, color: colors.textSecondary },
});
