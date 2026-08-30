import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Heart, Package } from 'lucide-react-native';
import { router } from 'expo-router';
import { flawPhotos, mainPhotos, photoUrl, type ListingCard } from '../lib/listings';
import { formatPrice, timeAgo } from '../lib/format';
import { formatDistance, haversineKm } from '../lib/geo';

export { timeAgo };
import { colors, radius, spacing } from '../theme';

/**
 * Deal-condition banners shown under the title on every card, so a buyer can see
 * "pickup only" / "cash only" before opening the listing. Each condition has its own
 * colour so they read at a glance (pickup = teal, delivery = blue, collect = purple,
 * cash = amber, bank transfer = grey). `any` payment shows nothing.
 */
const BADGE_COLORS: Record<string, { bg: string; fg: string }> = {
  pickup_only: { bg: colors.primarySoft, fg: colors.primary },
  seller_delivers: { bg: '#E8F0FB', fg: '#2A5DB0' },
  buyer_collects: { bg: '#EFEAF9', fg: '#6A4CAF' },
  cash_only: { bg: '#FFF3DF', fg: '#B4700A' },
  bank_transfer: { bg: colors.surface, fg: colors.textSecondary },
};

function DealBadge({ id, label }: { id: string; label: string }) {
  const c = BADGE_COLORS[id] ?? { bg: colors.surface, fg: colors.textSecondary };
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function ListingRow({
  item,
  viewerPos,
}: {
  item: ListingCard;
  viewerPos?: { lat: number; lng: number } | null;
}) {
  const { t } = useTranslation();
  const photo = mainPhotos([...item.listing_photos]).sort((a, b) => a.sort_order - b.sort_order)[0];
  const hasFlaws = Boolean(item.has_flaws) || flawPhotos(item.listing_photos).length > 0 || !!item.flaw_note;
  const distance =
    viewerPos && item.lat != null && item.lng != null
      ? formatDistance(haversineKm(viewerPos.lat, viewerPos.lng, item.lat, item.lng))
      : null;
  const badges: { id: string; label: string }[] = [];
  if (item.pickup_mode) badges.push({ id: item.pickup_mode, label: t(`pickupModes.${item.pickup_mode}`) });
  if (item.payment_method && item.payment_method !== 'any')
    badges.push({ id: item.payment_method, label: t(`paymentMethods.${item.payment_method}`) });
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { backgroundColor: colors.surface }]}
      disabled={item.status === 'sold'}
      onPress={() => router.push(`/listing/${item.id}`)}
    >
      <View>
        {photo ? (
          <Image source={{ uri: photoUrl(photo.storage_path) }} style={styles.cardImage} />
        ) : (
          <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
            <Package size={24} color={colors.textSecondary} strokeWidth={1.5} />
          </View>
        )}
        {item.status !== 'active' && (
          <View style={styles.statusOverlay}>
            {item.status === 'sold' ? (
              <View style={styles.soldStamp}>
                <Text style={styles.statusOverlayText}>{t('listingDetail.sold')}</Text>
              </View>
            ) : (
              <Text style={styles.statusOverlayText}>{t('listingDetail.reserved')}</Text>
            )}
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {badges.length > 0 && (
          <View style={styles.badgeRow}>
            {badges.map((b) => (
              <DealBadge key={b.id} id={b.id} label={b.label} />
            ))}
          </View>
        )}
        <Text style={styles.cardMeta} numberOfLines={1}>
          {[item.suburb, distance, timeAgo(item.created_at)].filter(Boolean).join(' · ')}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.cardPrice}>{formatPrice(item.price_cents, t('common.free'))}</Text>
          {(item.favorites_count ?? 0) > 0 && (
            <View style={styles.likes}>
              <Heart size={12} color={colors.textSecondary} />
              <Text style={styles.likesText}>{item.favorites_count}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flawBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    backgroundColor: '#FBF0DA',
  },
  flawBadgeText: { fontSize: 10, fontWeight: '700', color: '#9A6B00' },
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cardImage: { width: 104, height: 104, borderRadius: radius.md, backgroundColor: colors.surface },
  cardImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, gap: 3, justifyContent: 'center' },
  cardTitle: { fontSize: 15, color: colors.text, lineHeight: 20 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardMeta: { fontSize: 12, color: colors.textSecondary },
  cardPrice: { fontSize: 16, fontWeight: '700', color: colors.text },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 1,
  },
  likes: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statusOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 20, 20, 0.5)',
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusOverlayText: { color: colors.white, fontSize: 13, fontWeight: '700' },
  soldStamp: {
    borderWidth: 2,
    borderColor: colors.white,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 3,
    transform: [{ rotate: '-8deg' }],
  },
  likesText: { fontSize: 12, color: colors.textSecondary },
});
