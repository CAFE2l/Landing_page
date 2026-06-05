create table if not exists public.feedback_saved_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.feedback_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, post_id)
);

alter table public.feedback_saved_posts enable row level security;

drop policy if exists "Users can view own saved posts" on public.feedback_saved_posts;
create policy "Users can view own saved posts"
  on public.feedback_saved_posts
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can save posts" on public.feedback_saved_posts;
create policy "Users can save posts"
  on public.feedback_saved_posts
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can remove own saved posts" on public.feedback_saved_posts;
create policy "Users can remove own saved posts"
  on public.feedback_saved_posts
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create index if not exists idx_feedback_saved_posts_user_created
  on public.feedback_saved_posts(user_id, created_at desc);

create index if not exists idx_feedback_saved_posts_post
  on public.feedback_saved_posts(post_id);

grant select, insert, delete on public.feedback_saved_posts to authenticated;
