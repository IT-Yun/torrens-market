// Price-offer notifications (ADR 011) — trigger-invoked on offer state
// changes; pushes to the counterparty in their preferred language.
import { createClient } from 'npm:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
type Lang = 'ko' | 'en' | 'zh';
type Event = 'proposed' | 'accepted' | 'declined' | 'withdrawn';

const TITLES: Record<Event, Record<Lang, string>> = {
  proposed: { ko: '💰 새 가격 제안', en: '💰 New price offer', zh: '💰 新的出价' },
  accepted: { ko: '🤝 가격 제안이 수락됐어요', en: '🤝 Offer accepted', zh: '🤝 出价已接受' },
  declined: { ko: '가격 제안이 거절됐어요', en: 'Offer declined', zh: '出价被拒绝' },
  withdrawn: { ko: '가격 제안이 철회됐어요', en: 'Offer withdrawn', zh: '出价已撤回' },
};

Deno.serve(async (req) => {
  try {
    const { offer_id, event } = (await req.json()) as { offer_id: string; event: Event };
    if (!offer_id || !TITLES[event]) return new Response('bad payload', { status: 400 });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: offer, error } = await supabase
      .from('offers')
      .select(
        `id, room_id, proposer_id, price_cents,
         chat_rooms (
           listings (title),
           chat_participants (user_id, profiles (preferred_language))
         )`,
      )
      .eq('id', offer_id)
      .single();
    if (error || !offer) return new Response('offer not found', { status: 200 });

    const room = offer.chat_rooms as unknown as {
      listings: { title: string };
      chat_participants: { user_id: string; profiles: { preferred_language: Lang } }[];
    };
    // proposed → counterparty; responses → the proposer
    const recipients = room.chat_participants.filter((p) =>
      event === 'proposed' ? p.user_id !== offer.proposer_id : p.user_id === offer.proposer_id,
    );
    if (recipients.length === 0) return new Response(JSON.stringify({ notified: 0 }), { status: 200 });

    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('user_id, token')
      .in('user_id', recipients.map((r) => r.user_id));
    const langOf = new Map(recipients.map((r) => [r.user_id, r.profiles?.preferred_language ?? 'en']));
    const price =
      offer.price_cents === 0 ? 'Free' : `$${(offer.price_cents / 100).toLocaleString('en-AU')}`;
    const messages = (tokens ?? []).map((row) => {
      const lang = (langOf.get(row.user_id) ?? 'en') as Lang;
      return {
        to: row.token,
        sound: 'default',
        title: TITLES[event][lang],
        body: `${price} — ${room.listings?.title ?? ''}`,
        data: { roomId: offer.room_id },
      };
    });

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
