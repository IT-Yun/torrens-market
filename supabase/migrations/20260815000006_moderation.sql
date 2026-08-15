-- UGC moderation: content reports + user blocking (App Store requirement)

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid references public.listings (id) on delete set null,
  reported_user_id uuid references public.profiles (id) on delete set null,
  reason text not null check (reason in ('spam', 'scam', 'inappropriate', 'other')),
  detail text,
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;
-- users can file reports; only service role (admin tooling) can read them
create policy "users file own reports"
  on public.reports for insert with check (auth.uid() = reporter_id);

create table public.blocked_users (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.blocked_users enable row level security;
create policy "users manage own block list"
  on public.blocked_users for all using (auth.uid() = blocker_id);
