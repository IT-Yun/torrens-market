import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { LANGUAGES, setAppLanguage } from '../../src/lib/i18n';
import i18n from '../../src/lib/i18n';
import { signOut } from '../../src/lib/auth';
import { GuestCta } from '../../src/components/GuestCta';
import { usePromptSheet } from '../../src/components/PromptSheet';
import { useSession } from '../../src/lib/session';
import { supabase } from '../../src/lib/supabase';
import {
  BadgeCheck,
  Bell,
  ChevronRight,
  Globe,
  LogOut,
  MapPin,
  MessageSquareWarning,
  PawPrint,
  Package,
  Pencil,
  ShieldOff,
  Star,
  UserX,
} from 'lucide-react-native';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { Avatar } from '../../src/components/Avatar';
import { TrustBadge } from '../../src/components/TrustBadge';
import { fetchListingStats } from '../../src/lib/listings';
import { deleteAccount } from '../../src/lib/profile';
import { fetchTrust, type ProfileTrust } from '../../src/lib/reviews';
import { colors, radius, spacing } from '../../src/theme';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { session, profile, refreshProfile } = useSession();
  const sheet = usePromptSheet();
  const isGuest = !session;
  const [trust, setTrust] = useState<ProfileTrust | null>(null);
  const [stats, setStats] = useState<{ active: number; sold: number } | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Refresh on every tab visit — a mount-once effect left the stats stale
  // after posting/selling (Sean: "매물 올렸는데 여전히 0 0").
  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      fetchTrust(session.user.id).then(setTrust).catch(() => {});
      fetchListingStats(session.user.id).then(setStats).catch(() => {});
    }, [session]),
  );

  async function changeLanguage(lang: 'ko' | 'en' | 'zh') {
    await setAppLanguage(lang);
    if (session) {
      await supabase.from('profiles').update({ preferred_language: lang }).eq('id', session.user.id);
      await refreshProfile();
    }
  }


  if (isGuest) return <GuestCta emoji="🦘" />;
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <Avatar
              name={profile?.display_name}
              url={profile?.avatar_url}
              nationality={profile?.nationality}
              seed={session?.user.id}
              size={64}
            />
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.name}>{profile?.display_name ?? '—'}</Text>
                {profile?.is_phone_verified && <BadgeCheck size={17} color={colors.primary} />}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {profile?.suburb_verified_at && <MapPin size={13} color={colors.primary} />}
                <Text style={styles.meta}>
                  {[
                    profile?.suburb,
                    profile?.created_at
                      ? t('profile.joined', {
                          date: new Date(profile.created_at).toLocaleDateString(
                            i18n.language === 'zh' ? 'zh-CN' : i18n.language,
                            { year: 'numeric', month: 'short' },
                          ),
                        })
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || ' '}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.statStrip}>
            <Pressable style={styles.statCol} onPress={() => router.push('/my-listings')}>
              <Text style={styles.statValue}>{stats?.active ?? '–'}</Text>
              <Text style={styles.statLabel}>{t('myListings.status.active')}</Text>
            </Pressable>
            <View style={styles.statDivider} />
            <Pressable style={styles.statCol} onPress={() => router.push('/my-listings')}>
              <Text style={styles.statValue}>{stats?.sold ?? '–'}</Text>
              <Text style={styles.statLabel}>{t('myListings.status.sold')}</Text>
            </Pressable>
            <View style={styles.statDivider} />
            <Pressable style={styles.statCol} onPress={() => router.push('/my-reviews')}>
              <TrustBadge trust={trust} compact />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Text style={styles.statLabel}>
                  {t('review.viewCount', { count: trust?.review_count ?? 0 })}
                </Text>
                <ChevronRight size={12} color={colors.textSecondary} />
              </View>
            </Pressable>
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
          <View style={styles.separator} />
          <Pressable style={styles.menuRow} onPress={() => router.push('/trust-ladder')}>
            <View style={styles.menuLeft}>
              <PawPrint size={18} color={colors.textSecondary} />
              <Text style={styles.menuText}>{t('trustLadder.title')}</Text>
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
          <View style={styles.separator} />
          <Pressable style={styles.menuRow} onPress={() => router.push('/notification-settings')}>
            <View style={styles.menuLeft}>
              <Bell size={18} color={colors.textSecondary} />
              <Text style={styles.menuText}>{t('notifPrefs.title')}</Text>
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
          <Pressable
            style={styles.menuRow}
            onPress={() =>
              Alert.alert(t('profile.language'), undefined, [
                ...LANGUAGES.map((l) => ({
                  text: `${l.label}${i18n.language === l.code ? ' ✓' : ''}`,
                  onPress: () => changeLanguage(l.code),
                })),
                { text: t('common.cancel'), style: 'cancel' as const },
              ])
            }
          >
            <View style={styles.menuLeft}>
              <Globe size={18} color={colors.textSecondary} />
              <Text style={styles.menuText}>{t('profile.language')}</Text>
            </View>
            <View style={styles.menuLeft}>
              <Text style={styles.menuValue}>
                {LANGUAGES.find((l) => l.code === i18n.language)?.label ?? ''}
              </Text>
              <ChevronRight size={18} color={colors.textSecondary} />
            </View>
          </Pressable>
          <View style={styles.separator} />
          <Pressable style={styles.menuRow} onPress={() => router.push('/feedback')}>
            <View style={styles.menuLeft}>
              <MessageSquareWarning size={18} color={colors.textSecondary} />
              <Text style={styles.menuText}>{t('feedback.title')}</Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </Pressable>
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
            onPress={() =>
              sheet.showConfirm(t('profile.signOut'), t('profile.signOutConfirm'), [
                {
                  label: t('profile.signOut'),
                  variant: 'destructive',
                  onPress: async () => {
                    await signOut();
                    router.replace('/');
                  },
                },
              ])
            }
          >
            <View style={styles.menuLeft}>
              <LogOut size={18} color={colors.textSecondary} />
              <Text style={styles.menuText}>{t('profile.signOut')}</Text>
            </View>
          </Pressable>
          <View style={styles.separator} />
          <Pressable
            style={styles.menuRow}
            onPress={() => {
              setDeleteText('');
              setDeleteOpen(true);
            }}
          >
            <View style={styles.menuLeft}>
              <UserX size={18} color="#B4423E" />
              <Text style={[styles.menuText, { color: '#B4423E' }]}>
                {t('profile.deleteAccount')}
              </Text>
            </View>
          </Pressable>
        </View>
        <Text style={styles.versionText}>
          {`v${Constants.expoConfig?.version ?? '?'} (${Constants.expoConfig?.ios?.buildNumber ?? '5'})`}
          {Updates.updateId ? ` · ${Updates.updateId.slice(0, 8)}` : ' · embedded'}
        </Text>
      </ScrollView>

      <Modal visible={deleteOpen} transparent animationType="fade">
        <View style={styles.deleteBackdrop}>
          <View style={styles.deleteCard}>
            <Text style={styles.deleteTitle}>{t('profile.deleteAccount')}</Text>
            <Text style={styles.deleteBody}>{t('profile.deleteAccountConfirm')}</Text>
            <Text style={styles.deleteBody}>{t('profile.deleteTypePrompt')}</Text>
            <TextInput
              style={styles.deleteInput}
              value={deleteText}
              onChangeText={setDeleteText}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="DELETE"
              placeholderTextColor={colors.textSecondary}
            />
            <View style={styles.deleteActions}>
              <Pressable
                style={[styles.deleteBtn, styles.deleteCancel]}
                onPress={() => setDeleteOpen(false)}
                disabled={deleting}
              >
                <Text style={styles.deleteCancelText}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.deleteBtn,
                  styles.deleteConfirm,
                  (deleteText.trim() !== 'DELETE' || deleting) && { opacity: 0.4 },
                ]}
                disabled={deleteText.trim() !== 'DELETE' || deleting}
                onPress={async () => {
                  setDeleting(true);
                  try {
                    await deleteAccount();
                    setDeleteOpen(false);
                    router.replace('/');
                  } catch {
                    setDeleting(false);
                    setDeleteOpen(false);
                    setTimeout(() => Alert.alert(t('auth.error')), 50);
                  }
                }}
              >
                <Text style={styles.deleteConfirmText}>{t('profile.deleteAccount')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  versionText: {
    textAlign: 'center',
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  deleteBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  deleteCard: {
    alignSelf: 'stretch',
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  deleteTitle: { fontSize: 17, fontWeight: '700', color: '#B4423E' },
  deleteBody: { fontSize: 14, color: colors.text, lineHeight: 20 },
  deleteInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    fontSize: 16,
    letterSpacing: 2,
    color: colors.text,
    backgroundColor: colors.white,
  },
  deleteActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  deleteBtn: { flex: 1, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center' },
  deleteCancel: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  deleteCancelText: { fontWeight: '600', color: colors.text },
  deleteConfirm: { backgroundColor: '#B4423E' },
  deleteConfirmText: { fontWeight: '700', color: colors.white },
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 56 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  statStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  statCol: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, height: 28, backgroundColor: colors.border },
  statValue: { fontSize: 18, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 12, color: colors.textSecondary },
  name: { fontSize: 20, fontWeight: '700', color: colors.text },
  meta: { fontSize: 14, color: colors.textSecondary },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
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
  menuValue: { fontSize: 14, color: colors.textSecondary },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
