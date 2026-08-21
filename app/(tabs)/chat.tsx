import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageCircle, Package } from 'lucide-react-native';
import { Avatar } from '../../src/components/Avatar';
import { router, useFocusEffect } from 'expo-router';
import { timeAgo } from '../../src/components/ListingRow';
import { fetchRooms, type ChatRoomSummary } from '../../src/lib/chat';
import { photoUrl } from '../../src/lib/listings';
import { useSession } from '../../src/lib/session';
import { colors, radius, spacing } from '../../src/theme';

export default function ChatListScreen() {
  const { t } = useTranslation();
  const { session } = useSession();
  const [rooms, setRooms] = useState<ChatRoomSummary[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (session) fetchRooms(session.user.id).then(setRooms).catch(() => {});
    }, [session]),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={rooms}
        keyExtractor={(item) => item.room_id}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/chat/${item.room_id}`)}>
            <View>
              <Avatar
                name={item.other.display_name}
                url={item.other.avatar_url}
                nationality={item.other.nationality}
                seed={item.other.id}
                size={48}
              />
              {item.listing.photo ? (
                <Image source={{ uri: photoUrl(item.listing.photo) }} style={styles.miniThumb} />
              ) : (
                <View style={[styles.miniThumb, styles.thumbPlaceholder]}>
                  <Package size={12} color={colors.textSecondary} />
                </View>
              )}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.name, item.unread && styles.nameUnread]}>
                {item.other.display_name}
                <Text style={styles.listingTitle}>  · {item.listing.title}</Text>
              </Text>
              <Text
                style={[styles.preview, item.unread && styles.previewUnread]}
                numberOfLines={1}
              >
                {item.lastMessage?.body ?? ''}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              {item.lastMessage && (
                <Text style={styles.time}>{timeAgo(item.lastMessage.created_at)}</Text>
              )}
              {item.unread && <View style={styles.unreadDot} />}
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MessageCircle size={44} color={colors.textSecondary} strokeWidth={1.5} />
            <Text style={styles.text}>{t('chat.empty')}</Text>
          </View>
        }
        contentContainerStyle={rooms.length === 0 ? { flex: 1 } : undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  thumb: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: colors.surface },
  miniThumb: {
    position: 'absolute',
    right: -6,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.background,
    backgroundColor: colors.surface,
  },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  nameUnread: { fontWeight: '800' },
  previewUnread: { color: colors.text, fontWeight: '600' },
  unreadDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary },
  listingTitle: { fontSize: 13, fontWeight: '400', color: colors.textSecondary },
  preview: { fontSize: 13, color: colors.textSecondary },
  time: { fontSize: 12, color: colors.textSecondary },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  emoji: { fontSize: 44 },
  text: { fontSize: 15, color: colors.textSecondary },
});
