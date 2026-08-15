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
import { BadgeCheck, Bell, ChevronRight, MapPin, Package, Pencil } from 'lucide-react-native';
import { Avatar } from '../../src/components/Avatar';
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
          <Avatar
            name={profile?.display_name}
            url={profile?.avatar_url}
            nationality={profile?.nationality}
            size={56}
          />
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.name}>{profile?.display_name ?? '—'}</Text>
              {profile?.is_phone_verified && <BadgeCheck size={16} color={colors.primary} />}
            </View>
            <Text style={styles.meta}>
              {profile?.suburb_verified_at && (
                <>
                  <MapPin size={12} color={colors.primary} />{' '}
                </>
              )}
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

        <Pressable style={styles.menuRow} onPress={() => router.push('/onboarding/profile')}>
          <View style={styles.menuLeft}>
            <Pencil size={18} color={colors.textSecondary} />
            <Text style={styles.menuText}>{t('profile.editProfile')}</Text>
          </View>
          <ChevronRight size={18} color={colors.textSecondary} />
        </Pressable>

        <Pressable style={styles.menuRow} onPress={() => router.push('/my-listings')}>
          <View style={styles.menuLeft}>
            <Package size={18} color={colors.textSecondary} />
            <Text style={styles.menuText}>{t('profile.myListings')}</Text>
          </View>
          <ChevronRight size={18} color={colors.textSecondary} />
        </Pressable>

        <Pressable style={styles.menuRow} onPress={() => router.push('/keywords')}>
          <View style={styles.menuLeft}>
            <Bell size={18} color={colors.textSecondary} />
            <Text style={styles.menuText}>{t('keywords.title')}</Text>
          </View>
          <ChevronRight size={18} color={colors.textSecondary} />
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
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
