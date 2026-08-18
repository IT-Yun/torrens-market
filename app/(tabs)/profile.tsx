import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LANGUAGES, setAppLanguage } from '../../src/lib/i18n';
import i18n from '../../src/lib/i18n';
import { signOut } from '../../src/lib/auth';
import { useSession } from '../../src/lib/session';
import { supabase } from '../../src/lib/supabase';
import {
  BadgeCheck,
  Bell,
  ChevronRight,
  Globe,
  LogOut,
  MapPin,
  Package,
  Pencil,
  ShieldOff,
  Star,
  UserX,
} from 'lucide-react-native';
import { Avatar } from '../../src/components/Avatar';
import { TrustBadge } from '../../src/components/TrustBadge';
import { fetchListingStats } from '../../src/lib/listings';
import { deleteAccount } from '../../src/lib/profile';
import { fetchTrust, type ProfileTrust } from '../../src/lib/reviews';
import { colors, radius, spacing } from '../../src/theme';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { session, profile, refreshProfile } = useSession();
  const [trust, setTrust] = useState<ProfileTrust | null>(null);
  const [stats, setStats] = useState<{ active: number; sold: number } | null>(null);

  useEffect(() => {
    if (!session) return;
    fetchTrust(session.user.id).then(setTrust).catch(() => {});
    fetchListingStats(session.user.id).then(setStats).catch(() => {});
  }, [session]);

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
            <TrustBadge trust={trust} />
            {stats && (
              <Text style={styles.meta}>
                {t('profile.stats', { active: stats.active, sold: stats.sold })}
              </Text>
            )}
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

        <Text style={styles.sectionTitle}>{t('profile.sectionTrading')}</Text>
        <View style={styles.menuGroup}>
          <Pressable style={styles.menuRow} onPress={() => router.push('/my-listings')}>
            <View style={styles.menuLeft}>
              <Package size={18} color={colors.textSecondary} />
              <Text style={styles.menuText}>{t('profile.myListings')}</Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </Pressable>
          <View style={styles.separator} />
          <Pressable style={styles.menuRow} onPress={() => router.push('/my-reviews')}>
            <View style={styles.menuLeft}>
              <Star size={18} color={colors.textSecondary} />
              <Text style={styles.menuText}>{t('review.received')}</Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>{t('profile.sectionAlerts')}</Text>
        <View style={styles.menuGroup}>
          <Pressable style={styles.menuRow} onPress={() => router.push('/keywords')}>
            <View style={styles.menuLeft}>
              <Bell size={18} color={colors.textSecondary} />
              <Text style={styles.menuText}>{t('keywords.title')}</Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>{t('profile.sectionSettings')}</Text>
        <View style={styles.menuGroup}>
          <Pressable style={styles.menuRow} onPress={() => router.push('/onboarding/profile')}>
            <View style={styles.menuLeft}>
              <Pencil size={18} color={colors.textSecondary} />
              <Text style={styles.menuText}>{t('profile.editProfile')}</Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </Pressable>
          <View style={styles.separator} />
          <View style={[styles.menuRow, { justifyContent: 'flex-start', gap: 10 }]}>
            <View style={styles.menuLeft}>
              <Globe size={18} color={colors.textSecondary} />
              <Text style={styles.menuText}>{t('profile.language')}</Text>
            </View>
            <View style={[styles.langRow, { flex: 1, justifyContent: 'flex-end' }]}>
              {LANGUAGES.map((l) => {
                const selected = i18n.language === l.code;
                return (
                  <Pressable
                    key={l.code}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => changeLanguage(l.code)}
                  >
                    <Text style={[styles.chipText, selected && { color: colors.white }]}>
                      {l.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View style={styles.separator} />
          <Pressable style={styles.menuRow} onPress={() => router.push('/blocked-users')}>
            <View style={styles.menuLeft}>
              <ShieldOff size={18} color={colors.textSecondary} />
              <Text style={styles.menuText}>{t('block.manageTitle')}</Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </Pressable>
          <View style={styles.separator} />
          <Pressable
            style={styles.menuRow}
            onPress={async () => {
              await signOut();
              router.replace('/');
            }}
          >
            <View style={styles.menuLeft}>
              <LogOut size={18} color={colors.textSecondary} />
              <Text style={styles.menuText}>{t('profile.signOut')}</Text>
            </View>
          </Pressable>
          <View style={styles.separator} />
          <Pressable
            style={styles.menuRow}
            onPress={() =>
              Alert.alert(t('profile.deleteAccount'), t('profile.deleteAccountConfirm'), [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('profile.deleteAccount'),
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteAccount();
                      router.replace('/');
                    } catch {
                      Alert.alert(t('auth.error'));
                    }
                  },
                },
              ])
            }
          >
            <View style={styles.menuLeft}>
              <UserX size={18} color="#B4423E" />
              <Text style={[styles.menuText, { color: '#B4423E' }]}>
                {t('profile.deleteAccount')}
              </Text>
            </View>
          </Pressable>
        </View>
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
  menuGroup: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  menuText: { fontSize: 15, fontWeight: '600', color: colors.text },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
