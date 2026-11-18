-- Firm-price listings: seller can disable price offers (Sean's request 2026-08-20).
-- Enforced in the DB, not just the UI — a modified client still can't inject an
-- offer on a listing the seller marked firm-price.

alter table public.listings
  add column offers_enabled boolean not null default true;

-- migration 030 column-locked listings INSERT/UPDATE; the seller must be able to
-- set this new client-editable column or the create/edit write 403s.
grant insert (offers_enabled) on public.listings to authenticated;
grant update (offers_enabled) on public.listings to authenticated;

-- The offers INSERT policy already requires proposer = self + room participant.
-- Add: the room's listing must have offers_enabled = true.
drop policy if exists "participants propose offers" on public.offers;
create policy "participants propose offers"
  on public.offers for insert
  with check (
    auth.uid() = proposer_id
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
