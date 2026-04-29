-- Phase 1 - Create profiles table

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  pseudo text not null unique,
  photo_url text,
  english_level text not null default 'beginner' check (
    english_level in ('beginner', 'intermediate', 'advanced')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger tr_profiles_updated_at
before update on public.profiles
for each row
execute function public.update_updated_at_column();
