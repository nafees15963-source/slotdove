-- Platform operations are callable only by the server service role after verified
-- administrator authentication. The actor is checked again inside transactions.
create function public.seed_demo_server(p_business uuid,p_actor uuid) returns void language plpgsql security invoker set search_path='' as $$
declare sid uuid;stid uuid;cid uuid;tz text;start_at timestamptz;i int;
begin
 if not exists(select 1 from private.platform_admins where user_id=p_actor) then raise exception 'FORBIDDEN';end if;
 select timezone into tz from public.businesses where id=p_business and is_demo and status='active';if tz is null then raise exception 'NOT_A_DEMO';end if;
 select id into sid from public.services where business_id=p_business and name='Example consultation' and active limit 1;
 if sid is null then insert into public.services(business_id,name,description,duration_minutes,price_cents,buffer_after) values(p_business,'Example consultation','Fictional demo service. Replace with your own.',30,4500,15) returning id into sid;end if;
 select id into stid from public.staff_profiles where business_id=p_business and name='Example Alex' and active limit 1;
 if stid is null then insert into public.staff_profiles(business_id,name) values(p_business,'Example Alex') returning id into stid;end if;
 insert into public.service_staff values(p_business,sid,stid) on conflict do nothing;
 insert into public.availability_rules(business_id,staff_id,weekday,starts,ends) select p_business,stid,d,'09:00','17:00' from generate_series(1,5)d on conflict do nothing;
 for i in 1..3 loop
  insert into public.customers(business_id,name,email,is_sample) values(p_business,'Example Customer '||i,'sample-'||i||'@example.invalid',true) on conflict(business_id,email) do update set is_sample=true returning id into cid;
  start_at=(((now() at time zone tz)::date+i+2)+time '10:00') at time zone tz;
  if extract(dow from start_at at time zone tz) between 1 and 5 then
   begin insert into public.bookings(business_id,service_id,staff_id,customer_id,starts_at,is_sample) values(p_business,sid,stid,cid,start_at,true);exception when exclusion_violation then null;end;
  end if;
 end loop;
 insert into public.admin_audit_logs(actor_id,business_id,action) values(p_actor,p_business,'demo.seeded');
end $$;
create function public.admin_create_business(p_actor uuid,p_name text,p_slug text,p_email text,p_timezone text,p_locale text,p_demo boolean,p_plan text) returns uuid language plpgsql security invoker set search_path='' as $$ declare bid uuid;begin
 if not exists(select 1 from private.platform_admins where user_id=p_actor) then raise exception 'FORBIDDEN';end if;
 insert into public.businesses(owner_id,name,slug,email,timezone,locale,is_demo,demo_expires_at) values(p_actor,p_name,p_slug,p_email,p_timezone,p_locale,p_demo,case when p_demo then now()+interval '14 days' else null end) returning id into bid;
 update public.business_entitlements set plan_id=p_plan,assigned_by=p_actor where business_id=bid;
 if p_demo then perform public.seed_demo_server(bid,p_actor);end if;
 insert into public.admin_audit_logs(actor_id,business_id,action,details) values(p_actor,bid,'business.created',jsonb_build_object('is_demo',p_demo,'plan',p_plan));return bid;
end $$;
create function public.admin_demo_action(p_actor uuid,p_business uuid,p_action text) returns void language plpgsql security invoker set search_path='' as $$ begin
 if not exists(select 1 from private.platform_admins where user_id=p_actor) then raise exception 'FORBIDDEN';end if;
 perform 1 from public.businesses where id=p_business and is_demo for update;if not found then raise exception 'NOT_A_DEMO';end if;
 if p_action='extend' then update public.businesses set demo_expires_at=greatest(now(),coalesce(demo_expires_at,now()))+interval '14 days' where id=p_business;
 elsif p_action in('reset','convert') then
  delete from public.bookings where business_id=p_business and is_sample;
  delete from public.customers c where c.business_id=p_business and c.is_sample and not exists(select 1 from public.bookings where customer_id=c.id);
  update public.customers set name='Removed demo customer',email='removed-'||id::text||'@example.invalid',phone='',notes='',is_sample=false where business_id=p_business and is_sample;
  if p_action='convert' then update public.businesses set is_demo=false,demo_expires_at=null,published=false where id=p_business;
  else update public.businesses set demo_expires_at=greatest(now()+interval '14 days',demo_expires_at),status='active' where id=p_business;perform public.seed_demo_server(p_business,p_actor);end if;
 else raise exception 'INVALID_ACTION';end if;
 insert into public.admin_audit_logs(actor_id,business_id,action) values(p_actor,p_business,'demo.'||p_action);
end $$;
revoke all on function public.seed_demo_server(uuid,uuid),public.admin_create_business(uuid,text,text,text,text,text,boolean,text),public.admin_demo_action(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.seed_demo_server(uuid,uuid),public.admin_create_business(uuid,text,text,text,text,text,boolean,text),public.admin_demo_action(uuid,uuid,text) to service_role;
