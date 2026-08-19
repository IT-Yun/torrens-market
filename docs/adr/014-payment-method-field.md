# ADR 014 — Payment Method Field ("Cash only")

## Context
Sellers want to state "cash only" up front (user request 2026-08-19). Payment method is a different axis from `pickup_mode` (how goods change hands ≠ how money does). AU-specific: **PayID/bank-transfer impersonation is the #1 local marketplace scam**, so how we present payment options is a trust feature, not just a filter.

## Options considered
- **(a) Overload `pickup_mode`** with cash values — wrong axis, breaks existing filters
- **(b) New `payment_method` column** — `any | cash_only | bank_transfer_only`, chip on detail, picker on create
- **(c) Free-text in description** — status quo, unsearchable, invisible

## Decision
**(b).** `listings.payment_method text not null default 'any'` (check constraint). Create form: 3-option picker defaulting to Any. Detail screen: chip next to condition/pickup chips (the `005-icon-system`-styled chip row shipped 2026-08-18) — shown only when not `any`. i18n keys `paymentMethods.*` in KO/EN/ZH. Cash-only listings get a one-line safety hint in chat ("meet in person, count cash — never 'hold' deposits"); bank-transfer listings get the PayID-scam warning line.

## Why
1. One column, zero schema churn elsewhere; filters can come later without migration.
2. Chip placement reuses the new header chip row — no new UI pattern.
3. Scam-aware copy turns a filter into a trust differentiator (`benchmark-karrot` axis: Karrot pushes 직거래/현금 norms the same way).

## Consequences
- Migration (payment_method + constraint), create.tsx picker, detail chip, 3×i18n, E2E case. Search filter deferred until demand.
