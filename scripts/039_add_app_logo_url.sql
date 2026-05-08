-- PHASE 12 - Add app logo column on app_config
-- Safe to re-run.

alter table public.app_config
  add column if not exists app_logo_url text;
