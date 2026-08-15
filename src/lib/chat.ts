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
  other: { id: string; display_name: string };
  lastMessage: { body: string; created_at: string } | null;
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
         chat_participants (user_id, profiles (display_name)),
         messages (body, created_at)
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
      chat_participants: { user_id: string; profiles: { display_name: string } }[];
      messages: { body: string; created_at: string }[];
    };
  };

  return ((data ?? []) as unknown as Row[])
    .map((row) => {
      const room = row.chat_rooms;
      const other = room.chat_participants.find((p) => p.user_id !== userId);
      const photo = [...(room.listings?.listing_photos ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order,
      )[0];
      return {
        room_id: row.room_id,
        listing: {
          id: room.listings?.id ?? '',
          title: room.listings?.title ?? '',
          photo: photo?.storage_path ?? null,
        },
        other: {
          id: other?.user_id ?? '',
          display_name: other?.profiles?.display_name ?? '?',
        },
        lastMessage: room.messages[0] ?? null,
      };
    })
    .sort((a, b) =>
      (b.lastMessage?.created_at ?? '').localeCompare(a.lastMessage?.created_at ?? ''),
    );
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
