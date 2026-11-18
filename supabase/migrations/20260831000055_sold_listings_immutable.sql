-- Sean (2026-08-31): a sold listing is a trade record — sellers must not be
-- able to delete it. Hiding stays possible (feed already only shows
-- active/reserved/sold to others); the record and its reviews/chats persist.
-- Enforced for client roles only; the service role (admin console) can still
-- hide/restore for moderation.
create or replace function public.protect_sold_listing()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('anon', 'authenticated')
     and old.status = 'sold' and new.status = 'deleted' then
    raise exception 'Sold listings are a trade record and cannot be deleted.';
  end if;
  return new;
end $$;
revoke execute on function public.protect_sold_listing() from anon, authenticated, public;
drop trigger if exists protect_sold_listing on public.listings;
create trigger protect_sold_listing before update on public.listings
  for each row execute function public.protect_sold_listing();

-- Buyer attribution for the mark-sold flow (ADR-019): who the seller says they
-- sold to. Nullable; 'outside buyer' (지인/외부 판매) leaves it null. Client may
-- set it only via the normal own-listing update path; server columns guard
-- unaffected.
alter table public.listings
  add column if not exists sold_to_user_id uuid references public.profiles (id) on delete set null;
