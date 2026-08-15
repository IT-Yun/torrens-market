import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Package } from 'lucide-react-native';
import { router } from 'expo-router';
import { photoUrl, type ListingCard } from '../lib/listings';
import { attributeSnippet, formatPrice, timeAgo } from '../lib/format';

export { timeAgo };
import { colors, radius, spacing } from '../theme';

export function ListingRow({ item }: { item: ListingCard }) {
  const photo = [...item.listing_photos].sort((a, b) => a.sort_order - b.sort_order)[0];
  const snippet = attributeSnippet(item.attributes);
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { backgroundColor: colors.surface }]}
      onPress={() => router.push(`/listing/${item.id}`)}
    >
      {photo ? (
        <Image source={{ uri: photoUrl(photo.storage_path) }} style={styles.cardImage} />
      ) : (
        <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
          <Package size={24} color={colors.textSecondary} strokeWidth={1.5} />
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {snippet && (
          <Text style={styles.snippet} numberOfLines={1}>
            {snippet}
          </Text>
        )}
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
  cardPrice: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 2 },
});
