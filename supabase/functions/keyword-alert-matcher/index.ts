// Keyword-alert matcher — Torrens Market's custom notification service.
// Invoked by a DB trigger (pg_net) whenever a listing is inserted:
// matches the new listing against active keyword_alerts and fans out
// Expo push notifications to subscribed devices.

import { createClient } from 'npm:@supabase/supabase-js@2';

type Alert = {
  id: string;
  user_id: string;
  keyword: string;
  category_id: number | null;
  max_price_cents: number | null;
};

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

Deno.serve(async (req) => {
  try {
    const { listing_id } = await req.json();
    if (!listing_id) return new Response('missing listing_id', { status: 400 });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, seller_id, category_id, title, description, price_cents, suburb, status')
      .eq('id', listing_id)
      .single();
    if (listingError || !listing || listing.status !== 'active')
      return new Response('no active listing', { status: 200 });

    const { data: alerts, error: alertsError } = await supabase
      .from('keyword_alerts')
      .select('id, user_id, keyword, category_id, max_price_cents')
      .eq('active', true)
      .neq('user_id', listing.seller_id);
    if (alertsError) throw alertsError;

    const haystack = `${listing.title} ${listing.description}`.toLowerCase();
    const matched = ((alerts ?? []) as Alert[]).filter(
      (a) =>
        haystack.includes(a.keyword.toLowerCase()) &&
        (a.category_id == null || a.category_id === listing.category_id) &&
        (a.max_price_cents == null || listing.price_cents <= a.max_price_cents),
    );
    const userIds = [...new Set(matched.map((a) => a.user_id))];
    if (userIds.length === 0) return new Response(JSON.stringify({ matched: 0 }), { status: 200 });

    const { data: tokens, error: tokensError } = await supabase
      .from('push_tokens')
      .select('user_id, token')
      .in('user_id', userIds);
    if (tokensError) throw tokensError;

    const price =
      listing.price_cents === 0 ? 'Free' : `$${(listing.price_cents / 100).toLocaleString('en-AU')}`;
    const messages = (tokens ?? []).map((row) => {
      const keyword = matched.find((a) => a.user_id === row.user_id)?.keyword ?? '';
      return {
        to: row.token,
        sound: 'default',
        title: `🔔 "${keyword}" — ${listing.title}`,
        body: `${price} · ${listing.suburb}`,
        data: { listingId: listing.id },
      };
    });

    // Expo accepts batches of up to 100
    for (let i = 0; i < messages.length; i += 100) {
      await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages.slice(i, i + 100)),
      });
    }

    return new Response(
      JSON.stringify({ matched: matched.length, notified: messages.length }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error(e);
    return new Response(String(e), { status: 500 });
  }
});
