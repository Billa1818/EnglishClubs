-- PHASE 7 - Create absence_requests table
-- Safe to re-run.

create extension if not exists pgcrypto;

create table if not exists public.absence_requests (
  id text primary key default gen_random_uuid()::text,
  session_id text not null,
  user_id uuid not null,
  reason text,
  status text not null default 'pending',
  admin_comment text,
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.absence_requests
  add column if not exists session_id text,
  add column if not exists user_id uuid,
  add column if not exists reason text,
  add column if not exists status text,
  add column if not exists admin_comment text,
  add column if not exists requested_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

-- Keep existing id type (uuid/text) when table already exists.
do $$
declare
  id_type text;
begin
  select data_type
  into id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'absence_requests'
    and column_name = 'id';

  if id_type = 'uuid' then
    execute 'alter table public.absence_requests alter column id set default gen_random_uuid()';
  elsif id_type = 'text' then
    execute 'alter table public.absence_requests alter column id set default gen_random_uuid()::text';
  end if;
end
$$;

-- Align session_id type with sessions.id when needed.
do $$
declare
  sessions_id_type text;
  absence_session_id_type text;
begin
  select data_type
  into sessions_id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'sessions'
    and column_name = 'id';

  select data_type
  into absence_session_id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'absence_requests'
    and column_name = 'session_id';

  if sessions_id_type = 'uuid' and absence_session_id_type <> 'uuid' then
    execute 'alter table public.absence_requests alter column session_id type uuid using nullif(btrim(session_id), '''')::uuid';
  elsif sessions_id_type = 'text' and absence_session_id_type <> 'text' then
    execute 'alter table public.absence_requests alter column session_id type text using session_id::text';
  end if;
end
$$;

alter table public.absence_requests alter column status set default 'pending';
alter table public.absence_requests alter column requested_at set default now();
alter table public.absence_requests alter column created_at set default now();
alter table public.absence_requests alter column updated_at set default now();

-- Backfill legacy nullable rows.
do $$
declare
  id_type text;
begin
  select data_type
  into id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'absence_requests'
    and column_name = 'id';

  if id_type = 'text' then
    execute $q$
      update public.absence_requests
      set id = coalesce(nullif(id, ''), gen_random_uuid()::text)
    $q$;
  elsif id_type = 'uuid' then
    execute $q$
      update public.absence_requests
      set id = coalesce(id, gen_random_uuid())
    $q$;
  end if;
end
$$;

update public.absence_requests
set
  status = case
    when status in ('pending', 'approved', 'rejected') then status
    else 'pending'
  end,
  reason = nullif(btrim(reason), ''),
  admin_comment = nullif(btrim(admin_comment), ''),
  requested_at = coalesce(requested_at, created_at, now()),
  reviewed_at = case
    when status in ('approved', 'rejected')
      then coalesce(reviewed_at, updated_at, now())
    else null
  end,
  reviewed_by = case
    when status = 'pending' then null
    else reviewed_by
  end,
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

-- Required columns.
alter table public.absence_requests alter column id set not null;
alter table public.absence_requests alter column session_id set not null;
alter table public.absence_requests alter column user_id set not null;
alter table public.absence_requests alter column status set not null;
alter table public.absence_requests alter column requested_at set not null;
alter table public.absence_requests alter column created_at set not null;
alter table public.absence_requests alter column updated_at set not null;

-- Ensure primary key exists.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.absence_requests'::regclass
      and contype = 'p'
  ) then
    alter table public.absence_requests add primary key (id);
  end if;
end
$$;

-- Constraints.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'absence_requests_status_check'
      and conrelid = 'public.absence_requests'::regclass
  ) then
    alter table public.absence_requests
      add constraint absence_requests_status_check
      check (status in ('pending', 'approved', 'rejected'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'absence_requests_unique_member_per_session'
      and conrelid = 'public.absence_requests'::regclass
  ) then
    alter table public.absence_requests
      add constraint absence_requests_unique_member_per_session
      unique (session_id, user_id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'absence_requests_review_state_check'
      and conrelid = 'public.absence_requests'::regclass
  ) then
    alter table public.absence_requests
      add constraint absence_requests_review_state_check
      check (
        (status = 'pending' and reviewed_at is null)
        or
        (status in ('approved', 'rejected') and reviewed_at is not null)
      );
  end if;
end
$$;

-- FKs.
do $$
begin
  if to_regclass('public.sessions') is not null and not exists (
    select 1
    from pg_constraint
    where conname = 'absence_requests_session_id_fkey'
      and conrelid = 'public.absence_requests'::regclass
  ) then
    alter table public.absence_requests
      add constraint absence_requests_session_id_fkey
      foreign key (session_id) references public.sessions(id) on delete cascade;
  end if;

  if to_regclass('public.profiles') is not null and not exists (
    select 1
    from pg_constraint
    where conname = 'absence_requests_user_id_fkey'
      and conrelid = 'public.absence_requests'::regclass
  ) then
    alter table public.absence_requests
      add constraint absence_requests_user_id_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;

  if to_regclass('public.profiles') is not null and not exists (
    select 1
    from pg_constraint
    where conname = 'absence_requests_reviewed_by_fkey'
      and conrelid = 'public.absence_requests'::regclass
  ) then
    alter table public.absence_requests
      add constraint absence_requests_reviewed_by_fkey
      foreign key (reviewed_by) references public.profiles(id) on delete set null;
  end if;
end
$$;

create index if not exists idx_absence_requests_session_id
  on public.absence_requests(session_id);

create index if not exists idx_absence_requests_user_id
  on public.absence_requests(user_id);

create index if not exists idx_absence_requests_status
  on public.absence_requests(status);

create index if not exists idx_absence_requests_requested_at
  on public.absence_requests(requested_at desc);

-- Ensure single updated_at trigger.
drop trigger if exists tr_absence_requests_updated_at on public.absence_requests;
create trigger tr_absence_requests_updated_at
before update on public.absence_requests
for each row
execute function public.update_updated_at_column();
