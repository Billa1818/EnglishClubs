-- Phase 1 - Helper functions for RLS and shared triggers

create or replace function public.is_authenticated()
returns boolean
language sql
stable
as $$
  select auth.uid() is not null;
$$;

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

grant execute on function public.is_authenticated() to anon, authenticated;
