// Review-request push (ADR 019) — trigger-invoked when a seller marks a
// listing sold and attributes the buyer. Pushes to the buyer in their
// preferred language with a deep link to the review screen.
import { createClient } from 'npm:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
type Lang = 'ko' | 'en' | 'zh';

const TITLE: Record<Lang, string> = {
  ko: '⭐ 거래는 어떠셨나요?',
  en: '⭐ How was your trade?',
  zh: '⭐ 这次交易怎么样？',
};
const BODY: Record<Lang, (t: string) => string> = {
  ko: (t) => `'${t}' 거래가 완료됐어요. 판매자에게 후기를 남겨주세요!`,
  en: (t) => `Your trade for '${t}' is complete. Leave the seller a review!`,
  zh: (t) => `'${t}' 的交易已完成，给卖家写个评价吧！`,
};

Deno.serve(async (req) => {
  if (req.headers.get('x-notify-secret') !== Deno.env.get('NOTIFY_SECRET')) {
    return new Response('forbidden', { status: 403 });
  }
  try {
    const { listing_id } = (await req.json()) as { listing_id: string };
    if (!listing_id) return new Response('bad payload', { status: 400 });
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: l, error } = await supabase
      .from('listings')
      .select('id, title, sold_to_user_id, seller_id, profiles!listings_sold_to_user_id_fkey (preferred_language)')
      .eq('id', listing_id)
      .single();
    if (error || !l?.sold_to_user_id) return new Response('no buyer', { status: 200 });
    // don't nag: skip if the buyer already reviewed this listing
    const { data: existing } = await supabase.from('reviews').select('id')
      .eq('listing_id', l.id).eq('reviewer_id', l.sold_to_user_id).maybeSingle();
    if (existing) return new Response(JSON.stringify({ skipped: 'already reviewed' }), { status: 200 });
    const lang = ((l.profiles as unknown as { preferred_language: Lang } | null)?.preferred_language ?? 'en') as Lang;
    const { data: tokens } = await supabase.from('push_tokens').select('token').eq('user_id', l.sold_to_user_id);
    if (!tokens?.length) return new Response(JSON.stringify({ ok: true, pushes: 0 }), { status: 200 });
    const messages = tokens.map((t) => ({
      to: t.token,
      title: TITLE[lang] ?? TITLE.en,
      body: (BODY[lang] ?? BODY.en)(l.title),
      data: { type: 'review_request', listing_id: l.id, reviewee_id: l.seller_id },
    }));
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(messages),
    });
    return new Response(JSON.stringify({ ok: res.ok, pushes: messages.length }), { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(String(e), { status: 500 });
  }
});
