-- PHASE 11 - Create notification_preferences table
-- Safe to re-run.

create extension if not exists pgcrypto;

create table if not exists public.notification_preferences (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null,
  notification_type text not null,
  in_app boolean not null default true,
  email boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences
  add column if not exists user_id uuid,
  add column if not exists notification_type text,
  add column if not exists in_app boolean,
  add column if not exists email boolean,
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
    and table_name = 'notification_preferences'
    and column_name = 'id';

  if id_type = 'uuid' then
    execute 'alter table public.notification_preferences alter column id set default gen_random_uuid()';
  elsif id_type = 'text' then
    execute 'alter table public.notification_preferences alter column id set default gen_random_uuid()::text';
  end if;
end
$$;

alter table public.notification_preferences alter column in_app set default true;
alter table public.notification_preferences alter column email set default false;
alter table public.notification_preferences alter column created_at set default now();
alter table public.notification_preferences alter column updated_at set default now();

-- Backfill legacy nullable rows.
do $$
declare
  id_type text;
begin
  select data_type
  into id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'notification_preferences'
    and column_name = 'id';

  if id_type = 'text' then
    execute $q$
      update public.notification_preferences
      set id = coalesce(nullif(id, ''), gen_random_uuid()::text)
    $q$;
  elsif id_type = 'uuid' then
    execute $q$
      update public.notification_preferences
      set id = coalesce(id, gen_random_uuid())
    $q$;
  end if;
end
$$;

update public.notification_preferences
set
  notification_type = lower(coalesce(nullif(btrim(notification_type), ''), 'session_reminder')),
  in_app = coalesce(in_app, true),
  email = coalesce(email, false),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

-- Remove duplicates (keep newest row per user/type).
with ranked as (
  select
    ctid,
    row_number() over (
      partition by user_id, lower(btrim(notification_type))
      order by updated_at desc, created_at desc, ctid desc
    ) as row_num
  from public.notification_preferences
)
delete from public.notification_preferences p
using ranked r
where p.ctid = r.ctid
  and r.row_num > 1;

-- Required columns.
alter table public.notification_preferences alter column id set not null;
alter table public.notification_preferences alter column user_id set not null;
alter table public.notification_preferences alter column notification_type set not null;
alter table public.notification_preferences alter column in_app set not null;
alter table public.notification_preferences alter column email set not null;
alter table public.notification_preferences alter column created_at set not null;
alter table public.notification_preferences alter column updated_at set not null;

-- Ensure primary key exists.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.notification_preferences'::regclass
      and contype = 'p'
  ) then
    alter table public.notification_preferences add primary key (id);
  end if;
end
$$;

-- Constraints.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notification_preferences_type_not_empty_check'
      and conrelid = 'public.notification_preferences'::regclass
  ) then
    alter table public.notification_preferences
      add constraint notification_preferences_type_not_empty_check
      check (length(btrim(notification_type)) > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'notification_preferences_unique_user_type'
      and conrelid = 'public.notification_preferences'::regclass
  ) then
    alter table public.notification_preferences
      add constraint notification_preferences_unique_user_type
      unique (user_id, notification_type);
  end if;
end
$$;

-- FKs.
do $$
begin
  if to_regclass('public.profiles') is not null and not exists (
    select 1
    from pg_constraint
    where conname = 'notification_preferences_user_id_fkey'
      and conrelid = 'public.notification_preferences'::regclass
  ) then
    alter table public.notification_preferences
      add constraint notification_preferences_user_id_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;
end
$$;

create index if not exists idx_notification_preferences_user_id
  on public.notification_preferences(user_id);

create index if not exists idx_notification_preferences_type
  on public.notification_preferences(notification_type);

-- Ensure single updated_at trigger.
drop trigger if exists tr_notification_preferences_updated_at on public.notification_preferences;
create trigger tr_notification_preferences_updated_at
before update on public.notification_preferences
for each row
execute function public.update_updated_at_column();
