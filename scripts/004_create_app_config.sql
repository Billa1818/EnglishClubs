-- Phase 1 - Create app_config singleton table

create table if not exists public.app_config (
  id uuid primary key default '00000000-0000-0000-0000-000000000001',
  app_name text not null default 'English Club',
  access_type text not null default 'open' check (
    access_type in ('open', 'invitation')
  ),
  schedule_days text[] not null default array['saturday']::text[],
  start_time time not null default '18:00'::time,
  end_time time not null default '20:00'::time,
  frequency text not null default 'weekly',
  rules text,
  absence_min_delay_hours integer not null default 24 check (absence_min_delay_hours > 0),
  fcc_reminder_days integer not null default 7 check (fcc_reminder_days > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_config_singleton check (id = '00000000-0000-0000-0000-000000000001')
);

create trigger tr_app_config_updated_at
before update on public.app_config
for each row
execute function public.update_updated_at_column();

insert into public.app_config (id)
values ('00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;
