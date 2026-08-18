-- markRead stamped client time; a device clock behind the server could
-- never clear unread (caught by E2E). Server-time RPC, RLS-invoker.
create function public.mark_read(p_room_id uuid)
returns void
language sql
as $$
  update public.chat_participants
  set last_read_at = now()
  where room_id = p_room_id and user_id = auth.uid();
$$;
revoke execute on function public.mark_read(uuid) from anon;
