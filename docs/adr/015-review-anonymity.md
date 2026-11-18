# ADR 015 — Anonymous, positive-first reviews (Karrot-aligned)

**Status:** accepted (2026-08-20) · v1 does the user-facing part; the DB-level seal is v1.1.

## Context
Post-trade reviews feed the trust ladder ([ADR 008](008-trust-tiers.md)). The original design showed the reviewer's name on each review. Testing surfaced the same failure mode Karrot (당근마켓) designed around: if a buyer can see *who* left a critical review, negative reviews invite retaliation and dry up. Karrot keeps bad-manner evaluations **anonymous — even to the recipient** — and surfaces mostly positive signal publicly, which is why its "manner temperature" stays useful.

## Decision
Follow Karrot's model:
1. **Public profile reviews are anonymous.** You can read the rating and comment; you cannot see who wrote it.
2. **Only positive reviews (4–5★) are shown publicly.** Negative reviews still count toward the trust score (they lower it) but are visible **only to the recipient** on their own review screen — no public shaming, no way to trace a bad review back to its author for retaliation.
3. The trust score itself ([ADR 008](008-trust-tiers.md)) continues to use *all* reviews (positive − negative), computed in the DB, so a bad actor's score still falls even though individual negatives aren't publicly attributed.

## Why
- **Prevents retaliation reviews** — the single most common way peer-review systems get gamed into uselessness.
- **Keeps the public signal trustworthy** without turning the app into a shaming board.
- **Matches the benchmark** ([benchmark analysis](../../../중고거래%20플랫폼/wiki/benchmark-karrot.md) — Karrot's anonymous bad-manner evaluation), which Sean explicitly asked us to follow.

## Implementation
- **v1 (shipped):** the app shows anonymized, positive-only reviews on public profiles; the recipient sees their own negatives. Reviewer name never rendered for others.
- **v1.1 (DB-level seal):** the app still reads reviews directly, so a crafted API call could technically read `reviewer_id`. `get_profile_reviews()` (migration 041, a `SECURITY DEFINER` function returning rating/comment/date with **no reviewer identity**) is the foundation; the follow-up is to route profile-review reads through it and restrict direct `SELECT` on `reviews` to the reviewer's own rows. `profile_trust` is a definer view, so tightening the policy won't affect the score.

## Consequences
- Reviewer identity is a private field by policy — future features must not leak it.
- Fuller Karrot alignment (praise **tags** instead of free-text, a re-trade-wish rate, a composite temperature-style score) is tracked as a separate v1.1 ADR — each is i18n-sensitive (the tag vocabulary must be pre-translated KO/EN/ZH).
