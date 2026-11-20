-- Platform admins can edit every business setting directly (audited).
create or replace function public.admin_edit_business(p_actor uuid,p_business uuid,p_fields jsonb) returns void language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from private.platform_admins where user_id=p_actor) then raise exception 'FORBIDDEN';end if;
 update public.businesses set
  name=coalesce(p_fields->>'name',name),
  slug=coalesce(p_fields->>'slug',slug),
  email=coalesce(p_fields->>'email',email),
  phone=coalesce(p_fields->>'phone',phone),
  address=coalesce(p_fields->>'address',address),
  description=coalesce(p_fields->>'description',description),
  industry=coalesce(p_fields->>'industry',industry),
  locale=coalesce(p_fields->>'locale',locale),
  timezone=coalesce(p_fields->>'timezone',timezone),
  currency=coalesce(p_fields->>'currency',currency),
  brand_color=coalesce(p_fields->>'brand_color',brand_color),
  published=coalesce((p_fields->>'published')::boolean,published),
  auto_confirm=coalesce((p_fields->>'auto_confirm')::boolean,auto_confirm),
  notifications_enabled=coalesce((p_fields->>'notifications_enabled')::boolean,notifications_enabled),
  min_notice_minutes=coalesce((p_fields->>'min_notice_minutes')::int,min_notice_minutes),
  max_advance_days=coalesce((p_fields->>'max_advance_days')::int,max_advance_days),
  slot_interval=coalesce((p_fields->>'slot_interval')::int,slot_interval),
  cancellation_hours=coalesce((p_fields->>'cancellation_hours')::int,cancellation_hours)
 where id=p_business;
 insert into public.admin_audit_logs(actor_id,business_id,action,details) values(p_actor,p_business,'business.edited',p_fields);
end $$;
revoke all on function public.admin_edit_business(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.admin_edit_business(uuid,uuid,jsonb) to service_role;
