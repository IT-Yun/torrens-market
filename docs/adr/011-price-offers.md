---
name: adr-011-price-offers
description: In-chat price offers (Bunjang/FB "Make offer" pattern) — one open offer per room, accept/decline/withdraw, push notified
type: adr
status: accepted
created: 2026-08-18
updated: 2026-08-18
---

# ADR 011 — In-chat Price Offers

## Context
Haggling is the default in secondhand trading; without structure it's buried in chat text. Bunjang and Facebook Marketplace both formalize a "make offer" step ([[benchmark-bunjang]] price-offer culture; FB Marketplace [TBD: capture screenshots]). We already have the one-active-card-per-room machinery from [[adr-009-meetup-scheduling]].

## Decision
`offers` table mirroring the meetup pattern: one **open** offer per room (partial unique on `status='proposed'`), participants-only RLS, states `proposed → accepted | declined | withdrawn` (proposer may withdraw). Offer renders as a second pinned card in the chat room with the amount; accepting is a social agreement — it does **not** rewrite the listing price (the listing keeps its asking price; the deal price lives in the room). Push via `offer-notify` Edge Function on state changes, trilingual. Realtime keeps both parties' cards live.

## Why
1. Reuses a proven state-machine shape — cheap to build and to reason about.
2. Not rewriting the listing price avoids a fake-discount feed and keeps the asking price honest.
3. A declined/withdrawn offer allows a new one — natural negotiation loop.

## Consequences
- Migration 019 (table, RLS, unique-open index, notify trigger, realtime publication) + `offer-notify` function.
- `src/lib/offers.ts` + `OfferCard` in the chat room beside the meetup card; E2E covers the offer loop + double-open rejection.
- Future: accepted offer could prefill a payment request if in-app payments ever land (Gumtree in-chat payment pattern, [[benchmark-gumtree]]).
