import type { RealtimeChannel } from '@supabase/supabase-js';
import { compressForUpload } from './images';
import { supabase } from './supabase';

export type Message = {
  id: string;
  room_id: string;
  sender_id: string;
  body: string;
  image_path: string | null;
  created_at: string;
};

export type ChatRoomSummary = {
  room_id: string;
  listing: { id: string; title: string; photo: string | null };
  other: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    nationality: string | null;
  };
  lastMessage: { body: string; created_at: string } | null;
  unread: boolean;
};

export async function startChat(listingId: string): Promise<string> {
  const { data, error } = await supabase.rpc('start_chat', { p_listing_id: listingId });
  if (error) throw error;
  return data as string;
}

export async function fetchRooms(userId: string): Promise<ChatRoomSummary[]> {
  const { data, error } = await supabase
    .from('chat_participants')
    .select(
      `room_id,
       chat_rooms (
         id, created_at,
         listings (id, title, listing_photos (storage_path, sort_order)),
         chat_participants (user_id, last_read_at, profiles (display_name, avatar_url, nationality)),
         messages (body, created_at, sender_id)
       )`,
    )
    .eq('user_id', userId)
    .order('created_at', { referencedTable: 'chat_rooms.messages', ascending: false })
    .limit(1, { referencedTable: 'chat_rooms.messages' });
  if (error) throw error;

  type Row = {
    room_id: string;
    chat_rooms: {
      listings: {
        id: string;
        title: string;
        listing_photos: { storage_path: string; sort_order: number }[];
      };
      chat_participants: {
        user_id: string;
        last_read_at: string;
        profiles: { display_name: string; avatar_url: string | null; nationality: string | null };
      }[];
      messages: { body: string; created_at: string; sender_id: string }[];
    };
  };

  return ((data ?? []) as unknown as Row[])
    .map((row) => {
      const room = row.chat_rooms;
      const other = room.chat_participants.find((p) => p.user_id !== userId);
      const me = room.chat_participants.find((p) => p.user_id === userId);
      const photo = [...(room.listings?.listing_photos ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order,
      )[0];
      const last = room.messages[0] ?? null;
      const unread =
        !!last && last.sender_id !== userId && (!me || last.created_at > me.last_read_at);
      return {
        unread,
        room_id: row.room_id,
        listing: {
          id: room.listings?.id ?? '',
          title: room.listings?.title ?? '',
          photo: photo?.storage_path ?? null,
        },
        other: {
          id: other?.user_id ?? '',
          display_name: other?.profiles?.display_name ?? '?',
          avatar_url: other?.profiles?.avatar_url ?? null,
          nationality: other?.profiles?.nationality ?? null,
        },
        lastMessage: room.messages[0] ?? null,
      };
    })
    .sort((a, b) =>
      (b.lastMessage?.created_at ?? '').localeCompare(a.lastMessage?.created_at ?? ''),
    );
}

export type RoomHeader = {
  otherName: string;
  otherId: string;
  listingTitle: string;
  listingId: string;
  listingStatus: string;
  listingSuburb: string;
  offersEnabled: boolean;
};

export async function fetchRoomHeader(roomId: string, myUserId: string): Promise<RoomHeader | null> {
  const { data, error } = await supabase
    .from('chat_rooms')
    .select('listings (id, title, status, suburb, offers_enabled), chat_participants (user_id, profiles (display_name))')
    .eq('id', roomId)
    .single();
  if (error) return null;
  const room = data as unknown as {
    listings: { id: string; title: string; status: string; suburb: string; offers_enabled: boolean };
    chat_participants: { user_id: string; profiles: { display_name: string } }[];
  };
  const other = room.chat_participants.find((p) => p.user_id !== myUserId);
  return {
    otherName: other?.profiles?.display_name ?? '?',
    otherId: other?.user_id ?? '',
    listingTitle: room.listings?.title ?? '',
    listingId: room.listings?.id ?? '',
    listingStatus: room.listings?.status ?? 'active',
    listingSuburb: room.listings?.suburb ?? '',
    offersEnabled: room.listings?.offers_enabled ?? true,
  };
}

/** The caller's chat room for a listing, or null (e.g. jump from my-listings to review). */
export async function findRoomForListing(listingId: string, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('chat_rooms')
    .select('id, chat_participants!inner (user_id)')
    .eq('listing_id', listingId)
    .eq('chat_participants.user_id', userId)
    .limit(1);
  return (data as { id: string }[] | null)?.[0]?.id ?? null;
}

export async function fetchMessages(roomId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data as Message[]) ?? [];
}

export async function sendMessage(roomId: string, senderId: string, body: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .insert({ room_id: roomId, sender_id: senderId, body });
  if (error) throw error;
}

export function subscribeToRoom(
  roomId: string,
  onMessage: (message: Message) => void,
): RealtimeChannel {
  return supabase
    .channel(`room-${roomId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
      (payload) => onMessage(payload.new as Message),
    )
    .subscribe();
}

const unreadListeners = new Set<() => void>();

/** Subscribe to local unread-state changes (returns unsubscribe). */
export function onUnreadChanged(listener: () => void): () => void {
  unreadListeners.add(listener);
  return () => unreadListeners.delete(listener);
}

export async function markRead(roomId: string, _userId: string): Promise<void> {
  // Server-time stamp (mark_read RPC) — client clocks can lag the DB.
  await supabase.rpc('mark_read', { p_room_id: roomId });
  // The tab badge can't rely on a chat_participants UPDATE event arriving —
  // nudge listeners directly once the server confirms the read.
  unreadListeners.forEach((listener) => listener());
}

/** Number of rooms with unread messages — used for the chat tab badge. */
export async function fetchUnreadCount(userId: string): Promise<number> {
  const rooms = await fetchRooms(userId);
  return rooms.filter((r) => r.unread).length;
}

/** Send an image message: uploads to the room-scoped bucket, then inserts. */
export async function sendImageMessage(
  roomId: string,
  senderId: string,
  asset: { uri: string; mimeType?: string; width?: number },
): Promise<void> {
  const compressed = await compressForUpload(asset);
  const path = `${roomId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const response = await fetch(compressed.uri);
  const arrayBuffer = await response.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from('chat-images')
    .upload(path, arrayBuffer, { contentType: compressed.mimeType });
  if (uploadError) throw uploadError;
  const { error } = await supabase
    .from('messages')
    .insert({ room_id: roomId, sender_id: senderId, body: '📷', image_path: path });
  if (error) throw error;
}

/** Signed URL for a chat image (bucket is private, participants-only). */
export async function chatImageUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from('chat-images').createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
