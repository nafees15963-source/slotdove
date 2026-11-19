-- Waitlist for the pre-launch phase. Entries are written by the trusted server only
-- (rate limited, honeypot, consent required) and read by platform admins.
create table if not exists public.waitlist(
  id uuid primary key default gen_random_uuid(),
  company text not null check (length(company) between 2 and 120),
  contact_name text not null check (length(contact_name) between 2 and 100),
  email text not null check (length(email) <= 254 and email = lower(email) and email like '%_@_%._%'),
  phone text not null default '' check (length(phone) <= 30),
  industry text not null default 'other' check (length(industry) <= 40),
  city text not null default '' check (length(city) <= 80),
  team_size text not null default '' check (team_size in ('', '1', '2-5', '6-15', '16+')),
  plan_interest text not null default 'unsure' check (plan_interest in ('free', 'pro', 'business', 'unsure')),
  interest text not null default 'demo' check (interest in ('demo', 'subscription', 'info')),
  message text not null default '' check (length(message) <= 1000),
  consent boolean not null check (consent),
  consent_text text not null check (length(consent_text) <= 500),
  locale text not null default 'de' check (locale in ('de', 'en')),
  source text not null default '' check (length(source) <= 120),
  status text not null default 'new' check (status in ('new', 'contacted', 'demo', 'customer', 'declined')),
  admin_notes text not null default '' check (length(admin_notes) <= 4000),
  demo_until timestamptz,
  contacted_at timestamptz,
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists waitlist_email_idx on public.waitlist (email);
create index if not exists waitlist_status_idx on public.waitlist (status, created_at desc);
alter table public.waitlist enable row level security;
revoke all on public.waitlist from anon, authenticated;
grant all on public.waitlist to service_role;
