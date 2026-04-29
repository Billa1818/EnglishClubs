-- Phase 1 - RLS policies for app_config

alter table public.app_config enable row level security;

drop policy if exists "app_config_select_active_member" on public.app_config;
create policy "app_config_select_active_member"
on public.app_config
for select
to authenticated
using (public.is_active_member());

drop policy if exists "app_config_update_admin" on public.app_config;
create policy "app_config_update_admin"
on public.app_config
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());
