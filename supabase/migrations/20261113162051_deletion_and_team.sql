-- Explicit deletion is separate from the editable active flag. Existing booking
-- foreign keys intentionally prevent orphaning appointment history.
grant delete on public.services, public.staff_profiles to authenticated;
create policy manager_delete on public.services for delete to authenticated
  using (private.business_role(business_id) in ('owner','admin'));
create policy manager_delete on public.staff_profiles for delete to authenticated
  using (private.business_role(business_id) in ('owner','admin'));
grant delete on public.bookings to authenticated;
create policy manager_delete on public.bookings for delete to authenticated
  using (private.business_role(business_id) in ('owner','admin') and status in ('cancelled','completed','no_show'));

-- Deleting a staff profile also revokes that account's tenant access.
create function private.remove_staff_access() returns trigger language plpgsql
  security definer set search_path='' as $$ begin
  delete from public.business_members where business_id=old.business_id and user_id=old.user_id;
  delete from public.business_invitations where business_id=old.business_id and staff_id=old.id;
  return old;
end $$;
revoke all on function private.remove_staff_access() from public,anon,authenticated;
create trigger remove_staff_access before delete on public.staff_profiles
  for each row execute function private.remove_staff_access();

-- Cover tenant filters and foreign-key lookups used in the dashboard.
create index if not exists bookings_business_staff_idx on public.bookings(business_id,staff_id);
create index if not exists bookings_business_service_idx on public.bookings(business_id,service_id);
create index if not exists bookings_business_customer_idx on public.bookings(business_id,customer_id);
create index if not exists blocks_business_staff_idx on public.blocked_times(business_id,staff_id);
create index if not exists assignments_business_service_idx on public.service_staff(business_id,service_id);
create index if not exists assignments_business_staff_idx on public.service_staff(business_id,staff_id);
create index if not exists invitations_business_staff_idx on public.business_invitations(business_id,staff_id);

-- Only the trusted server may call this after authenticating the platform admin.
create function public.delete_business_server(p_business uuid,p_actor uuid,p_name text)
returns void language plpgsql security invoker set search_path='' as $$
declare business_name text;
begin
  if not exists(select 1 from private.platform_admins where user_id=p_actor) then raise exception 'FORBIDDEN'; end if;
  select name into business_name from public.businesses where id=p_business for update;
  if business_name is null or business_name<>p_name then raise exception 'INVALID_INPUT'; end if;
  delete from public.businesses where id=p_business;
  insert into public.admin_audit_logs(actor_id,action,details)
    values(p_actor,'business.deleted',jsonb_build_object('business_id',p_business,'name',business_name));
end $$;
revoke all on function public.delete_business_server(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.delete_business_server(uuid,uuid,text) to service_role;
