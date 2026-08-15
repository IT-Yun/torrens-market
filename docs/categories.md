# Spec — Categories & Category-specific Fields

Confirmed 2026-08-15. Choosing a category during listing creation reveals its custom fields (`spec-mvp` §3). Evidence: Karrot's car vertical surfaces year·mileage on cards (`benchmark-karrot`); Gumtree uses structured attribute rows and a "Pickup Only" flag (`benchmark-gumtree`).

**Common fields (all listings):** photos, title, price, description, suburb, condition (new/like-new/used), pickup/delivery flag (pickup only · seller delivers · buyer collects — Gumtree pattern, extended).

| # | Category | Custom fields |
|---|----------|---------------|
| 1 | Furniture ⭐ | dimensions W×D×H (cm), pickup-only default ON |
| 2 | Electronics ⭐ | brand/model, purchase date, warranty remaining (y/n) |
| 3 | Luxury & fashion accessories ⭐ | brand, purchase date, receipt/authenticity photo slot |
| 4 | Cosmetics & beauty ⭐ | expiry date, opened (y/n) |
| 5 | Clothing | size, gender |
| 6 | Home & kitchen | — |
| 7 | Books & textbooks | ISBN or course code (international-student niche) |
| 8 | Cars & bikes ⭐ | year, purchase date, odometer (km), **rego expiry**, consumables/service history (free text: tyres, oil, brakes) |
| 9 | Food & groceries | best-before date |
| 10 | Other | — |

⭐ = has custom fields. Custom-field values render as **structured attribute rows** on the listing detail page and as a one-line badge on feed cards (e.g. "2019 · 82,000km" — Karrot car-card pattern).

## Data-model implication
Per-category field templates; listing stores values as a JSON attributes object (e.g. Postgres JSONB) → to be settled in the data-design ADR (Stage 2).
