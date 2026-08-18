// Meetup notifications (ADR 009) — invoked by DB trigger (pg_net) on
// meetup insert/status change, and by the pg_cron reminder sweep.
// Fans out Expo push in each recipient's preferred language.

import { createClient } from 'npm:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

type Lang = 'ko' | 'en' | 'zh';
type Event = 'proposed' | 'accepted' | 'declined' | 'cancelled' | 'reminder';

const TITLES: Record<Event, Record<Lang, string>> = {
  proposed: { ko: '📅 새 픽업 약속 제안', en: '📅 New pickup time proposed', zh: '📅 新的交易时间提议' },
  accepted: { ko: '✅ 약속이 확정됐어요', en: '✅ Meetup confirmed', zh: '✅ 约定已确认' },
  declined: { ko: '❌ 약속이 거절됐어요', en: '❌ Meetup declined', zh: '❌ 提议被拒绝' },
  cancelled: { ko: '🚫 약속이 취소됐어요', en: '🚫 Meetup cancelled', zh: '🚫 约定已取消' },
  reminder: { ko: '⏰ 1시간 후 약속이 있어요', en: '⏰ Meetup in about an hour', zh: '⏰ 约1小时后有交易约定' },
};

function formatWhen(iso: string, lang: Lang): string {
  const locale = lang === 'ko' ? 'ko-KR' : lang === 'zh' ? 'zh-CN' : 'en-AU';
  return new Date(iso).toLocaleString(locale, {
    timeZone: 'Australia/Adelaide',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

Deno.serve(async (req) => {
  if (req.headers.get('x-notify-secret') !== Deno.env.get('NOTIFY_SECRET')) {
    return new Response('forbidden', { status: 403 });
  }
  try {
    const { meetup_id, event } = (await req.json()) as { meetup_id: string; event: Event };
    if (!meetup_id || !TITLES[event]) return new Response('bad payload', { status: 400 });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: meetup, error } = await supabase
      .from('meetups')
      .select(
        `id, room_id, proposer_id, scheduled_at, place,
         chat_rooms (
           listings (title),
           chat_participants (user_id, profiles (preferred_language))
         )`,
      )
      .eq('id', meetup_id)
      .single();
    if (error || !meetup) return new Response('meetup not found', { status: 200 });

    const room = meetup.chat_rooms as unknown as {
      listings: { title: string };
      chat_participants: { user_id: string; profiles: { preferred_language: Lang } }[];
    };

    // proposed → only the counterparty; everything else → both participants.
    const recipients = room.chat_participants.filter(
      (p) => event !== 'proposed' || p.user_id !== meetup.proposer_id,
    );
    if (recipients.length === 0) return new Response(JSON.stringify({ notified: 0 }), { status: 200 });

    const { data: tokens, error: tokensError } = await supabase
      .from('push_tokens')
      .select('user_id, token')
      .in('user_id', recipients.map((r) => r.user_id));
    if (tokensError) throw tokensError;

    const langOf = new Map(recipients.map((r) => [r.user_id, r.profiles?.preferred_language ?? 'en']));
    const messages = (tokens ?? []).map((row) => {
      const lang = (langOf.get(row.user_id) ?? 'en') as Lang;
      return {
        to: row.token,
        sound: 'default',
        title: TITLES[event][lang],
        body: `${room.listings?.title ?? ''} — ${formatWhen(meetup.scheduled_at, lang)} · ${meetup.place}`,
        data: { roomId: meetup.room_id },
      };
    });

    for (let i = 0; i < messages.length; i += 100) {
      await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages.slice(i, i + 100)),
      });
    }

    return new Response(JSON.stringify({ notified: messages.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(String(e), { status: 500 });
  }
});
