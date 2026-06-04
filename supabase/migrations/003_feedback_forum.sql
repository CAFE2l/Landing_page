-- Café Services — Migration 003: Extend feedback tables for forum features
-- Adds columns for FeedbackPost, FeedbackComment, and helpful votes

-- ============================================================
-- FEEDBACK POSTS — add missing columns
-- ============================================================
alter table feedback_posts add column if not exists service_category text default '';
alter table feedback_posts add column if not exists project_title text default '';
alter table feedback_posts add column if not exists project_url text default '';
alter table feedback_posts add column if not exists service_date text default '';
alter table feedback_posts add column if not exists is_verified_client boolean default false;
alter table feedback_posts add column if not exists is_verified_project boolean default false;
alter table feedback_posts add column if not exists is_highlighted boolean default false;
alter table feedback_posts add column if not exists helpful_count integer default 0;
alter table feedback_posts add column if not exists comment_count integer default 0;
alter table feedback_posts add column if not exists improvement_suggestion text default '';
alter table feedback_posts add column if not exists admin_reply jsonb default null;

-- Extend status check to include 'highlighted'
alter table feedback_posts drop constraint if exists feedback_posts_status_check;
alter table feedback_posts add constraint feedback_posts_status_check
  check (status in ('pending','approved','rejected','highlighted'));

-- ============================================================
-- FEEDBACK MEDIA — add alt_text
-- ============================================================
alter table feedback_media add column if not exists alt_text text default '';

-- Extend type check to include 'video' (already there) but ensure
alter table feedback_media drop constraint if exists feedback_media_type_check;
alter table feedback_media add constraint feedback_media_type_check
  check (type in ('image','video','embed'));

-- ============================================================
-- FEEDBACK COMMENTS — add missing columns
-- ============================================================
alter table feedback_comments add column if not exists user_avatar text default '';
alter table feedback_comments add column if not exists status text not null default 'visible'
  check (status in ('visible','hidden'));

-- ============================================================
-- FEEDBACK HELPFUL VOTES
-- ============================================================
create table if not exists feedback_helpful_votes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references feedback_posts(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  unique(post_id, user_id)
);

alter table feedback_helpful_votes enable row level security;

drop policy if exists "Users can manage own votes" on feedback_helpful_votes;
create policy "Users can manage own votes"
  on feedback_helpful_votes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Admin can view all votes" on feedback_helpful_votes;
create policy "Admin can view all votes"
  on feedback_helpful_votes for select
  using (is_admin());

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_feedback_posts_service_category on feedback_posts(service_category);
create index if not exists idx_feedback_posts_status_created on feedback_posts(status, created_at desc);
create index if not exists idx_feedback_comments_post_id on feedback_comments(post_id);
create index if not exists idx_feedback_helpful_votes_post_id on feedback_helpful_votes(post_id);
create index if not exists idx_feedback_helpful_votes_user_id on feedback_helpful_votes(user_id);

-- ============================================================
-- RPC FUNCTIONS for atomic counter updates
-- ============================================================

create or replace function increment_comment_count(post_id uuid)
returns void language plpgsql security definer as $$
begin
  update feedback_posts set comment_count = comment_count + 1 where id = post_id;
end;
$$;

create or replace function decrement_comment_count(post_id uuid)
returns void language plpgsql security definer as $$
begin
  update feedback_posts set comment_count = greatest(0, comment_count - 1) where id = post_id;
end;
$$;

create or replace function increment_helpful_count(post_id uuid)
returns void language plpgsql security definer as $$
begin
  update feedback_posts set helpful_count = helpful_count + 1 where id = post_id;
end;
$$;

create or replace function decrement_helpful_count(post_id uuid)
returns void language plpgsql security definer as $$
begin
  update feedback_posts set helpful_count = greatest(0, helpful_count - 1) where id = post_id;
end;
$$;

-- ============================================================
-- RLS UPDATES for feedback_posts
-- ============================================================
-- Drop existing policies and recreate with proper access
drop policy if exists "Public can view approved" on feedback_posts;
create policy "Public can view approved"
  on feedback_posts for select
  using (status in ('approved', 'highlighted'));

drop policy if exists "Authenticated users can insert" on feedback_posts;
create policy "Authenticated users can insert"
  on feedback_posts for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "Admin can manage all feedback" on feedback_posts;
create policy "Admin can manage all feedback"
  on feedback_posts for all
  using (is_admin())
  with check (is_admin());

-- Users can update their own pending posts
drop policy if exists "Users can update own pending posts" on feedback_posts;
create policy "Users can update own pending posts"
  on feedback_posts for update
  using (auth.uid() = user_id and status = 'pending')
  with check (auth.uid() = user_id and status = 'pending');

-- Users can delete their own pending posts
drop policy if exists "Users can delete own pending posts" on feedback_posts;
create policy "Users can delete own pending posts"
  on feedback_posts for delete
  using (auth.uid() = user_id and status = 'pending');

-- ============================================================
-- RLS for feedback_comments read policy (allow reading on approved/+ posts)
-- ============================================================
drop policy if exists "Public can read comments on approved posts" on feedback_comments;
create policy "Public can read comments on approved posts"
  on feedback_comments for select
  using (
    exists (
      select 1 from feedback_posts
      where feedback_posts.id = feedback_comments.post_id
      and feedback_posts.status in ('approved', 'highlighted')
    )
  );
