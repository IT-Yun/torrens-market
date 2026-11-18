-- ADR-019 wiring: let the seller record who bought (chat participants only),
-- and fire the review-request push when they do.

-- 1) Column grant (listings uses a column allow-list since mig 030).
grant update (sold_to_user_id) on public.listings to authenticated;

-- 2) Validation: sold_to must be null, or a chat participant of one of this
--    listing's rooms and not the seller — otherwise a seller could attribute
--    a sale to any account and spam review-request pushes.
create or replace function public.validate_sold_to()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.sold_to_user_id is not null
     and new.sold_to_user_id is distinct from old.sold_to_user_id then
    if new.sold_to_user_id = new.seller_id then
      raise exception 'sold_to cannot be the seller';
    end if;
    if not exists (
      select 1 from public.chat_rooms r
      join public.chat_participants p on p.room_id = r.id
      where r.listing_id = new.id and p.user_id = new.sold_to_user_id
    ) then
      raise exception 'sold_to must be a chat participant of this listing';
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.validate_sold_to() from anon, authenticated, public;
drop trigger if exists validate_sold_to on public.listings;
create trigger validate_sold_to before update on public.listings
  for each row execute function public.validate_sold_to();

-- 3) Review-request push when a buyer is attributed on a sold listing.
create or replace function public.notify_review_request()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'sold' and new.sold_to_user_id is not null
     and (old.sold_to_user_id is distinct from new.sold_to_user_id or old.status <> 'sold') then
    perform net.http_post(
      url := 'https://lpajdhhgfzsdlehqndni.supabase.co/functions/v1/review-request-notify',
      body := jsonb_build_object('listing_id', new.id),
      headers := private.notify_headers()
    );
  end if;
  return new;
end $$;
revoke execute on function public.notify_review_request() from anon, authenticated, public;
drop trigger if exists notify_review_request on public.listings;
create trigger notify_review_request after update on public.listings
  for each row execute function public.notify_review_request();
