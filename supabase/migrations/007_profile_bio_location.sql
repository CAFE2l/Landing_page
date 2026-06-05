alter table public.profiles
  add column if not exists email text,
  add column if not exists role text default 'client',
  add column if not exists company text,
  add column if not exists phone text,
  add column if not exists country_code text,
  add column if not exists bio text,
  add column if not exists location_country text,
  add column if not exists location_country_code text;
