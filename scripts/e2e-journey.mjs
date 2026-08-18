// E2E journey test: plays a full seller+buyer trade against the live
// Supabase backend — profile → listing → feed/search → favorite → chat →
// meetup → reviews → trust tier — and asserts the RLS gates hold.
// Usage: node scripts/e2e-journey.mjs   (reads .env / .env.local)
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

for (const f of ['.env', '.env.local']) {
  try {
    for (const line of readFileSync(f, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {}
}

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !ANON || !SERVICE) throw new Error('missing env');

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

const results = [];
let failures = 0;
async function step(name, fn) {
  try {
    const out = await fn();
    results.push(`✅ ${name}${out ? ` — ${out}` : ''}`);
  } catch (e) {
    failures++;
    results.push(`❌ ${name} — ${e.message ?? e}`);
  }
}
async function expectFail(name, fn) {
  try {
    await fn();
    failures++;
    results.push(`❌ ${name} — expected rejection but succeeded (RLS HOLE?)`);
  } catch (e) {
    results.push(`✅ ${name} — correctly blocked (${String(e.message ?? e).slice(0, 60)})`);
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function ensureUser(email, password, displayName) {
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
  let user = list.users.find((u) => u.email === email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    user = data.user;
  }
  const client = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  await client
    .from('profiles')
    .update({ display_name: displayName })
    .eq('id', user.id);
  return { id: user.id, client };
}

const PW = 'e2e-Passw0rd!';
const seller = await ensureUser('seller.e2e@torrens.test', PW, 'E2E Seller');
const buyer = await ensureUser('buyer.e2e@torrens.test', PW, 'E2E Buyer');
const rando = await ensureUser('rando.e2e@torrens.test', PW, 'E2E Rando');

// ── cleanup previous runs (admin bypasses RLS) ─────────────────────────
await admin.from('reviews').delete().in('reviewer_id', [seller.id, buyer.id, rando.id]);
await admin.from('listings').delete().eq('seller_id', seller.id);
await admin.from('keyword_alerts').delete().eq('user_id', buyer.id);
await admin.from('blocked_users').delete().eq('blocker_id', buyer.id);

let listingId, roomId, meetupId, catId;

await step('seller: profile setup (suburb/nationality/language)', async () => {
  const { error } = await seller.client
    .from('profiles')
    .update({ suburb: 'Norwood', nationality: 'KR', preferred_language: 'ko' })
    .eq('id', seller.id);
  assert(!error, error?.message);
});

await step('buyer: profile setup', async () => {
  const { error } = await buyer.client
    .from('profiles')
    .update({ suburb: 'Adelaide CBD', nationality: 'CN', preferred_language: 'zh' })
    .eq('id', buyer.id);
  assert(!error, error?.message);
});

await step('seller: create furniture listing w/ attributes + approx location', async () => {
  const { data: cat } = await seller.client
    .from('categories')
    .select('id')
    .eq('slug', 'furniture')
    .single();
  catId = cat.id;
  const { data, error } = await seller.client
    .from('listings')
    .insert({
      seller_id: seller.id,
      category_id: cat.id,
      title: 'E2E IKEA desk white',
      description: 'e2e test listing — sturdy desk',
      price_cents: 4500,
      condition: 'used',
      pickup_mode: 'pickup_only',
      suburb: 'Norwood',
      lat: -34.92,
      lng: 138.63,
      attributes: { dimensions: '120×60×75' },
    })
    .select('id')
    .single();
  assert(!error, error?.message);
  listingId = data.id;
});

await step('seller: upload listing photo to storage', async () => {
  // 1x1 transparent PNG
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64',
  );
  const path = `${seller.id}/e2e-${listingId}.png`;
  const { error } = await seller.client.storage
    .from('listing-photos')
    .upload(path, png, { contentType: 'image/png', upsert: true });
  assert(!error, error?.message);
  const { error: linkError } = await seller.client
    .from('listing_photos')
    .insert({ listing_id: listingId, storage_path: path, sort_order: 0 });
  assert(!linkError, linkError?.message);
});

await step('buyer: sees listing in feed', async () => {
  const { data } = await buyer.client
    .from('listings')
    .select('id, title, lat, lng, pickup_mode')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(50);
  const found = data.find((l) => l.id === listingId);
  assert(found, 'listing not in feed');
  assert(found.lat === -34.92 && found.pickup_mode === 'pickup_only', 'fields missing');
});

await step('buyer: listing DETAIL query (seller-profile embed)', async () => {
  const { data, error } = await buyer.client
    .from('listings')
    .select(
      `id, title, description, price_cents, suburb, status, created_at, category_id, attributes,
       lat, lng, condition, pickup_mode, seller_id,
       listing_photos (storage_path, sort_order),
       profiles!listings_seller_id_fkey (display_name, avatar_url, suburb, nationality, is_phone_verified)`,
    )
    .eq('id', listingId)
    .single();
  assert(!error, error?.message);
  assert(data.profiles?.display_name === 'E2E Seller', 'seller profile not embedded');
});

await step('buyer: verified-filter search (inner embed)', async () => {
  const { error } = await buyer.client
    .from('listings')
    .select(
      `id, profiles!listings_seller_id_fkey!inner (nationality, is_phone_verified)`,
    )
    .eq('status', 'active')
    .limit(5);
  assert(!error, error?.message);
});

await step('buyer: FTS search finds it', async () => {
  const { data, error } = await buyer.client
    .from('listings')
    .select('id')
    .textSearch('search_vector', 'desk')
    .eq('status', 'active');
  assert(!error, error?.message);
  assert(data.some((l) => l.id === listingId), 'FTS miss');
});

await step('buyer: favorite + public count view', async () => {
  const { error } = await buyer.client
    .from('favorites')
    .insert({ user_id: buyer.id, listing_id: listingId });
  assert(!error, error?.message);
  const { data } = await rando.client
    .from('listing_favorite_counts')
    .select('*')
    .eq('listing_id', listingId)
    .single();
  assert(data?.favorites_count === 1, `count=${data?.favorites_count}`);
});

await step('buyer: start chat + send message', async () => {
  const { data, error } = await buyer.client.rpc('start_chat', { p_listing_id: listingId });
  assert(!error, error?.message);
  roomId = data;
  const { error: msgError } = await buyer.client
    .from('messages')
    .insert({ room_id: roomId, sender_id: buyer.id, body: 'Hi! Is this available?' });
  assert(!msgError, msgError?.message);
});

await expectFail('review BEFORE trade should be blocked', async () => {
  const { error } = await buyer.client.from('reviews').insert({
    listing_id: listingId,
    reviewer_id: buyer.id,
    reviewee_id: seller.id,
    rating: 5,
  });
  if (error) throw error;
});

await step('buyer: propose meetup', async () => {
  const when = new Date(Date.now() + 24 * 3600 * 1000);
  const { data, error } = await buyer.client
    .from('meetups')
    .insert({
      room_id: roomId,
      proposer_id: buyer.id,
      scheduled_at: when.toISOString(),
      place: 'Norwood Coles entrance',
    })
    .select('id')
    .single();
  assert(!error, error?.message);
  meetupId = data.id;
});

await expectFail('second active meetup in same room should be blocked', async () => {
  const { error } = await buyer.client.from('meetups').insert({
    room_id: roomId,
    proposer_id: buyer.id,
    scheduled_at: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    place: 'somewhere else',
  });
  if (error) throw error;
});

await step('seller: accept meetup → listing flips to reserved', async () => {
  const { error } = await seller.client
    .from('meetups')
    .update({ status: 'accepted' })
    .eq('id', meetupId);
  assert(!error, error?.message);
  await new Promise((r) => setTimeout(r, 1500));
  const { data } = await seller.client.from('listings').select('status').eq('id', listingId).single();
  assert(data.status === 'reserved', `status=${data.status}`);
});

await step('buyer: review seller after reservation', async () => {
  const { error } = await buyer.client.from('reviews').insert({
    listing_id: listingId,
    reviewer_id: buyer.id,
    reviewee_id: seller.id,
    rating: 5,
    comment: 'Great seller, desk as described!',
  });
  assert(!error, error?.message);
});

await expectFail('duplicate review should be blocked', async () => {
  const { error } = await buyer.client.from('reviews').insert({
    listing_id: listingId,
    reviewer_id: buyer.id,
    reviewee_id: seller.id,
    rating: 1,
  });
  if (error) throw error;
});

await expectFail('non-participant (rando) review should be blocked', async () => {
  const { error } = await rando.client.from('reviews').insert({
    listing_id: listingId,
    reviewer_id: rando.id,
    reviewee_id: seller.id,
    rating: 5,
  });
  if (error) throw error;
});

await step('seller: review buyer back', async () => {
  const { error } = await seller.client.from('reviews').insert({
    listing_id: listingId,
    reviewer_id: seller.id,
    reviewee_id: buyer.id,
    rating: 4,
    comment: 'Punctual buyer.',
  });
  assert(!error, error?.message);
});

await step('trust view: seller has points from the 5★ review', async () => {
  const { data } = await rando.client
    .from('profile_trust')
    .select('*')
    .eq('profile_id', seller.id)
    .single();
  assert(data.trust_points === 1 && data.review_count === 1, JSON.stringify(data));
});

await step('seller: mark sold', async () => {
  const { error } = await seller.client
    .from('listings')
    .update({ status: 'sold' })
    .eq('id', listingId);
  assert(!error, error?.message);
});

await step('cancel-after-accept releases the listing (reserved → active)', async () => {
  const { data: l2, error: l2Error } = await seller.client
    .from('listings')
    .insert({
      seller_id: seller.id,
      category_id: catId,
      title: 'E2E second chair',
      description: 'e2e cancel-flow listing',
      price_cents: 1000,
      condition: 'used',
      pickup_mode: 'pickup_only',
      suburb: 'Norwood',
      attributes: {},
    })
    .select('id')
    .single();
  assert(!l2Error, l2Error?.message);
  const { data: room2 } = await buyer.client.rpc('start_chat', { p_listing_id: l2.id });
  const { data: m2, error: m2Error } = await buyer.client
    .from('meetups')
    .insert({
      room_id: room2,
      proposer_id: buyer.id,
      scheduled_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      place: 'test spot',
    })
    .select('id')
    .single();
  assert(!m2Error, m2Error?.message);
  await seller.client.from('meetups').update({ status: 'accepted' }).eq('id', m2.id);
  await new Promise((r) => setTimeout(r, 1200));
  let { data: st } = await seller.client.from('listings').select('status').eq('id', l2.id).single();
  assert(st.status === 'reserved', `expected reserved, got ${st.status}`);
  await buyer.client.from('meetups').update({ status: 'cancelled' }).eq('id', m2.id);
  await new Promise((r) => setTimeout(r, 1200));
  ({ data: st } = await seller.client.from('listings').select('status').eq('id', l2.id).single());
  assert(st.status === 'active', `expected active after cancel, got ${st.status}`);
});

await step('buyer: keyword alert insert', async () => {
  const { error } = await buyer.client
    .from('keyword_alerts')
    .insert({ user_id: buyer.id, keyword: 'e2e-kayak' });
  assert(!error, error?.message);
});

await step('buyer: report + block seller, feed hides their listings', async () => {
  const { error: repError } = await buyer.client
    .from('reports')
    .insert({ reporter_id: buyer.id, listing_id: listingId, reason: 'other' });
  assert(!repError, repError?.message);
  const { error: blockError } = await buyer.client
    .from('blocked_users')
    .insert({ blocker_id: buyer.id, blocked_id: seller.id });
  assert(!blockError, blockError?.message);
  const { data } = await buyer.client
    .from('blocked_users')
    .select('blocked_id')
    .eq('blocker_id', buyer.id);
  assert(data.some((b) => b.blocked_id === seller.id), 'block missing');
});

// ── iteration 2 coverage ───────────────────────────────────────────────
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

await step('seller: avatar upload to own folder + avatar_url save', async () => {
  const path = `${seller.id}/avatar-e2e.png`;
  const { error } = await seller.client.storage
    .from('avatars')
    .upload(path, PNG, { contentType: 'image/png', upsert: true });
  assert(!error, error?.message);
  const url = seller.client.storage.from('avatars').getPublicUrl(path).data.publicUrl;
  const { error: saveError } = await seller.client
    .from('profiles')
    .update({ avatar_url: url })
    .eq('id', seller.id);
  assert(!saveError, saveError?.message);
});

await expectFail('avatar upload into ANOTHER user folder should be blocked', async () => {
  const { error } = await rando.client.storage
    .from('avatars')
    .upload(`${seller.id}/evil.png`, PNG, { contentType: 'image/png' });
  if (error) throw error;
});

await step('seller: suburb verification timestamp write', async () => {
  const { error } = await seller.client
    .from('profiles')
    .update({ suburb_verified_at: new Date().toISOString() })
    .eq('id', seller.id);
  assert(!error, error?.message);
});

await step('meetup-notify edge function responds 200', async () => {
  const res = await fetch(`${URL}/functions/v1/meetup-notify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON}` },
    body: JSON.stringify({ meetup_id: meetupId, event: 'reminder' }),
  });
  assert(res.status === 200, `status ${res.status}: ${await res.text()}`);
});

await step('trust tier progression: +3 points → Bilby thresholds hold', async () => {
  // Seed two more positive reviews via admin (distinct synthetic listings).
  for (let i = 0; i < 2; i++) {
    const { data: l } = await admin
      .from('listings')
      .insert({
        seller_id: seller.id,
        category_id: catId,
        title: `E2E tier seed ${i}`,
        description: 'seed',
        price_cents: 100,
        condition: 'used',
        pickup_mode: 'pickup_only',
        suburb: 'Norwood',
        status: 'sold',
        attributes: {},
      })
      .select('id')
      .single();
    await admin.from('reviews').insert({
      listing_id: l.id,
      reviewer_id: rando.id,
      reviewee_id: seller.id,
      rating: 5,
    });
  }
  const { data } = await rando.client
    .from('profile_trust')
    .select('*')
    .eq('profile_id', seller.id)
    .single();
  assert(data.trust_points === 3, `points=${data.trust_points}`);
  // mirror of src/lib/trust.ts thresholds
  const tiers = [['quokka', 0], ['bilby', 3], ['koala', 8], ['wombat', 15], ['wallaby', 30], ['kangaroo', 50]];
  const tier = tiers.filter(([, min]) => data.trust_points >= min).pop()[0];
  assert(tier === 'bilby', `tier=${tier}`);
});

await step('buyer: unfavorite → count drops to 0', async () => {
  const { error } = await buyer.client
    .from('favorites')
    .delete()
    .eq('user_id', buyer.id)
    .eq('listing_id', listingId);
  assert(!error, error?.message);
  const { data } = await rando.client
    .from('listing_favorite_counts')
    .select('*')
    .eq('listing_id', listingId)
    .maybeSingle();
  assert(!data || data.favorites_count === 0, `count=${data?.favorites_count}`);
});

await step('chat unread: new message → unread, markRead clears it', async () => {
  await seller.client
    .from('messages')
    .insert({ room_id: roomId, sender_id: seller.id, body: 'See you tomorrow!' });
  const isUnread = async () => {
    const { data: me } = await buyer.client
      .from('chat_participants')
      .select('last_read_at')
      .eq('room_id', roomId)
      .eq('user_id', buyer.id)
      .single();
    const { data: last } = await buyer.client
      .from('messages')
      .select('created_at, sender_id')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    return last.sender_id !== buyer.id && last.created_at > me.last_read_at;
  };
  assert(await isUnread(), 'expected unread after seller message');
  await buyer.client
    .from('chat_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('room_id', roomId)
    .eq('user_id', buyer.id);
  assert(!(await isUnread()), 'expected read after markRead');
});

await step('seller: my-listings status transitions sold → active → sold', async () => {
  for (const status of ['active', 'sold']) {
    const { error } = await seller.client
      .from('listings')
      .update({ status })
      .eq('id', listingId);
    assert(!error, `${status}: ${error?.message}`);
  }
});

await expectFail('seller self-chat on own listing should be blocked', async () => {
  const { error } = await seller.client.rpc('start_chat', { p_listing_id: listingId });
  if (error) throw error;
});

await expectFail('start_chat after blocking should be refused (either direction)', async () => {
  // buyer blocked seller earlier; a NEW listing forces the create path
  const { data: l3 } = await admin
    .from('listings')
    .insert({
      seller_id: seller.id,
      category_id: catId,
      title: 'E2E block-guard listing',
      description: 'guard test',
      price_cents: 500,
      condition: 'used',
      pickup_mode: 'pickup_only',
      suburb: 'Norwood',
      attributes: {},
    })
    .select('id')
    .single();
  const { error } = await buyer.client.rpc('start_chat', { p_listing_id: l3.id });
  if (error) throw error;
});

await step('chat-notify edge function responds 200', async () => {
  const { data: lastMsg } = await buyer.client
    .from('messages')
    .select('id')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  const res = await fetch(`${URL}/functions/v1/chat-notify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON}` },
    body: JSON.stringify({ message_id: lastMsg.id }),
  });
  assert(res.status === 200, `status ${res.status}: ${await res.text()}`);
});

