-- Fix legacy schemas where group_id is still required on absence_requests.
-- Safe to re-run.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'absence_requests'
      and column_name = 'group_id'
  ) then
    execute 'alter table public.absence_requests alter column group_id drop not null';
  end if;
end
$$;

notify pgrst, 'reload schema';
