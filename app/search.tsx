import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BadgeCheck, Bell, History, SearchX } from 'lucide-react-native';
import { router } from 'expo-router';
import { ListingRow } from '../src/components/ListingRow';
import { getPositionIfGranted } from '../src/lib/location';
import i18n from '../src/lib/i18n';
import {
  fetchCategories,
  searchListings,
  type Category,
  type ListingCard,
} from '../src/lib/listings';
import { colors, radius, spacing } from '../src/theme';

const NATIONALITY_CODES = ['CN', 'KR', 'AU', 'IN', 'VN', 'JP', 'MY', 'HK', 'TW', 'OTHER'];
const RECENTS_KEY = 'recent_searches';

export default function SearchScreen() {
  const { t } = useTranslation();
  const lang = i18n.language;
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [nationality, setNationality] = useState<string | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [results, setResults] = useState<ListingCard[]>([]);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    getPositionIfGranted().then((p) => p && setPos(p)).catch(() => {});
  }, []);
  const [searched, setSearched] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
    AsyncStorage.getItem(RECENTS_KEY)
      .then((v) => v && setRecents(JSON.parse(v)))
      .catch(() => {});
  }, []);

  function saveRecent(term: string) {
    const next = [term, ...recents.filter((r) => r !== term)].slice(0, 8);
    setRecents(next);
    AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(next)).catch(() => {});
  }

  function clearRecents() {
    setRecents([]);
    AsyncStorage.removeItem(RECENTS_KEY).catch(() => {});
  }

  const run = useCallback(
    async (override?: string) => {
      const term = override ?? query;
      const items = await searchListings({ query: term, categoryId, nationality, verifiedOnly });
      setResults(items);
      setSearched(true);
      if (term.trim()) saveRecent(term.trim());
    },
    [query, categoryId, nationality, verifiedOnly, recents],
  );

  useEffect(() => {
    run().catch(() => {});
  }, [categoryId, nationality, verifiedOnly]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.searchBar}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <TextInput
          style={styles.input}
          placeholder={t('home.searchPlaceholder')}
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => run().catch(() => {})}
          returnKeyType="search"
          autoFocus
        />
      </View>

      {/* filter rows */}
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <Pressable
            style={[styles.chip, styles.iconChip, verifiedOnly && styles.chipSelected]}
            onPress={() => setVerifiedOnly((v) => !v)}
          >
            <BadgeCheck size={14} color={verifiedOnly ? colors.white : colors.textSecondary} />
            <Text style={[styles.chipText, verifiedOnly && { color: colors.white }]}>
              {t('search.verifiedOnly')}
            </Text>
          </Pressable>
          {categories.map((c) => {
            const selected = categoryId === c.id;
            return (
              <Pressable
                key={c.id}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => setCategoryId(selected ? null : c.id)}
              >
                <Text style={[styles.chipText, selected && { color: colors.white }]}>
                  {c.name_i18n[lang] ?? c.slug}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {NATIONALITY_CODES.map((code) => {
            const selected = nationality === code;
            return (
              <Pressable
                key={code}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => setNationality(selected ? null : code)}
              >
                <Text style={[styles.chipText, selected && { color: colors.white }]}>
                  {t(`nationalities.${code}`)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ListingRow item={item} viewerPos={pos} />}
        ListHeaderComponent={
          query.trim() === '' && recents.length > 0 ? (
            <View style={styles.recents}>
              <View style={styles.recentsHeader}>
                <Text style={styles.recentsTitle}>{t('search.recent')}</Text>
                <Pressable onPress={clearRecents} hitSlop={8} accessibilityRole="button">
                  <Text style={styles.recentsClear}>{t('search.clearRecent')}</Text>
                </Pressable>
              </View>
              <View style={styles.recentsChips}>
                {recents.map((r) => (
                  <Pressable
                    key={r}
                    style={[styles.chip, styles.iconChip]}
                    onPress={() => {
                      setQuery(r);
                      run(r).catch(() => {});
                    }}
                    accessibilityRole="button"
                  >
                    <History size={13} color={colors.textSecondary} />
                    <Text style={styles.chipText}>{r}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          searched ? (
            <View style={styles.empty}>
              <SearchX size={44} color={colors.textSecondary} strokeWidth={1.5} />
              <Text style={styles.emptyText}>{t('search.noResults')}</Text>
              <Pressable style={[styles.keywordCta, styles.iconChip]} onPress={() => router.push('/keywords')}>
                <Bell size={15} color={colors.white} />
                <Text style={styles.keywordCtaText}>{t('search.keywordCta')}</Text>
              </Pressable>
            </View>
          ) : null
        }
        contentContainerStyle={results.length === 0 ? { flex: 1 } : undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  back: { fontSize: 32, color: colors.text, lineHeight: 34 },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
  },
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
  iconChip: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  recents: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: spacing.sm },
  recentsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recentsTitle: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  recentsClear: { fontSize: 13, color: colors.textSecondary, textDecorationLine: 'underline' },
  recentsChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  keywordCta: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  keywordCtaText: { color: colors.white, fontWeight: '600', fontSize: 14 },
  emptyText: { fontSize: 15, color: colors.textSecondary },
});
