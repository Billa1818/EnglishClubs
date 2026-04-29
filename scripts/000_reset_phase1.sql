-- DANGER: this script removes Phase 1 database objects.
-- Use on dev/staging only unless you are sure.

begin;

-- Drop triggers first (safe if they do not exist)
do $$
begin
  if to_regclass('public.profiles') is not null then
    execute 'drop trigger if exists tr_profiles_auto_member on public.profiles';
    execute 'drop trigger if exists tr_profiles_updated_at on public.profiles';
  end if;

  if to_regclass('public.members') is not null then
    execute 'drop trigger if exists tr_members_updated_at on public.members';
  end if;

  if to_regclass('public.app_config') is not null then
    execute 'drop trigger if exists tr_app_config_updated_at on public.app_config';
  end if;
end;
$$;

-- Drop custom functions
drop function if exists public.handle_new_profile() cascade;
drop function if exists public.get_member_status() cascade;
drop function if exists public.is_active_member() cascade;
drop function if exists public.is_admin() cascade;

-- Drop Phase 1 tables
drop table if exists public.members cascade;
drop table if exists public.profiles cascade;
drop table if exists public.app_config cascade;

-- Drop helper functions from Phase 1
drop function if exists public.is_authenticated() cascade;
drop function if exists public.update_updated_at_column() cascade;

commit;
