-- Slotdove core. Apply to a fresh Supabase project after reviewing existing schema.
create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;
set search_path = public, extensions;

create table public.profiles(id uuid primary key references auth.users(id) on delete cascade, name text not null default '' check(length(name)<=100), locale text not null default 'en' check(locale in('en','de')), created_at timestamptz not null default now());
create table private.platform_admins(user_id uuid primary key references auth.users(id) on delete cascade, created_at timestamptz not null default now());
create table public.businesses(
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id),name text not null check(length(name) between 2 and 100),
 slug text unique not null check(slug ~ '^[a-z][a-z0-9-]{2,49}$' and slug not in('admin','api','login','signup','dashboard','slotdove','www','support')),
 description text not null default '' check(length(description)<=1000),industry text not null default 'consulting',timezone text not null default 'Europe/Berlin',currency text not null default 'EUR' check(currency in('EUR','USD','GBP','CHF','CAD','AUD','INR')),locale text not null default 'en' check(locale in('de','en')),
 email text not null,phone text not null default '',address text not null default '',brand_color text not null default '#7460db' check(brand_color~'^#[a-fA-F0-9]{6}$'),
 published boolean not null default false,status text not null default 'active' check(status in('active','suspended','archived')),is_demo boolean not null default false,demo_expires_at timestamptz,
 min_notice_minutes int not null default 120 check(min_notice_minutes between 0 and 10080), max_advance_days int not null default 60 check(max_advance_days between 1 and 365),slot_interval int not null default 15 check(slot_interval between 5 and 120),cancellation_hours int not null default 24 check(cancellation_hours between 0 and 720),auto_confirm boolean not null default true,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index businesses_owner_idx on public.businesses(owner_id);
