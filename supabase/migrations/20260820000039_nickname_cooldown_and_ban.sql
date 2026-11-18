-- Trust hardening vs Karrot gap check (Sean 2026-08-20):
--  #2 nickname change cooldown (30 days) — stop rapid identity churn. Reputation
--     is already account-bound, so this is purely anti-confusion.
--  #3 real ban capability — a banned user can't post listings, chat, or make
--     offers (enforced in RLS, not just an alert). Set profiles.banned = true
--     (via Supabase dashboard / an admin action) to ban.

-- ── #2 nickname 30-day cooldown ──────────────────────────────────────
alter table public.profiles add column display_name_changed_at timestamptz;

create or replace function public.enforce_name_cooldown()
returns trigger language plpgsql as $$  -- not definer: current_user = the caller
begin
  if new.display_name is distinct from old.display_name then
    if current_user in ('anon', 'authenticated')
       and old.display_name_changed_at is not null
       and old.display_name_changed_at > now() - interval '30 days' then
      raise exception 'Nickname can only be changed once every 30 days.';
    end if;
    new.display_name_changed_at := now();
  end if;
  return new;
end $$;
drop trigger if exists enforce_name_cooldown on public.profiles;
create trigger enforce_name_cooldown before update on public.profiles
  for each row execute function public.enforce_name_cooldown();

-- ── #3 ban flag + enforcement ────────────────────────────────────────
alter table public.profiles add column banned boolean not null default false;

create or replace function public.is_banned(uid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select banned from public.profiles where id = uid), false);
$$;
grant execute on function public.is_banned(uuid) to authenticated, anon;

-- a banned user cannot create listings…
drop policy if exists "sellers insert own listings" on public.listings;
create policy "sellers insert own listings" on public.listings for insert
  with check (auth.uid() = seller_id and not public.is_banned(auth.uid()));

-- …send chat messages…
drop policy if exists "participants send messages as themselves" on public.messages;
create policy "participants send messages as themselves" on public.messages for insert
  with check (
    auth.uid() = sender_id
    and public.is_room_participant(room_id)
    and not public.is_banned(auth.uid())
  );

-- …or make price offers.
drop policy if exists "participants propose offers" on public.offers;
create policy "participants propose offers" on public.offers for insert
  with check (
    auth.uid() = proposer_id
    and not public.is_banned(auth.uid())
    and exists (
      select 1 from public.chat_participants p
      where p.room_id = offers.room_id and p.user_id = auth.uid()
    )
    and exists (
      select 1 from public.chat_rooms r
      join public.listings l on l.id = r.listing_id
      where r.id = offers.room_id and l.offers_enabled = true
    )
  );
