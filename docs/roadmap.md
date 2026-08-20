# Roadmap: where this goes

Torrens Market launches as a free, trilingual secondhand marketplace. This doc is about the *next* chapters — how it makes money and how it grows into more than secondhand — and, just as importantly, what I'm deliberately *not* doing yet.

## The model: ads-first, free-to-trade (the Karrot playbook)

I studied how Karrot (당근마켓) became a local super-app, and the lesson is clear: **win liquidity first, monetize the business side later, and never take a cut of neighbour-to-neighbour trades.** Karrot makes ~99% of its revenue from local-business ads, charges 0% on secondhand deals, stayed free for years, and only turned its first profit in year nine. I'm copying the *sequence*, not the timeline.

### The lever order (never ahead of liquidity)

1. **Listing bump / featured slot.** The bump mechanic already exists ([ADR 010](adr/010-listing-bump.md)); a paid "featured" is the smallest possible first revenue and reuses the existing feed ordering. Safe to introduce early — it's a seller convenience, not a tax on trades.
2. **Local-business profiles → radius-targeted ads** — the real prize. This is where the trilingual angle becomes a moat: Korean and Chinese restaurants, tutors, and hairdressers in Adelaide currently advertise only inside their own language's chat groups. A local marketplace that already speaks all three languages is the natural place to reach across those silos.
3. **Job-post boosts** — once the jobs vertical exists (below).
4. **A take-rate on *shipped* deals only** — never on local meetups. (Facebook Marketplace does exactly this: 0% on local pickup.)

### What I'm deliberately NOT doing early

- **No commission on neighbour-to-neighbour trades. Ever.** That's the trust that makes the whole thing work.
- **No fee experiments on existing users.** Bunjang's fee hike and Mercari's fee U-turn both show how fast that backfires.
- **No payments/escrow while I'm a solo dev** — that's AFSL/AUSTRAC-weight regulation. Partner or defer.
- **No monetization at all before a suburb's feed is genuinely liquid.** Most marketplaces die from empty feeds, not from lack of revenue.

### The one thing worth building *before* monetizing

Analytics for the liquidity gate: listings-per-suburb, first-reply time, % sold within 7 days, and 4-week retention. These — not vanity MAU — tell me *when* a neighbourhood is alive enough to switch a lever on.

## The vertical expansion (secondhand → local super-app)

Karrot went secondhand → community feed → local jobs → business profiles → payments. Torrens Market can follow the same ladder, scaled down to suburb-level liquidity:

1. **Community feed** (KO/EN/ZH, cross-translated — a differentiator Karrot never needed).
2. **Casual jobs board** — huge for students on limited work rights, and the current alternative is unverified KakaoTalk/WeChat posts. The wedge is trust: ABN-verified employers, mandatory pay-rate display against the relevant award, and scam-pattern warnings. (Australian note: since 2023 the Fair Work Act bars advertising pay below the award, so a jobs board must validate that — cheap, portfolio-grade compliance.)
3. **Sublets / housing** — constant demand in the student community.
4. **Local business profiles** — which is also step 2 of monetization. The supply side and the revenue side arrive together.

## Regulatory reality (Australia)

- No licence is needed to run classifieds; the app operates under Australian Consumer Law (no misleading conduct, honour consumer guarantees).
- **GST registration kicks in at A$75k rolling-12-month turnover** (ad revenue counts). Free app today = nothing owed.
- Each new lever and vertical gets its own ADR before any code — the same "decide, then build" discipline the rest of the project follows.

## Bottom line

For v1: build nothing monetization-wise, ship free, and win liquidity. The only preparation worth doing near launch is wiring the analytics events and keeping the feed flexible enough to slot a "promoted" card in later. Everything else is a small, well-understood step when the neighbourhood is ready.

---

See also: [docs/architecture.md](architecture.md) · [docs/operations.md](operations.md)