create table public.business_members(business_id uuid references public.businesses on delete cascade,user_id uuid references auth.users on delete cascade,role text not null check(role in('admin','staff')),created_at timestamptz not null default now(),primary key(business_id,user_id));
create index members_user_idx on public.business_members(user_id,business_id);
create table public.staff_profiles(id uuid primary key default gen_random_uuid(),business_id uuid not null references public.businesses on delete cascade,user_id uuid references auth.users on delete set null,name text not null check(length(name) between 2 and 100),active boolean not null default true,created_at timestamptz not null default now(),unique(business_id,id),unique(business_id,user_id));
create index staff_business_idx on public.staff_profiles(business_id);
create table public.services(id uuid primary key default gen_random_uuid(),business_id uuid not null references public.businesses on delete cascade,name text not null check(length(name) between 2 and 100),description text not null default '' check(length(description)<=1000),duration_minutes int not null check(duration_minutes between 5 and 480),price_cents int not null default 0 check(price_cents between 0 and 10000000),buffer_before int not null default 0 check(buffer_before between 0 and 120),buffer_after int not null default 0 check(buffer_after between 0 and 120),color text not null default '#7460db' check(color~'^#[a-fA-F0-9]{6}$'),active boolean not null default true,sort_order int not null default 0,created_at timestamptz not null default now(),unique(business_id,id));
create index services_business_idx on public.services(business_id,active);
create table public.service_staff(business_id uuid not null references public.businesses on delete cascade,service_id uuid not null,staff_id uuid not null,primary key(service_id,staff_id),foreign key(business_id,service_id) references public.services(business_id,id) on delete cascade,foreign key(business_id,staff_id) references public.staff_profiles(business_id,id) on delete cascade);
create index service_staff_staff_idx on public.service_staff(staff_id);
create table public.availability_rules(id uuid primary key default gen_random_uuid(),business_id uuid not null references public.businesses on delete cascade,staff_id uuid not null,weekday int not null check(weekday between 0 and 6),starts time not null,ends time not null,check(ends>starts),foreign key(business_id,staff_id) references public.staff_profiles(business_id,id) on delete cascade,unique(staff_id,weekday,starts));
create index availability_business_idx on public.availability_rules(business_id,staff_id,weekday);
create table public.blocked_times(id uuid primary key default gen_random_uuid(),business_id uuid not null references public.businesses on delete cascade,staff_id uuid not null,starts_at timestamptz not null,ends_at timestamptz not null,reason text not null default '' check(length(reason)<=200),check(ends_at>starts_at),foreign key(business_id,staff_id) references public.staff_profiles(business_id,id) on delete cascade);
create index blocks_range_idx on public.blocked_times(staff_id,starts_at,ends_at);
create index blocks_business_idx on public.blocked_times(business_id);
create table public.customers(id uuid primary key default gen_random_uuid(),business_id uuid not null references public.businesses on delete cascade,name text not null check(length(name) between 2 and 100),email text not null check(length(email)<=254 and email=lower(email) and email like '%@%'),phone text not null default '' check(length(phone)<=30),notes text not null default '' check(length(notes)<=2000),is_sample boolean not null default false,created_at timestamptz not null default now(),unique(business_id,id),unique(business_id,email));
create table public.bookings(
 id uuid primary key default gen_random_uuid(),business_id uuid not null references public.businesses on delete cascade,service_id uuid not null,staff_id uuid not null,customer_id uuid not null,
 starts_at timestamptz not null,ends_at timestamptz not null,occupied_start timestamptz not null,occupied_end timestamptz not null,
 status text not null default 'confirmed' check(status in('pending','confirmed','cancelled','completed','no_show')),
 service_name text not null,customer_name text not null,price_cents int not null default 0,notes text not null default '' check(length(notes)<=1000),internal_notes text not null default '' check(length(internal_notes)<=2000),is_sample boolean not null default false,idempotency_key uuid not null default gen_random_uuid(),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(business_id,service_id) references public.services(business_id,id),foreign key(business_id,staff_id) references public.staff_profiles(business_id,id),foreign key(business_id,customer_id) references public.customers(business_id,id),unique(business_id,idempotency_key),unique(business_id,id),check(ends_at>starts_at),check(occupied_start<=starts_at and occupied_end>=ends_at),
 constraint bookings_no_overlap exclude using gist(staff_id with =,tstzrange(occupied_start,occupied_end,'[)') with &&) where (status in('pending','confirmed','completed','no_show'))
);
create index bookings_business_start_idx on public.bookings(business_id,starts_at);
create index bookings_customer_idx on public.bookings(customer_id,starts_at);
create index bookings_service_idx on public.bookings(service_id);
create table public.booking_status_history(id bigint generated always as identity primary key,business_id uuid not null references public.businesses on delete cascade,booking_id uuid not null references public.bookings on delete cascade,old_status text,new_status text not null,actor_id uuid,created_at timestamptz not null default now());
create index history_business_idx on public.booking_status_history(business_id,booking_id);
create table private.booking_management_tokens(booking_id uuid primary key references public.bookings on delete cascade,token_hash text unique not null,expires_at timestamptz not null);
create table public.business_invitations(id uuid primary key default gen_random_uuid(),business_id uuid not null references public.businesses on delete cascade,email text not null,role text not null check(role in('owner','admin','staff')),expires_at timestamptz not null default now()+interval '7 days',accepted_at timestamptz,revoked_at timestamptz,created_at timestamptz not null default now());
create index invitations_business_idx on public.business_invitations(business_id);
create table private.invitation_tokens(invitation_id uuid primary key references public.business_invitations on delete cascade,token_hash text unique not null);
create table public.plans(id text primary key,name text not null,monthly_price_cents int not null check(monthly_price_cents>=0),currency text not null default 'USD',features jsonb not null default '{}');
insert into public.plans values('free','Free',0,'USD','{"booking":true,"analytics":true}'),('pro','Pro',1500,'USD','{"booking":true,"analytics":true}'),('business','Business',3900,'USD','{"booking":true,"analytics":true}');
create table public.business_entitlements(business_id uuid primary key references public.businesses on delete cascade,plan_id text not null default 'free' references public.plans,assigned_by uuid references auth.users,updated_at timestamptz not null default now());
create table public.subscriptions(business_id uuid primary key references public.businesses on delete cascade,provider text,external_customer_id text unique,external_subscription_id text unique,status text not null default 'manual',period_end timestamptz);
create table private.billing_events(id text primary key,provider text not null,payload jsonb not null,processed_at timestamptz);
create table public.notification_jobs(id uuid primary key default gen_random_uuid(),business_id uuid not null references public.businesses on delete cascade,booking_id uuid not null references public.bookings on delete cascade,kind text not null check(kind in('confirmation','cancellation','reschedule','reminder')),status text not null default 'queued' check(status in('queued','processing','accepted','failed','unavailable','suppressed')),scheduled_at timestamptz not null default now(),attempts int not null default 0,locked_until timestamptz,last_error text,provider_id text,created_at timestamptz not null default now(),dedupe_key text unique not null);
create index notification_due_idx on public.notification_jobs(status,scheduled_at);
create index notification_business_idx on public.notification_jobs(business_id,booking_id);
create table public.admin_audit_logs(id bigint generated always as identity primary key,actor_id uuid not null,business_id uuid references public.businesses on delete set null,action text not null,details jsonb not null default '{}',created_at timestamptz not null default now());
create index audit_business_idx on public.admin_audit_logs(business_id,created_at);
create table private.rate_limits(key text primary key,hits int not null,window_start timestamptz not null);

