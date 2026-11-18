-- Torrens Market — initial schema
-- Implements docs/data-model.md (ERD). PostGIS for distance, JSONB for
-- category-specific attributes, FTS for search + keyword alerts, RLS throughout.

create extension if not exists postgis;

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  avatar_url text,
  suburb text,
  location geography (point, 4326),
  nationality text,                    -- self-declared, optional (ISO 3166-1 alpha-2)
  preferred_language text not null default 'en' check (preferred_language in ('ko', 'en', 'zh')),
  is_phone_verified boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are readable by everyone"
  on public.profiles for select using (true);
create policy "users insert own profile"
  on public.profiles for insert with check (auth.uid() = id);
create policy "users update own profile"
  on public.profiles for update using (auth.uid() = id);

-- auto-create a profile row on signup
create function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'User ' || left(new.id::text, 8)),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- categories (field_template drives category-specific listing inputs)
-- ---------------------------------------------------------------------------
create table public.categories (
  id int generated always as identity primary key,
  slug text not null unique,
  name_i18n jsonb not null,            -- {"ko": ..., "en": ..., "zh": ...}
  field_template jsonb not null default '[]'::jsonb,
  sort_order int not null default 0
);

alter table public.categories enable row level security;
create policy "categories are readable by everyone"
  on public.categories for select using (true);
-- no insert/update policies: managed via migrations only

-- ---------------------------------------------------------------------------
-- listings
-- ---------------------------------------------------------------------------
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles (id) on delete cascade,
  category_id int not null references public.categories (id),
  title text not null check (char_length(title) between 1 and 80),
  description text not null default '',
  price_cents int not null check (price_cents >= 0),
  condition text not null default 'used' check (condition in ('new', 'like_new', 'used')),
  pickup_mode text not null default 'pickup_only'
    check (pickup_mode in ('pickup_only', 'seller_delivers', 'buyer_collects')),
  suburb text not null,
  location geography (point, 4326),
  attributes jsonb not null default '{}'::jsonb,   -- values for the category's field_template
  status text not null default 'active' check (status in ('active', 'reserved', 'sold', 'deleted')),
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'B')
  ) stored,
  created_at timestamptz not null default now()
);

create index listings_location_idx on public.listings using gist (location);
create index listings_search_idx on public.listings using gin (search_vector);
create index listings_category_idx on public.listings (category_id, status, created_at desc);
create index listings_seller_idx on public.listings (seller_id, created_at desc);

alter table public.listings enable row level security;

create policy "active listings are readable by everyone"
  on public.listings for select using (status <> 'deleted');
create policy "sellers insert own listings"
  on public.listings for insert with check (auth.uid() = seller_id);
create policy "sellers update own listings"
  on public.listings for update using (auth.uid() = seller_id);

-- ---------------------------------------------------------------------------
-- listing_photos
-- ---------------------------------------------------------------------------
create table public.listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  storage_path text not null,
  sort_order int not null default 0
);

create index listing_photos_listing_idx on public.listing_photos (listing_id, sort_order);

alter table public.listing_photos enable row level security;

create policy "photos are readable by everyone"
  on public.listing_photos for select using (true);
create policy "sellers manage photos of own listings"
  on public.listing_photos for all using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.seller_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- favorites
-- ---------------------------------------------------------------------------
create table public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

alter table public.favorites enable row level security;
create policy "users manage own favorites"
  on public.favorites for all using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- keyword_alerts
-- ---------------------------------------------------------------------------
create table public.keyword_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  keyword text not null check (char_length(keyword) between 1 and 60),
  category_id int references public.categories (id),
  max_price_cents int,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index keyword_alerts_active_idx on public.keyword_alerts (active) where active;

alter table public.keyword_alerts enable row level security;
create policy "users manage own keyword alerts"
  on public.keyword_alerts for all using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- chat
-- ---------------------------------------------------------------------------
create table public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.chat_participants (
  room_id uuid not null references public.chat_rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null default '',
  image_path text,
  created_at timestamptz not null default now(),
  check (body <> '' or image_path is not null)
);

create index messages_room_idx on public.messages (room_id, created_at desc);

alter table public.chat_rooms enable row level security;
alter table public.chat_participants enable row level security;
alter table public.messages enable row level security;

create function public.is_room_participant(p_room_id uuid)
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (
    select 1 from public.chat_participants
    where room_id = p_room_id and user_id = auth.uid()
  );
$$;

create policy "participants read own rooms"
  on public.chat_rooms for select using (public.is_room_participant(id));
create policy "authenticated users create rooms"
  on public.chat_rooms for insert with check (auth.uid() is not null);

create policy "participants see room membership"
  on public.chat_participants for select using (public.is_room_participant(room_id));
create policy "users join rooms as themselves"
  on public.chat_participants for insert with check (auth.uid() = user_id);
create policy "users update own read state"
  on public.chat_participants for update using (auth.uid() = user_id);

create policy "participants read messages"
  on public.messages for select using (public.is_room_participant(room_id));
create policy "participants send messages as themselves"
  on public.messages for insert
  with check (auth.uid() = sender_id and public.is_room_participant(room_id));

-- ---------------------------------------------------------------------------
-- push_tokens (Expo push)
-- ---------------------------------------------------------------------------
create table public.push_tokens (
  user_id uuid not null references public.profiles (id) on delete cascade,
  token text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);

alter table public.push_tokens enable row level security;
create policy "users manage own push tokens"
  on public.push_tokens for all using (auth.uid() = user_id);
