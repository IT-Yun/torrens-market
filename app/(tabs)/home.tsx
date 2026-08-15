import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { AdelaideHero } from '../../src/components/AdelaideHero';
import { ListingRow } from '../../src/components/ListingRow';
import i18n from '../../src/lib/i18n';
import { fetchCategories, fetchListings, type Category, type ListingCard } from '../../src/lib/listings';
import { fetchBlockedIds } from '../../src/lib/moderation';
import { useSession } from '../../src/lib/session';
import { colors, radius, spacing } from '../../src/theme';

export default function HomeScreen() {
  const { t } = useTranslation();
  const { session, profile } = useSession();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [listings, setListings] = useState<ListingCard[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const lang = i18n.language as 'ko' | 'en' | 'zh';

  const load = useCallback(async () => {
    try {
      const [cats, items, blocked] = await Promise.all([
        categories.length ? Promise.resolve(categories) : fetchCategories(),
        fetchListings(selectedCategory),
        session ? fetchBlockedIds(session.user.id) : Promise.resolve(new Set<string>()),
      ]);
      setCategories(cats);
      setListings(items.filter((item) => !blocked.has(item.seller_id)));
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, [categories, selectedCategory, session]);

  useEffect(() => {
    load();
  }, [selectedCategory]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Karrot pattern: your neighbourhood first */}
      <View style={styles.header}>
        <Text style={styles.suburb}>📍 {profile?.suburb ?? t('common.appName')}</Text>
        <Pressable
          onPress={() => router.push('/search')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('home.searchPlaceholder')}
        >
          <Text style={{ fontSize: 20 }}>🔍</Text>
        </Pressable>
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
        renderItem={({ item }) => <ListingRow item={item} />}
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
          loadError ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 40 }}>📡</Text>
              <Text style={styles.emptyText}>{t('common.loadError')}</Text>
              <Pressable style={styles.retryButton} onPress={load} accessibilityRole="button">
                <Text style={styles.retryText}>{t('common.retry')}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <AdelaideHero width={220} height={124} />
              <Text style={styles.emptyText}>{t('home.empty')}</Text>
            </View>
          )
        }
        contentContainerStyle={listings.length === 0 ? { flex: 1 } : undefined}
      />

      <Pressable
        style={styles.fab}
        onPress={() => router.push('/listing/create')}
        accessibilityRole="button"
        accessibilityLabel={t('listingCreate.title')}
      >
        <Text style={styles.fabText}>＋</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  suburb: { fontSize: 18, fontWeight: '800', color: colors.text },
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
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  emptyText: { fontSize: 15, color: colors.textSecondary },
  retryButton: {
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  retryText: { fontSize: 14, fontWeight: '600', color: colors.text },
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
