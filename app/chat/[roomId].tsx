import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  fetchMessages,
  fetchRoomHeader,
  markRead,
  sendMessage,
  subscribeToRoom,
  type Message,
  type RoomHeader,
} from '../../src/lib/chat';
import { Star } from 'lucide-react-native';
import { MeetupCard } from '../../src/components/MeetupCard';
import { OfferCard } from '../../src/components/OfferCard';
import { hasReviewed } from '../../src/lib/reviews';
import { useSession } from '../../src/lib/session';
import { colors, radius, spacing } from '../../src/theme';

export default function ChatRoomScreen() {
  const { t } = useTranslation();
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [header, setHeader] = useState<RoomHeader | null>(null);
  const [canReview, setCanReview] = useState(false);
  const seenIds = useRef(new Set<string>());

  const loadHeader = useCallback(() => {
    if (!roomId || !session) return;
    fetchRoomHeader(roomId, session.user.id)
      .then((h) => {
        setHeader(h);
        if (h && h.listingStatus !== 'active') {
          hasReviewed(h.listingId, session.user.id)
            .then((done) => setCanReview(!done))
            .catch(() => {});
        } else {
          setCanReview(false);
        }
      })
      .catch(() => {});
  }, [roomId, session]);

  // Refresh listing status / review eligibility whenever the room regains focus
  // (e.g. returning from the review screen or after the trade state changed).
  useFocusEffect(loadHeader);

  useEffect(() => {
    if (!roomId || !session) return;
    fetchMessages(roomId)
      .then((items) => {
        items.forEach((m) => seenIds.current.add(m.id));
        setMessages(items);
      })
      .catch(() => {});
    markRead(roomId, session.user.id).catch(() => {});

    const channel = subscribeToRoom(roomId, (message) => {
      if (seenIds.current.has(message.id)) return;
      seenIds.current.add(message.id);
      setMessages((prev) => [message, ...prev]);
      if (session) markRead(roomId, session.user.id).catch(() => {});
    });
    return () => {
      channel.unsubscribe();
    };
  }, [roomId, session]);

  async function send() {
    const body = draft.trim();
    if (!body || !roomId || !session) return;
    setDraft('');
    try {
      await sendMessage(roomId, session.user.id, body);
    } catch {
      setDraft(body);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        {header && (
          <Pressable
            style={styles.headerCenter}
            onPress={() => router.push(`/listing/${header.listingId}`)}
          >
            <Text style={styles.headerName}>{header.otherName}</Text>
            <Text style={styles.headerListing} numberOfLines={1}>
              {header.listingTitle}
            </Text>
          </Pressable>
        )}
        <View style={{ width: 24 }} />
      </View>
      {roomId && session && header && (
        <>
          <OfferCard roomId={roomId} myId={session.user.id} />
          <MeetupCard roomId={roomId} myId={session.user.id} defaultPlace={header.listingSuburb} />
        </>
      )}
      {canReview && header?.otherId ? (
        <Pressable
          style={styles.reviewChip}
          onPress={() =>
            router.push({
              pathname: '/review',
              params: {
                listingId: header.listingId,
                revieweeId: header.otherId,
                name: header.otherName,
              },
            })
          }
          accessibilityRole="button"
        >
          <Star size={14} color={colors.primary} />
          <Text style={styles.reviewChipText}>{t('review.leaveReview')}</Text>
        </Pressable>
      ) : null}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          inverted
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const mine = item.sender_id === session?.user.id;
            const time = new Date(item.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
            return (
              <View style={[styles.bubbleRow, mine && { justifyContent: 'flex-end' }]}>
                {mine && <Text style={styles.time}>{time}</Text>}
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  <Text style={[styles.bubbleText, mine && { color: colors.white }]}>
                    {item.body}
                  </Text>
                </View>
                {!mine && <Text style={styles.time}>{time}</Text>}
              </View>
            );
          }}
        />
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder={t('chat.typeMessage')}
            placeholderTextColor={colors.textSecondary}
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={send}
            returnKeyType="send"
            multiline
          />
          <Pressable style={styles.sendButton} onPress={send} disabled={!draft.trim()}>
            <Text style={styles.sendText}>{t('chat.send')}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerName: { fontSize: 16, fontWeight: '700', color: colors.text },
  headerListing: { fontSize: 12, color: colors.textSecondary, maxWidth: 220 },
  back: { fontSize: 32, color: colors.text, lineHeight: 34, width: 24 },
  time: { fontSize: 10, color: colors.textSecondary, alignSelf: 'flex-end', marginHorizontal: 4 },
  list: { padding: spacing.md, gap: spacing.sm },
  bubbleRow: { flexDirection: 'row' },
  bubble: { maxWidth: '78%', borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine: { backgroundColor: colors.primary },
  bubbleTheirs: { backgroundColor: colors.surface },
  bubbleText: { fontSize: 15, color: colors.text },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sendText: { color: colors.white, fontWeight: '600' },
  reviewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
  },
  reviewChipText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
});
