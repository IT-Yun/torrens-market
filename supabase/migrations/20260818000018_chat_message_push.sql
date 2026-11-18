-- Push on new chat messages (was a silent gap: replies never notified).
create function public.notify_chat_message()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://lpajdhhgfzsdlehqndni.supabase.co/functions/v1/chat-notify',
    body := jsonb_build_object('message_id', new.id),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  return new;
end;
$$;

create trigger on_message_notify
  after insert on public.messages
  for each row execute function public.notify_chat_message();
