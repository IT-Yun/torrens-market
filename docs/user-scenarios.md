# Spec — Core User Scenarios (MVP)

Personas from `core-context`: Li (Chinese student, Adelaide CBD), Min-ji (Korean working-holiday, Norwood), Sam (local Aussie buyer). Scope per `spec-mvp`; auth per `002-auth-strategy`.

## S1 — First run & sign-up (Li)
1. Opens app → **language selection (中文/English/한국어)** before anything else.
2. Signs in with Google/Apple (one tap). Enters display name, suburb, **nationality (optional, self-declared)**.
3. Optionally verifies phone → **✓ Verified badge**.
4. Lands on home feed filtered to listings near their suburb.

## S2 — Selling a sofa (Min-ji)
1. Taps FAB (+) → photo picker (camera/gallery, multi-select).
2. Types title → category suggested automatically (Gumtree pattern, `benchmark-gumtree`); picks **Furniture** → custom fields appear: dimensions W×D×H, pickup flag (default: Pickup only) (`spec-categories`).
3. Sets price, description, confirms suburb → posts. Listing appears in feed; card shows "Pickup only · 120×80×75cm".

## S3 — Buying with filters (Li)
1. Searches "sofa" or browses Furniture.
2. Applies filters: distance ≤ 10km, **nationality: Chinese sellers** (opt-in), verified-only.
3. Opens listing → structured attribute rows → taps **Chat** → arranges pickup in 1:1 chat.
4. Seller marks listing as **Sold**.

## S4 — Keyword alert loop (Sam)
1. Registers keyword "IKEA desk" (+ optional category/max-price).
2. New matching listing posted → **push notification** → opens listing → chats.
3. Manages keywords in profile → keyword settings.

## S5 — Favorites
- Heart on any card/detail → saved to Favorites tab; price-drop indication is v1.1.

## Screen list (11)
Onboarding(language) / Auth / Home feed / Search+filters / Listing detail / Listing create / Chat list / Chat room / Favorites / Keyword alerts / My profile
