import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, X } from 'lucide-react-native';
import countries from '../data/countries.json';
import { flagEmoji } from '../lib/format';
import i18n from '../lib/i18n';
import { colors, radius, spacing } from '../theme';

type CountryNames = { en: string; ko: string; zh: string };
const COUNTRY_MAP = countries as Record<string, CountryNames>;

/** Localized display name for an ISO alpha-2 code (falls back to English). */
export function countryName(code: string | null | undefined): string | null {
  if (!code) return null;
  const entry = COUNTRY_MAP[code.toUpperCase()];
  if (!entry) return null;
  const lang = i18n.language as keyof CountryNames;
  return entry[lang] ?? entry.en;
}

/**
 * Searchable full-country picker (250 ISO entries, KO/EN/ZH names bundled —
 * Hermes has no Intl.DisplayNames). Matches any language name or the code.
 */
export function CountryPicker({
  visible,
  onSelect,
  onClose,
}: {
  visible: boolean;
  onSelect: (code: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const lang = i18n.language as keyof CountryNames;
    const all = Object.entries(COUNTRY_MAP).map(([code, names]) => ({
      code,
      name: names[lang] ?? names.en,
      names,
    }));
    all.sort((a, b) => a.name.localeCompare(b.name, i18n.language));
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (row) =>
        row.code.toLowerCase() === q ||
        row.names.en.toLowerCase().includes(q) ||
        row.names.ko.includes(query.trim()) ||
        row.names.zh.includes(query.trim()),
    );
  }, [query]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('countryPicker.title')}</Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button">
            <X size={22} color={colors.text} />
          </Pressable>
        </View>
        <View style={styles.searchRow}>
          <Search size={16} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('countryPicker.placeholder')}
            placeholderTextColor={colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
        <FlatList
          data={rows}
          keyExtractor={(row) => row.code}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => {
                onSelect(item.code);
                setQuery('');
                onClose();
              }}
            >
              <Text style={{ fontSize: 20 }}>{flagEmoji(item.code) ?? '🏳️'}</Text>
              <Text style={styles.rowText}>{item.name}</Text>
              <Text style={styles.rowCode}>{item.code}</Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>{t('countryPicker.empty')}</Text>
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, padding: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowText: { flex: 1, fontSize: 15, color: colors.text },
  rowCode: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.xl, fontSize: 14 },
});
