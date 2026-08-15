import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, X } from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import { addAlert, fetchAlerts, removeAlert, type KeywordAlert } from '../src/lib/alerts';
import { registerPushToken } from '../src/lib/notifications';
import { useSession } from '../src/lib/session';
import { colors, radius, spacing } from '../src/theme';

export default function KeywordsScreen() {
  const { t } = useTranslation();
  const { session } = useSession();
  const [alerts, setAlerts] = useState<KeywordAlert[]>([]);
  const [draft, setDraft] = useState('');

  const load = useCallback(() => {
    if (session) fetchAlerts(session.user.id).then(setAlerts).catch(() => {});
  }, [session]);

  useFocusEffect(load);

  async function add() {
    const keyword = draft.trim();
    if (!keyword || !session) return;
    setDraft('');
    await addAlert(session.user.id, keyword).catch(() => {});
    await registerPushToken(session.user.id);
    load();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.title}>{t('keywords.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.hint}>{t('keywords.hint')}</Text>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder={t('keywords.placeholder')}
          placeholderTextColor={colors.textSecondary}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={add}
          returnKeyType="done"
        />
        <Pressable style={styles.addButton} onPress={add} disabled={!draft.trim()}>
          <Text style={styles.addText}>＋</Text>
        </Pressable>
      </View>

      <FlatList
        data={alerts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <Bell size={16} color={colors.primary} />
              <Text style={styles.keyword}>{item.keyword}</Text>
            </View>
            <Pressable
              onPress={async () => {
                await removeAlert(item.id).catch(() => {});
                load();
              }}
              hitSlop={8}
            >
              <X size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Bell size={40} color={colors.textSecondary} strokeWidth={1.5} />
            <Text style={styles.emptyText}>{t('keywords.empty')}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  back: { fontSize: 32, color: colors.text, lineHeight: 34, width: 24 },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  hint: { fontSize: 13, color: colors.textSecondary, paddingHorizontal: spacing.md },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { color: colors.white, fontSize: 22 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  keyword: { fontSize: 15, color: colors.text, fontWeight: '600' },
  remove: { fontSize: 16, color: colors.textSecondary },
  empty: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xl },
  emptyText: { fontSize: 14, color: colors.textSecondary },
});
