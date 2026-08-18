---
name: adr-010-listing-bump
description: Karrot-style listing bump — once per 24h, feed ordered by a generated sort timestamp, cooldown enforced in the DB
type: adr
status: accepted
created: 2026-08-18
updated: 2026-08-18
---

# ADR 010 — Listing Bump (끌어올리기)

## Context
In a young marketplace, listings sink fast and sellers have no recourse — Karrot's bump ("끌어올리기", once per day) is its signature retention mechanic for sellers ([[benchmark-karrot]] — known feature). Our feed orders purely by `created_at`.

## Options considered
- **(a) Re-posting** (delete + recreate) — loses favorites/chats/reviews linkage; what users do when no bump exists
- **(b) `bumped_at` column + DB-generated `sort_ts`** — feed orders by `greatest(created_at, bumped_at)`; cooldown enforced by trigger
- **(c) Paid/limited boosts** — monetization-grade complexity, premature

## Decision
**(b).** `listings.bumped_at` + stored generated column `sort_ts` (indexed) so PostgREST can order without expressions; feed/search order by `sort_ts desc`. **One bump per 24 h per listing**, enforced by a DB trigger (client greys the button out but the DB is the authority). Bump button lives in my-listings on active listings; card age display keeps showing `created_at` (honesty: a bump moves you up, it doesn't make the listing look new — a deliberate difference from (a) re-posting).

## Why
1. Sellers keep engagement without the destructive re-post pattern.
2. Generated column keeps ordering index-backed and client-simple.
3. DB-enforced cooldown can't be bypassed by a modified client.

## Consequences
- Migration 015: columns, index, cooldown trigger; feed/search selects switch to `sort_ts` ordering.
- `bumpListing()` in listings lib + my-listings UI with cooldown state; E2E covers bump reorder + cooldown rejection.
- Future: bump-quota tiers could hang off [[adr-008-trust-tiers]] (e.g. kangaroo gets extra bumps).
