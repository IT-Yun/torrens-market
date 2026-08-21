import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Heart, Package } from 'lucide-react-native';
import { router } from 'expo-router';
import { photoUrl, type ListingCard } from '../lib/listings';
import { attributeSnippet, formatPrice, timeAgo } from '../lib/format';
import { formatDistance, haversineKm } from '../lib/geo';

export { timeAgo };
import { colors, radius, spacing } from '../theme';

export function ListingRow({
  item,
  viewerPos,
}: {
  item: ListingCard;
  viewerPos?: { lat: number; lng: number } | null;
}) {
  const { t } = useTranslation();
  const photo = [...item.listing_photos].sort((a, b) => a.sort_order - b.sort_order)[0];
  const snippet = attributeSnippet(item.attributes);
  const distance =
    viewerPos && item.lat != null && item.lng != null
      ? formatDistance(haversineKm(viewerPos.lat, viewerPos.lng, item.lat, item.lng))
      : null;
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
        {snippet && (
          <Text style={styles.snippet} numberOfLines={1}>
            {snippet}
          </Text>
        )}
        <View style={styles.metaRow}>
          <Text style={styles.cardMeta}>
            {[item.suburb, distance, timeAgo(item.created_at)].filter(Boolean).join(' · ')}
          </Text>
          {item.pickup_mode === 'pickup_only' && (
            <View style={styles.pickupBadge}>
              <Text style={styles.pickupBadgeText}>{t('pickupModes.pickup_only')}</Text>
            </View>
          )}
        </View>
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
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cardImage: { width: 104, height: 104, borderRadius: radius.md, backgroundColor: colors.surface },
  cardImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, gap: 2, justifyContent: 'center' },
  cardTitle: { fontSize: 15, color: colors.text, lineHeight: 20 },
  snippet: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    backgroundColor: '#E8F3F1',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  cardMeta: { fontSize: 12, color: colors.textSecondary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pickupBadge: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  pickupBadgeText: { fontSize: 10, color: colors.textSecondary, fontWeight: '600' },
  cardPrice: { fontSize: 16, fontWeight: '700', color: colors.text },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
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
