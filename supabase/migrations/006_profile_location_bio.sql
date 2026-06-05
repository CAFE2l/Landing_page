alter table public.profiles
  add column if not exists location text,
  add column if not exists bio text;
