-- Ops alerts to the maintainer's Telegram (interim "admin"): live notice of bug
-- reports and abuse signals so a solo dev can act without a dashboard.
-- Uses the same secret-authenticated pg_net path as the notify functions.

-- 1) New feedback / bug report → alert.
create or replace function public.alert_feedback()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform net.http_post(
    url := 'https://lpajdhhgfzsdlehqndni.supabase.co/functions/v1/ops-alert',
    body := jsonb_build_object('text',
      '📝 New ' || new.kind || ' feedback (v' || coalesce(new.app_version, '?') || ')' ||
      E'\n' || left(new.message, 800)),
    headers := private.notify_headers()
  );
  return new;
end $$;
revoke execute on function public.alert_feedback() from anon, authenticated, public;
drop trigger if exists alert_feedback on public.feedback;
create trigger alert_feedback after insert on public.feedback
  for each row execute function public.alert_feedback();

-- 2) Abuse signals on new reports:
--    (a) a listing just reached the 3-distinct-reporter auto-hide threshold;
--    (b) a reported user crosses a milestone (5/10/25 reports) — possible bad actor.
create or replace function public.alert_report()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_listing_reports int;
  v_user_reports int;
  v_title text;
begin
  select count(distinct reporter_id) into v_listing_reports
    from reports where listing_id = new.listing_id;
  select count(*) into v_user_reports
    from reports where reported_user_id = new.reported_user_id;
  select title into v_title from listings where id = new.listing_id;

  if v_listing_reports = 3 then
    perform net.http_post(
      url := 'https://lpajdhhgfzsdlehqndni.supabase.co/functions/v1/ops-alert',
      body := jsonb_build_object('text',
        '⚠️ Listing auto-hidden (3 reports): ' || coalesce(v_title, '?') ||
        ' · reason: ' || new.reason),
      headers := private.notify_headers()
    );
  end if;

  if v_user_reports in (5, 10, 25) then
    perform net.http_post(
      url := 'https://lpajdhhgfzsdlehqndni.supabase.co/functions/v1/ops-alert',
      body := jsonb_build_object('text',
        '🚨 A user now has ' || v_user_reports || ' reports — possible bad actor.' ||
        ' Latest reason: ' || new.reason || E'\n(user_id ' || new.reported_user_id || ')'),
      headers := private.notify_headers()
    );
  end if;
  return new;
end $$;
revoke execute on function public.alert_report() from anon, authenticated, public;
drop trigger if exists alert_report on public.reports;
create trigger alert_report after insert on public.reports
  for each row execute function public.alert_report();
