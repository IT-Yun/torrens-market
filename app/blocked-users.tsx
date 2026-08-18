import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { ChevronLeft, ShieldOff } from 'lucide-react-native';
import { Avatar } from '../src/components/Avatar';
import { fetchBlockedUsers, unblockUser, type BlockedUser } from '../src/lib/moderation';
import { useSession } from '../src/lib/session';
import { colors, radius, spacing } from '../src/theme';

export default function BlockedUsersScreen() {
  const { t } = useTranslation();
  const { session } = useSession();
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);

  const load = useCallback(() => {
    if (session) fetchBlockedUsers(session.user.id).then(setBlocked).catch(() => {});
  }, [session]);

  useFocusEffect(load);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button">
          <ChevronLeft size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{t('block.manageTitle')}</Text>
        <View style={{ width: 26 }} />
      </View>
      <FlatList
        data={blocked}
        keyExtractor={(item) => item.blocked_id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Avatar
              name={item.profiles?.display_name}
              url={item.profiles?.avatar_url}
              nationality={item.profiles?.nationality}
              size={44}
            />
            <Text style={styles.name}>{item.profiles?.display_name ?? '?'}</Text>
            <Pressable
              style={styles.unblockBtn}
              onPress={async () => {
                if (!session) return;
                await unblockUser(session.user.id, item.blocked_id).catch(() => {});
                load();
              }}
              accessibilityRole="button"
            >
              <Text style={styles.unblockText}>{t('block.unblock')}</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <ShieldOff size={40} color={colors.textSecondary} strokeWidth={1.5} />
            <Text style={styles.emptyText}>{t('block.empty')}</Text>
          </View>
        }
        contentContainerStyle={blocked.length === 0 ? { flex: 1 } : undefined}
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
    paddingVertical: spacing.sm,
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  name: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  unblockBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: colors.white,
  },
  unblockText: { fontSize: 13, fontWeight: '600', color: colors.text },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  emptyText: { fontSize: 14, color: colors.textSecondary },
});
