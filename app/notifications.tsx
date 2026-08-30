import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import {
  BadgeDollarSign,
  Bell,
  CalendarClock,
  CheckCheck,
  Heart,
  Info,
  MessageCircle,
  Star,
} from 'lucide-react-native';
import { BackButton } from '../src/components/BackButton';
import { GuestCta } from '../src/components/GuestCta';
import {
  fetchActivities,
  markActivityRead,
  markAllActivitiesRead,
  type Activity,
  type ActivityKind,
} from '../src/lib/activity';
import { formatPrice, timeAgo } from '../src/lib/format';
import { useSession } from '../src/lib/session';
import { colors, radius, spacing } from '../src/theme';

const KIND_ICON: Record<ActivityKind, typeof Bell> = {
  message: MessageCircle,
  offer: BadgeDollarSign,
  meetup: CalendarClock,
  review: Star,
  favorite: Heart,
  system: Info,
};

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const { session } = useSession();
  const [items, setItems] = useState<Activity[]>([]);

  const load = useCallback(() => {
    if (session) fetchActivities().then(setItems).catch(() => {});
  }, [session]);

  useFocusEffect(load);

  function title(item: Activity): string {
    const name = item.actor?.display_name ?? t('notifCenter.someone');
    switch (item.kind) {
      case 'message':
        return t('notifCenter.kind_message', { name });
      case 'offer': {
        const cents = Number(item.data?.price_cents ?? 0);
        return t('notifCenter.kind_offer', { name, price: formatPrice(cents, t('common.free')) });
      }
      case 'meetup':
        return t('notifCenter.kind_meetup', { name });
      case 'review':
        // reviewer stays anonymous (ADR-015) — actor_id is NULL by design
        return t('notifCenter.kind_review');
      case 'favorite':
        return t('notifCenter.kind_favorite', { name });
      default:
        return String(item.data?.text ?? t('notifCenter.kind_system'));
    }
  }

  async function open(item: Activity) {
    markActivityRead(item.id).catch(() => {});
    setItems((prev) =>
      prev.map((row) => (row.id === item.id ? { ...row, read_at: new Date().toISOString() } : row)),
    );
    if (item.room_id) router.push(`/chat/${item.room_id}`);
    else if (item.kind === 'review') router.push('/my-reviews');
    else if (item.listing_id) router.push(`/listing/${item.listing_id}`);
  }

  if (!session) return <GuestCta emoji="🔔" />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.title}>{t('notifCenter.title')}</Text>
        <Pressable
          onPress={() => {
            markAllActivitiesRead().catch(() => {});
            setItems((prev) =>
              prev.map((row) => ({ ...row, read_at: row.read_at ?? new Date().toISOString() })),
            );
          }}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('notifCenter.markAll')}
        >
          <CheckCheck size={20} color={colors.primary} />
        </Pressable>
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const Icon = KIND_ICON[item.kind] ?? Info;
          const unread = item.read_at == null;
          return (
            <Pressable
              style={[styles.row, unread && styles.rowUnread]}
              onPress={() => open(item)}
            >
              <View style={[styles.iconWrap, unread && { backgroundColor: colors.primarySoft }]}>
                <Icon size={18} color={unread ? colors.primary : colors.textSecondary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.rowTitle, unread && { fontWeight: '700' }]}>
                  {title(item)}
                </Text>
                {item.kind === 'message' && item.data?.preview ? (
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {String(item.data.preview)}
                  </Text>
                ) : item.listing?.title ? (
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {item.listing.title}
                  </Text>
                ) : null}
                <Text style={styles.rowTime}>{timeAgo(item.created_at)}</Text>
              </View>
              {unread && <View style={styles.dot} />}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 44 }}>🔔</Text>
            <Text style={styles.emptyText}>{t('notifCenter.empty')}</Text>
          </View>
        }
        contentContainerStyle={items.length === 0 ? { flex: 1 } : { paddingBottom: spacing.xl }}
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
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowUnread: { backgroundColor: colors.surface },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontSize: 14, color: colors.text, lineHeight: 19 },
  rowMeta: { fontSize: 13, color: colors.textSecondary },
  rowTime: { fontSize: 11, color: colors.textSecondary },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  emptyText: { fontSize: 14, color: colors.textSecondary },
});
