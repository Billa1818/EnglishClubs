-- PHASE 10 - Create fcc_progressions table
-- Safe to re-run.

create extension if not exists pgcrypto;

create table if not exists public.fcc_progressions (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null,
  track text not null,
  level text not null default 'Starting',
  modules_completed integer not null default 0,
  certificate_name text,
  screenshot_url text,
  validated_by uuid,
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.fcc_progressions
  add column if not exists user_id uuid,
  add column if not exists track text,
  add column if not exists level text,
  add column if not exists modules_completed integer,
  add column if not exists certificate_name text,
  add column if not exists screenshot_url text,
  add column if not exists validated_by uuid,
  add column if not exists validated_at timestamptz,
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
    and table_name = 'fcc_progressions'
    and column_name = 'id';

  if id_type = 'uuid' then
    execute 'alter table public.fcc_progressions alter column id set default gen_random_uuid()';
  elsif id_type = 'text' then
    execute 'alter table public.fcc_progressions alter column id set default gen_random_uuid()::text';
  end if;
end
$$;

alter table public.fcc_progressions alter column level set default 'Starting';
alter table public.fcc_progressions alter column modules_completed set default 0;
alter table public.fcc_progressions alter column created_at set default now();
alter table public.fcc_progressions alter column updated_at set default now();

-- Backfill legacy nullable rows.
do $$
declare
  id_type text;
begin
  select data_type
  into id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'fcc_progressions'
    and column_name = 'id';

  if id_type = 'text' then
    execute $q$
      update public.fcc_progressions
      set id = coalesce(nullif(id, ''), gen_random_uuid()::text)
    $q$;
  elsif id_type = 'uuid' then
    execute $q$
      update public.fcc_progressions
      set id = coalesce(id, gen_random_uuid())
    $q$;
  end if;
end
$$;

update public.fcc_progressions
set
  track = coalesce(nullif(btrim(track), ''), 'Parcours non defini'),
  level = case
    when level in ('Starting', 'In Progress', 'Almost Done', 'Completed') then level
    else 'Starting'
  end,
  modules_completed = greatest(least(coalesce(modules_completed, 0), 5), 0),
  certificate_name = nullif(btrim(certificate_name), ''),
  screenshot_url = nullif(btrim(screenshot_url), ''),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

-- Remove duplicate rows per member + track (keep latest).
with ranked as (
  select
    ctid,
    row_number() over (
      partition by user_id, lower(btrim(track))
      order by updated_at desc, created_at desc, ctid desc
    ) as row_num
  from public.fcc_progressions
)
delete from public.fcc_progressions p
using ranked r
where p.ctid = r.ctid
  and r.row_num > 1;

-- Required columns.
alter table public.fcc_progressions alter column id set not null;
alter table public.fcc_progressions alter column user_id set not null;
alter table public.fcc_progressions alter column track set not null;
alter table public.fcc_progressions alter column level set not null;
alter table public.fcc_progressions alter column modules_completed set not null;
alter table public.fcc_progressions alter column created_at set not null;
alter table public.fcc_progressions alter column updated_at set not null;

-- Ensure primary key exists.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.fcc_progressions'::regclass
      and contype = 'p'
  ) then
    alter table public.fcc_progressions add primary key (id);
  end if;
end
$$;

-- Constraints.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'fcc_progressions_level_check'
      and conrelid = 'public.fcc_progressions'::regclass
  ) then
    alter table public.fcc_progressions
      add constraint fcc_progressions_level_check
      check (level in ('Starting', 'In Progress', 'Almost Done', 'Completed'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'fcc_progressions_modules_completed_check'
      and conrelid = 'public.fcc_progressions'::regclass
  ) then
    alter table public.fcc_progressions
      add constraint fcc_progressions_modules_completed_check
      check (modules_completed >= 0 and modules_completed <= 5);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'fcc_progressions_track_not_empty_check'
      and conrelid = 'public.fcc_progressions'::regclass
  ) then
    alter table public.fcc_progressions
      add constraint fcc_progressions_track_not_empty_check
      check (length(btrim(track)) > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'fcc_progressions_unique_member_track'
      and conrelid = 'public.fcc_progressions'::regclass
  ) then
    alter table public.fcc_progressions
      add constraint fcc_progressions_unique_member_track
      unique (user_id, track);
  end if;
end
$$;

-- FKs.
do $$
begin
  if to_regclass('public.profiles') is not null and not exists (
    select 1
    from pg_constraint
    where conname = 'fcc_progressions_user_id_fkey'
      and conrelid = 'public.fcc_progressions'::regclass
  ) then
    alter table public.fcc_progressions
      add constraint fcc_progressions_user_id_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;

  if to_regclass('public.profiles') is not null and not exists (
    select 1
    from pg_constraint
    where conname = 'fcc_progressions_validated_by_fkey'
      and conrelid = 'public.fcc_progressions'::regclass
  ) then
    alter table public.fcc_progressions
      add constraint fcc_progressions_validated_by_fkey
      foreign key (validated_by) references public.profiles(id) on delete set null;
  end if;
end
$$;

create index if not exists idx_fcc_progressions_user_id
  on public.fcc_progressions(user_id);

create index if not exists idx_fcc_progressions_validated_at
  on public.fcc_progressions(validated_at);

create index if not exists idx_fcc_progressions_track
  on public.fcc_progressions(track);

-- Ensure single updated_at trigger.
drop trigger if exists tr_fcc_progressions_updated_at on public.fcc_progressions;
create trigger tr_fcc_progressions_updated_at
before update on public.fcc_progressions
for each row
execute function public.update_updated_at_column();
