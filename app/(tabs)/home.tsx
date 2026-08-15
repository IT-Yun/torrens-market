import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronDown, MapPin, Plus, Search, WifiOff } from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import { haversineKm } from '../../src/lib/geo';
import { getPosition, getPositionIfGranted } from '../../src/lib/location';
import { AdelaideHero } from '../../src/components/AdelaideHero';
import { ListingRow } from '../../src/components/ListingRow';
import i18n from '../../src/lib/i18n';
import { fetchCategories, fetchListings, type Category, type ListingCard } from '../../src/lib/listings';
import { fetchBlockedIds } from '../../src/lib/moderation';
import { useSession } from '../../src/lib/session';
import { colors, radius, spacing } from '../../src/theme';

type FeedScope = 'suburb' | 'km5' | 'km10' | 'km20' | 'all';
const SCOPE_STORAGE_KEY = 'feed_scope';

export default function HomeScreen() {
  const { t } = useTranslation();
  const { session, profile } = useSession();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [listings, setListings] = useState<ListingCard[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [scope, setScope] = useState<FeedScope>('all');
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const lang = i18n.language as 'ko' | 'en' | 'zh';

  useEffect(() => {
    AsyncStorage.getItem(SCOPE_STORAGE_KEY).then((v) => {
      if (v === 'suburb' || v === 'km5' || v === 'km10' || v === 'km20' || v === 'all') setScope(v);
    });
  }, []);

  useEffect(() => {
    getPositionIfGranted().then((p) => p && setPos(p)).catch(() => {});
  }, []);

  useEffect(() => {
    if (scope.startsWith('km')) getPosition().then(setPos).catch(() => {});
  }, [scope]);

  function chooseScope(next: FeedScope) {
    setScope(next);
    AsyncStorage.setItem(SCOPE_STORAGE_KEY, next).catch(() => {});
  }

  function openScopePicker() {
    Alert.alert(t('home.scopeTitle'), undefined, [
      { text: `${t('home.scopeSuburb')}${profile?.suburb ? ` (${profile.suburb})` : ''}`, onPress: () => chooseScope('suburb') },
      { text: t('home.withinKm', { km: 5 }), onPress: () => chooseScope('km5') },
      { text: t('home.withinKm', { km: 10 }), onPress: () => chooseScope('km10') },
      { text: t('home.withinKm', { km: 20 }), onPress: () => chooseScope('km20') },
      { text: t('home.scopeAll'), onPress: () => chooseScope('all') },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }

  const visibleListings = useMemo(() => {
    if (scope === 'suburb') {
      const mine = (profile?.suburb ?? '').trim().toLowerCase();
      if (!mine) return listings;
      return listings.filter((item) => item.suburb.trim().toLowerCase() === mine);
    }
    if (scope.startsWith('km')) {
      if (!pos) return listings; // permission denied/pending → graceful fallback to all
      const maxKm = Number(scope.slice(2));
      return listings.filter(
        (item) =>
          item.lat != null &&
          item.lng != null &&
          haversineKm(pos.lat, pos.lng, item.lat, item.lng) <= maxKm,
      );
    }
    return listings;
  }, [listings, scope, pos, profile?.suburb]);

  const scopeLabel =
    scope === 'suburb'
      ? profile?.suburb ?? t('home.scopeAll')
      : scope === 'all'
        ? t('home.scopeAll')
        : t('home.withinKm', { km: Number(scope.slice(2)) });

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
        <Pressable
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          onPress={openScopePicker}
          accessibilityRole="button"
          accessibilityLabel={t('home.scopeTitle')}
        >
          <MapPin size={18} color={colors.primary} strokeWidth={2.2} />
          <Text style={styles.suburb}>{scopeLabel}</Text>
          <ChevronDown size={16} color={colors.textSecondary} />
        </Pressable>
        <Pressable
          onPress={() => router.push('/search')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('home.searchPlaceholder')}
        >
          <Search size={22} color={colors.text} strokeWidth={2.2} />
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
        data={visibleListings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ListingRow item={item} viewerPos={pos} />}
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
              <WifiOff size={40} color={colors.textSecondary} strokeWidth={1.5} />
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
        contentContainerStyle={visibleListings.length === 0 ? { flex: 1 } : undefined}
      />

      <Pressable
        style={styles.fab}
        onPress={() => router.push('/listing/create')}
        accessibilityRole="button"
        accessibilityLabel={t('listingCreate.title')}
      >
        <Plus size={26} color={colors.white} strokeWidth={2.4} />
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
});
