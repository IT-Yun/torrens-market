# Spec — Data Model (ERD)

Postgres on Supabase per `003-backend-supabase`. Covers every scenario in `spec-user-scenarios`.

```mermaid
erDiagram
    profiles ||--o{ listings : sells
    profiles ||--o{ favorites : saves
    profiles ||--o{ keyword_alerts : registers
    profiles ||--o{ chat_participants : joins
    categories ||--o{ listings : classifies
    listings ||--o{ listing_photos : has
    listings ||--o{ favorites : saved_as
    listings ||--o{ chat_rooms : discussed_in
    chat_rooms ||--o{ chat_participants : has
    chat_rooms ||--o{ messages : contains
    profiles ||--o{ messages : sends

    profiles {
        uuid id PK "= auth.users.id"
        text display_name
        text avatar_url
        text suburb
        geography location "PostGIS point (suburb centroid)"
        text nationality "self-declared, nullable"
        text preferred_language "ko | en | zh"
        boolean is_phone_verified "trust badge"
        timestamptz created_at
    }
    categories {
        int id PK
        text slug "furniture, electronics, ..."
        jsonb field_template "custom field definitions"
        jsonb name_i18n "ko/en/zh labels"
        int sort_order
    }
    listings {
        uuid id PK
        uuid seller_id FK
        int category_id FK
        text title
        text description
        int price_cents "AUD"
        text condition "new | like_new | used"
        text pickup_mode "pickup_only | seller_delivers | buyer_collects"
        text suburb
        geography location "PostGIS point"
        jsonb attributes "category-specific values"
        text status "active | reserved | sold | deleted"
        tsvector search_vector "FTS for search + keyword alerts"
        timestamptz created_at
    }
    listing_photos {
        uuid id PK
        uuid listing_id FK
        text storage_path
        int sort_order
    }
    favorites {
        uuid user_id PK_FK
        uuid listing_id PK_FK
        timestamptz created_at
    }
    keyword_alerts {
        uuid id PK
        uuid user_id FK
        text keyword
        int category_id FK "nullable"
        int max_price_cents "nullable"
        boolean active
        timestamptz created_at
    }
    chat_rooms {
        uuid id PK
        uuid listing_id FK
        timestamptz created_at
    }
    chat_participants {
        uuid room_id PK_FK
        uuid user_id PK_FK
        timestamptz last_read_at
    }
    messages {
        uuid id PK
        uuid room_id FK
        uuid sender_id FK
        text body
        text image_path "nullable"
        timestamptz created_at
    }
```

## Design notes
- **Category custom fields**: `categories.field_template` defines each category's fields (type, label i18n, required); `listings.attributes` stores the values as JSONB → new categories/fields need no migration (`spec-categories`).
- **Distance filter**: `listings.location` (PostGIS) + GiST index → `ST_DWithin` for "within X km". Suburb centroid, not exact address (privacy).
- **Keyword alerts**: on listing INSERT, a trigger/Edge Function matches `search_vector` against active `keyword_alerts` → Expo push. This is the custom showcase service (`003-backend-supabase`).
- **Nationality filter**: join on `profiles.nationality`; NULL = not shown, always opt-in filter (`spec-mvp`).
- **i18n**: UI strings live in the app (i18next); DB stores `name_i18n` only for category labels. Listing content stays in the seller's language (machine translation of listings = v2 candidate).
- **RLS sketch**: listings readable by all / writable by seller; messages readable only by room participants; favorites/keyword_alerts owner-only. Full policies written at implementation.
- **Push tokens**: Expo push tokens stored per device in a small `push_tokens` table (omitted from diagram).
