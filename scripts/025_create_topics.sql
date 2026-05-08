-- PHASE 9 - Create topics table
-- Safe to re-run.

create extension if not exists pgcrypto;

create table if not exists public.topics (
  id text primary key default gen_random_uuid()::text,
  activity_id text,
  title text not null,
  description text not null,
  level text not null default 'intermediate',
  is_archived boolean not null default false,
  usage_count integer not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.topics
  add column if not exists activity_id text,
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists level text,
  add column if not exists is_archived boolean,
  add column if not exists usage_count integer,
  add column if not exists created_by uuid,
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
    and table_name = 'topics'
    and column_name = 'id';

  if id_type = 'uuid' then
    execute 'alter table public.topics alter column id set default gen_random_uuid()';
  elsif id_type = 'text' then
    execute 'alter table public.topics alter column id set default gen_random_uuid()::text';
  end if;
end
$$;

-- Align activity_id type with activities.id when needed.
do $$
declare
  activities_id_type text;
  topic_activity_id_type text;
begin
  select data_type
  into activities_id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'activities'
    and column_name = 'id';

  select data_type
  into topic_activity_id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'topics'
    and column_name = 'activity_id';

  if activities_id_type = 'uuid' and topic_activity_id_type <> 'uuid' then
    execute 'alter table public.topics alter column activity_id type uuid using nullif(btrim(activity_id), '''')::uuid';
  elsif activities_id_type = 'text' and topic_activity_id_type <> 'text' then
    execute 'alter table public.topics alter column activity_id type text using activity_id::text';
  end if;
end
$$;

alter table public.topics alter column level set default 'intermediate';
alter table public.topics alter column is_archived set default false;
alter table public.topics alter column usage_count set default 0;
alter table public.topics alter column created_at set default now();
alter table public.topics alter column updated_at set default now();

-- Backfill legacy nullable rows.
do $$
declare
  id_type text;
begin
  select data_type
  into id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'topics'
    and column_name = 'id';

  if id_type = 'text' then
    execute $q$
      update public.topics
      set id = coalesce(nullif(id, ''), gen_random_uuid()::text)
    $q$;
  elsif id_type = 'uuid' then
    execute $q$
      update public.topics
      set id = coalesce(id, gen_random_uuid())
    $q$;
  end if;
end
$$;

update public.topics
set
  title = coalesce(nullif(btrim(title), ''), 'Sujet sans titre'),
  description = coalesce(nullif(btrim(description), ''), 'Description a definir'),
  level = case
    when level in ('beginner', 'intermediate', 'advanced') then level
    else 'intermediate'
  end,
  is_archived = coalesce(is_archived, false),
  usage_count = greatest(coalesce(usage_count, 0), 0),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

-- Required columns.
alter table public.topics alter column id set not null;
alter table public.topics alter column title set not null;
alter table public.topics alter column description set not null;
alter table public.topics alter column level set not null;
alter table public.topics alter column is_archived set not null;
alter table public.topics alter column usage_count set not null;
alter table public.topics alter column created_at set not null;
alter table public.topics alter column updated_at set not null;

-- Ensure primary key exists.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.topics'::regclass
      and contype = 'p'
  ) then
    alter table public.topics add primary key (id);
  end if;
end
$$;

-- Constraints.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'topics_level_check'
      and conrelid = 'public.topics'::regclass
  ) then
    alter table public.topics
      add constraint topics_level_check
      check (level in ('beginner', 'intermediate', 'advanced'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'topics_usage_count_non_negative_check'
      and conrelid = 'public.topics'::regclass
  ) then
    alter table public.topics
      add constraint topics_usage_count_non_negative_check
      check (usage_count >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'topics_title_not_empty_check'
      and conrelid = 'public.topics'::regclass
  ) then
    alter table public.topics
      add constraint topics_title_not_empty_check
      check (length(btrim(title)) > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'topics_description_not_empty_check'
      and conrelid = 'public.topics'::regclass
  ) then
    alter table public.topics
      add constraint topics_description_not_empty_check
      check (length(btrim(description)) > 0);
  end if;
end
$$;

-- FKs.
do $$
begin
  if to_regclass('public.activities') is not null and not exists (
    select 1
    from pg_constraint
    where conname = 'topics_activity_id_fkey'
      and conrelid = 'public.topics'::regclass
  ) then
    alter table public.topics
      add constraint topics_activity_id_fkey
      foreign key (activity_id) references public.activities(id) on delete set null;
  end if;

  if to_regclass('public.profiles') is not null and not exists (
    select 1
    from pg_constraint
    where conname = 'topics_created_by_fkey'
      and conrelid = 'public.topics'::regclass
  ) then
    alter table public.topics
      add constraint topics_created_by_fkey
      foreign key (created_by) references public.profiles(id) on delete set null;
  end if;
end
$$;

create index if not exists idx_topics_level
  on public.topics(level);

create index if not exists idx_topics_archived
  on public.topics(is_archived);

create index if not exists idx_topics_activity_id
  on public.topics(activity_id);

create index if not exists idx_topics_usage_count
  on public.topics(usage_count desc);

-- Ensure single updated_at trigger.
drop trigger if exists tr_topics_updated_at on public.topics;
create trigger tr_topics_updated_at
before update on public.topics
for each row
execute function public.update_updated_at_column();
