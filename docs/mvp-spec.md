# Spec — Torrens Market MVP

**Goal:** the smallest app where one real secondhand trade can happen in Adelaide. Ship portfolio-grade to App Store / Play Store, then keep growing (`core-context`, Stage 1 of `source-service-dev-process`).

**Stack:** React Native + Expo + TypeScript (`001-cross-platform-framework`).

## In scope (v1)
1. **Sign-up + basic verification** — phone/email auth. Profile includes **nationality (user-entered)**.
2. **Listing creation** — photos, title, price, description, suburb. Photo upload must be frictionless.
3. **Category-specific listing fields** (differentiator, added 2026-08-15) — choosing a category reveals tailored fields: furniture → dimensions; luxury goods → receipt photo + purchase date; cosmetics → expiry date; etc. Shown as structured info on the listing detail page.
4. **Browse + search** — list/grid, category filter, distance filter, **nationality filter** (opt-in: filter sellers by nationality, or see everyone; no matching logic).
5. **Favorites (찜)** — save listings to a favorites list.
6. **Keyword alerts** (user's top-priority feature) — user registers keywords; push notification when a matching listing is posted. Karrot's killer retention feature.
7. **1:1 chat** — buyer contacts seller, arrange pickup/delivery.
8. **Trilingual UI (KO/EN/ZH)** — full language switching from day one; retrofitting i18n is costly.

## Explicit non-goals (v1.1+)
- Karrot-style reputation (manner temperature), advanced trust scores
- In-app payments
- Monetization (ads / subscription / paid features)
- Web version (planned later; stack chosen to keep the path open)

## Implementation notes
- Keyword alerts + chat both need push notifications → notification infra is v1 scope (basic, not polished).
- Category-specific fields → data model should use per-category field templates (e.g. JSONB attributes) → future ADR in data design.

## Decisions this spec depends on
- `001-cross-platform-framework` — React Native + Expo + TypeScript
- Future ADRs: backend/BaaS choice, i18n library, auth provider — to be decided in Stage 2 (Design)
