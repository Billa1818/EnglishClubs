-- PHASE 11 - Create notifications table
-- Safe to re-run.

create extension if not exists pgcrypto;

create table if not exists public.notifications (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null,
  type text not null,
  title text not null,
  body text not null,
  is_read boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notifications
  add column if not exists user_id uuid,
  add column if not exists type text,
  add column if not exists title text,
  add column if not exists body text,
  add column if not exists is_read boolean,
  add column if not exists metadata jsonb,
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
    and table_name = 'notifications'
    and column_name = 'id';

  if id_type = 'uuid' then
    execute 'alter table public.notifications alter column id set default gen_random_uuid()';
  elsif id_type = 'text' then
    execute 'alter table public.notifications alter column id set default gen_random_uuid()::text';
  end if;
end
$$;

alter table public.notifications alter column is_read set default false;
alter table public.notifications alter column metadata set default '{}'::jsonb;
alter table public.notifications alter column created_at set default now();
alter table public.notifications alter column updated_at set default now();

-- Backfill legacy nullable rows.
do $$
declare
  id_type text;
begin
  select data_type
  into id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'notifications'
    and column_name = 'id';

  if id_type = 'text' then
    execute $q$
      update public.notifications
      set id = coalesce(nullif(id, ''), gen_random_uuid()::text)
    $q$;
  elsif id_type = 'uuid' then
    execute $q$
      update public.notifications
      set id = coalesce(id, gen_random_uuid())
    $q$;
  end if;
end
$$;

update public.notifications
set
  type = coalesce(nullif(btrim(type), ''), 'session_reminder'),
  title = coalesce(nullif(btrim(title), ''), 'Notification'),
  body = coalesce(nullif(btrim(body), ''), 'Mise a jour disponible.'),
  is_read = coalesce(is_read, false),
  metadata = coalesce(metadata, '{}'::jsonb),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

-- Required columns.
alter table public.notifications alter column id set not null;
alter table public.notifications alter column user_id set not null;
alter table public.notifications alter column type set not null;
alter table public.notifications alter column title set not null;
alter table public.notifications alter column body set not null;
alter table public.notifications alter column is_read set not null;
alter table public.notifications alter column metadata set not null;
alter table public.notifications alter column created_at set not null;
alter table public.notifications alter column updated_at set not null;

-- Ensure primary key exists.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.notifications'::regclass
      and contype = 'p'
  ) then
    alter table public.notifications add primary key (id);
  end if;
end
$$;

-- Constraints.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_type_not_empty_check'
      and conrelid = 'public.notifications'::regclass
  ) then
    alter table public.notifications
      add constraint notifications_type_not_empty_check
      check (length(btrim(type)) > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_title_not_empty_check'
      and conrelid = 'public.notifications'::regclass
  ) then
    alter table public.notifications
      add constraint notifications_title_not_empty_check
      check (length(btrim(title)) > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_body_not_empty_check'
      and conrelid = 'public.notifications'::regclass
  ) then
    alter table public.notifications
      add constraint notifications_body_not_empty_check
      check (length(btrim(body)) > 0);
  end if;
end
$$;

-- FKs.
do $$
begin
  if to_regclass('public.profiles') is not null and not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_user_id_fkey'
      and conrelid = 'public.notifications'::regclass
  ) then
    alter table public.notifications
      add constraint notifications_user_id_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;
end
$$;

create index if not exists idx_notifications_user_id
  on public.notifications(user_id);

create index if not exists idx_notifications_is_read
  on public.notifications(is_read);

create index if not exists idx_notifications_created_at
  on public.notifications(created_at desc);

-- Ensure single updated_at trigger.
drop trigger if exists tr_notifications_updated_at on public.notifications;
create trigger tr_notifications_updated_at
before update on public.notifications
for each row
execute function public.update_updated_at_column();
