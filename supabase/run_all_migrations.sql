-- ============================================================
-- Café Services — Run ALL migrations in the Supabase SQL Editor
-- Copy and paste this entire file into:
--   Supabase Dashboard → SQL Editor → New query → Paste → Run
-- ============================================================

-- 1. Admin schema: feedback_posts, feedback_media, feedback_comments, clients, admin_activity_log
-- 2. Profiles table: avatar_url & avatar_public_id per user
-- 3. Users table: public profile data (name, email, company, country, photo_url)

-- ============================================================
-- MIGRATION 001: Admin schema
-- ============================================================
-- Helper: check if user is admin
create or replace function is_admin()
returns boolean
language sql stable
as $$
  select coalesce(auth.jwt() ->> 'role', '') = 'admin'
$$;

-- ========== FEEDBACK POSTS ==========
create table if not exists feedback_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  user_name text not null default 'Anonymous',
  user_email text default '',
  user_avatar text default '',
  title text not null default '',
  body text not null default '',
  body_html text default '',
  channel text not null default 'website' check (channel in ('website','email','whatsapp','telegram','discord','direct')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note text default '',
  is_testimonial boolean default false,
  star_rating integer default 0 check (star_rating >= 0 and star_rating <= 5),
  verified_result text default '',
  metrics jsonb default '{}',
  media_count integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table feedback_posts enable row level security;

drop policy if exists "Public can view approved" on feedback_posts;
create policy "Public can view approved"
  on feedback_posts for select
  using (status = 'approved' and is_testimonial = true);

drop policy if exists "Authenticated users can insert" on feedback_posts;
create policy "Authenticated users can insert"
  on feedback_posts for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "Admin can manage all feedback" on feedback_posts;
create policy "Admin can manage all feedback"
  on feedback_posts for all
  using (is_admin())
  with check (is_admin());

-- ========== FEEDBACK MEDIA ==========
create table if not exists feedback_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references feedback_posts(id) on delete cascade not null,
  type text not null default 'image' check (type in ('image','video','embed')),
  url text not null,
  thumbnail_url text default '',
  order_index integer default 0
);

alter table feedback_media enable row level security;

drop policy if exists "Admin can manage media" on feedback_media;
create policy "Admin can manage media"
  on feedback_media for all
  using (is_admin())
  with check (is_admin());

drop policy if exists "Public can view approved post media" on feedback_media;
create policy "Public can view approved post media"
  on feedback_media for select
  using (
    exists (
      select 1 from feedback_posts
      where feedback_posts.id = feedback_media.post_id
      and feedback_posts.status = 'approved'
    )
  );

-- ========== FEEDBACK COMMENTS ==========
create table if not exists feedback_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references feedback_posts(id) on delete cascade not null,
  parent_id uuid references feedback_comments(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  user_name text not null default 'Anonymous',
  body text not null,
  reactions jsonb default '{}',
  created_at timestamptz not null default now()
);

alter table feedback_comments enable row level security;

drop policy if exists "Public can read comments on approved posts" on feedback_comments;
create policy "Public can read comments on approved posts"
  on feedback_comments for select
  using (
    exists (
      select 1 from feedback_posts
      where feedback_posts.id = feedback_comments.post_id
      and feedback_posts.status = 'approved'
    )
  );

drop policy if exists "Authenticated users can comment" on feedback_comments;
create policy "Authenticated users can comment"
  on feedback_comments for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "Admin can manage comments" on feedback_comments;
create policy "Admin can manage comments"
  on feedback_comments for all
  using (is_admin())
  with check (is_admin());

-- ========== CLIENTS ==========
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null unique,
  name text not null,
  email text not null,
  company text default '',
  avatar_url text default '',
  role text not null default 'client' check (role in ('client','admin')),
  projects_count integer default 0,
  feedback_count integer default 0,
  last_activity timestamptz,
  created_at timestamptz not null default now()
);

alter table clients enable row level security;

drop policy if exists "Admin can manage clients" on clients;
create policy "Admin can manage clients"
  on clients for all
  using (is_admin())
  with check (is_admin());

drop policy if exists "Users can view own client profile" on clients;
create policy "Users can view own client profile"
  on clients for select
  using (auth.uid() = user_id);

-- ========== ADMIN ACTIVITY LOG ==========
create table if not exists admin_activity_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text not null default '',
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

alter table admin_activity_log enable row level security;

drop policy if exists "Admin can view logs" on admin_activity_log;
create policy "Admin can view logs"
  on admin_activity_log for select
  using (is_admin());

drop policy if exists "Admin can insert logs" on admin_activity_log;
create policy "Admin can insert logs"
  on admin_activity_log for insert
  with check (is_admin());

-- ========== INDEXES ==========
create index if not exists idx_feedback_posts_status on feedback_posts(status);
create index if not exists idx_feedback_posts_channel on feedback_posts(channel);
create index if not exists idx_feedback_posts_created_at on feedback_posts(created_at desc);
create index if not exists idx_feedback_media_post_id on feedback_media(post_id);
create index if not exists idx_clients_user_id on clients(user_id);
create index if not exists idx_admin_activity_log_created_at on admin_activity_log(created_at desc);

-- ========== TRIGGER: auto-update updated_at ==========
create or replace function update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists feedback_posts_updated_at on feedback_posts;
create trigger feedback_posts_updated_at
  before update on feedback_posts
  for each row
  execute function update_updated_at();

-- ============================================================
-- MIGRATION 002: Profiles table (for avatar upload)
-- ============================================================
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

drop policy if exists "Users can view all profiles" on public.profiles;
create policy "Users can view all profiles"
  on public.profiles for select using (true);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user_profile()
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

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

-- ============================================================
-- MIGRATION 003: Users table (public profile data)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT,
  username TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'admin')),
  company TEXT,
  country TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read users" ON public.users;
CREATE POLICY "Anyone can read users" ON public.users
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own row" ON public.users;
CREATE POLICY "Users can insert own row" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own row" ON public.users;
CREATE POLICY "Users can update own row" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Auto-create public.users row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, username, role, company, country, photo_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'User'),
    NEW.email,
    NEW.raw_user_meta_data->>'username',
    COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
    NEW.raw_user_meta_data->>'company',
    NEW.raw_user_meta_data->>'country',
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'photoUrl')
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    role = EXCLUDED.role,
    company = EXCLUDED.company,
    country = EXCLUDED.country,
    photo_url = EXCLUDED.photo_url,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
