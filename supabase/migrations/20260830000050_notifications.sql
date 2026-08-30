-- In-app notification center (ADR-019): one durable feed per user, written by
-- security-definer triggers, read/marked by the recipient only. Push stays the
-- nudge; this table is the record behind the bell icon.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('message', 'offer', 'meetup', 'review', 'favorite', 'system')),
  actor_id uuid references public.profiles (id) on delete set null,
  listing_id uuid references public.listings (id) on delete cascade,
  room_id uuid references public.chat_rooms (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists notifications_user_unread_idx on public.notifications (user_id, created_at desc) where read_at is null;
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;
create policy "recipients read their notifications" on public.notifications
  for select using (auth.uid() = user_id);
create policy "recipients mark their notifications" on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- no insert/delete policies for clients: rows come only from the triggers below
revoke insert, delete on public.notifications from anon, authenticated;
revoke all on public.notifications from anon;

-- ── helpers ───────────────────────────────────────────────────────────
create or replace function private.notify_user(
  p_user uuid, p_kind text, p_actor uuid, p_listing uuid, p_room uuid, p_data jsonb
) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_user is null or p_user = p_actor then return; end if;
  -- messages collapse: one unread row per room until the recipient reads it
  if p_kind = 'message' then
    if exists (select 1 from public.notifications
               where user_id = p_user and kind = 'message' and room_id = p_room and read_at is null) then
      update public.notifications set created_at = now(), actor_id = p_actor, data = p_data
        where user_id = p_user and kind = 'message' and room_id = p_room and read_at is null;
      return;
    end if;
  end if;
  insert into public.notifications (user_id, kind, actor_id, listing_id, room_id, data)
    values (p_user, p_kind, p_actor, p_listing, p_room, coalesce(p_data, '{}'::jsonb));
end $$;
revoke execute on function private.notify_user(uuid, text, uuid, uuid, uuid, jsonb) from public, anon, authenticated;

create or replace function private.room_other_party(p_room uuid, p_me uuid)
returns uuid language sql security definer set search_path = public stable as $$
  select user_id from public.chat_participants where room_id = p_room and user_id <> p_me limit 1;
$$;

-- ── triggers ──────────────────────────────────────────────────────────
create or replace function public.notif_on_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_to uuid; v_listing uuid;
begin
  select private.room_other_party(new.room_id, new.sender_id) into v_to;
  select listing_id into v_listing from public.chat_rooms where id = new.room_id;
  perform private.notify_user(v_to, 'message', new.sender_id, v_listing, new.room_id,
    jsonb_build_object('preview', left(coalesce(new.body, ''), 80), 'has_image', new.image_path is not null));
  return new;
end $$;
drop trigger if exists notif_on_message on public.messages;
create trigger notif_on_message after insert on public.messages for each row execute function public.notif_on_message();

create or replace function public.notif_on_offer() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_to uuid; v_listing uuid; v_actor uuid;
begin
  select listing_id into v_listing from public.chat_rooms where id = new.room_id;
  if tg_op = 'INSERT' then
    v_actor := new.proposer_id;
    select private.room_other_party(new.room_id, new.proposer_id) into v_to;
  elsif new.status is distinct from old.status and new.status in ('accepted', 'declined') then
    -- the non-proposer acted; tell the proposer
    v_to := new.proposer_id;
    select private.room_other_party(new.room_id, new.proposer_id) into v_actor;
  else
    return new;
  end if;
  perform private.notify_user(v_to, 'offer', v_actor, v_listing, new.room_id,
    jsonb_build_object('price_cents', new.price_cents, 'status', new.status));
  return new;
end $$;
drop trigger if exists notif_on_offer on public.offers;
create trigger notif_on_offer after insert or update of status on public.offers for each row execute function public.notif_on_offer();

create or replace function public.notif_on_meetup() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_to uuid; v_listing uuid; v_actor uuid;
begin
  select listing_id into v_listing from public.chat_rooms where id = new.room_id;
  if tg_op = 'INSERT' then
    v_actor := new.proposer_id;
    select private.room_other_party(new.room_id, new.proposer_id) into v_to;
  elsif new.status is distinct from old.status then
    if new.status in ('accepted', 'declined') then
      v_to := new.proposer_id; select private.room_other_party(new.room_id, new.proposer_id) into v_actor;
    else -- cancelled by either side: tell the other one (best effort: proposer's counterpart)
      v_actor := new.proposer_id; select private.room_other_party(new.room_id, new.proposer_id) into v_to;
    end if;
  else
    return new;
  end if;
  perform private.notify_user(v_to, 'meetup', v_actor, v_listing, new.room_id,
    jsonb_build_object('scheduled_at', new.scheduled_at, 'place', new.place, 'status', new.status));
  return new;
end $$;
drop trigger if exists notif_on_meetup on public.meetups;
create trigger notif_on_meetup after insert or update of status on public.meetups for each row execute function public.notif_on_meetup();

create or replace function public.notif_on_review() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- reviewer identity intentionally NOT stored (ADR-015): actor_id null
  perform private.notify_user(new.reviewee_id, 'review', null, new.listing_id, null,
    jsonb_build_object('rating', new.rating, 'has_comment', new.comment is not null));
  return new;
end $$;
drop trigger if exists notif_on_review on public.reviews;
create trigger notif_on_review after insert on public.reviews for each row execute function public.notif_on_review();

create or replace function public.notif_on_favorite() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_seller uuid; v_title text;
begin
  select seller_id, title into v_seller, v_title from public.listings where id = new.listing_id;
  perform private.notify_user(v_seller, 'favorite', new.user_id, new.listing_id, null,
    jsonb_build_object('title', v_title));
  return new;
end $$;
drop trigger if exists notif_on_favorite on public.favorites;
create trigger notif_on_favorite after insert on public.favorites for each row execute function public.notif_on_favorite();

-- ── client RPCs ───────────────────────────────────────────────────────
create or replace function public.mark_notification_read(p_id uuid) returns void
language sql security invoker set search_path = public as $$
  update public.notifications set read_at = now() where id = p_id and user_id = auth.uid() and read_at is null;
$$;
create or replace function public.mark_all_notifications_read() returns void
language sql security invoker set search_path = public as $$
  update public.notifications set read_at = now() where user_id = auth.uid() and read_at is null;
$$;
revoke execute on function public.mark_notification_read(uuid) from public, anon;
revoke execute on function public.mark_all_notifications_read() from public, anon;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;

-- reading a chat room also clears its message notification (keeps the two badges consistent)
create or replace function public.mark_read(p_room_id uuid) returns void
language sql security invoker set search_path = public as $$
  update public.chat_participants set last_read_at = now() where room_id = p_room_id and user_id = auth.uid();
  update public.notifications set read_at = now() where room_id = p_room_id and user_id = auth.uid() and kind = 'message' and read_at is null;
$$;

alter publication supabase_realtime add table public.notifications;
