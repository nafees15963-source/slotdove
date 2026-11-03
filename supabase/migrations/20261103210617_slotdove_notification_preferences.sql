alter table public.businesses add column notifications_enabled boolean not null default true;
alter table public.businesses add column reminder_hours int[] not null default array[24] check(reminder_hours <@ array[2,24] and cardinality(reminder_hours)<=2);
grant update(notifications_enabled,reminder_hours) on public.businesses to authenticated;

create or replace function private.booking_events() returns trigger language plpgsql security definer set search_path='' as $$ declare k text;dedupe text;reminder_hour int;begin
 if auth.uid() is null and current_setting('request.jwt.claim.role',true) is distinct from 'service_role' and current_setting('role',true)<>'service_role' and session_user<>'postgres' then raise exception 'FORBIDDEN';end if;
 if tg_op='INSERT' or new.status<>old.status then insert into public.booking_status_history(business_id,booking_id,old_status,new_status,actor_id) values(new.business_id,new.id,case when tg_op='INSERT' then null else old.status end,new.status,auth.uid());end if;
 if tg_op='INSERT' then k='confirmation';elsif new.status='cancelled' and old.status<>'cancelled' then k='cancellation';elsif new.starts_at<>old.starts_at then k='reschedule';elsif new.status='confirmed' and old.status='pending' then k='confirmation';end if;
 if k is not null then
  update public.notification_jobs set status='suppressed' where booking_id=new.id and kind in('confirmation','reschedule') and status in('queued','failed','unavailable');
  dedupe=new.id::text||':'||k||':'||new.updated_at::text;
  insert into public.notification_jobs(business_id,booking_id,kind,dedupe_key,status) values(new.business_id,new.id,k,dedupe,case when (select is_demo or not notifications_enabled from public.businesses where id=new.business_id) or new.is_sample then 'suppressed' else 'queued' end) on conflict do nothing;
  update public.notification_jobs set status='suppressed' where booking_id=new.id and kind='reminder' and status in('queued','failed','unavailable');
  for reminder_hour in select unnest((select reminder_hours from public.businesses where id=new.business_id)) loop
  if new.status='confirmed' and new.starts_at>now()+make_interval(hours=>reminder_hour) then
  insert into public.notification_jobs(business_id,booking_id,kind,scheduled_at,dedupe_key,status) values(new.business_id,new.id,'reminder',new.starts_at-make_interval(hours=>reminder_hour),new.id::text||':reminder:'||reminder_hour::text||':'||new.starts_at::text,case when (select is_demo or not notifications_enabled from public.businesses where id=new.business_id) or new.is_sample then 'suppressed' else 'queued' end) on conflict do nothing;
  end if;end loop;
 end if;return new;
end $$;
