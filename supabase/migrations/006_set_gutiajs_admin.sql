create or replace function is_admin()
returns boolean
language sql stable
as $$
  select
    coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
    or coalesce((auth.jwt() -> 'user_metadata' ->> 'role'), '') = 'admin'
    or lower(coalesce(auth.jwt() ->> 'email', '')) = 'gutiajs@gmail.com'
$$;

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where lower(email) = 'gutiajs@gmail.com';
