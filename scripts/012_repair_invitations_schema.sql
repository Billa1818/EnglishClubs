-- Phase 3 repair - Fix legacy invitations schema and refresh PostgREST cache.
-- Use this when errors mention missing invitations columns (type, used_by, updated_at, etc).

begin;

create extension if not exists pgcrypto;

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),
  type text not null default 'link',
  email text,
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz,
  created_by uuid references public.profiles(id) on delete cascade,
  used_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.invitations add column if not exists id uuid;
alter table public.invitations alter column id set default gen_random_uuid();
update public.invitations set id = gen_random_uuid() where id is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.invitations'::regclass
      and contype = 'p'
  ) then
    alter table public.invitations
      add constraint invitations_pkey primary key (id);
  end if;
end;
$$;

alter table public.invitations add column if not exists token uuid;
update public.invitations set token = gen_random_uuid() where token is null;
alter table public.invitations alter column token set default gen_random_uuid();
alter table public.invitations alter column token set not null;
create unique index if not exists idx_invitations_token on public.invitations(token);

alter table public.invitations add column if not exists type text;
update public.invitations
set type = case
  when email is not null then 'email'
  else 'link'
end
where type is null or type not in ('link', 'email');
alter table public.invitations alter column type set default 'link';
alter table public.invitations alter column type set not null;

alter table public.invitations add column if not exists email text;
alter table public.invitations add column if not exists expires_at timestamptz;
update public.invitations
set expires_at = now() + interval '7 days'
where expires_at is null;
alter table public.invitations alter column expires_at set default (now() + interval '7 days');
alter table public.invitations alter column expires_at set not null;

alter table public.invitations add column if not exists used_at timestamptz;
alter table public.invitations add column if not exists created_by uuid references public.profiles(id) on delete cascade;
alter table public.invitations add column if not exists used_by uuid references public.profiles(id) on delete set null;
alter table public.invitations add column if not exists created_at timestamptz;
update public.invitations set created_at = now() where created_at is null;
alter table public.invitations alter column created_at set default now();
alter table public.invitations alter column created_at set not null;

alter table public.invitations add column if not exists updated_at timestamptz;
update public.invitations set updated_at = now() where updated_at is null;
alter table public.invitations alter column updated_at set default now();
alter table public.invitations alter column updated_at set not null;

create index if not exists idx_invitations_expires_at on public.invitations(expires_at);
create index if not exists idx_invitations_used_at on public.invitations(used_at);
create index if not exists idx_invitations_email on public.invitations(lower(email));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'invitations_type_check'
      and conrelid = 'public.invitations'::regclass
  ) then
    alter table public.invitations
      add constraint invitations_type_check
      check (type in ('link', 'email'));
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'invitations_email_required_for_email_type'
      and conrelid = 'public.invitations'::regclass
  ) then
    alter table public.invitations
      add constraint invitations_email_required_for_email_type
      check ((type = 'link') or (type = 'email' and email is not null));
  end if;
end;
$$;

drop trigger if exists tr_invitations_updated_at on public.invitations;
create trigger tr_invitations_updated_at
before update on public.invitations
for each row
execute function public.update_updated_at_column();

notify pgrst, 'reload schema';

commit;
