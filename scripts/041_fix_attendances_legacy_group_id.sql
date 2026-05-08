-- Fix legacy schemas where group_id is still required on attendances.
-- Safe to re-run.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'attendances'
      and column_name = 'group_id'
  ) then
    execute 'alter table public.attendances alter column group_id drop not null';
  end if;
end
$$;

notify pgrst, 'reload schema';
