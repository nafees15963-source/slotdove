-- Trust & safety, GDPR workflows and admin tooling.

-- Service pictures: an uploaded image (same tenant-scoped bucket as logos) or an
-- automatically generated illustration key.
alter table public.services add column if not exists image_path text
  check (image_path is null or (length(image_path) < 200 and image_path like business_id::text || '/%'));
alter table public.services add column if not exists art text not null default '' check (length(art) <= 40 and art ~ '^[a-z0-9-]*$');

-- Tutorials: a user who closes them is not asked again on any device.
alter table public.profiles add column if not exists tutorials_off boolean not null default false;

-- Abuse and content reports (DSA notice-and-action, customer reports by businesses).
create sequence if not exists private.report_seq;
grant usage on sequence private.report_seq to service_role;
create table if not exists public.abuse_reports(
  id uuid primary key default gen_random_uuid(),
  case_number text not null unique default ('M-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('private.report_seq')::text, 5, '0')),
  kind text not null check (kind in ('customer', 'business', 'content', 'user', 'other')),
  category text not null check (category in ('no_show', 'abuse', 'harassment', 'fraud', 'spam', 'illegal', 'privacy', 'copyright', 'security', 'other')),
  business_id uuid references public.businesses on delete set null,
  customer_id uuid,
  target_user uuid references auth.users on delete set null,
  target_url text not null default '' check (length(target_url) <= 500),
  description text not null check (length(description) between 10 and 4000),
  reporter_kind text not null check (reporter_kind in ('member', 'public', 'admin')),
  reporter_id uuid references auth.users on delete set null,
  reporter_name text not null default '' check (length(reporter_name) <= 120),
  reporter_email text not null default '' check (length(reporter_email) <= 254),
  good_faith boolean not null default false,
  status text not null default 'open' check (status in ('open', 'in_review', 'actioned', 'rejected', 'closed')),
  decision text not null default '' check (length(decision) <= 4000),
  admin_notes text not null default '' check (length(admin_notes) <= 4000),
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists abuse_reports_status_idx on public.abuse_reports (status, created_at desc);
alter table public.abuse_reports enable row level security;
grant all on public.abuse_reports to service_role;

-- Data subject requests (Art. 15-22 GDPR) with the one-month deadline.
create sequence if not exists private.dsr_seq;
grant usage on sequence private.dsr_seq to service_role;
create table if not exists public.dsr_requests(
  id uuid primary key default gen_random_uuid(),
  case_number text not null unique default ('D-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('private.dsr_seq')::text, 5, '0')),
  type text not null check (type in ('access', 'erasure', 'rectification', 'restriction', 'portability', 'objection', 'withdrawal', 'other')),
  requester_name text not null default '' check (length(requester_name) <= 120),
  requester_email text not null check (length(requester_email) <= 254),
  subject_email text not null default '' check (length(subject_email) <= 254),
  channel text not null default 'email' check (length(channel) <= 40),
  identity_verified boolean not null default false,
  status text not null default 'new' check (status in ('new', 'verifying', 'in_progress', 'done', 'rejected')),
  received_at timestamptz not null default now(),
  due_at timestamptz not null default now() + interval '1 month',
  notes text not null default '' check (length(notes) <= 8000),
  result text not null default '' check (length(result) <= 8000),
  created_by uuid references auth.users on delete set null,
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table public.dsr_requests enable row level security;
grant all on public.dsr_requests to service_role;

-- Blocklist for abusive senders (e-mail, whole domains, hashed IPs).
create table if not exists public.blocklist(
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('email', 'domain', 'ip')),
  value text not null check (length(value) between 3 and 254),
  reason text not null default '' check (length(reason) <= 500),
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  unique (kind, value)
);
alter table public.blocklist enable row level security;
grant all on public.blocklist to service_role;

-- Proof of accepted terms, privacy notice and processing agreement (versioned).
create table if not exists public.legal_acceptances(
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade,
  business_id uuid references public.businesses on delete set null,
  document text not null check (document in ('terms', 'privacy', 'dpa')),
  version text not null check (length(version) <= 20),
  ip_hash text,
  accepted_at timestamptz not null default now()
);
create index if not exists legal_acceptances_user_idx on public.legal_acceptances (user_id, accepted_at desc);
alter table public.legal_acceptances enable row level security;
grant all on public.legal_acceptances to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Public platform switches (maintenance banner, signups, public bookings).
create table if not exists public.platform_settings(
  key text primary key check (key ~ '^[a-z_]{2,40}$'),
  value jsonb not null,
  updated_by uuid references auth.users on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.platform_settings enable row level security;
drop policy if exists platform_settings_read on public.platform_settings;
create policy platform_settings_read on public.platform_settings for select to anon, authenticated using (true);
grant select on public.platform_settings to anon, authenticated;
grant all on public.platform_settings to service_role;
insert into public.platform_settings(key, value) values
  ('maintenance', '{"enabled": false, "message": ""}'),
  ('signups', '{"enabled": true}'),
  ('public_booking', '{"enabled": true}')
on conflict (key) do nothing;

-- Admin: sign a user out everywhere.
create or replace function public.admin_revoke_sessions(p_actor uuid, p_user uuid) returns integer language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if not exists (select 1 from private.platform_admins where user_id = p_actor) then raise exception 'FORBIDDEN'; end if;
  delete from auth.sessions where user_id = p_user;
  get diagnostics n = row_count;
  insert into public.admin_audit_logs(actor_id, action, details) values (p_actor, 'user.sessions_revoked', jsonb_build_object('user_id', p_user, 'sessions', n));
  return n;
end $$;
revoke all on function public.admin_revoke_sessions(uuid, uuid) from public, anon, authenticated;
grant execute on function public.admin_revoke_sessions(uuid, uuid) to service_role;

-- Admin: erase a data subject by e-mail across all businesses (Art. 17 GDPR).
create or replace function public.admin_erase_email(p_actor uuid, p_email text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare c record; n_customers integer := 0; n_waitlist integer := 0; n_reports integer := 0;
begin
  if not exists (select 1 from private.platform_admins where user_id = p_actor) then raise exception 'FORBIDDEN'; end if;
  if p_email is null or position('@' in p_email) = 0 then raise exception 'INVALID_INPUT'; end if;
  for c in select id, business_id from public.customers where email = lower(p_email) loop
    update public.customers set name = 'Deleted customer', email = null, phone = '', notes = '' where id = c.id;
    update public.bookings set customer_name = 'Deleted customer', notes = '', internal_notes = '' where customer_id = c.id and business_id = c.business_id;
    delete from private.booking_management_tokens where booking_id in (select id from public.bookings where customer_id = c.id);
    update public.notification_jobs set status = 'suppressed' where booking_id in (select id from public.bookings where customer_id = c.id) and status in ('queued', 'failed', 'unavailable', 'processing');
    n_customers := n_customers + 1;
  end loop;
  delete from public.waitlist where email = lower(p_email); get diagnostics n_waitlist = row_count;
  update public.abuse_reports set reporter_email = '', reporter_name = '' where reporter_email = lower(p_email); get diagnostics n_reports = row_count;
  insert into public.admin_audit_logs(actor_id, action, details) values (p_actor, 'gdpr.erased', jsonb_build_object('customers', n_customers, 'waitlist', n_waitlist, 'reports', n_reports));
  return jsonb_build_object('customers', n_customers, 'waitlist', n_waitlist, 'reports', n_reports);
end $$;
revoke all on function public.admin_erase_email(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_erase_email(uuid, text) to service_role;

-- Retention: also clean resolved reports after 3 years and finished requests after 3 years (proof).
create or replace function private.apply_retention() returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.waitlist where status in ('new', 'declined') and updated_at < now() - interval '12 months';
  delete from public.activity_log where created_at < now() - interval '180 days';
  delete from private.rate_limits where window_start < now() - interval '1 day';
  delete from private.support_sessions where expires_at < now() - interval '1 day';
  delete from public.abuse_reports where status in ('actioned', 'rejected', 'closed') and updated_at < now() - interval '3 years';
  delete from public.dsr_requests where status in ('done', 'rejected') and updated_at < now() - interval '3 years';
  delete from public.blocklist where expires_at is not null and expires_at < now();
end $$;
revoke all on function private.apply_retention() from public, anon, authenticated;
