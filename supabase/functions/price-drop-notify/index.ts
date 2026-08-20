// Price-drop notifications — trigger-invoked when a listing's price falls;
// pushes to everyone who favorited it, in each recipient's language.
import { createClient } from 'npm:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
type Lang = 'ko' | 'en' | 'zh';

const TITLES: Record<Lang, string> = {
  ko: '💸 찜한 매물 가격이 내려갔어요',
  en: '💸 Price drop on a listing you saved',
  zh: '💸 你收藏的商品降价了',
};

Deno.serve(async (req) => {
  if (req.headers.get('x-notify-secret') !== Deno.env.get('NOTIFY_SECRET')) {
    return new Response('forbidden', { status: 403 });
  }
  try {
    const { listing_id, old_price, new_price } = await req.json();
    if (!listing_id) return new Response('missing listing_id', { status: 400 });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: listing } = await supabase
      .from('listings')
      .select('id, title, seller_id, status')
      .eq('id', listing_id)
      .single();
    if (!listing || listing.status !== 'active')
      return new Response('no active listing', { status: 200 });

    const { data: favs } = await supabase
      .from('favorites')
      .select('user_id, profiles!favorites_user_id_fkey (preferred_language)')
      .eq('listing_id', listing_id)
      .neq('user_id', listing.seller_id);
    if (!favs?.length) return new Response(JSON.stringify({ notified: 0 }), { status: 200 });

    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('user_id, token')
      .in('user_id', favs.map((f) => f.user_id));
    // respect per-user notification preference (default on)
    const { data: _pf } = await supabase
      .from('profiles')
      .select('id, notification_prefs')
      .in('id', (tokens ?? []).map((t) => t.user_id));
    const _off = new Set(
      (_pf ?? [])
        .filter((p) => (p.notification_prefs as Record<string, boolean>)?.price_drops === false)
        .map((p) => p.id),
    );
    const sendTokens = (tokens ?? []).filter((t) => !_off.has(t.user_id));
    const langOf = new Map(
      favs.map((f) => [
        f.user_id,
        ((f.profiles as unknown as { preferred_language: Lang })?.preferred_language ?? 'en') as Lang,
      ]),
    );
    const fmt = (c: number) => (c === 0 ? 'Free' : `$${(c / 100).toLocaleString('en-AU')}`);
    const messages = sendTokens.map((row) => ({
      to: row.token,
      sound: 'default',
      title: TITLES[langOf.get(row.user_id) ?? 'en'],
      body: `${listing.title}: ${fmt(old_price)} → ${fmt(new_price)}`,
      data: { listingId: listing.id },
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
