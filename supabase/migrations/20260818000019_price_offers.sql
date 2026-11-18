-- In-chat price offers (ADR 011) — one open offer per room.
create table public.offers (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms (id) on delete cascade,
  proposer_id uuid not null references public.profiles (id) on delete cascade,
  price_cents int not null check (price_cents >= 0),
  status text not null default 'proposed'
    check (status in ('proposed', 'accepted', 'declined', 'withdrawn')),
  created_at timestamptz not null default now()
);

create unique index one_open_offer_per_room
  on public.offers (room_id)
  where status = 'proposed';

alter table public.offers enable row level security;

create policy "participants read offers"
  on public.offers for select using (
    exists (
      select 1 from public.chat_participants p
      where p.room_id = offers.room_id and p.user_id = auth.uid()
    )
  );

create policy "participants propose offers"
  on public.offers for insert with check (
    auth.uid() = proposer_id
    and exists (
      select 1 from public.chat_participants p
      where p.room_id = offers.room_id and p.user_id = auth.uid()
    )
  );

create policy "participants update offers"
  on public.offers for update using (
    exists (
      select 1 from public.chat_participants p
      where p.room_id = offers.room_id and p.user_id = auth.uid()
    )
  );

create function public.notify_offer_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform net.http_post(
      url := 'https://lpajdhhgfzsdlehqndni.supabase.co/functions/v1/offer-notify',
      body := jsonb_build_object('offer_id', new.id, 'event', 'proposed'),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    perform net.http_post(
      url := 'https://lpajdhhgfzsdlehqndni.supabase.co/functions/v1/offer-notify',
      body := jsonb_build_object('offer_id', new.id, 'event', new.status),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  end if;
  return new;
end;
$$;

create trigger on_offer_change_notify
  after insert or update on public.offers
  for each row execute function public.notify_offer_change();

alter publication supabase_realtime add table public.offers;
