import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import i18n from '../../src/lib/i18n';
import {
  fetchCategories,
  fetchListings,
  formatPrice,
  photoUrl,
  type Category,
  type ListingCard,
} from '../../src/lib/listings';
import { colors, radius, spacing } from '../../src/theme';

function timeAgo(iso: string): string {
  const mins = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [listings, setListings] = useState<ListingCard[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const lang = i18n.language as 'ko' | 'en' | 'zh';

  const load = useCallback(async () => {
    const [cats, items] = await Promise.all([
      categories.length ? Promise.resolve(categories) : fetchCategories(),
      fetchListings(selectedCategory),
    ]);
    setCategories(cats);
    setListings(items);
  }, [categories, selectedCategory]);

  useEffect(() => {
    load().catch(() => {});
  }, [selectedCategory]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => {});
    }, [load]),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.brand}>{t('common.appName')}</Text>
      </View>

      <View>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          data={[{ id: null as number | null, label: t('home.all') }].concat(
            categories.map((c) => ({ id: c.id as number | null, label: c.name_i18n[lang] ?? c.slug })),
          )}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => {
            const selected = selectedCategory === item.id;
            return (
              <Pressable
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => setSelectedCategory(item.id)}
              >
                <Text style={[styles.chipText, selected && { color: colors.white }]}>{item.label}</Text>
              </Pressable>
            );
          }}
        />
      </View>

      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load().catch(() => {});
              setRefreshing(false);
            }}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📦</Text>
            <Text style={styles.emptyText}>{t('home.empty')}</Text>
          </View>
        }
        contentContainerStyle={listings.length === 0 ? { flex: 1 } : undefined}
        renderItem={({ item }) => {
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
        }}
      />

      <Pressable style={styles.fab} onPress={() => router.push('/listing/create')}>
        <Text style={styles.fabText}>＋</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  brand: { fontSize: 22, fontWeight: '800', color: colors.primary },
  chipRow: { paddingHorizontal: spacing.md, gap: spacing.sm, paddingVertical: spacing.xs },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.white,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, color: colors.text },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  emptyEmoji: { fontSize: 44 },
  emptyText: { fontSize: 15, color: colors.textSecondary },
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
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  fabText: { color: colors.white, fontSize: 28, lineHeight: 30 },
});
