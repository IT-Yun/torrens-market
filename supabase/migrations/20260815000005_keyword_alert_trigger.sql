-- Fire the keyword-alert-matcher Edge Function on every new active listing.
-- pg_net makes the HTTP call asynchronously so listing INSERTs stay fast.

create extension if not exists pg_net;

create function public.notify_keyword_alerts()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.status = 'active' then
    perform net.http_post(
      url := 'https://lpajdhhgfzsdlehqndni.supabase.co/functions/v1/keyword-alert-matcher',
      body := jsonb_build_object('listing_id', new.id),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  end if;
  return new;
end;
$$;

create trigger on_listing_created_notify
  after insert on public.listings
  for each row execute function public.notify_keyword_alerts();
