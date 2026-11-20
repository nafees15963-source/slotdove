-- Separate admin accounts, trash with 14-day restore, feature wishes, reply snippets,
-- warnings, authority requests, per-business free period, usage monitor, status page.

-- Platform admin accounts (managed only through these audited functions).
create or replace function public.admin_list_platform_admins(p_actor uuid) returns table(user_id uuid, created_at timestamptz) language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from private.platform_admins a where a.user_id = p_actor) then raise exception 'FORBIDDEN'; end if;
  return query select a.user_id, a.created_at from private.platform_admins a order by a.created_at;
end $$;
create or replace function public.admin_set_platform_admin(p_actor uuid, p_user uuid, p_add boolean) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from private.platform_admins where user_id = p_actor) then raise exception 'FORBIDDEN'; end if;
  if p_add then
    -- An admin account is only an admin account: no business ownership or team membership.
    if exists (select 1 from public.businesses where owner_id = p_user) or exists (select 1 from public.business_members where user_id = p_user) then raise exception 'ADMIN_MUST_BE_SEPARATE'; end if;
    insert into private.platform_admins(user_id) values (p_user) on conflict do nothing;
  else
    if (select count(*) from private.platform_admins) <= 1 then raise exception 'LAST_ADMIN'; end if;
    delete from private.platform_admins where user_id = p_user;
    delete from private.support_sessions where admin_id = p_user;
  end if;
  insert into public.admin_audit_logs(actor_id, action, details) values (p_actor, case when p_add then 'platform.admin_added' else 'platform.admin_removed' end, jsonb_build_object('user_id', p_user));
end $$;
revoke all on function public.admin_list_platform_admins(uuid) from public, anon, authenticated;
revoke all on function public.admin_set_platform_admin(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.admin_list_platform_admins(uuid) to service_role;
grant execute on function public.admin_set_platform_admin(uuid, uuid, boolean) to service_role;

-- Trash: deleted accounts can be restored for 14 days, then they are purged by the app.
create table if not exists public.account_deletions(
  user_id uuid primary key references auth.users on delete cascade,
  email text not null default '',
  requested_at timestamptz not null default now(),
  purge_after timestamptz not null default now() + interval '14 days',
  businesses jsonb not null default '[]',
  requested_by text not null default 'self' check (requested_by in ('self', 'admin'))
);
alter table public.account_deletions enable row level security;
grant all on public.account_deletions to service_role;

-- Per-business free period and early-adopter flag.
alter table public.businesses add column if not exists early_adopter boolean not null default false;
alter table public.businesses add column if not exists free_until date;

-- Feature wishes with votes (measures real interest during the test phase).
create table if not exists public.feature_requests(
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 3 and 120),
  description text not null default '' check (length(description) <= 2000),
  status text not null default 'new' check (status in ('new', 'planned', 'in_progress', 'done', 'declined')),
  admin_note text not null default '' check (length(admin_note) <= 1000),
  created_by uuid references auth.users on delete set null,
  business_id uuid references public.businesses on delete set null,
  votes integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.feature_votes(
  request_id uuid references public.feature_requests on delete cascade,
  user_id uuid references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (request_id, user_id)
);
alter table public.feature_requests enable row level security;
alter table public.feature_votes enable row level security;
grant all on public.feature_requests, public.feature_votes to service_role;

-- Reply snippets for the admin.
create table if not exists public.admin_snippets(
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 2 and 120),
  body text not null check (length(body) between 2 and 5000),
  category text not null default 'allgemein' check (length(category) <= 40),
  updated_at timestamptz not null default now()
);
alter table public.admin_snippets enable row level security;
grant all on public.admin_snippets to service_role;
insert into public.admin_snippets(title, category, body) values
 ('Passwort vergessen', 'konto', E'Hallo {name},\n\nüber „Passwort vergessen“ auf der Anmeldeseite bekommst du einen Link per E-Mail. Falls nichts ankommt, prüfe bitte den Spam-Ordner. Melde dich gern, wenn es weiter nicht klappt.\n\nViele Grüße\nSlotdove'),
 ('Keine Haftung für Termine', 'recht', E'Hallo {name},\n\nes tut uns leid, dass es Probleme gab. Slotdove ist ein kostenloses, privates Testprojekt und wird ohne Gewähr bereitgestellt (§ 6 und § 14 der Nutzungsbedingungen). Für Termine gegenüber deinen Kunden bist du selbst verantwortlich. Wir schauen uns den Fehler trotzdem gern an – schick uns bitte die Buchungsnummer.\n\nViele Grüße\nSlotdove'),
 ('Rabatt / Kosten', 'geld', E'Hallo {name},\n\nSlotdove ist in der Testphase komplett kostenlos – es gibt nichts zu bezahlen und daher auch keine Rabatte. Falls es später weitergeht, informieren wir dich mindestens vier Wochen vorher.\n\nViele Grüße\nSlotdove'),
 ('Datenauskunft Endkunde', 'datenschutz', E'Guten Tag,\n\nfür Ihre Termindaten ist der Betrieb verantwortlich, bei dem Sie gebucht haben. Wir haben Ihre Anfrage an den Betrieb weitergeleitet und unterstützen ihn bei der Beantwortung innerhalb eines Monats.\n\nMit freundlichen Grüßen\nSlotdove'),
 ('Funktionswunsch', 'allgemein', E'Hallo {name},\n\ndanke für die Idee! Trag sie gern im Dashboard unter „Wünsche“ ein – dort können andere abstimmen, und wir sehen, was am meisten gebraucht wird.\n\nViele Grüße\nSlotdove')
