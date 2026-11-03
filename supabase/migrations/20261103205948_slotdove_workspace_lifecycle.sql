-- Verified accounts only, including when anonymous Supabase sign-in is enabled.
create function private.verified_user() returns boolean language sql stable security definer set search_path='' as $$select auth.uid() is not null and exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null)$$;
revoke all on function private.verified_user() from public;
grant execute on function private.verified_user() to authenticated;
drop policy business_create on public.businesses;
create policy business_create on public.businesses for insert to authenticated with check(owner_id=(select auth.uid()) and (select private.verified_user()) and status='active' and not is_demo and demo_expires_at is null);
create or replace function private.business_role(bid uuid) returns text language sql stable security definer set search_path='' as $$
 select case when b.owner_id=auth.uid() then 'owner' else m.role end from public.businesses b left join public.business_members m on m.business_id=b.id and m.user_id=auth.uid() where auth.uid() is not null and private.verified_user() and b.id=bid and b.status='active' and (not b.is_demo or b.demo_expires_at is null or b.demo_expires_at>now())
$$;

alter table public.business_invitations add column staff_id uuid;
alter table public.business_invitations add foreign key(business_id,staff_id) references public.staff_profiles(business_id,id);
drop function public.create_invitation_server(uuid,text,text,text,uuid);
create function public.create_invitation_server(p_business uuid,p_email text,p_role text,p_hash text,p_actor uuid,p_staff uuid default null) returns uuid language plpgsql security invoker set search_path='' as $$ declare iid uuid;begin
 if not exists(select 1 from public.businesses where id=p_business and owner_id=p_actor) and not exists(select 1 from private.platform_admins where user_id=p_actor) then raise exception 'FORBIDDEN';end if;
 if p_staff is not null and not exists(select 1 from public.staff_profiles where id=p_staff and business_id=p_business and user_id is null and active) then raise exception 'STAFF_ALREADY_LINKED';end if;
 insert into public.business_invitations(business_id,email,role,staff_id) values(p_business,lower(p_email),p_role,p_staff) returning id into iid;
 insert into private.invitation_tokens(invitation_id,token_hash) values(iid,p_hash);
 insert into public.admin_audit_logs(actor_id,business_id,action,details) values(p_actor,p_business,'invitation.created',jsonb_build_object('role',p_role));return iid;
end $$;
create or replace function public.accept_invitation_server(p_token_hash text,p_user uuid,p_email text) returns uuid language plpgsql security invoker set search_path='' as $$ declare i public.business_invitations;begin
 if not exists(select 1 from auth.users where id=p_user and lower(email)=lower(p_email) and email_confirmed_at is not null) then raise exception 'INVITATION_INVALID';end if;
 select bi.* into i from public.business_invitations bi join private.invitation_tokens t on t.invitation_id=bi.id where t.token_hash=p_token_hash and bi.accepted_at is null and bi.revoked_at is null and bi.expires_at>now() and lower(bi.email)=lower(p_email) for update of bi;
 if i.id is null then raise exception 'INVITATION_INVALID';end if;
 if i.role='owner' then update public.businesses set owner_id=p_user where id=i.business_id;
 else insert into public.business_members(business_id,user_id,role) values(i.business_id,p_user,i.role) on conflict(business_id,user_id) do update set role=excluded.role;
 if i.staff_id is not null then
  update public.staff_profiles set user_id=p_user where id=i.staff_id and business_id=i.business_id and user_id is null;
  if not found then raise exception 'STAFF_ALREADY_LINKED';end if;
 else insert into public.staff_profiles(business_id,user_id,name) values(i.business_id,p_user,split_part(p_email,'@',1)) on conflict(business_id,user_id) do nothing;end if;end if;
 update public.business_invitations set accepted_at=now() where id=i.id;
 insert into public.admin_audit_logs(actor_id,business_id,action,details) values(p_user,i.business_id,'invitation.accepted',jsonb_build_object('role',i.role));return i.business_id;
end $$;
create function public.manage_member_server(p_business uuid,p_user uuid,p_actor uuid,p_role text,p_remove boolean) returns void language plpgsql security invoker set search_path='' as $$ begin
 if not exists(select 1 from public.businesses where id=p_business and owner_id=p_actor and status='active') then raise exception 'FORBIDDEN';end if;
 if p_user=p_actor then raise exception 'FORBIDDEN';end if;
 if p_remove then delete from public.business_members where business_id=p_business and user_id=p_user;update public.staff_profiles set user_id=null,active=false where business_id=p_business and user_id=p_user;
 else if p_role not in('staff','admin') then raise exception 'INVALID_ROLE';end if;update public.business_members set role=p_role where business_id=p_business and user_id=p_user;end if;
 insert into public.admin_audit_logs(actor_id,business_id,action,details) values(p_actor,p_business,'member.changed',jsonb_build_object('user_id',p_user,'role',p_role,'removed',p_remove));
end $$;
revoke all on function public.create_invitation_server(uuid,text,text,text,uuid,uuid),public.manage_member_server(uuid,uuid,uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.create_invitation_server(uuid,text,text,text,uuid,uuid),public.manage_member_server(uuid,uuid,uuid,text,boolean) to service_role;

-- Intentional, audited erasure of personal information while preserving the
-- appointment ledger. Only an owner/manager in this exact tenant can invoke it.
create function private.anonymize_customer(bid uuid,cid uuid) returns void language plpgsql security definer set search_path='' as $$ begin
 if auth.uid() is null or coalesce(private.business_role(bid),'') not in('owner','admin') then raise exception 'FORBIDDEN';end if;
 perform 1 from public.customers where id=cid and business_id=bid for update;if not found then raise exception 'CUSTOMER_NOT_FOUND';end if;
 update public.customers set name='Deleted customer',email='deleted-'||id::text||'@example.invalid',phone='',notes='' where id=cid and business_id=bid;
 update public.bookings set customer_name='Deleted customer',notes='',internal_notes='' where customer_id=cid and business_id=bid;
 delete from private.booking_management_tokens where booking_id in(select id from public.bookings where customer_id=cid and business_id=bid);
 update public.notification_jobs set status='suppressed' where business_id=bid and booking_id in(select id from public.bookings where customer_id=cid) and status in('queued','failed','unavailable','processing');
 insert into public.admin_audit_logs(actor_id,business_id,action,details) values(auth.uid(),bid,'customer.anonymized',jsonb_build_object('customer_id',cid));
end $$;
create function public.anonymize_customer(bid uuid,cid uuid) returns void language sql security invoker set search_path='' as $$select private.anonymize_customer(bid,cid)$$;
revoke all on function private.anonymize_customer(uuid,uuid),public.anonymize_customer(uuid,uuid) from public,anon;
grant execute on function private.anonymize_customer(uuid,uuid),public.anonymize_customer(uuid,uuid) to authenticated;
