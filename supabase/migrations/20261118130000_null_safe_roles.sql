-- NULL-safe role checks: a user without any role must be rejected explicitly
-- (RLS already prevented changes; this makes the error immediate and clear).
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
 if tg_op='UPDATE' and new.staff_id is distinct from old.staff_id and (coalesce(private.business_role(new.business_id),'') not in ('owner','admin') or old.status not in ('pending','confirmed')) then raise exception 'FORBIDDEN';end if;
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

create or replace function public.replace_week_plan(p_business uuid,p_staff uuid,p_rules jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare r jsonb;
begin
 if coalesce(private.business_role(p_business),'') not in ('owner','admin') then raise exception 'FORBIDDEN';end if;
 if jsonb_array_length(p_rules)>70 then raise exception 'INVALID_INPUT';end if;
 delete from public.availability_rules where business_id=p_business and staff_id=p_staff;
 for r in select * from jsonb_array_elements(p_rules) loop
  insert into public.availability_rules(business_id,staff_id,weekday,starts,ends)
  values(p_business,p_staff,(r->>'weekday')::int,(r->>'starts')::time,(r->>'ends')::time)
  on conflict(staff_id,weekday,starts) do nothing;
 end loop;
end $$;

-- Same pattern as my_business_role: definer helper lives in the private schema.
create or replace function private.support_business() returns uuid language sql stable security definer set search_path='' as $$
 select s.business_id from private.support_sessions s join private.platform_admins pa on pa.user_id=s.admin_id
  where s.admin_id=auth.uid() and s.expires_at>now() order by s.created_at desc limit 1
$$;
revoke all on function private.support_business() from public,anon;
grant execute on function private.support_business() to authenticated,service_role;
create or replace function public.my_support_business() returns uuid language sql stable security invoker set search_path='' as $$ select private.support_business() $$;
