-- A business can stop a reported customer from booking online again.
alter table public.customers add column if not exists booking_blocked boolean not null default false;
