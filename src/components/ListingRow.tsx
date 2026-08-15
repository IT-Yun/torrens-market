import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { formatPrice, photoUrl, type ListingCard } from '../lib/listings';
import { colors, radius, spacing } from '../theme';

export function timeAgo(iso: string): string {
  const mins = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function ListingRow({ item }: { item: ListingCard }) {
  const photo = [...item.listing_photos].sort((a, b) => a.sort_order - b.sort_order)[0];
  return (
    <Pressable style={styles.card} onPress={() => router.push(`/listing/${item.id}`)}>
      {photo ? (
        <Image source={{ uri: photoUrl(photo.storage_path) }} style={styles.cardImage} />
      ) : (
        <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
          <Text style={{ fontSize: 24 }}>📦</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.cardMeta}>
          {item.suburb} · {timeAgo(item.created_at)}
        </Text>
        <Text style={styles.cardPrice}>{formatPrice(item.price_cents)}</Text>
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
  cardImage: { width: 96, height: 96, borderRadius: radius.md, backgroundColor: colors.surface },
  cardImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 15, color: colors.text },
  cardMeta: { fontSize: 12, color: colors.textSecondary },
  cardPrice: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 2 },
});