-- Privileged helpers are isolated from PostgREST. Authorization is derived from
-- immutable auth.uid(), never editable JWT user_metadata or client-supplied roles.
create function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$ select auth.uid() is not null and exists(select 1 from private.platform_admins where user_id=auth.uid()) $$;
create function private.business_role(bid uuid) returns text language sql stable security definer set search_path='' as $$
 select case when b.owner_id=auth.uid() then 'owner' else m.role end from public.businesses b left join public.business_members m on m.business_id=b.id and m.user_id=auth.uid() where auth.uid() is not null and b.id=bid and b.status='active' and (not b.is_demo or b.demo_expires_at is null or b.demo_expires_at>now())
$$;
create function private.own_staff(sid uuid) returns boolean language sql stable security definer set search_path='' as $$ select auth.uid() is not null and exists(select 1 from public.staff_profiles where id=sid and user_id=auth.uid() and active) $$;
create function public.my_platform_role() returns boolean language sql stable security invoker set search_path='' as $$ select private.is_admin() $$;
create function public.my_business_role(bid uuid) returns text language sql stable security invoker set search_path='' as $$ select private.business_role(bid) $$;
revoke all on function private.is_admin(),private.business_role(uuid),private.own_staff(uuid),public.my_platform_role(),public.my_business_role(uuid) from public;
grant execute on function private.is_admin(),private.business_role(uuid),private.own_staff(uuid),public.my_platform_role(),public.my_business_role(uuid) to authenticated,service_role;

