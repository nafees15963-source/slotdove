-- Electronic signature of the terms: typed full name, method and browser as proof.
alter table public.legal_acceptances add column if not exists signer_name text not null default '' check (length(signer_name) <= 120);
alter table public.legal_acceptances add column if not exists method text not null default 'checkbox' check (method in ('checkbox', 'signature'));
alter table public.legal_acceptances add column if not exists user_agent text not null default '' check (length(user_agent) <= 300);
create index if not exists legal_acceptances_sig_idx on public.legal_acceptances (user_id, version, method);
