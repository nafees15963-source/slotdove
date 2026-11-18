-- Reliable email delivery without Vercel cron:
-- 1. The app registers its public URL in private.app_settings on first use.
-- 2. pg_cron calls /api/cron/notifications every 2 minutes, but only when jobs are due.
-- 3. The call is authorised with a random secret that never leaves the database
--    except in this request; the endpoint compares it via a service-only RPC.
-- Extensions are optional so the migration also runs on plain PostgreSQL (tests).
do $$ begin
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then create extension if not exists pg_net with schema extensions; end if;
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then create extension if not exists pg_cron; end if;
end $$;

create table if not exists private.app_settings(
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table private.app_settings enable row level security;
grant all on private.app_settings to service_role;
insert into private.app_settings(key, value)
values ('cron_secret', encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (key) do nothing;

create or replace function public.get_app_setting(p_key text) returns text language sql stable security definer set search_path='' as $$
  select value from private.app_settings where key = p_key
$$;
create or replace function public.set_app_url(p_url text) returns void language plpgsql security definer set search_path='' as $$
begin
  if p_url !~ '^https://[a-z0-9.-]+(:[0-9]+)?$' then raise exception 'INVALID_INPUT'; end if;
  insert into private.app_settings(key, value, updated_at) values ('app_url', p_url, now())
  on conflict (key) do update set value = excluded.value, updated_at = now()
  where private.app_settings.value is distinct from excluded.value;
end $$;
revoke all on function public.get_app_setting(text), public.set_app_url(text) from public, anon, authenticated;
grant execute on function public.get_app_setting(text), public.set_app_url(text) to service_role;

create or replace function private.kick_notifications() returns void language plpgsql security definer set search_path='' as $$
declare url text; secret text;
begin
  select value into url from private.app_settings where key = 'app_url';
  select value into secret from private.app_settings where key = 'cron_secret';
  if url is null or secret is null then return; end if;
  if not exists (
    select 1 from public.notification_jobs
    where ((status in ('queued','failed','unavailable') and scheduled_at <= now()) or (status = 'processing' and locked_until < now()))
      and attempts < 5
  ) then return; end if;
  perform net.http_post(
    url := url || '/api/cron/notifications',
    headers := jsonb_build_object('Authorization', 'Bearer ' || secret, 'Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
end $$;
revoke all on function private.kick_notifications() from public, anon, authenticated;

do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute $q$select cron.unschedule(jobid) from cron.job where jobname = 'slotdove-notifications'$q$;
    execute $q$select cron.schedule('slotdove-notifications', '*/2 * * * *', 'select private.kick_notifications()')$q$;
  end if;
end $$;

-- Delivery overview for the admin console.
create or replace function public.email_queue_stats() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; cron_active boolean := false; last_run timestamptz;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute $q$select exists (select 1 from cron.job where jobname = 'slotdove-notifications' and active)$q$ into cron_active;
    execute $q$select max(d.start_time) from cron.job_run_details d join cron.job j on j.jobid = d.jobid where j.jobname = 'slotdove-notifications'$q$ into last_run;
  end if;
  select jsonb_build_object(
    'by_status', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) n from public.notification_jobs group by status) s), '{}'::jsonb),
    'last_accepted', (select max(created_at) from public.notification_jobs where status = 'accepted'),
    'due', (select count(*) from public.notification_jobs where status in ('queued','failed','unavailable') and scheduled_at <= now() and attempts < 5),
    'recent_errors', coalesce((select jsonb_agg(e) from (select last_error e from public.notification_jobs where last_error is not null order by created_at desc limit 5) x), '[]'::jsonb),
    'app_url', (select value from private.app_settings where key = 'app_url'),
    'cron_active', cron_active,
    'last_cron_run', last_run
  ) into result;
  return result;
end $$;
revoke all on function public.email_queue_stats() from public, anon, authenticated;
grant execute on function public.email_queue_stats() to service_role;
