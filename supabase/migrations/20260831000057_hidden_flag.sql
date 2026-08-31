-- ADR-019 amendment: "hide" is its own flag, not status='deleted'.
-- Sean: a sold listing must stay in HIS records ("기록상 있어야") while being
-- hideable from everyone else ("숨기면 다른 사람이 볼 순 없어"). status='deleted'
-- already hides from others but the app's own-listings query excludes it, and
-- sold→deleted is blocked (mig 055). A separate boolean keeps status semantics
-- (active/reserved/sold) intact and makes hidden-sold distinguishable forever.
alter table public.listings add column if not exists hidden boolean not null default false;
grant update (hidden) on public.listings to authenticated;

drop policy if exists "listings readable unless deleted (owners always)" on public.listings;
drop policy if exists "active listings are readable by everyone" on public.listings;
create policy "listings readable unless deleted or hidden (owners always)"
  on public.listings for select
  using (((status <> 'deleted') and (hidden = false)) or auth.uid() = seller_id);
