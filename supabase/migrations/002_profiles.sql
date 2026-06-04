-- Profiles table for user avatars and metadata
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  full_name text,
  avatar_url text,
  avatar_public_id text,
  bio text,
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view all profiles"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Set admin role (run this once for your admin user in Supabase SQL editor):
-- update auth.users
-- set raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'
-- where email = 'YOUR_ADMIN_EMAIL@domain.com';

-- RLS for feedback_posts: admin full access, public read approved, auth insert
drop policy if exists "Admin full access" on public.feedback_posts;
create policy "Admin full access"
  on public.feedback_posts
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  with check (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

drop policy if exists "Public read approved posts" on public.feedback_posts;
create policy "Public read approved posts"
  on public.feedback_posts for select
  using (status = 'approved');

drop policy if exists "Authenticated users can insert posts" on public.feedback_posts;
create policy "Authenticated users can insert posts"
  on public.feedback_posts for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own pending posts" on public.feedback_posts;
create policy "Users can update own pending posts"
  on public.feedback_posts for update
  using (auth.uid() = user_id and status = 'pending');
