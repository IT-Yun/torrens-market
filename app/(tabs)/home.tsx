import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../src/lib/supabase';
import i18n from '../../src/lib/i18n';
import { colors, radius, spacing } from '../../src/theme';

type Category = { id: number; slug: string; name_i18n: Record<string, string> };

export default function HomeScreen() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from('categories')
      .select('id, slug, name_i18n')
      .order('sort_order')
      .then(({ data }) => setCategories((data as Category[]) ?? []));
  }, []);

  const lang = i18n.language as 'ko' | 'en' | 'zh';

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
                <Text style={[styles.chipText, selected && { color: colors.white }]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      <View style={styles.emptyState}>
        <Text style={styles.emptyEmoji}>📦</Text>
        <Text style={styles.emptyText}>{t('home.empty')}</Text>
      </View>

      {/* Listing creation FAB — wired to the create flow in M2 */}
      <Pressable style={styles.fab}>
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
  },
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
