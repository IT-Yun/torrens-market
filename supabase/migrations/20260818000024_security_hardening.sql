-- Security hardening pass (Supabase Security Advisor + ops roadmap):
-- 1) API roles can no longer execute trigger/definer functions directly
-- 2) notify pipeline authenticates to Edge Functions via a shared secret
--    kept in a private schema (value inserted out-of-band, never in git)
-- 3) mutable search_path fixed; 4) status_changed_at for storage lifecycle

-- ── 1. function execution privileges ──────────────────────────────────
revoke execute on function public.notify_chat_message() from anon, authenticated;
revoke execute on function public.notify_keyword_alerts() from anon, authenticated;
revoke execute on function public.notify_meetup_change() from anon, authenticated;
revoke execute on function public.notify_offer_change() from anon, authenticated;
revoke execute on function public.notify_price_drop() from anon, authenticated;
revoke execute on function public.auto_hide_reported_listing() from anon, authenticated;
revoke execute on function public.enforce_bump_cooldown() from anon, authenticated;
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.bump_listing(uuid) from anon;
revoke execute on function public.increment_view(uuid) from anon;
revoke execute on function public.start_chat(uuid) from anon;

alter function public.enforce_bump_cooldown() set search_path = public;

-- ── 2. private config + authenticated notify calls ────────────────────
create schema if not exists private;
create table if not exists private.config (
  key text primary key,
  value text not null
);
-- no grants: only owner (postgres) and definer functions can read it

create or replace function private.notify_headers()
returns jsonb
language sql security definer set search_path = private
as $$
  select jsonb_build_object(
    'Content-Type', 'application/json',
    'x-notify-secret', coalesce((select value from private.config where key = 'notify_secret'), '')
  );
$$;
revoke execute on function private.notify_headers() from anon, authenticated, public;

create or replace function public.notify_meetup_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform net.http_post(
      url := 'https://lpajdhhgfzsdlehqndni.supabase.co/functions/v1/meetup-notify',
      body := jsonb_build_object('meetup_id', new.id, 'event', 'proposed'),
      headers := private.notify_headers()
    );
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    perform net.http_post(
      url := 'https://lpajdhhgfzsdlehqndni.supabase.co/functions/v1/meetup-notify',
      body := jsonb_build_object('meetup_id', new.id, 'event', new.status),
      headers := private.notify_headers()
    );
    if new.status = 'accepted' then
      update public.listings l
      set status = 'reserved'
      from public.chat_rooms r
      where r.id = new.room_id and l.id = r.listing_id and l.status = 'active';
    elsif old.status = 'accepted' and new.status in ('cancelled', 'declined') then
      update public.listings l
      set status = 'active'
      from public.chat_rooms r
      where r.id = new.room_id and l.id = r.listing_id and l.status = 'reserved';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.notify_chat_message()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://lpajdhhgfzsdlehqndni.supabase.co/functions/v1/chat-notify',
    body := jsonb_build_object('message_id', new.id),
    headers := private.notify_headers()
  );
  return new;
end;
$$;

create or replace function public.notify_offer_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform net.http_post(
      url := 'https://lpajdhhgfzsdlehqndni.supabase.co/functions/v1/offer-notify',
      body := jsonb_build_object('offer_id', new.id, 'event', 'proposed'),
      headers := private.notify_headers()
    );
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    perform net.http_post(
      url := 'https://lpajdhhgfzsdlehqndni.supabase.co/functions/v1/offer-notify',
      body := jsonb_build_object('offer_id', new.id, 'event', new.status),
      headers := private.notify_headers()
    );
  end if;
  return new;
end;
$$;

create or replace function public.notify_price_drop()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.price_cents < old.price_cents and new.status = 'active' then
    perform net.http_post(
      url := 'https://lpajdhhgfzsdlehqndni.supabase.co/functions/v1/price-drop-notify',
      body := jsonb_build_object(
        'listing_id', new.id,
        'old_price', old.price_cents,
        'new_price', new.price_cents
      ),
      headers := private.notify_headers()
    );
  end if;
  return new;
end;
$$;

create or replace function public.notify_keyword_alerts()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.status = 'active' then
    perform net.http_post(
      url := 'https://lpajdhhgfzsdlehqndni.supabase.co/functions/v1/keyword-alert-matcher',
      body := jsonb_build_object('listing_id', new.id),
      headers := private.notify_headers()
    );
  end if;
  return new;
end;
$$;

-- reschedule the reminder sweep with authenticated headers
select cron.unschedule('meetup-reminders');
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
    headers := private.notify_headers()
  ) from due
  $$
);

-- ── 3. storage lifecycle bookkeeping ──────────────────────────────────
alter table public.listings
  add column if not exists status_changed_at timestamptz not null default now();

create or replace function public.track_status_change()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    new.status_changed_at := now();
  end if;
  return new;
end;
$$;
revoke execute on function public.track_status_change() from anon, authenticated;

create trigger on_listing_status_change
  before update on public.listings
  for each row execute function public.track_status_change();

-- weekly photo purge for long-finished listings (90 days)
select cron.schedule(
  'storage-cleanup',
  '0 3 * * 1',
  $$
  select net.http_post(
    url := 'https://lpajdhhgfzsdlehqndni.supabase.co/functions/v1/storage-cleanup',
    body := '{}'::jsonb,
    headers := private.notify_headers()
  )
  $$
);
