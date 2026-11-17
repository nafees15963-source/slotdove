-- Keep entitlement IDs stable; this updates displayed prices, not billing.
update public.plans set name='Starter',monthly_price_cents=500,currency='EUR' where id='free';
update public.plans set name='Pro',monthly_price_cents=1500,currency='EUR' where id='pro';
update public.plans set name='Business',monthly_price_cents=2500,currency='EUR' where id='business';
alter table public.profiles alter column locale set default 'de';
alter table public.businesses alter column locale set default 'de';
