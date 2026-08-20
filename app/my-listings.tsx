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
import { useSession } from '../src/lib/session';
import { colors, radius, spacing } from '../src/theme';
import { BackButton } from '../src/components/BackButton';

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
  const [items, setItems] = useState<ListingCard[]>([]);
  const [showSold, setShowSold] = useState(true);
  const visible = showSold ? items : items.filter((i) => i.status !== 'sold');

  const load = useCallback(() => {
    if (session) fetchMyListings(session.user.id).then(setItems).catch(() => {});
  }, [session]);

  useFocusEffect(load);

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
            <View style={styles.row}>
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
                  <Text style={[styles.status, sold && { color: colors.textSecondary }]}>
                    {t(`myListings.status.${item.status}`)}
                  </Text>
                </View>
              </Pressable>
              <View style={{ gap: 6 }}>
                {item.status === 'active' && (
                  <Pressable
                    style={[styles.actionButton, styles.bumpButton, !canBump(item.bumped_at) && { opacity: 0.4 }]}
                    disabled={!canBump(item.bumped_at)}
                    onPress={async () => {
                      try {
                        await bumpListing(item.id);
                        Alert.alert(t('myListings.bumped'));
                        load();
                      } catch {
                        Alert.alert(t('myListings.bumpCooldown'));
                      }
                    }}
                  >
                    <ArrowUp size={13} color={colors.primary} />
                    <Text style={[styles.actionText, { color: colors.primary }]}>
                      {t('myListings.bump')}
                    </Text>
                  </Pressable>
                )}
                {sold && (
                  <Pressable
                    style={[styles.actionButton, styles.reviewButton]}
                    onPress={async () => {
                      const room = session
                        ? await findRoomForListing(item.id, session.user.id).catch(() => null)
                        : null;
                      if (room) router.push(`/chat/${room}`);
                      else Alert.alert(t('myListings.noChatYet'));
                    }}
                  >
                    <Text style={[styles.actionText, { color: colors.primary }]}>
                      {t('myListings.review')}
                    </Text>
                  </Pressable>
                )}
                {(ACTIONS[item.status] ?? []).map((next) => (
                  <Pressable
                    key={next}
                    style={[styles.actionButton, next === 'active' && styles.actionButtonSecondary]}
                    onPress={async () => {
                      await updateListingStatus(item.id, next).catch(() => {});
                      load();
                    }}
                  >
                    <Text style={[styles.actionText, next === 'active' && { color: colors.text }]}>
                      {t(ACTION_LABEL[next])}
                    </Text>
                  </Pressable>
                ))}
                <Pressable
                  style={styles.deleteButton}
                  onPress={() =>
                    Alert.alert(t('myListings.manageTitle'), undefined, [
                      {
                        text: t('myListings.edit'),
                        onPress: () =>
                          router.push({ pathname: '/listing/create', params: { editId: item.id } }),
                      },
                      {
                        text: t('myListings.delete'),
                        style: 'destructive',
                        onPress: () =>
                          Alert.alert(t('myListings.deleteTitle'), t('myListings.deleteConfirm'), [
                            { text: t('common.cancel'), style: 'cancel' },
                            {
                              text: t('myListings.delete'),
                              style: 'destructive',
                              onPress: async () => {
                                await updateListingStatus(item.id, 'deleted').catch(() => {});
                                load();
                              },
                            },
                          ]),
                      },
                      { text: t('common.cancel'), style: 'cancel' },
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
            <Package size={40} color={colors.textSecondary} strokeWidth={1.5} />
            <Text style={styles.emptyText}>{t('myListings.empty')}</Text>
          </View>
        }
        contentContainerStyle={items.length === 0 ? { flex: 1 } : undefined}
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowMain: { flex: 1, flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  thumb: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.surface },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontSize: 15, color: colors.text },
  soldText: { color: colors.textSecondary, textDecorationLine: 'line-through' },
  price: { fontSize: 15, fontWeight: '700', color: colors.text },
  status: { fontSize: 12, color: colors.primary, fontWeight: '600' },
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
