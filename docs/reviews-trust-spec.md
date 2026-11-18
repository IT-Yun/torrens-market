---
name: spec-reviews-trust
description: Post-trade reviews, Aussie-animal trust tiers (quokka→kangaroo), and in-chat meetup scheduling with notifications
type: spec
created: 2026-08-18
updated: 2026-08-18
---

# Spec — Reviews, Trust Tiers & Meetup Scheduling

## Goal
Strangers meeting for local pickup need a reason to trust each other before committing time. Verified badges ([[adr-002-auth-strategy]], [[adr-006-approximate-location-distance]]) prove identity/location once; a **reputation system** proves repeated good behaviour. Target segments (Chinese-first, international, Korean residents — [[core-context]]) share no common language, so reputation must be **visual and language-free**: an animal tier reads instantly in KO/EN/ZH. The same chat where a deal is agreed should also **fix the meetup** (time + place) — the actual failure point of secondhand trades is the no-show.

## Benchmark evidence
- **Karrot — manner temperature**: a single warmth score raised by positive trade reviews; core of its "믿을만한 이웃" trust framing ([[benchmark-karrot]] — noted as a known feature; screenshots not yet captured → [TBD: capture 매너온도 profile shots into raw/benchmarks/]).
- **Gumtree — the counter-example**: no verification or reputation → scam-prone marketplace reputation ([[benchmark-gumtree]]). Exactly the gap we differentiate on.
- **Bunjang**: trust bought via escrow/케어 services ([[benchmark-bunjang]]) — heavier than a solo MVP needs; reviews + tiers are the right-sized alternative.

## Our version
### 1. Post-trade reviews
- After a chat exists for a listing, each participant can leave **one review of the other** (1–5 stars + short comment) once the listing is `sold` (or `reserved` → both directions allowed after meetup accepted).
- Entry points: chat room header menu + sold listing detail.
- Reviews are public on the profile (latest first), with average rating.

### 2. Trust tiers — Australian animals (quokka → kangaroo)
Karrot's temperature, reinterpreted as a **6-step Aussie animal ladder** — playful, local, and readable in any language:

| Lv | Animal | KO / ZH | Trust points needed |
|----|--------|---------|---------------------|
| 1 | Quokka | 쿼카 / 微笑短尾袋鼠 | 0 (everyone starts) |
| 2 | Bilby | 빌비 / 兔耳袋狸 | 3 |
| 3 | Koala | 코알라 / 考拉 | 8 |
| 4 | Wombat | 웜뱃 / 袋熊 | 15 |
| 5 | Wallaby | 왈라비 / 小袋鼠 | 30 |
| 6 | Kangaroo | 캥거루 / 袋鼠 | 50 |

- **Trust points** = (reviews rated 4–5★) − (reviews rated 1–2★); 3★ is neutral. Computed in the DB (aggregate view), never client-trusted.
- Tier badge (animal name + paw mark, tier-colored) shows on: profile card, seller card in listing detail, chat header. Tier + avg ★ + review count together.
- Original flat-vector animal glyphs may come later; launch uses name-chip + paw icon (no copied assets — [[adr-005-icon-system]] discipline).

### 3. In-chat meetup scheduling
- Calendar button in the chat room → propose **date/time + place** (place defaults to listing suburb).
- Proposal renders as a card in the room (time · place · status). Other party **accepts / declines**; either side can cancel. One active meetup per room (new proposal replaces a declined/cancelled one).
- **Notifications** (Expo push, reusing [[adr-004-keyword-alert-architecture]] infrastructure): on proposal, on accept/decline, and a **1-hour reminder** before an accepted meetup (pg_cron sweep).
- Accepted meetup also flips the listing to `reserved` (seller confirmation of intent).

## Scope
**MVP (now):** reviews table + RLS, trust-points view + tier mapping, badges in profile/detail/chat, review entry from chat + sold detail, meetup propose/accept/decline/cancel + push on state change + 1-h reminder.
**Later:** review photos, seller response to a review, tier perks (e.g. kangaroo-only visibility boost), no-show strikes, animal glyph illustrations, review-based search ranking.

## Open decisions → ADR
- Tier ladder, thresholds, and point formula → [[adr-008-trust-tiers]]
- Meetup data model & notification wiring → [[adr-009-meetup-scheduling]]
