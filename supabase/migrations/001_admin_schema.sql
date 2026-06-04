-- Café Services Admin Dashboard
-- Supabase Migration: Schema + RLS Policies

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

create policy "Public can view approved"
  on feedback_posts for select
  using (status = 'approved' and is_testimonial = true);

create policy "Authenticated users can insert"
  on feedback_posts for insert
  with check (auth.role() = 'authenticated');

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

create policy "Admin can manage media"
  on feedback_media for all
  using (is_admin())
  with check (is_admin());

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

create policy "Public can read comments on approved posts"
  on feedback_comments for select
  using (
    exists (
      select 1 from feedback_posts
      where feedback_posts.id = feedback_comments.post_id
      and feedback_posts.status = 'approved'
    )
  );

create policy "Authenticated users can comment"
  on feedback_comments for insert
  with check (auth.role() = 'authenticated');

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

create policy "Admin can manage clients"
  on clients for all
  using (is_admin())
  with check (is_admin());

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

create policy "Admin can view logs"
  on admin_activity_log for select
  using (is_admin());

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

create trigger feedback_posts_updated_at
  before update on feedback_posts
  for each row
  execute function update_updated_at();