alter table public.profiles enable row level security;
create policy profile_read on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy profile_insert on public.profiles for insert to authenticated with check(id=(select auth.uid()));
create policy profile_update on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
alter table public.businesses enable row level security;
create policy business_read on public.businesses for select to authenticated using(owner_id=(select auth.uid()) or private.business_role(id) is not null or (select private.is_admin()));
create policy business_create on public.businesses for insert to authenticated with check(owner_id=(select auth.uid()) and status='active' and not is_demo and demo_expires_at is null);
create policy business_update on public.businesses for update to authenticated using(private.business_role(id) in('owner','admin') or (select private.is_admin())) with check(private.business_role(id) in('owner','admin') or (select private.is_admin()));
alter table public.business_members enable row level security;
create policy members_read on public.business_members for select to authenticated using(user_id=(select auth.uid()) or private.business_role(business_id) in('owner','admin'));
-- Membership writes happen only through verified invitation acceptance.
alter table public.bookings enable row level security;
create policy bookings_read on public.bookings for select to authenticated using(private.business_role(business_id) in('owner','admin') or (private.business_role(business_id)='staff' and private.own_staff(staff_id)));
create policy bookings_insert on public.bookings for insert to authenticated with check(private.business_role(business_id) in('owner','admin'));
create policy bookings_update on public.bookings for update to authenticated using(private.business_role(business_id) in('owner','admin') or (private.business_role(business_id)='staff' and private.own_staff(staff_id))) with check(private.business_role(business_id) in('owner','admin') or (private.business_role(business_id)='staff' and private.own_staff(staff_id)));
alter table public.booking_status_history enable row level security;
create policy history_read on public.booking_status_history for select to authenticated using(private.business_role(business_id) in('owner','admin'));
alter table public.business_invitations enable row level security;
create policy invitations_read on public.business_invitations for select to authenticated using(private.business_role(business_id) in('owner','admin'));
alter table public.plans enable row level security;
create policy plans_read on public.plans for select to anon,authenticated using(true);
alter table public.business_entitlements enable row level security;
create policy entitlements_read on public.business_entitlements for select to authenticated using(private.business_role(business_id) in('owner','admin') or (select private.is_admin()));
alter table public.subscriptions enable row level security;
create policy subscriptions_read on public.subscriptions for select to authenticated using(private.business_role(business_id) in('owner','admin'));
alter table public.notification_jobs enable row level security;
create policy notifications_read on public.notification_jobs for select to authenticated using(private.business_role(business_id) in('owner','admin'));
alter table public.admin_audit_logs enable row level security;
create policy audit_read on public.admin_audit_logs for select to authenticated using((select private.is_admin()));
-- Operational tables: staff can read availability and services, never the customer directory.
do $$ declare t text;begin
 foreach t in array array['staff_profiles','services','service_staff','availability_rules','blocked_times','customers'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy manager_read on public.%I for select to authenticated using (private.business_role(business_id) in (''owner'',''admin''))',t);
 execute format('create policy manager_insert on public.%I for insert to authenticated with check (private.business_role(business_id) in (''owner'',''admin''))',t);
 execute format('create policy manager_update on public.%I for update to authenticated using (private.business_role(business_id) in (''owner'',''admin'')) with check (private.business_role(business_id) in (''owner'',''admin''))',t);
 if t in('availability_rules','blocked_times','service_staff','customers') then execute format('create policy manager_delete on public.%I for delete to authenticated using (private.business_role(business_id) in (''owner'',''admin''))',t);end if;
 if t<>'customers' then execute format('create policy staff_read on public.%I for select to authenticated using (private.business_role(business_id) = ''staff'')',t);end if;
 end loop;
end $$;
do $$ declare t text;begin foreach t in array array['platform_admins','booking_management_tokens','invitation_tokens','billing_events','rate_limits'] loop execute format('alter table private.%I enable row level security',t);end loop;end $$;
revoke all on all tables in schema public from anon,authenticated;
grant select,insert,update on public.profiles to authenticated;
grant select on public.businesses to authenticated;
grant insert(owner_id,name,slug,description,industry,timezone,currency,locale,email,phone,address) on public.businesses to authenticated;
grant update(name,description,industry,timezone,currency,locale,email,phone,address,brand_color,published,min_notice_minutes,max_advance_days,slot_interval,cancellation_hours,auto_confirm) on public.businesses to authenticated;
grant select on public.business_members,public.bookings,public.booking_status_history,public.business_invitations,public.business_entitlements,public.subscriptions,public.notification_jobs,public.admin_audit_logs to authenticated;
grant select on public.plans to anon,authenticated;
grant select,insert,update on public.services,public.staff_profiles to authenticated;
grant select,insert,update,delete on public.customers,public.availability_rules,public.blocked_times,public.service_staff to authenticated;
grant insert(business_id,service_id,staff_id,customer_id,starts_at,notes,idempotency_key) on public.bookings to authenticated;
grant update(starts_at,status,internal_notes) on public.bookings to authenticated;
grant all on all tables in schema public to service_role;
grant all on all tables in schema private to service_role;
grant usage,select on all sequences in schema public to service_role;

create function private.validate_business() returns trigger language plpgsql set search_path='' as $$
begin
 if not exists(select 1 from pg_timezone_names where name=new.timezone) then raise exception 'INVALID_TIMEZONE';end if;
 if new.published and not exists(select 1 from public.services s join public.service_staff ss on ss.service_id=s.id join public.staff_profiles sp on sp.id=ss.staff_id join public.availability_rules a on a.staff_id=sp.id where s.business_id=new.id and s.active and sp.active) then raise exception 'COMPLETE_SETUP_FIRST';end if;
 new.updated_at=now();return new;
end $$;
create trigger validate_business before insert or update on public.businesses for each row execute function private.validate_business();
create function private.bootstrap_business() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is distinct from new.owner_id and not private.is_admin() and current_setting('request.jwt.claim.role',true) is distinct from 'service_role' and session_user<>'postgres' then raise exception 'FORBIDDEN';end if;
 insert into public.business_entitlements(business_id) values(new.id);
 insert into public.subscriptions(business_id) values(new.id);
 return new;
end $$;
create trigger bootstrap_business after insert on public.businesses for each row execute function private.bootstrap_business();

-- Same validation for dashboard, guest bookings, and rescheduling. Locks a staff
-- row before reading schedules, also shared by schedule mutation triggers.
create function private.validate_booking() returns trigger language plpgsql security definer set search_path='' as $$
declare b public.businesses;s public.services;c public.customers;local_start timestamp;local_end timestamp;rescheduling boolean;
begin
 if auth.uid() is null and current_setting('request.jwt.claim.role',true) is distinct from 'service_role' and current_setting('role',true)<>'service_role' and session_user<>'postgres' then raise exception 'FORBIDDEN';end if;
 if tg_op='UPDATE' then
  if new.business_id<>old.business_id or new.staff_id<>old.staff_id or new.service_id<>old.service_id or new.customer_id<>old.customer_id then raise exception 'IMMUTABLE_BOOKING';end if;
  if new.status<>old.status and not ((old.status='pending' and new.status in('confirmed','cancelled')) or (old.status='confirmed' and new.status in('cancelled','completed','no_show'))) then raise exception 'INVALID_TRANSITION';end if;
  if old.status in('cancelled','completed','no_show') and new.starts_at<>old.starts_at then raise exception 'INVALID_TRANSITION';end if;
 end if;
 new.updated_at=now();rescheduling=tg_op='INSERT' or new.starts_at is distinct from old.starts_at;
 if not rescheduling then
   if new.status in('completed','no_show') and new.starts_at>now() then raise exception 'APPOINTMENT_NOT_STARTED';end if;
   return new;
 end if;
 perform 1 from public.staff_profiles where id=new.staff_id for update;
 select * into b from public.businesses where id=new.business_id;
 select * into s from public.services where id=new.service_id and business_id=new.business_id and active;
 select * into c from public.customers where id=new.customer_id and business_id=new.business_id;
 if b.id is null or b.status<>'active' or (b.is_demo and b.demo_expires_at<=now()) or s.id is null or c.id is null then raise exception 'BOOKING_UNAVAILABLE';end if;
 if not exists(select 1 from public.service_staff ss join public.staff_profiles sp on sp.id=ss.staff_id where ss.service_id=new.service_id and ss.staff_id=new.staff_id and ss.business_id=new.business_id and sp.active) then raise exception 'INVALID_STAFF';end if;
 if new.starts_at<now()+make_interval(mins=>b.min_notice_minutes) or new.starts_at>now()+make_interval(days=>b.max_advance_days) then raise exception 'OUTSIDE_BOOKING_WINDOW';end if;
 if extract(second from new.starts_at)<>0 or (extract(hour from new.starts_at at time zone b.timezone)*60+extract(minute from new.starts_at at time zone b.timezone))::int % b.slot_interval<>0 then raise exception 'INVALID_SLOT';end if;
 new.ends_at=new.starts_at+make_interval(mins=>s.duration_minutes);
 new.occupied_start=new.starts_at-make_interval(mins=>s.buffer_before);
 new.occupied_end=new.ends_at+make_interval(mins=>s.buffer_after);
 local_start=new.occupied_start at time zone b.timezone;local_end=new.occupied_end at time zone b.timezone;
 if local_start::date<>local_end::date or not exists(select 1 from public.availability_rules a where a.staff_id=new.staff_id and a.weekday=extract(dow from local_start) and a.starts<=local_start::time and a.ends>=local_end::time) then raise exception 'OUTSIDE_WORKING_HOURS';end if;
 if exists(select 1 from public.blocked_times bt where bt.staff_id=new.staff_id and tstzrange(bt.starts_at,bt.ends_at,'[)')&&tstzrange(new.occupied_start,new.occupied_end,'[)')) then raise exception 'SLOT_UNAVAILABLE';end if;
 if tg_op='INSERT' then new.service_name=s.name;new.customer_name=c.name;new.price_cents=s.price_cents;new.status=case when b.auto_confirm then 'confirmed' else 'pending' end;end if;
 return new;
end $$;
create trigger validate_booking before insert or update on public.bookings for each row execute function private.validate_booking();
create function private.lock_schedule() returns trigger language plpgsql set search_path='' as $$ begin perform 1 from public.staff_profiles where id=coalesce(new.staff_id,old.staff_id) for update;
 if tg_table_name='blocked_times' and tg_op<>'DELETE' then
 if exists(select 1 from public.bookings where staff_id=new.staff_id and status in('pending','confirmed') and tstzrange(occupied_start,occupied_end,'[)')&&tstzrange(new.starts_at,new.ends_at,'[)')) then raise exception 'EXISTING_BOOKING_CONFLICT';end if;end if;
 return coalesce(new,old);end $$;
create trigger lock_blocks before insert or update or delete on public.blocked_times for each row execute function private.lock_schedule();
create trigger lock_availability before insert or update or delete on public.availability_rules for each row execute function private.lock_schedule();
create function private.booking_events() returns trigger language plpgsql security definer set search_path='' as $$ declare k text;dedupe text;begin
 if auth.uid() is null and current_setting('request.jwt.claim.role',true) is distinct from 'service_role' and current_setting('role',true)<>'service_role' and session_user<>'postgres' then raise exception 'FORBIDDEN';end if;
 if tg_op='INSERT' or new.status<>old.status then insert into public.booking_status_history(business_id,booking_id,old_status,new_status,actor_id) values(new.business_id,new.id,case when tg_op='INSERT' then null else old.status end,new.status,auth.uid());end if;
 if tg_op='INSERT' then k='confirmation';elsif new.status='cancelled' and old.status<>'cancelled' then k='cancellation';elsif new.starts_at<>old.starts_at then k='reschedule';elsif new.status='confirmed' and old.status='pending' then k='confirmation';end if;
 if k is not null then
  update public.notification_jobs set status='suppressed' where booking_id=new.id and kind in('confirmation','reschedule') and status in('queued','failed','unavailable');
  dedupe=new.id::text||':'||k||':'||new.updated_at::text;
  insert into public.notification_jobs(business_id,booking_id,kind,dedupe_key,status) values(new.business_id,new.id,k,dedupe,case when (select is_demo from public.businesses where id=new.business_id) or new.is_sample then 'suppressed' else 'queued' end) on conflict do nothing;
  update public.notification_jobs set status='suppressed' where booking_id=new.id and kind='reminder' and status in('queued','failed','unavailable');
  if new.status='confirmed' and new.starts_at>now()+interval '24 hours' then insert into public.notification_jobs(business_id,booking_id,kind,scheduled_at,dedupe_key,status) values(new.business_id,new.id,'reminder',new.starts_at-interval '24 hours',new.id::text||':reminder:'||new.starts_at::text,case when (select is_demo from public.businesses where id=new.business_id) or new.is_sample then 'suppressed' else 'queued' end) on conflict do nothing;end if;
 end if;return new;
end $$;
create trigger booking_events after insert or update on public.bookings for each row execute function private.booking_events();
revoke all on all functions in schema private from public;

-- Service-only atomic RPCs. No anonymous grants on sensitive tables or functions.
create function public.consume_rate_limit(p_key text,p_limit int default 15,p_window int default 900) returns boolean language plpgsql security invoker set search_path='' as $$ declare n int;begin
 insert into private.rate_limits(key,hits,window_start) values(p_key,1,now()) on conflict(key) do update set hits=case when private.rate_limits.window_start<now()-make_interval(secs=>p_window) then 1 else private.rate_limits.hits+1 end,window_start=case when private.rate_limits.window_start<now()-make_interval(secs=>p_window) then now() else private.rate_limits.window_start end returning hits into n;return n<=p_limit;
end $$;
create function public.reserve_booking(p_business uuid,p_service uuid,p_staff uuid,p_start timestamptz,p_name text,p_email text,p_phone text,p_notes text,p_idempotency uuid,p_token_hash text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare b public.businesses;c public.customers;r public.bookings;begin
 select * into b from public.businesses where id=p_business and published and status='active';if b.id is null then raise exception 'BOOKING_UNAVAILABLE';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_idempotency::text,0));
 select * into r from public.bookings where business_id=p_business and idempotency_key=p_idempotency;
 if r.id is not null then
  if r.service_id<>p_service or r.staff_id<>p_staff or r.starts_at<>p_start or not exists(select 1 from private.booking_management_tokens where booking_id=r.id and token_hash=p_token_hash and expires_at>now()) then raise exception 'IDEMPOTENCY_MISMATCH';end if;
  return jsonb_build_object('id',r.id,'status',r.status,'starts_at',r.starts_at,'ends_at',r.ends_at,'service_name',r.service_name);
 end if;
 insert into public.customers(business_id,name,email,phone) values(p_business,p_name,lower(p_email),p_phone) on conflict(business_id,email) do nothing;
 select * into c from public.customers where business_id=p_business and email=lower(p_email);
 insert into public.bookings(business_id,service_id,staff_id,customer_id,starts_at,notes,idempotency_key) values(p_business,p_service,p_staff,c.id,p_start,p_notes,p_idempotency) returning * into r;
 insert into private.booking_management_tokens(booking_id,token_hash,expires_at) values(r.id,p_token_hash,r.ends_at+interval '7 days');
 return jsonb_build_object('id',r.id,'status',r.status,'starts_at',r.starts_at,'ends_at',r.ends_at,'service_name',r.service_name);
