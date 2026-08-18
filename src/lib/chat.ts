import type { RealtimeChannel } from '@supabase/supabase-js';
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
};

export async function fetchRoomHeader(roomId: string, myUserId: string): Promise<RoomHeader | null> {
  const { data, error } = await supabase
    .from('chat_rooms')
    .select('listings (id, title, status, suburb), chat_participants (user_id, profiles (display_name))')
    .eq('id', roomId)
    .single();
  if (error) return null;
  const room = data as unknown as {
    listings: { id: string; title: string; status: string; suburb: string };
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
  };
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

export async function markRead(roomId: string, userId: string): Promise<void> {
  await supabase
    .from('chat_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('room_id', roomId)
    .eq('user_id', userId);
}

/** Number of rooms with unread messages — used for the chat tab badge. */
export async function fetchUnreadCount(userId: string): Promise<number> {
  const rooms = await fetchRooms(userId);
  return rooms.filter((r) => r.unread).length;
}
