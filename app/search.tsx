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
import { router } from 'expo-router';
import { ListingRow } from '../src/components/ListingRow';
import i18n from '../src/lib/i18n';
import {
  fetchCategories,
  searchListings,
  type Category,
  type ListingCard,
} from '../src/lib/listings';
import { colors, radius, spacing } from '../src/theme';

const NATIONALITY_CODES = ['CN', 'KR', 'AU', 'IN', 'VN', 'JP', 'MY', 'HK', 'TW', 'OTHER'];

export default function SearchScreen() {
  const { t } = useTranslation();
  const lang = i18n.language;
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [nationality, setNationality] = useState<string | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [results, setResults] = useState<ListingCard[]>([]);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  const run = useCallback(async () => {
    const items = await searchListings({ query, categoryId, nationality, verifiedOnly });
    setResults(items);
    setSearched(true);
  }, [query, categoryId, nationality, verifiedOnly]);

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
            style={[styles.chip, verifiedOnly && styles.chipSelected]}
            onPress={() => setVerifiedOnly((v) => !v)}
          >
            <Text style={[styles.chipText, verifiedOnly && { color: colors.white }]}>
              ✓ {t('search.verifiedOnly')}
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
        renderItem={({ item }) => <ListingRow item={item} />}
        ListEmptyComponent={
          searched ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyText}>{t('search.noResults')}</Text>
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
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  emptyEmoji: { fontSize: 44 },
  emptyText: { fontSize: 15, color: colors.textSecondary },
});