end $$;
create function public.manage_booking(p_hash text,p_action text,p_start timestamptz default null) returns jsonb language plpgsql security invoker set search_path='' as $$ declare r public.bookings;b public.businesses;begin
 select bk.* into r from private.booking_management_tokens t join public.bookings bk on bk.id=t.booking_id where t.token_hash=p_hash and t.expires_at>now() for update of bk;
 if r.id is null then raise exception 'LINK_EXPIRED';end if;
 select * into b from public.businesses where id=r.business_id;
 if p_action<>'view' then
  if b.status<>'active' or r.status not in('pending','confirmed') or r.starts_at<now()+make_interval(hours=>b.cancellation_hours) then raise exception 'CHANGE_DEADLINE_PASSED';end if;
  if p_action='cancel' then update public.bookings set status='cancelled' where id=r.id returning * into r;
  elsif p_action='reschedule' and p_start is not null then update public.bookings set starts_at=p_start where id=r.id returning * into r;update private.booking_management_tokens set expires_at=r.ends_at+interval '7 days' where booking_id=r.id;
  else raise exception 'INVALID_ACTION';end if;
 end if;
 return jsonb_build_object('id',r.id,'business_id',b.id,'business_name',b.name,'slug',b.slug,'timezone',b.timezone,'address',b.address,'service_id',r.service_id,'staff_id',r.staff_id,'service_name',r.service_name,'starts_at',r.starts_at,'ends_at',r.ends_at,'status',r.status);