on conflict do nothing;

-- Graduated warnings (DSA statement of reasons).
create table if not exists public.business_warnings(
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses on delete cascade,
  level integer not null check (level between 1 and 3),
  reason text not null check (length(reason) between 10 and 2000),
  created_by uuid references auth.users on delete set null,
  notified boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.business_warnings enable row level security;
grant all on public.business_warnings to service_role;

-- Requests from authorities (police, courts) – Art. 10 DSA documentation.
create sequence if not exists private.authority_seq;
grant usage on sequence private.authority_seq to service_role;
create table if not exists public.authority_requests(
  id uuid primary key default gen_random_uuid(),
  case_number text not null unique default ('B-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('private.authority_seq')::text, 5, '0')),
  authority text not null check (length(authority) between 2 and 200),
  reference text not null default '' check (length(reference) <= 120),
  legal_basis text not null default '' check (length(legal_basis) <= 300),
  scope text not null default '' check (length(scope) <= 4000),
  disclosed text not null default '' check (length(disclosed) <= 4000),
  status text not null default 'new' check (status in ('new', 'in_review', 'answered', 'rejected')),
  received_at timestamptz not null default now(),
  due_at timestamptz,
  notes text not null default '' check (length(notes) <= 4000),
  created_by uuid references auth.users on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.authority_requests enable row level security;
grant all on public.authority_requests to service_role;

-- Public status message.
insert into public.platform_settings(key, value) values ('status', '{"level": "ok", "message": ""}') on conflict (key) do nothing;

-- Usage against the free plans.
create or replace function public.admin_usage(p_actor uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare r jsonb;
begin
  if not exists (select 1 from private.platform_admins where user_id = p_actor) then raise exception 'FORBIDDEN'; end if;
  select jsonb_build_object(
    'db_bytes', pg_database_size(current_database()),
    'storage_bytes', coalesce((select sum((metadata->>'size')::bigint) from storage.objects), 0),
    'storage_files', (select count(*) from storage.objects),
    'emails_today', (select count(*) from public.notification_jobs where status = 'accepted' and created_at >= date_trunc('day', now())),
    'emails_month', (select count(*) from public.notification_jobs where status = 'accepted' and created_at >= date_trunc('month', now())),
    'emails_failed_7d', (select count(*) from public.notification_jobs where status = 'failed' and created_at >= now() - interval '7 days'),
    'users', (select count(*) from auth.users),
    'businesses', (select count(*) from public.businesses),
    'bookings', (select count(*) from public.bookings)
  ) into r;
  return r;
end $$;
revoke all on function public.admin_usage(uuid) from public, anon, authenticated;
grant execute on function public.admin_usage(uuid) to service_role;

-- Wake the app when accounts in the trash are due for purging (the app also removes their files).
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
  ) and not exists (select 1 from public.account_deletions where purge_after < now()) then return; end if;
  perform net.http_post(
    url := url || '/api/cron/notifications',
    headers := jsonb_build_object('Authorization', 'Bearer ' || secret, 'Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
end $$;
revoke all on function private.kick_notifications() from public, anon, authenticated;
