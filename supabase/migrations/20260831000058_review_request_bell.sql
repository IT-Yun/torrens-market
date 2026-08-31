-- DB-owner reconciliation (claude-0d): 056 fires a push via the (previously
-- undeployed) review-request-notify function, but the bell/activity center
-- reads public.notifications — and 'review_request' wasn't an allowed kind, so
-- the request never appeared in-app. Allow the kind and insert the bell row
-- from the same transition 056 pushes on.
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('message', 'offer', 'meetup', 'review', 'favorite', 'review_request', 'system'));

create or replace function public.notif_on_sold_to()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'sold' and new.sold_to_user_id is not null
     and (old.sold_to_user_id is distinct from new.sold_to_user_id or old.status <> 'sold') then
    perform private.notify_user(new.sold_to_user_id, 'review_request', new.seller_id, new.id, null,
      jsonb_build_object('title', new.title, 'reviewee_id', new.seller_id));
  end if;
  return new;
end $$;
revoke execute on function public.notif_on_sold_to() from public, anon, authenticated;
drop trigger if exists notif_on_sold_to on public.listings;
create trigger notif_on_sold_to after update on public.listings
  for each row execute function public.notif_on_sold_to();
