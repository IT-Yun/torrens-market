---
name: adr-008-trust-tiers
description: 6-level Aussie-animal trust ladder (quokka→kangaroo) computed from post-trade review points in the DB
type: adr
status: accepted
created: 2026-08-18
updated: 2026-08-18
---

# ADR 008 — Trust Tiers: the Aussie Animal Ladder

## Context
[[spec-reviews-trust]]: reputation must read instantly across KO/EN/ZH users. Karrot proves a single fun trust metric works ([[benchmark-karrot]] manner temperature); Gumtree proves the absence of one breeds scams ([[benchmark-gumtree]]). User direction (2026-08-18): Australian animals, small→iconic, kangaroo on top.

## Options considered
- **(a) Numeric score (temperature clone)** — proven, but a Celsius metaphor is Karrot's identity; copying it is lazy and culturally Korean
- **(b) Star average only** — universal but bland; averages hide volume (one 5★ review = 5.0)
- **(c) Animal tier ladder fed by review points** — local identity, language-free, volume-aware; stars still shown alongside

## Decision
**(c).** Six tiers: **Quokka(0) → Bilby(3) → Koala(8) → Wombat(15) → Wallaby(30) → Kangaroo(50)**, thresholds on **trust points = count(4–5★) − count(1–2★)** (3★ neutral).
- Points/tier computed **in the database** (`profile_trust` aggregate view over `reviews`) — the client only maps points→tier via a pure function (`trustTier()`); nothing reputation-related is client-writable.
- One review per (listing, reviewer); reviewer and reviewee must be the two chat participants of that listing; reviews open once the listing leaves `active`.
- Display: tier chip (paw + i18n animal name, tier color) + ★avg + count on profile, seller card, chat header.

## Why
1. Instantly legible to a Chinese student and a Korean newcomer alike — no shared language needed, and quokka→kangaroo is self-explanatorily Australian.
2. Net-count points reward sustained good trades (volume) while 1–2★ reviews genuinely cost tier — averages alone can't do both.
3. DB-computed reputation is tamper-proof under RLS and portfolio-defensible.

## Consequences
- Migration: `reviews` table (+RLS: participants only, one per side) and `profile_trust` view (owner-rights, aggregates only).
- `src/lib/trust.ts` pure tier mapping + unit tests; thresholds tunable in one place (mirrored in the view docs).
- Animal glyph artwork deferred; chip uses [[adr-005-icon-system]] PawPrint until original vectors exist.
