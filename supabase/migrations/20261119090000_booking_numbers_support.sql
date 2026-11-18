-- Human-readable booking numbers (e.g. SD-7K3F9Q) and a support desk with case numbers.

-- 1. Booking numbers: short, unambiguous alphabet (no 0/O, 1/I/L).
alter table public.bookings add column if not exists booking_number text;
create or replace function private.new_booking_number() returns text language plpgsql volatile set search_path='' as $$
declare alphabet text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; candidate text; i int;
begin
 loop
  candidate := 'SD-';
  for i in 1..6 loop
   candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  exit when not exists(select 1 from public.bookings where booking_number = candidate);
 end loop;
 return candidate;
end $$;
create or replace function private.set_booking_number() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.booking_number is null then new.booking_number := private.new_booking_number(); end if;
 return new;
end $$;
revoke all on function private.new_booking_number(), private.set_booking_number() from public, anon, authenticated;
drop trigger if exists set_booking_number on public.bookings;
create trigger set_booking_number before insert on public.bookings for each row execute function private.set_booking_number();
-- Backfill without firing booking validation triggers.
alter table public.bookings disable trigger user;
do $$ declare r record; begin
 for r in select id from public.bookings where booking_number is null loop
  update public.bookings set booking_number = private.new_booking_number() where id = r.id;
 end loop;
end $$;
alter table public.bookings enable trigger user;
alter table public.bookings alter column booking_number set not null;
create unique index if not exists bookings_number_idx on public.bookings(booking_number);

-- 2. Support desk: tickets with case numbers like F-2026-00042.
create sequence if not exists public.support_case_seq;
create table if not exists public.support_tickets(
  id uuid primary key default gen_random_uuid(),
  case_number text unique,
  business_id uuid references public.businesses on delete set null,
  user_id uuid references auth.users on delete set null,
  contact_email text not null default '' check(length(contact_email) <= 254),
  subject text not null check(length(subject) between 3 and 160),
  category text not null default 'question' check(category in('question','bug','billing','account','security','feature','other')),
  priority text not null default 'normal' check(priority in('low','normal','high','urgent')),
  status text not null default 'open' check(status in('open','in_progress','waiting','resolved','closed')),
  assigned_to uuid references auth.users on delete set null,
  last_reply_by text not null default 'user' check(last_reply_by in('user','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);
create or replace function private.set_case_number() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.case_number is null then
  new.case_number := 'F-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.support_case_seq')::text, 5, '0');
 end if;
 return new;
end $$;
revoke all on function private.set_case_number() from public, anon, authenticated;
drop trigger if exists set_case_number on public.support_tickets;
create trigger set_case_number before insert on public.support_tickets for each row execute function private.set_case_number();
create index if not exists tickets_status_idx on public.support_tickets(status, updated_at desc);
create index if not exists tickets_business_idx on public.support_tickets(business_id, updated_at desc);
create table if not exists public.support_ticket_messages(
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets on delete cascade,
  author_kind text not null check(author_kind in('user','admin','system')),
  author_id uuid references auth.users on delete set null,
  author_name text not null default '' check(length(author_name) <= 100),
  body text not null check(length(body) between 1 and 8000),
  internal boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists ticket_messages_idx on public.support_ticket_messages(ticket_id, created_at);
alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;
grant all on public.support_tickets, public.support_ticket_messages to service_role;
grant usage, select on sequence public.support_case_seq to service_role;
