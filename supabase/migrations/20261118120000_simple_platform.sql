-- Slotdove 2: simpler internal scheduling, EUR plans, support mode, chat with
-- moderation, beta rollouts, announcements and an activity trail for platform admins.
-- Additive and idempotent where practical.

-- 1. Display prices in EUR (5 / 15 / 25) and German defaults.
update public.plans set name='Starter',monthly_price_cents=500,currency='EUR',
  features='{"booking":true,"analytics":true,"staff":1,"chat":true}' where id='free';
update public.plans set name='Pro',monthly_price_cents=1500,currency='EUR',
  features='{"booking":true,"analytics":true,"staff":5,"chat":true,"assistant":true}' where id='pro';
update public.plans set name='Business',monthly_price_cents=2500,currency='EUR',
  features='{"booking":true,"analytics":true,"staff":50,"chat":true,"assistant":true,"priority":true}' where id='business';
alter table public.plans alter column currency set default 'EUR';
alter table public.profiles alter column locale set default 'de';
alter table public.businesses alter column locale set default 'de';
alter table public.businesses alter column industry set default 'other';

-- 2. Walk-in customers do not need an email address.
alter table public.customers alter column email drop not null;
alter table public.bookings alter column staff_id drop not null;
grant update(staff_id) on public.bookings to authenticated;

-- 3. Platform support sessions: an admin can temporarily act as owner of a
-- business. Sessions expire, and starting one is written to the audit log.
create table if not exists private.support_sessions(
  admin_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key(admin_id,business_id)
);
alter table private.support_sessions enable row level security;
grant all on private.support_sessions to service_role;

create or replace function private.business_role(bid uuid) returns text language sql stable security definer set search_path='' as $$
 select coalesce(
  (select case when b.owner_id=auth.uid() then 'owner' else m.role end
     from public.businesses b left join public.business_members m on m.business_id=b.id and m.user_id=auth.uid()
    where auth.uid() is not null and private.verified_user() and b.id=bid and b.status='active'
      and (not b.is_demo or b.demo_expires_at is null or b.demo_expires_at>now())),
  (select 'owner' from private.support_sessions s join private.platform_admins pa on pa.user_id=s.admin_id
    where auth.uid() is not null and s.admin_id=auth.uid() and s.business_id=bid and s.expires_at>now())
 )
$$;

create or replace function public.admin_support_session(p_actor uuid,p_business uuid,p_start boolean) returns void language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from private.platform_admins where user_id=p_actor) then raise exception 'FORBIDDEN';end if;
 if p_start then
  insert into private.support_sessions(admin_id,business_id,expires_at) values(p_actor,p_business,now()+interval '2 hours')
  on conflict(admin_id,business_id) do update set expires_at=excluded.expires_at;
  insert into public.admin_audit_logs(actor_id,business_id,action,details) values(p_actor,p_business,'support.started','{}');
 else
  delete from private.support_sessions where admin_id=p_actor and business_id=p_business;
  insert into public.admin_audit_logs(actor_id,business_id,action,details) values(p_actor,p_business,'support.ended','{}');
 end if;
end $$;
create or replace function public.my_support_business() returns uuid language sql stable security definer set search_path='' as $$
 select s.business_id from private.support_sessions s join private.platform_admins pa on pa.user_id=s.admin_id
  where s.admin_id=auth.uid() and s.expires_at>now() order by s.created_at desc limit 1
