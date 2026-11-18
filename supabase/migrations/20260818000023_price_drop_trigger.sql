-- Notify favoriters when an active listing's price drops.
create function public.notify_price_drop()
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
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  end if;
  return new;
end;
$$;

create trigger on_price_drop_notify
  after update of price_cents on public.listings
  for each row execute function public.notify_price_drop();
