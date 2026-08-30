-- Ops alerts, round 2 (ADR-017): Sean runs ops from his Mac + Telegram, so push
-- the three events a solo operator wants to know about the moment they happen:
--   1) a new sign-up (profile row created by handle_new_user on auth signup)
--   2) a new listing (first real content; volume is tiny post-launch)
--   3) every new report (mig 038 only alerted at auto-hide / milestone thresholds)
-- Same secret-authenticated pg_net → ops-alert Edge Function path as mig 038.

-- 1) New sign-up → alert with running user count.
create or replace function public.alert_signup()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_total int;
begin
  select count(*) into v_total from public.profiles;
  perform net.http_post(
    url := 'https://lpajdhhgfzsdlehqndni.supabase.co/functions/v1/ops-alert',
    body := jsonb_build_object('text',
      '🙋 New sign-up #' || v_total ||
      coalesce(': ' || nullif(new.display_name, ''), '') ||
      coalesce(' · ' || nullif(new.suburb, ''), '') ||
      coalesce(' · ' || nullif(new.nationality, ''), '') ||
      ' · lang ' || coalesce(new.preferred_language, '?')),
    headers := private.notify_headers()
  );
  return new;
end $$;
revoke execute on function public.alert_signup() from anon, authenticated, public;
drop trigger if exists alert_signup on public.profiles;
create trigger alert_signup after insert on public.profiles
  for each row execute function public.alert_signup();

-- 2) New listing → alert (title · price · suburb · seller).
create or replace function public.alert_new_listing()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_seller text;
  v_total int;
begin
  select display_name into v_seller from public.profiles where id = new.seller_id;
  select count(*) into v_total from public.listings where status <> 'deleted';
  perform net.http_post(
    url := 'https://lpajdhhgfzsdlehqndni.supabase.co/functions/v1/ops-alert',
    body := jsonb_build_object('text',
      '🛍 New listing #' || v_total || ': ' || left(new.title, 80) ||
      ' · $' || (new.price_cents / 100) ||
      coalesce(' · ' || nullif(new.suburb, ''), '') ||
      ' · by ' || coalesce(nullif(v_seller, ''), '?')),
    headers := private.notify_headers()
  );
  return new;
end $$;
revoke execute on function public.alert_new_listing() from anon, authenticated, public;
drop trigger if exists alert_new_listing on public.listings;
create trigger alert_new_listing after insert on public.listings
  for each row execute function public.alert_new_listing();

-- 3) Every new report → one line (thresholds from mig 038 still fire on top).
create or replace function public.alert_every_report()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_title text;
begin
  select title into v_title from public.listings where id = new.listing_id;
  perform net.http_post(
    url := 'https://lpajdhhgfzsdlehqndni.supabase.co/functions/v1/ops-alert',
    body := jsonb_build_object('text',
      '🚩 Report: ' || new.reason || ' · ' || coalesce(left(v_title, 80), '?')),
    headers := private.notify_headers()
  );
  return new;
end $$;
revoke execute on function public.alert_every_report() from anon, authenticated, public;
drop trigger if exists alert_every_report on public.reports;
create trigger alert_every_report after insert on public.reports
  for each row execute function public.alert_every_report();
