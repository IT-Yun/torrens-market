import { db } from '@/lib/db';
import { H1, Card, Stat } from '@/components/ui';
import { Bars, Breakdown } from '@/components/charts';
import { dailySeries, topN } from '@/lib/series';
import { mb } from '@/lib/format';
export const dynamic = 'force-dynamic';

export default async function Analytics() {
  const since = new Date(Date.now() - 30 * 86400e3).toISOString();
  const [profiles, listings, messages, rooms, favorites, offers, meetups, keywords, trust, stats, cats, topViewed] = await Promise.all([
    db.from('profiles').select('created_at, preferred_language, nationality, suburb, is_phone_verified, suburb_verified_at'),
    db.from('listings').select('created_at, status, category_id, suburb, price_cents').neq('status', 'deleted'),
    db.from('messages').select('created_at').gte('created_at', since),
    db.from('chat_rooms').select('id', { count: 'exact', head: true }),
    db.from('favorites').select('listing_id'),
    db.from('offers').select('status'),
    db.from('meetups').select('status'),
    db.from('keyword_alerts').select('keyword').eq('active', true),
    db.from('profile_trust').select('trust_points'),
    db.rpc('admin_db_stats'),
    db.from('categories').select('id, slug'),
    db.from('listings').select('title, view_count, status').order('view_count', { ascending: false }).limit(5),
  ]);
  const P = profiles.data ?? [], L = listings.data ?? [];
  const catName = (id: number) => cats.data?.find((c) => c.id === id)?.slug ?? String(id);
  const tier = (p: number) => (p >= 100 ? 'kangaroo' : p >= 60 ? 'wallaby' : p >= 30 ? 'wombat' : p >= 15 ? 'koala' : p >= 5 ? 'bilby' : 'quokka');
  const s = (stats.data ?? {}) as Record<string, number>;
  const funnel = { signed: P.length, verifiedSuburb: P.filter((p) => p.suburb_verified_at).length, phone: P.filter((p) => p.is_phone_verified).length };
  const sellers = new Set(L.map((l: { suburb: string }) => l.suburb)).size;
  return (
    <>
      <H1 sub="30-day activity, breakdowns and demand signals — everything the DB knows">Analytics</H1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Active users (7d / 30d)" value={`${s.active_7d ?? 0} / ${s.active_30d ?? 0}`} hint={`of ${s.auth_users ?? 0} accounts (by last sign-in)`} />
        <Stat label="Listings" value={L.length} hint={`${L.filter((l: { status: string }) => l.status === 'active').length} active · ${L.filter((l: { status: string }) => l.status === 'sold').length} sold`} />
        <Stat label="Chat rooms" value={rooms.count ?? 0} hint={`${messages.data?.length ?? 0} messages in 30d`} />
        <Stat label="Deal signals" value={`${offers.data?.length ?? 0} / ${meetups.data?.length ?? 0}`} hint="offers / meetups (all time)" />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card><Bars label="Sign-ups per day" data={dailySeries(P)} /></Card>
        <Card><Bars label="Listings per day" data={dailySeries(L)} /></Card>
        <Card><Bars label="Messages per day" data={dailySeries(messages.data ?? [])} /></Card>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-4">
        <Card><Breakdown title="Language" rows={topN(P.map((p) => p.preferred_language))} total={P.length} /></Card>
        <Card><Breakdown title="Nationality" rows={topN(P.map((p) => p.nationality))} total={P.length} /></Card>
        <Card><Breakdown title="Member suburbs" rows={topN(P.map((p) => p.suburb))} total={P.length} /></Card>
        <Card><Breakdown title="Trust tiers" rows={topN([...(trust.data ?? []).map((t) => tier(t.trust_points ?? 0)), ...Array(Math.max(0, P.length - (trust.data?.length ?? 0))).fill('quokka')], 6)} total={P.length} /></Card>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-4">
        <Card><Breakdown title="Listing categories" rows={topN(L.map((l: { category_id: number }) => catName(l.category_id)))} total={L.length} /></Card>
        <Card><Breakdown title="Listing suburbs" rows={topN(L.map((l: { suburb: string }) => l.suburb))} total={L.length} /></Card>
        <Card><Breakdown title="Keyword demand (active alerts)" rows={topN((keywords.data ?? []).map((k) => k.keyword.toLowerCase()), 10)} total={keywords.data?.length ?? 0} /></Card>
        <Card>
          <div className="mb-2 text-sm font-semibold">Most viewed listings</div>
          <ol className="space-y-1 text-xs">{(topViewed.data ?? []).map((l) => <li key={l.title} className="flex justify-between"><span className="truncate">{l.title}</span><span className="tabular-nums text-stone-500">{l.view_count} · {l.status}</span></li>)}{!topViewed.data?.length && <li className="text-stone-400">no listings</li>}</ol>
        </Card>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <div className="mb-2 text-sm font-semibold">Trust funnel</div>
          <dl className="grid grid-cols-2 gap-y-1 text-sm"><dt className="text-stone-500">Signed up</dt><dd className="tabular-nums">{funnel.signed}</dd><dt className="text-stone-500">Suburb verified</dt><dd className="tabular-nums">{funnel.verifiedSuburb}</dd><dt className="text-stone-500">Phone verified</dt><dd className="tabular-nums">{funnel.phone}</dd><dt className="text-stone-500">Favorites total</dt><dd className="tabular-nums">{favorites.data?.length ?? 0}</dd><dt className="text-stone-500">Suburbs with listings</dt><dd className="tabular-nums">{sellers}</dd></dl>
        </Card>
        <Card className="lg:col-span-2">
          <div className="mb-2 text-sm font-semibold">Database & storage (Free tier caps: DB 500 MB · storage 1 GB)</div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><div className="text-xs text-stone-500">Database size</div><div className="text-xl font-semibold">{mb(s.db_bytes)}</div></div>
            {Object.entries((stats.data as { storage?: Record<string, { objects: number; bytes: number }> })?.storage ?? {}).map(([b, v]) => (
              <div key={b}><div className="text-xs text-stone-500">{b}</div><div className="text-xl font-semibold">{mb(v.bytes)}</div><div className="text-xs text-stone-500">{v.objects} objects</div></div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
            {Object.entries((stats.data as { tables?: Record<string, number> })?.tables ?? {}).sort((a, b) => b[1] - a[1]).map(([t, n]) => <span key={t}>{t} <b className="tabular-nums">{n}</b></span>)}
          </div>
        </Card>
      </div>
    </>
  );
}
