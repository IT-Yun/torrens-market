-- Blocking must also gate new chats (Karrot pattern): if either party has
-- blocked the other, start_chat refuses to create a room.
create or replace function public.start_chat(p_listing_id uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_seller uuid;
  v_room uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select seller_id into v_seller from public.listings where id = p_listing_id;
  if v_seller is null then
    raise exception 'listing not found';
  end if;
  if v_seller = auth.uid() then
    raise exception 'cannot chat with yourself';
  end if;

  if exists (
    select 1 from public.blocked_users b
    where (b.blocker_id = auth.uid() and b.blocked_id = v_seller)
       or (b.blocker_id = v_seller and b.blocked_id = auth.uid())
  ) then
    raise exception 'chat unavailable';
  end if;

  select cr.id into v_room
  from public.chat_rooms cr
  join public.chat_participants me on me.room_id = cr.id and me.user_id = auth.uid()
  where cr.listing_id = p_listing_id
  limit 1;

  if v_room is null then
    insert into public.chat_rooms (listing_id) values (p_listing_id) returning id into v_room;
    insert into public.chat_participants (room_id, user_id)
    values (v_room, auth.uid()), (v_room, v_seller);
  end if;

  return v_room;
end;
$$;