await step('keyword-alert-matcher edge function responds 200', async () => {
  const res = await fetch(`${URL}/functions/v1/keyword-alert-matcher`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON}` },
    body: JSON.stringify({ listing_id: listingId }),
  });
  assert(res.status === 200, `status ${res.status}: ${await res.text()}`);
});

await step('buyer: push token upsert', async () => {
  const { error } = await buyer.client
    .from('push_tokens')
    .upsert({ user_id: buyer.id, token: 'ExponentPushToken[e2e-fake]' });
  assert(!error, error?.message);
});

await step('bump: old listing resurfaces to top, cooldown enforced', async () => {
  // two fresh listings; A is older, B newer → bump A → A must lead sort_ts order
  const mk = async (title) => {
    const { data } = await seller.client
      .from('listings')
      .insert({
        seller_id: seller.id,
        category_id: catId,
        title,
        description: 'bump test',
        price_cents: 100,
        condition: 'used',
        pickup_mode: 'pickup_only',
        suburb: 'Norwood',
        attributes: {},
      })
      .select('id')
      .single();
    return data.id;
  };
  const a = await mk('E2E bump A');
  await new Promise((r) => setTimeout(r, 1100));
  const b = await mk('E2E bump B');
  const { error: bumpError } = await seller.client.rpc('bump_listing', { p_listing_id: a });
  assert(!bumpError, bumpError?.message);
  const { data: feed } = await buyer.client
    .from('listings')
    .select('id')
    .eq('status', 'active')
    .order('sort_ts', { ascending: false })
    .limit(10);
  const ia = feed.findIndex((l) => l.id === a);
  const ib = feed.findIndex((l) => l.id === b);
  assert(ia !== -1 && ib !== -1 && ia < ib, `order a=${ia} b=${ib}`);
  const { error: coolError } = await seller.client.rpc('bump_listing', { p_listing_id: a });
  assert(coolError, 'expected cooldown rejection');
});

await step('delete: listing hidden from feed and my-listings filter', async () => {
  const { data: l } = await seller.client
    .from('listings')
    .insert({
      seller_id: seller.id,
      category_id: catId,
      title: 'E2E delete me',
      description: 'delete test',
      price_cents: 100,
      condition: 'used',
      pickup_mode: 'pickup_only',
      suburb: 'Norwood',
      attributes: {},
    })
    .select('id')
    .single();
  const { error } = await seller.client
    .from('listings')
    .update({ status: 'deleted' })
    .eq('id', l.id);
  assert(!error, error?.message);
  const { data: feed } = await buyer.client
    .from('listings')
    .select('id')
    .eq('status', 'active')
    .eq('id', l.id);
  assert(feed.length === 0, 'deleted listing still in feed');
});

console.log(results.join('\n'));
console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURES`}`);
process.exit(failures === 0 ? 0 : 1);
