import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Package } from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import { Alert } from 'react-native';
import { ArrowUp, MoreHorizontal } from 'lucide-react-native';
import {
  bumpListing,
  canBump,
  fetchMyListings,
  formatPrice,
  photoUrl,
  updateListingStatus,
  type ListingCard,
} from '../src/lib/listings';
import { findRoomForListing } from '../src/lib/chat';
import { GuestCta } from '../src/components/GuestCta';
import { useSession } from '../src/lib/session';
import { colors, radius, shadows, spacing } from '../src/theme';
import { BackButton } from '../src/components/BackButton';
import { usePromptSheet } from '../src/components/PromptSheet';

const ACTIONS: Record<string, ('reserved' | 'sold' | 'active')[]> = {
  active: ['reserved', 'sold'],
  reserved: ['active', 'sold'],
  sold: ['active'],
};
const ACTION_LABEL: Record<string, string> = {
  reserved: 'myListings.markReserved',
  sold: 'myListings.markSold',
  active: 'myListings.markActive',
};

export default function MyListingsScreen() {
  const { t } = useTranslation();
  const { session } = useSession();
  const sheet = usePromptSheet();
  const [items, setItems] = useState<ListingCard[]>([]);
  const [showSold, setShowSold] = useState(true);
  const visible = showSold ? items : items.filter((i) => i.status !== 'sold');

  const load = useCallback(() => {
    if (session) fetchMyListings(session.user.id).then(setItems).catch(() => {});
  }, [session]);

  useFocusEffect(load);


  if (!session) return <GuestCta emoji="📦" />;
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.title}>{t('profile.myListings')}</Text>
        <Pressable
          style={[styles.soldToggle, showSold && styles.soldToggleOn]}
          onPress={() => setShowSold((v) => !v)}
          accessibilityRole="button"
        >
          <Text style={[styles.soldToggleText, showSold && { color: colors.white }]}>
            {t('myListings.showSold')}
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const photo = [...item.listing_photos].sort((a, b) => a.sort_order - b.sort_order)[0];
          const sold = item.status === 'sold';
          return (
            <View style={styles.card}>
              <Pressable
                style={styles.rowMain}
                onPress={() => router.push(`/listing/${item.id}`)}
              >
                {photo ? (
                  <Image
                    source={{ uri: photoUrl(photo.storage_path) }}
                    style={[styles.thumb, sold && { opacity: 0.4 }]}
                  />
                ) : (
                  <View style={[styles.thumb, styles.thumbPlaceholder]}>
                    <Package size={20} color={colors.textSecondary} />
                  </View>
                )}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.itemTitle, sold && styles.soldText]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.price}>{formatPrice(item.price_cents, t('common.free'))}</Text>
                  <View
                    style={[
                      styles.statusPill,
                      item.status === 'active' && styles.pillActive,
                      item.status === 'reserved' && styles.pillReserved,
                      sold && styles.pillSold,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        item.status === 'active' && { color: colors.primary },
                        item.status === 'reserved' && { color: '#9A6B00' },
                        sold && { color: colors.textSecondary },
                      ]}
                    >
                      {t(`myListings.status.${item.status}`)}
                    </Text>
                  </View>
                </View>
              </Pressable>
              <View style={styles.actionsRow}>
                <Pressable
                  style={[
                    styles.actionButton,
                    styles.bumpButton,
                    (item.status !== 'active' || !canBump(item.bumped_at)) && { opacity: 0.35 },
                  ]}
                  disabled={item.status !== 'active' || !canBump(item.bumped_at)}
                  onPress={async () => {
                    try {
                      await bumpListing(item.id);
                      sheet.showToast(t('myListings.bumped'));
                      load();
                    } catch {
                      sheet.showToast(t('myListings.bumpCooldown'));
                    }
                  }}
                >
                  <ArrowUp size={13} color={colors.primary} />
                  <Text style={[styles.actionText, { color: colors.primary }]}>
                    {t('myListings.bump')}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, styles.actionButtonAmber]}
                  onPress={() => {
                    const options = (ACTIONS[item.status] ?? []).map((next) => ({
                      label: t(ACTION_LABEL[next]),
                      variant: 'secondary' as const,
                      onPress: async () => {
                        await updateListingStatus(item.id, next).catch(() => {});
                        load();
                      },
                    }));
                    if (sold)
                      options.push({
                        label: t('myListings.review'),
                        variant: 'secondary' as const,
                        onPress: async () => {
                          const room = session
                            ? await findRoomForListing(item.id, session.user.id).catch(() => null)
                            : null;
                          if (room) router.push(`/chat/${room}`);
                          else sheet.showToast(t('myListings.noChatYet'));
                        },
                      });
                    sheet.showConfirm(t('myListings.changeStatus'), undefined, options);
                  }}
                >
                  <Text style={[styles.actionText, { color: '#9A6B00' }]}>
                    {t('myListings.changeStatus')}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.deleteButton}
                  onPress={() =>
                    sheet.showConfirm(t('myListings.manageTitle'), undefined, [
                      {
                        label: t('myListings.edit'),
                        variant: 'secondary',
                        onPress: () =>
                          router.push({ pathname: '/listing/create', params: { editId: item.id } }),
                      },
                      {
                        label: t('myListings.delete'),
                        variant: 'destructive',
                        onPress: () =>
                          setTimeout(
                            () =>
                              sheet.showConfirm(
                                t('myListings.deleteTitle'),
                                t('myListings.deleteConfirm'),
                                [
                                  {
                                    label: t('myListings.delete'),
                                    variant: 'destructive',
                                    onPress: async () => {
                                      await updateListingStatus(item.id, 'deleted').catch(() => {});
                                      load();
                                    },
                                  },
                                ],
                              ),
                            380,
                          ),
                      },
                    ])
                  }
                  accessibilityRole="button"
                >
                  <MoreHorizontal size={15} color={colors.textSecondary} />
                  <Text style={[styles.actionText, { color: colors.textSecondary }]}>
                    {t('myListings.manage')}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 44 }}>🦘</Text>
            <Text style={styles.emptyText}>{t('myListings.empty')}</Text>
          </View>
        }
        contentContainerStyle={items.length === 0 ? { flex: 1 } : { paddingBottom: spacing.xl }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  back: { fontSize: 32, color: colors.text, lineHeight: 34, width: 24 },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  soldToggle: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  soldToggleOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  soldToggleText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  reviewButton: { backgroundColor: colors.primarySoft },
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: colors.surface,
  },
  pillActive: { backgroundColor: colors.primarySoft },
  pillReserved: { backgroundColor: '#FBF0DA' },
  pillSold: { backgroundColor: colors.surface },
  statusPillText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
  actionButtonAmber: { backgroundColor: '#FBF0DA' },
  rowMain: { flex: 1, flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  thumb: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.surface },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontSize: 15, color: colors.text },
  soldText: { color: colors.textSecondary, textDecorationLine: 'line-through' },
  price: { fontSize: 15, fontWeight: '700', color: colors.text },
  actionButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bumpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  actionButtonSecondary: { backgroundColor: colors.surface },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionText: { fontSize: 13, fontWeight: '600', color: colors.white },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  emptyText: { fontSize: 14, color: colors.textSecondary },
});