$$;
revoke all on function public.admin_support_session(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.admin_support_session(uuid,uuid,boolean) to service_role;
revoke all on function public.my_support_business() from public,anon;
grant execute on function public.my_support_business() to authenticated;

-- 4. Internal appointments: team members can book any time (walk-ins,
-- phone calls, past entries). Overlaps and blocked times are still enforced.
-- Public bookings keep notice, booking window, slot grid and working hours.
create or replace function private.validate_booking() returns trigger language plpgsql security definer set search_path='' as $$
declare b public.businesses;s public.services;c public.customers;local_start timestamp;local_end timestamp;rescheduling boolean;internal boolean;
begin
 if auth.uid() is null and current_setting('request.jwt.claim.role',true) is distinct from 'service_role' and current_setting('role',true)<>'service_role' and session_user<>'postgres' then raise exception 'FORBIDDEN';end if;
 internal = auth.uid() is not null and private.business_role(new.business_id) is not null;
 if tg_op='UPDATE' then
  if new.business_id<>old.business_id or new.service_id<>old.service_id or new.customer_id<>old.customer_id then raise exception 'IMMUTABLE_BOOKING';end if;
  if new.status<>old.status and not ((old.status='pending' and new.status in('confirmed','cancelled')) or (old.status='confirmed' and new.status in('cancelled','completed','no_show'))) then raise exception 'INVALID_TRANSITION';end if;
  if old.status in('cancelled','completed','no_show') and new.starts_at<>old.starts_at then raise exception 'INVALID_TRANSITION';end if;
 end if;
 if tg_op='UPDATE' and new.staff_id is distinct from old.staff_id and (private.business_role(new.business_id) not in ('owner','admin') or old.status not in ('pending','confirmed')) then raise exception 'FORBIDDEN';end if;
 new.updated_at=now();rescheduling=tg_op='INSERT' or new.starts_at is distinct from old.starts_at or new.staff_id is distinct from old.staff_id;
 if not rescheduling then
   if new.status in('completed','no_show') and new.starts_at>now() then raise exception 'APPOINTMENT_NOT_STARTED';end if;
   return new;
 end if;
 perform 1 from public.staff_profiles where id=new.staff_id for update;
 select * into b from public.businesses where id=new.business_id;
 select * into s from public.services where id=new.service_id and business_id=new.business_id and active;
 select * into c from public.customers where id=new.customer_id and business_id=new.business_id;
 if b.id is null or b.status<>'active' or (b.is_demo and b.demo_expires_at<=now()) or s.id is null or c.id is null then raise exception 'BOOKING_UNAVAILABLE';end if;
 if new.staff_id is null and private.business_role(new.business_id) is distinct from 'owner' and private.business_role(new.business_id) is distinct from 'admin' then raise exception 'FORBIDDEN';end if;
 if new.staff_id is not null and not exists(select 1 from public.staff_profiles sp where sp.id=new.staff_id and sp.business_id=new.business_id and sp.active) then raise exception 'INVALID_STAFF';end if;
 if not internal and not exists(select 1 from public.service_staff ss where ss.service_id=new.service_id and ss.staff_id=new.staff_id and ss.business_id=new.business_id) then raise exception 'INVALID_STAFF';end if;
 if extract(second from new.starts_at)<>0 then raise exception 'INVALID_SLOT';end if;
 if internal then
   if new.starts_at<now()-interval '400 days' or new.starts_at>now()+interval '730 days' then raise exception 'OUTSIDE_BOOKING_WINDOW';end if;
 else
   if new.starts_at<now()+make_interval(mins=>b.min_notice_minutes) or new.starts_at>now()+make_interval(days=>b.max_advance_days) then raise exception 'OUTSIDE_BOOKING_WINDOW';end if;
   if (extract(hour from new.starts_at at time zone b.timezone)*60+extract(minute from new.starts_at at time zone b.timezone))::int % b.slot_interval<>0 then raise exception 'INVALID_SLOT';end if;
 end if;
 new.ends_at=new.starts_at+make_interval(mins=>s.duration_minutes);
 new.occupied_start=new.starts_at-make_interval(mins=>s.buffer_before);
 new.occupied_end=new.ends_at+make_interval(mins=>s.buffer_after);
 local_start=new.occupied_start at time zone b.timezone;local_end=new.occupied_end at time zone b.timezone;
 if not internal and new.staff_id is not null and (local_start::date<>local_end::date or not exists(select 1 from public.availability_rules a where a.staff_id=new.staff_id and a.weekday=extract(dow from local_start) and a.starts<=local_start::time and a.ends>=local_end::time)) then raise exception 'OUTSIDE_WORKING_HOURS';end if;
 if new.staff_id is not null and exists(select 1 from public.blocked_times bt where bt.staff_id=new.staff_id and tstzrange(bt.starts_at,bt.ends_at,'[)')&&tstzrange(new.occupied_start,new.occupied_end,'[)')) then raise exception 'SLOT_UNAVAILABLE';end if;
 if tg_op='INSERT' then new.service_name=s.name;new.customer_name=c.name;new.price_cents=s.price_cents;new.status=case when b.auto_confirm or internal then 'confirmed' else 'pending' end;end if;
 return new;
end $$;

-- 5. Replace one person's full week plan in a single transaction.
create or replace function public.replace_week_plan(p_business uuid,p_staff uuid,p_rules jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare r jsonb;
begin
 if private.business_role(p_business) not in ('owner','admin') then raise exception 'FORBIDDEN';end if;
 if jsonb_array_length(p_rules)>70 then raise exception 'INVALID_INPUT';end if;
 delete from public.availability_rules where business_id=p_business and staff_id=p_staff;
 for r in select * from jsonb_array_elements(p_rules) loop
  insert into public.availability_rules(business_id,staff_id,weekday,starts,ends)
  values(p_business,p_staff,(r->>'weekday')::int,(r->>'starts')::time,(r->>'ends')::time)
  on conflict(staff_id,weekday,starts) do nothing;
 end loop;
end $$;
revoke all on function public.replace_week_plan(uuid,uuid,jsonb) from public,anon;
grant execute on function public.replace_week_plan(uuid,uuid,jsonb) to authenticated;

-- 6. Beta features and per-account overrides.
create table if not exists public.feature_flags(
  key text primary key check(key ~ '^[a-z][a-z0-9_]{1,40}$'),
  name text not null check(length(name) between 2 and 80),
  description text not null default '' check(length(description)<=500),
  stage text not null default 'beta' check(stage in('off','beta','all')),
  created_at timestamptz not null default now()
);
create table if not exists public.business_features(
  business_id uuid not null references public.businesses on delete cascade,
  flag_key text not null references public.feature_flags(key) on delete cascade,
  enabled boolean not null,
  updated_at timestamptz not null default now(),
  primary key(business_id,flag_key)
);
alter table public.feature_flags enable row level security;
alter table public.business_features enable row level security;
drop policy if exists flags_read on public.feature_flags;
create policy flags_read on public.feature_flags for select to authenticated using(true);
drop policy if exists business_features_read on public.business_features;
create policy business_features_read on public.business_features for select to authenticated using(private.business_role(business_id) is not null);
grant select on public.feature_flags,public.business_features to authenticated;
grant all on public.feature_flags,public.business_features to service_role;
insert into public.feature_flags(key,name,description,stage) values
 ('assistant','Slotdove KI','Lokaler Assistent: Schnelleingabe, Fragen, Auswertungen.','all'),
 ('chat','Chat','Team-, Support- und Kundenchat.','all'),
 ('smart_slots','Smarte Zeitvorschläge','Schlägt Zeiten vor, die Lücken im Kalender füllen.','all'),
 ('insights_pro','Erweiterte Auswertungen (Beta)','Prognose, Auslastung und No-Show-Risiko.','beta'),
 ('new_calendar','Neue Tagesansicht (Beta)','Zeitachsen-Ansicht pro Mitarbeiter.','beta')
on conflict(key) do nothing;

-- 7. Announcements from the platform (global or for one account).
create table if not exists public.announcements(
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses on delete cascade,
  title text not null check(length(title) between 2 and 120),
  body text not null default '' check(length(body)<=2000),
  level text not null default 'info' check(level in('info','success','warning')),
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);
create index if not exists announcements_business_idx on public.announcements(business_id,created_at);
alter table public.announcements enable row level security;
drop policy if exists announcements_read on public.announcements;
create policy announcements_read on public.announcements for select to authenticated
  using((business_id is null or private.business_role(business_id) is not null) and (expires_at is null or expires_at>now()));
grant select on public.announcements to authenticated;
grant all on public.announcements to service_role;

-- 8. Activity trail written by the trusted server; read only by platform admins.
create table if not exists public.activity_log(
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete set null,
  business_id uuid references public.businesses on delete set null,
  action text not null check(length(action)<=80),
  details jsonb not null default '{}',
  ip_hash text,
  user_agent text check(length(user_agent)<=300),
  created_at timestamptz not null default now()
);
create index if not exists activity_user_idx on public.activity_log(user_id,created_at desc);
create index if not exists activity_business_idx on public.activity_log(business_id,created_at desc);
create index if not exists activity_created_idx on public.activity_log(created_at desc);
alter table public.activity_log enable row level security;
grant all on public.activity_log to service_role;
grant usage,select on all sequences in schema public to service_role;

-- 9. Chat: team, platform support and customer conversations. All access goes
-- through authorized server routes; automatic moderation flags messages and
-- users can report them to the platform.
create table if not exists public.conversations(
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses on delete cascade,
  kind text not null check(kind in('team','support','customer')),
  booking_id uuid references public.bookings on delete cascade,
  customer_name text not null default '',
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index if not exists conversations_single_idx on public.conversations(business_id,kind) where kind in('team','support');
create unique index if not exists conversations_booking_idx on public.conversations(booking_id) where booking_id is not null;
create table if not exists public.messages(
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations on delete cascade,
  business_id uuid not null references public.businesses on delete cascade,
  sender_kind text not null check(sender_kind in('member','admin','customer','system')),
  sender_id uuid references auth.users on delete set null,
  sender_name text not null default '' check(length(sender_name)<=100),
  body text not null check(length(body) between 1 and 4000),
  flagged boolean not null default false,
  flag_reason text not null default '',
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists messages_conversation_idx on public.messages(conversation_id,created_at);
create index if not exists messages_flagged_idx on public.messages(created_at desc) where flagged;
create table if not exists public.message_reports(
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages on delete cascade,
  business_id uuid not null references public.businesses on delete cascade,
  reporter_kind text not null check(reporter_kind in('member','customer','system')),
  reporter_id uuid references auth.users on delete set null,
  reason text not null default '' check(length(reason)<=500),
  status text not null default 'open' check(status in('open','resolved','dismissed')),
  resolved_by uuid references auth.users on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists reports_status_idx on public.message_reports(status,created_at desc);
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.message_reports enable row level security;
grant all on public.conversations,public.messages,public.message_reports to service_role;

-- 10. Private admin notes per account.
create table if not exists public.admin_business_notes(
  business_id uuid primary key references public.businesses on delete cascade,
  notes text not null default '' check(length(notes)<=5000),
  updated_by uuid references auth.users on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.admin_business_notes enable row level security;
grant all on public.admin_business_notes to service_role;

-- 11. Let the trusted server edit every business field during admin edits.
create or replace function public.admin_edit_business(p_actor uuid,p_business uuid,p_fields jsonb) returns void language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from private.platform_admins where user_id=p_actor) then raise exception 'FORBIDDEN';end if;
 update public.businesses set
  name=coalesce(p_fields->>'name',name),
  slug=coalesce(p_fields->>'slug',slug),
  email=coalesce(p_fields->>'email',email),
  phone=coalesce(p_fields->>'phone',phone),
  industry=coalesce(p_fields->>'industry',industry),
  locale=coalesce(p_fields->>'locale',locale),
  published=coalesce((p_fields->>'published')::boolean,published),
  min_notice_minutes=coalesce((p_fields->>'min_notice_minutes')::int,min_notice_minutes),
  max_advance_days=coalesce((p_fields->>'max_advance_days')::int,max_advance_days),
  slot_interval=coalesce((p_fields->>'slot_interval')::int,slot_interval)
 where id=p_business;
 insert into public.admin_audit_logs(actor_id,business_id,action,details) values(p_actor,p_business,'business.edited',p_fields);
end $$;
revoke all on function public.admin_edit_business(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.admin_edit_business(uuid,uuid,jsonb) to service_role;
