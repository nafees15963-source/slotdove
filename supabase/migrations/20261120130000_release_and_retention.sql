-- Free release 2027, confirmed pre-registrations, voluntary support link and stricter retention.

-- Pre-registration: an admin approves a lead and sends a personal sign-up link (hash only).
alter table public.waitlist drop constraint if exists waitlist_status_check;
alter table public.waitlist add constraint waitlist_status_check check (status in ('new', 'contacted', 'approved', 'demo', 'customer', 'declined'));
alter table public.waitlist add column if not exists invite_hash text unique;
alter table public.waitlist add column if not exists invite_expires_at timestamptz;
alter table public.waitlist add column if not exists approved_at timestamptz;

-- Public switches (readable by everyone, writable only via the admin API with the service key).
insert into public.platform_settings(key, value) values
  ('release', '{"free_from": "2027-01-01", "free_until": "2027-12-31", "invite_only": true}'),
  ('support', '{"enabled": false, "url": "", "text": ""}')
on conflict (key) do nothing;

-- Retention (Art. 5(1)(e) GDPR – storage limitation). Runs daily via pg_cron (slotdove-retention).
create or replace function private.apply_retention() returns void language plpgsql security definer set search_path = '' as $$
begin
  -- Pre-registrations without an account: 12 months; unused sign-up links expire.
  delete from public.waitlist where status in ('new', 'contacted', 'declined', 'approved') and updated_at < now() - interval '12 months';
  update public.waitlist set invite_hash = null where invite_expires_at < now() and invite_hash is not null;
  -- Security and usage logs.
  delete from public.activity_log where created_at < now() - interval '180 days';
  delete from private.rate_limits where window_start < now() - interval '1 day';
  delete from private.support_sessions where expires_at < now() - interval '1 day';
  delete from public.admin_audit_logs where created_at < now() - interval '3 years';
  -- Trust & safety and data-subject requests: 3 years after closing (proof, limitation period).
  delete from public.abuse_reports where status in ('actioned', 'rejected', 'closed') and updated_at < now() - interval '3 years';
  delete from public.dsr_requests where status in ('done', 'rejected') and updated_at < now() - interval '3 years';
  delete from public.support_tickets where status in ('resolved', 'closed') and updated_at < now() - interval '3 years';
  delete from public.blocklist where expires_at is not null and expires_at < now();
  -- Technical data that is no longer needed.
  delete from private.booking_management_tokens where expires_at < now() - interval '1 day';
  delete from public.business_invitations where (accepted_at is not null or revoked_at is not null or expires_at < now()) and created_at < now() - interval '30 days';
  delete from public.notification_jobs where status in ('accepted', 'suppressed', 'unavailable', 'failed') and created_at < now() - interval '90 days';
  -- Chats: 24 months after the last message.
  delete from public.conversations where last_message_at < now() - interval '24 months';
  -- Expired demo businesses: 30 days after the end of the demo.
  delete from public.businesses where is_demo and demo_expires_at is not null and demo_expires_at < now() - interval '30 days';
  -- Never confirmed sign-ups: 30 days.
  delete from auth.users u where u.email_confirmed_at is null and u.created_at < now() - interval '30 days'
    and not exists (select 1 from public.businesses b where b.owner_id = u.id)
    and not exists (select 1 from private.platform_admins a where a.user_id = u.id);
end $$;
revoke all on function private.apply_retention() from public, anon, authenticated;
