-- GDPR storage limitation: delete data that is no longer needed.
create or replace function private.apply_retention() returns void language plpgsql security definer set search_path='' as $$
begin
  delete from public.waitlist where status in ('new', 'declined') and updated_at < now() - interval '12 months';
  delete from public.activity_log where created_at < now() - interval '180 days';
  delete from private.rate_limits where window_start < now() - interval '1 day';
  delete from private.support_sessions where expires_at < now() - interval '1 day';
end $$;
revoke all on function private.apply_retention() from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute $q$select cron.unschedule(jobid) from cron.job where jobname = 'slotdove-retention'$q$;
    execute $q$select cron.schedule('slotdove-retention', '17 3 * * *', 'select private.apply_retention()')$q$;
  end if;
end $$;
