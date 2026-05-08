-- Fix legacy schemas where group_id is still required on sessions-related tables.
-- Safe to re-run.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'sessions'
      and column_name = 'group_id'
  ) then
    execute 'alter table public.sessions alter column group_id drop not null';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'session_activities'
      and column_name = 'group_id'
  ) then
    execute 'alter table public.session_activities alter column group_id drop not null';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'session_activity_assignments'
      and column_name = 'group_id'
  ) then
    execute 'alter table public.session_activity_assignments alter column group_id drop not null';
  end if;
end
$$;

notify pgrst, 'reload schema';
