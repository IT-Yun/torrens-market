-- Cancelling/declining an accepted meetup must release the listing:
-- reserved → active (unless it was already sold). Fixes the E2E-found
-- dead end where a cancelled trade left the listing reserved forever.
create or replace function public.notify_meetup_change()
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
