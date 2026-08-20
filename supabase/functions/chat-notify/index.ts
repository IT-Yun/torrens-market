// Chat message push — invoked by DB trigger on message insert; notifies
// the other participant in their preferred language with a body preview.
import { createClient } from 'npm:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
type Lang = 'ko' | 'en' | 'zh';

const TITLES: Record<Lang, (name: string) => string> = {
  ko: (n) => `💬 ${n}님의 새 메시지`,
  en: (n) => `💬 New message from ${n}`,
  zh: (n) => `💬 ${n} 的新消息`,
};

Deno.serve(async (req) => {
  if (req.headers.get('x-notify-secret') !== Deno.env.get('NOTIFY_SECRET')) {
    return new Response('forbidden', { status: 403 });
  }
  try {
    const { message_id } = await req.json();
    if (!message_id) return new Response('missing message_id', { status: 400 });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: msg, error } = await supabase
      .from('messages')
      .select(
        `id, room_id, sender_id, body,
         chat_rooms (
           listings (title),
           chat_participants (user_id, profiles (display_name, preferred_language))
         )`,
      )
      .eq('id', message_id)
      .single();
    if (error || !msg) return new Response('message not found', { status: 200 });

    const room = msg.chat_rooms as unknown as {
      listings: { title: string };
      chat_participants: {
        user_id: string;
        profiles: { display_name: string; preferred_language: Lang };
      }[];
    };
    const sender = room.chat_participants.find((p) => p.user_id === msg.sender_id);
    const recipient = room.chat_participants.find((p) => p.user_id !== msg.sender_id);
    if (!recipient) return new Response(JSON.stringify({ notified: 0 }), { status: 200 });

    // respect the recipient's notification preference (default on)
    const { data: rpref } = await supabase
      .from('profiles')
      .select('notification_prefs')
      .eq('id', recipient.user_id)
      .single();
    if ((rpref?.notification_prefs as Record<string, boolean>)?.chat === false)
      return new Response(JSON.stringify({ notified: 0 }), { status: 200 });

    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', recipient.user_id);
    if (!tokens?.length) return new Response(JSON.stringify({ notified: 0 }), { status: 200 });

    const lang = (recipient.profiles?.preferred_language ?? 'en') as Lang;
    const preview = msg.body.length > 80 ? `${msg.body.slice(0, 77)}…` : msg.body;
    const messages = tokens.map((row) => ({
      to: row.token,
      sound: 'default',
      title: TITLES[lang](sender?.profiles?.display_name ?? '?'),
      body: `${preview} · ${room.listings?.title ?? ''}`,
      data: { roomId: msg.room_id },
    }));

    for (let i = 0; i < messages.length; i += 100) {
      await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages.slice(i, i + 100)),
      });
    }
    return new Response(JSON.stringify({ notified: messages.length }), { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(String(e), { status: 500 });
  }
});
