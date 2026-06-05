-- ============================================================
-- Migration 008: Feedback votes (1 per user) & Saved feedbacks
-- ============================================================

-- ========== FEEDBACK VOTES (replaces feedback_helpful_votes) ==========
create table if not exists public.feedback_votes (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.feedback_posts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  vote_type text check (vote_type in ('up', 'down')) not null default 'up',
  created_at timestamptz default now(),
  unique(post_id, user_id)
);

alter table public.feedback_votes enable row level security;

drop policy if exists "Users manage own votes" on public.feedback_votes;
create policy "Users manage own votes"
  on public.feedback_votes for all
  using (auth.uid() = user_id);

drop policy if exists "Anyone can read votes" on public.feedback_votes;
create policy "Anyone can read votes"
  on public.feedback_votes for select
  using (true);

create index if not exists idx_feedback_votes_post on public.feedback_votes(post_id);
create index if not exists idx_feedback_votes_user on public.feedback_votes(user_id);

grant select, insert, update, delete on public.feedback_votes to authenticated;

-- ========== RPC FUNCTIONS for atomic counter updates ==========
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

create or replace function increment_downvote_count(post_id uuid)
returns void language plpgsql security definer as $$
begin
  update feedback_posts set downvote_count = downvote_count + 1 where id = post_id;
end;
$$;

create or replace function decrement_downvote_count(post_id uuid)
returns void language plpgsql security definer as $$
begin
  update feedback_posts set downvote_count = greatest(0, downvote_count - 1) where id = post_id;
end;
$$;

grant execute on function increment_helpful_count(uuid) to authenticated;
grant execute on function decrement_helpful_count(uuid) to authenticated;
grant execute on function increment_downvote_count(uuid) to authenticated;
grant execute on function decrement_downvote_count(uuid) to authenticated;

-- ========== SAVED FEEDBACKS (replaces feedback_saved_posts) ==========
create table if not exists public.saved_feedbacks (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.feedback_posts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(post_id, user_id)
);

alter table public.saved_feedbacks enable row level security;

drop policy if exists "Users manage own saved" on public.saved_feedbacks;
create policy "Users manage own saved"
  on public.saved_feedbacks for all
  using (auth.uid() = user_id);

drop policy if exists "Anyone can read saved" on public.saved_feedbacks;
create policy "Anyone can read saved"
  on public.saved_feedbacks for select
  using (true);

create index if not exists idx_saved_feedbacks_user on public.saved_feedbacks(user_id, post_id);
create index if not exists idx_saved_feedbacks_post on public.saved_feedbacks(post_id);

grant select, insert, delete on public.saved_feedbacks to authenticated;
