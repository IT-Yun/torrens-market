-- Reviews, trust tiers, and in-chat meetups (ADR 008 / ADR 009).

-- ── Reviews ────────────────────────────────────────────────────────────
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  reviewee_id uuid not null references public.profiles (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  unique (listing_id, reviewer_id),
  check (reviewer_id <> reviewee_id)
);

alter table public.reviews enable row level security;

create policy "reviews are readable by everyone"
  on public.reviews for select using (true);

-- Only the two chat participants of the listing may review each other,
-- and only once the listing has left 'active' (reserved or sold).
create policy "participants review each other after trade"
  on public.reviews for insert
  with check (
    auth.uid() = reviewer_id
    and exists (
      select 1
      from public.chat_rooms r
      join public.chat_participants pa on pa.room_id = r.id and pa.user_id = reviewer_id
      join public.chat_participants pb on pb.room_id = r.id and pb.user_id = reviewee_id
      where r.listing_id = reviews.listing_id
    )
    and exists (
      select 1 from public.listings l
      where l.id = reviews.listing_id and l.status <> 'active'
    )
  );

-- ── Trust points (ADR 008: net = count(4-5★) − count(1-2★)) ───────────
create or replace view public.profile_trust
with (security_invoker = off) as
select
  reviewee_id as profile_id,
  count(*)::int as review_count,
  round(avg(rating)::numeric, 2)::float as avg_rating,
  (count(*) filter (where rating >= 4) - count(*) filter (where rating <= 2))::int as trust_points
from public.reviews
group by reviewee_id;

grant select on public.profile_trust to anon, authenticated;

-- ── Meetups (ADR 009: one active per room) ─────────────────────────────
create table public.meetups (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms (id) on delete cascade,
  proposer_id uuid not null references public.profiles (id) on delete cascade,
  scheduled_at timestamptz not null,
  place text not null check (char_length(place) between 1 and 120),
  status text not null default 'proposed'
    check (status in ('proposed', 'accepted', 'declined', 'cancelled')),
  reminder_sent boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index one_active_meetup_per_room
  on public.meetups (room_id)
  where status in ('proposed', 'accepted');

alter table public.meetups enable row level security;

create policy "participants read their meetups"
  on public.meetups for select using (
    exists (
      select 1 from public.chat_participants p
      where p.room_id = meetups.room_id and p.user_id = auth.uid()
    )
  );

create policy "participants propose meetups"
  on public.meetups for insert with check (
    auth.uid() = proposer_id
    and exists (
      select 1 from public.chat_participants p
      where p.room_id = meetups.room_id and p.user_id = auth.uid()
    )
  );

create policy "participants update their meetups"
  on public.meetups for update using (
    exists (
      select 1 from public.chat_participants p
      where p.room_id = meetups.room_id and p.user_id = auth.uid()
    )
  );

-- ── Notifications: state changes → meetup-notify Edge Function ────────
create function public.notify_meetup_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform net.http_post(
      url := 'https://lpajdhhgfzsdlehqndni.supabase.co/functions/v1/meetup-notify',
      body := jsonb_build_object('meetup_id', new.id, 'event', 'proposed'),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    perform net.http_post(
      url := 'https://lpajdhhgfzsdlehqndni.supabase.co/functions/v1/meetup-notify',
      body := jsonb_build_object('meetup_id', new.id, 'event', new.status),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
    -- Accepted meetup marks the listing reserved (seller intent confirmed).
    if new.status = 'accepted' then
      update public.listings l
      set status = 'reserved'
      from public.chat_rooms r
      where r.id = new.room_id and l.id = r.listing_id and l.status = 'active';
    end if;
  end if;
  return new;
end;
$$;

create trigger on_meetup_change_notify
  after insert or update on public.meetups
  for each row execute function public.notify_meetup_change();

-- ── Reminder sweep: push ~1h before accepted meetups ──────────────────
create extension if not exists pg_cron;

select cron.schedule(
  'meetup-reminders',
  '*/10 * * * *',
  $$
  with due as (
    update public.meetups
    set reminder_sent = true
    where status = 'accepted'
      and reminder_sent = false
      and scheduled_at between now() and now() + interval '70 minutes'
    returning id
  )
  select net.http_post(
    url := 'https://lpajdhhgfzsdlehqndni.supabase.co/functions/v1/meetup-notify',
    body := jsonb_build_object('meetup_id', due.id, 'event', 'reminder'),
    headers := '{"Content-Type": "application/json"}'::jsonb
  ) from due
  $$
);
