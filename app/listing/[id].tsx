import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '../../src/components/ui';
import { startChat } from '../../src/lib/chat';
import { isFavorite, toggleFavorite } from '../../src/lib/favorites';
import { blockUser, reportListing, type ReportReason } from '../../src/lib/moderation';
import i18n from '../../src/lib/i18n';
import { useSession } from '../../src/lib/session';
import {
  fetchCategories,
  fetchListing,
  formatPrice,
  photoUrl,
  type Category,
  type ListingDetail,
} from '../../src/lib/listings';
import { colors, radius, spacing } from '../../src/theme';

const { width } = Dimensions.get('window');

export default function ListingDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [liked, setLiked] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const lang = i18n.language;

  useEffect(() => {
    if (id) {
      fetchListing(id).then(setListing).catch(() => {});
      if (session) isFavorite(session.user.id, id).then(setLiked).catch(() => {});
    }
    fetchCategories().then(setCategories).catch(() => {});
  }, [id, session]);

  function openModeration() {
    if (!session || !listing) return;
    const reasons: [string, ReportReason][] = [
      [t('report.spam'), 'spam'],
      [t('report.scam'), 'scam'],
      [t('report.inappropriate'), 'inappropriate'],
      [t('report.other'), 'other'],
    ];
    Alert.alert(t('report.menuTitle'), undefined, [
      {
        text: t('report.action'),
        onPress: () =>
          Alert.alert(
            t('report.reasonTitle'),
            undefined,
            reasons
              .map(([label, reason]) => ({
                text: label,
                onPress: async () => {
                  await reportListing(session.user.id, listing.id, listing.seller_id, reason).catch(
                    () => {},
                  );
                  Alert.alert(t('report.done'));
                },
              }))
              .concat([{ text: t('common.cancel'), onPress: async () => {} }]),
          ),
      },
      {
        text: t('block.action'),
        style: 'destructive',
        onPress: async () => {
          await blockUser(session.user.id, listing.seller_id).catch(() => {});
          Alert.alert(t('block.done'));
          router.back();
        },
      },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }

  async function onToggleFavorite() {
    if (!session || !id) return;
    const next = !liked;
    setLiked(next);
    try {
      await toggleFavorite(session.user.id, id, next);
    } catch {
      setLiked(!next);
    }
  }

  const category = useMemo(
    () => categories.find((c) => c.id === listing?.category_id) ?? null,
    [categories, listing],
  );

  if (!listing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const photos = [...listing.listing_photos].sort((a, b) => a.sort_order - b.sort_order);
  const attributeRows = (category?.field_template ?? [])
    .filter((f) => f.type !== 'photo' && listing.attributes[f.key] != null && listing.attributes[f.key] !== '')
    .map((f) => ({
      label: f.label_i18n[lang] ?? f.label_i18n.en ?? f.key,
      value:
        f.type === 'boolean'
          ? t(listing.attributes[f.key] ? 'listingCreate.yes' : 'listingCreate.no')
          : `${listing.attributes[f.key]}${f.unit ? ` ${f.unit}` : ''}`,
    }));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Pressable
            onPress={onToggleFavorite}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('tabs.favorites')}
            accessibilityState={{ selected: liked }}
          >
            <Text style={styles.heart}>{liked ? '❤️' : '🤍'}</Text>
          </Pressable>
          {session?.user.id !== listing.seller_id && (
            <Pressable
              onPress={openModeration}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('report.menuTitle')}
            >
              <Text style={styles.moreButton}>⋯</Text>
            </Pressable>
          )}
        </View>
      </View>
      <ScrollView>
        <View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) =>
              setPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / width))
            }
          >
            {photos.length > 0 ? (
              photos.map((p) => (
                <Image key={p.storage_path} source={{ uri: photoUrl(p.storage_path) }} style={styles.photo} />
              ))
            ) : (
              <View style={[styles.photo, styles.photoPlaceholder]}>
                <Text style={{ fontSize: 40 }}>📦</Text>
              </View>
            )}
          </ScrollView>
          {photos.length > 1 && (
            <View style={styles.dots}>
              {photos.map((p, i) => (
                <View key={p.storage_path} style={[styles.dot, i === photoIndex && styles.dotActive]} />
              ))}
            </View>
          )}
        </View>

        <View style={styles.body}>
          {listing.status !== 'active' && (
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>
                {t(listing.status === 'sold' ? 'listingDetail.sold' : 'listingDetail.reserved')}
              </Text>
            </View>
          )}
          <Text style={styles.title}>{listing.title}</Text>
          <Text style={styles.price}>{formatPrice(listing.price_cents)}</Text>
          <Text style={styles.meta}>
            {[listing.suburb, t(`conditions.${listing.condition}`), t(`pickupModes.${listing.pickup_mode}`)].join(' · ')}
          </Text>

          {attributeRows.length > 0 && (
            <View style={styles.attrCard}>
              <Text style={styles.attrTitle}>{t('listingDetail.detailsTitle')}</Text>
              {attributeRows.map((row) => (
                <View key={row.label} style={styles.attrRow}>
                  <Text style={styles.attrLabel}>{row.label}</Text>
                  <Text style={styles.attrValue}>{row.value}</Text>
                </View>
              ))}
            </View>
          )}

          {listing.description ? <Text style={styles.description}>{listing.description}</Text> : null}

          <View style={styles.sellerCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {listing.profiles.display_name.slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.sellerName}>
                {listing.profiles.display_name}
                {listing.profiles.is_phone_verified ? `  ✓ ${t('profile.verified')}` : ''}
              </Text>
              <Text style={styles.meta}>
                {[
                  listing.profiles.suburb,
                  listing.profiles.nationality
                    ? t(`nationalities.${listing.profiles.nationality}`)
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {session?.user.id !== listing.seller_id && (
        <View style={styles.footer}>
          <Pressable onPress={onToggleFavorite} hitSlop={8} style={styles.footerHeart}>
            <Text style={{ fontSize: 22 }}>{liked ? '❤️' : '🤍'}</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.footerPrice}>{formatPrice(listing.price_cents)}</Text>
            <Text style={styles.footerMeta}>{t(`pickupModes.${listing.pickup_mode}`)}</Text>
          </View>
          <View style={{ width: 150 }}>
            <Button
              title={t('listingDetail.chat')}
              onPress={async () => {
                try {
                  const roomId = await startChat(listing.id);
                  router.push(`/chat/${roomId}`);
                } catch (e) {
                  Alert.alert((e as Error).message);
                }
              }}
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: { fontSize: 32, color: colors.text, lineHeight: 34 },
  heart: { fontSize: 24 },
  moreButton: { fontSize: 26, color: colors.text, fontWeight: '700' },
  photo: { width, height: width * 0.9, backgroundColor: colors.surface },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  body: { padding: spacing.md, gap: spacing.sm },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  price: { fontSize: 22, fontWeight: '800', color: colors.primary },
  meta: { fontSize: 13, color: colors.textSecondary },
  attrCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  attrTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  attrRow: { flexDirection: 'row', justifyContent: 'space-between' },
  attrLabel: { fontSize: 14, color: colors.textSecondary },
  attrValue: { fontSize: 14, color: colors.text, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  description: { fontSize: 15, color: colors.text, lineHeight: 22, marginTop: spacing.sm },
  sellerCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.white, fontSize: 18, fontWeight: '700' },
  sellerName: { fontSize: 16, fontWeight: '600', color: colors.text },
  dots: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: radius.full,
    backgroundColor: '#FFFFFF',
    opacity: 0.45,
  },
  dotActive: { opacity: 1 },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.text,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusBadgeText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  footerHeart: {
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingRight: spacing.md,
  },
  footerPrice: { fontSize: 18, fontWeight: '800', color: colors.text },
  footerMeta: { fontSize: 12, color: colors.textSecondary },
});