end $$;
create function public.claim_notifications(p_limit int default 20) returns setof public.notification_jobs language sql security invoker set search_path='' as $$
 update public.notification_jobs set status='processing',attempts=attempts+1,locked_until=now()+interval '5 minutes' where id in(select id from public.notification_jobs where ((status in('queued','failed','unavailable') and scheduled_at<=now()) or (status='processing' and locked_until<now())) and attempts<5 order by scheduled_at limit least(p_limit,50) for update skip locked) returning *
$$;
create function public.dashboard_stats(bid uuid,p_from timestamptz,p_to timestamptz) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('total',count(*),'confirmed',count(*) filter(where status='confirmed'),'cancelled',count(*) filter(where status='cancelled'),'completed',count(*) filter(where status='completed'),'no_show',count(*) filter(where status='no_show'),'customers',(select count(*) from public.customers where business_id=bid),'popular',coalesce((select jsonb_agg(x) from(select service_name as name,count(*) as count from public.bookings where business_id=bid and starts_at>=p_from and starts_at<p_to group by service_name order by count(*) desc limit 5)x),'[]'::jsonb)) from public.bookings where business_id=bid and starts_at>=p_from and starts_at<p_to
$$;
revoke all on function public.consume_rate_limit(text,int,int),public.reserve_booking(uuid,uuid,uuid,timestamptz,text,text,text,text,uuid,text),public.manage_booking(text,text,timestamptz),public.claim_notifications(int),public.dashboard_stats(uuid,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.consume_rate_limit(text,int,int),public.reserve_booking(uuid,uuid,uuid,timestamptz,text,text,text,text,uuid,text),public.manage_booking(text,text,timestamptz),public.claim_notifications(int) to service_role;
grant execute on function public.dashboard_stats(uuid,timestamptz,timestamptz) to authenticated;

-- Verified invitation lifecycle; tokens never appear in a public table.
create function public.accept_invitation(p_token_hash text) returns uuid language plpgsql security invoker set search_path='' as $$begin raise exception 'USE_VERIFIED_SERVER_ENDPOINT';end $$;
revoke all on function public.accept_invitation(text) from public,anon,authenticated;
create function public.accept_invitation_server(p_token_hash text,p_user uuid,p_email text) returns uuid language plpgsql security invoker set search_path='' as $$ declare i public.business_invitations;begin
 select bi.* into i from public.business_invitations bi join private.invitation_tokens t on t.invitation_id=bi.id where t.token_hash=p_token_hash and bi.accepted_at is null and bi.revoked_at is null and bi.expires_at>now() and lower(bi.email)=lower(p_email) for update of bi;
 if i.id is null then raise exception 'INVITATION_INVALID';end if;
 if i.role='owner' then update public.businesses set owner_id=p_user where id=i.business_id;
 else insert into public.business_members(business_id,user_id,role) values(i.business_id,p_user,i.role) on conflict(business_id,user_id) do update set role=excluded.role;
 insert into public.staff_profiles(business_id,user_id,name) values(i.business_id,p_user,split_part(p_email,'@',1)) on conflict(business_id,user_id) do nothing;end if;
 update public.business_invitations set accepted_at=now() where id=i.id;
 insert into public.admin_audit_logs(actor_id,business_id,action,details) values(p_user,i.business_id,'invitation.accepted',jsonb_build_object('role',i.role));return i.business_id;
end $$;
create function public.create_invitation_server(p_business uuid,p_email text,p_role text,p_hash text,p_actor uuid) returns uuid language plpgsql security invoker set search_path='' as $$ declare iid uuid;begin
 insert into public.business_invitations(business_id,email,role) values(p_business,lower(p_email),p_role) returning id into iid;
 insert into private.invitation_tokens(invitation_id,token_hash) values(iid,p_hash);
 insert into public.admin_audit_logs(actor_id,business_id,action,details) values(p_actor,p_business,'invitation.created',jsonb_build_object('role',p_role));return iid;
end $$;
create function public.admin_update_business(p_id uuid,p_status text,p_plan text,p_actor uuid) returns void language plpgsql security invoker set search_path='' as $$begin
 if not exists(select 1 from private.platform_admins where user_id=p_actor) then raise exception 'FORBIDDEN';end if;
 update public.businesses set status=p_status where id=p_id;
 update public.business_entitlements set plan_id=p_plan,assigned_by=p_actor,updated_at=now() where business_id=p_id;
 insert into public.admin_audit_logs(actor_id,business_id,action,details) values(p_actor,p_id,'business.access_changed',jsonb_build_object('status',p_status,'plan',p_plan));
end $$;
revoke all on function public.accept_invitation_server(text,uuid,text),public.create_invitation_server(uuid,text,text,text,uuid),public.admin_update_business(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.accept_invitation_server(text,uuid,text),public.create_invitation_server(uuid,text,text,text,uuid),public.admin_update_business(uuid,text,text,uuid) to service_role;
reset search_path;
