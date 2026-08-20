# Operations: scaling, cost & disaster recovery

This is the "how it runs, how it grows, and how it survives a bad day" doc. I wrote it because a marketplace that works in a demo but falls over at 500 users — or loses everyone's chats to one bad migration — isn't finished. Here's the plan for all three.

## The scaling philosophy

**One well-indexed Postgres carries the whole city.** Torrens Market is hyperlocal — its ceiling is Adelaide's population, which grows steadily, not virally. So I didn't build for imaginary web-scale; I built for a real, bounded market and kept a clean path to grow *if* one part gets hot. The operating principle is the same one that runs through the whole app: **every rule lives in the database, so scaling means strengthening the database, not rewriting the app.**

### Where the walls actually are, in order

1. **Storage (photos), not database rows, is the first capacity wall.** Photos are downscaled on-device to ~1280px before upload, which cuts storage roughly 10×. A scheduled job purges photos of sold/deleted listings after 90 days.
2. **Read volume (feed + search).** The first real win is app-side, not infrastructure: cache the feed/search with a query cache and use keyset pagination on the generated `sort_ts` column. Zero new infrastructure, biggest latency payoff.
3. **Image bandwidth.** Serve feed thumbnails through Supabase's Smart CDN + image transforms so most photo traffic is cached (much cheaper egress) and never hits the origin.
4. **Realtime concurrency (chat).** This is the first thing that would justify pulling a service out. If chat presence ever degrades, the chat service is the clean extraction candidate — because it's already isolated behind its own tables and policies.
5. **Database CPU.** Only at tens of thousands of active users. The answer is a vertical compute bump (Supabase scales the Postgres instance) — a single Postgres serves this scale comfortably.

### The extraction path (only if a domain dominates)

Because the data layer is portable Postgres, I can split the busiest domain into its own service without a rewrite ([ADR 003](adr/003-backend-supabase.md)): first the keyword-alert matcher (already a standalone Edge Function), then chat, then add a read replica. Nothing here forces that early — it's an option, not a plan.

### The cost curve

Honest numbers, because "it scales" is meaningless without them:

| Stage | Setup | Roughly |
|---|---|---|
| Now (dev + first users) | Supabase Free | **$0** |
| Launch | Supabase Pro | **$25/mo** |
| Thousands of users | Pro + small compute add-on | ~$40/mo |
| Tens of thousands | + compute upgrade, CDN | scales with usage |

## Keeping the bill from exploding (denial-of-wallet)

Free scaling is worthless if someone can run up the bill. The defenses:

- **Supabase Spend Cap stays ON** — past-quota usage throttles instead of billing. It's the master safety switch.
- **SMS is the #1 cost-attack surface.** If/when phone verification ships, it uses a fraud-guarded provider locked to Australian numbers only, plus per-number/per-IP rate limits and a CAPTCHA — so a bot can't pump premium-rate SMS on my dime.
- **Uploads and functions** are bounded: per-user storage limits, image-only content types, and rate-limited write RPCs.

## Disaster recovery: how it survives a bad day

The promise I can honestly make on a ~$25–40/mo setup: **never lose more than about an hour of data, and be back the same day.**

### Backups (and the gotcha everyone misses)

- Supabase Pro keeps **7 days of daily backups**. On top of that, a scheduled job takes an **offsite encrypted dump** to object storage.
- **The gotcha:** database backups do *not* include the photo files in Storage — only their metadata rows. So the backup job also syncs the Storage buckets separately, at the same moment, so the database and the files always describe the same instant.

### The realistic numbers

- **RPO (how much data you could lose):** ≤ 1 hour with hourly dumps; ≤ 24 h from Supabase's daily backups alone.
- **RTO (how long to recover):** a self-inflicted mistake (bad migration) restores in minutes-to-an-hour; a total project loss rebuilds from the offsite backup in about half a day — *only because* the backups and a written runbook exist.

### The incident runbook (short version)

- **Region/platform down:** confirm at Supabase's status page, post an in-app banner (via a remote-config table), and do nothing destructive while the platform is unstable.
- **Bad migration:** stop writes, restore into a *branch* first, verify, then promote — never hand-fix production while panicking.
- **Leaked key:** the new Supabase key system revokes an individual secret instantly with no user logout. Rotate, deploy, done.
- **App-breaking bug:** JavaScript issues roll back over-the-air (EAS Update) and heal on next launch; a native issue gates old versions with a minimum-version check.
- **Abuse wave:** a `banned` flag + insert rate-limits are pre-written and ready.

### App-side resilience

The app degrades gracefully instead of white-screening: the feed and chat history render from a persisted cache when the backend is unreachable, a remote-config kill switch can disable a misbehaving feature without a new build, and a minimum-supported-version check (shipped in v1.0, because you can't add it later) can force an update if a truly dangerous bug ever escapes.

## What I watch

You can't fix what you don't measure. The metrics that matter for a marketplace: crash-free session rate, feed/search latency, realtime disconnect rate, push delivery receipts (a silent push failure quietly kills re-engagement), the signup funnel, and — treated as a real incident if it fails — the nightly backup job.

---

See also: [docs/architecture.md](architecture.md) · [docs/security.md](security.md) · [docs/roadmap.md](roadmap.md)
