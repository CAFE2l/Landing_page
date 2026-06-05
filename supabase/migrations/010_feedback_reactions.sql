-- ============================================================
-- Migration 010: feedback_reactions (replaces feedback_votes)
-- Unique per (feedback_id, user_id), toggle RPC for atomic ops
-- ============================================================

-- ========== FEEDBACK REACTIONS TABLE ==========
create table if not exists public.feedback_reactions (
  id uuid default gen_random_uuid() primary key,
  feedback_id uuid references public.feedback_posts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  reaction_type text check (reaction_type in ('like', 'dislike')) not null,
  created_at timestamptz default now(),
  unique(feedback_id, user_id)
);

alter table public.feedback_reactions enable row level security;

drop policy if exists "Anyone can read reactions" on public.feedback_reactions;
create policy "Anyone can read reactions"
  on public.feedback_reactions for select
  using (true);

drop policy if exists "Users manage own reactions" on public.feedback_reactions;
create policy "Users manage own reactions"
  on public.feedback_reactions for all
  using (auth.uid() = user_id);

create index if not exists idx_feedback_reactions_feedback on public.feedback_reactions(feedback_id);
create index if not exists idx_feedback_reactions_user on public.feedback_reactions(user_id);

grant select, insert, update, delete on public.feedback_reactions to authenticated;

-- ========== TOGGLE RPC ==========
create or replace function toggle_feedback_reaction(
  p_feedback_id uuid,
  p_reaction_type text
) returns text
language plpgsql security definer as $$
declare
  v_user_id uuid;
  v_existing text;
  v_result text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select reaction_type into v_existing
  from public.feedback_reactions
  where feedback_id = p_feedback_id and user_id = v_user_id;

  if v_existing is not null then
    if v_existing = p_reaction_type then
      delete from public.feedback_reactions
      where feedback_id = p_feedback_id and user_id = v_user_id;

      if p_reaction_type = 'like' then
        update public.feedback_posts set helpful_count = greatest(0, helpful_count - 1) where id = p_feedback_id;
      else
        update public.feedback_posts set downvote_count = greatest(0, downvote_count - 1) where id = p_feedback_id;
      end if;

      v_result := null;
    else
      update public.feedback_reactions
      set reaction_type = p_reaction_type, created_at = now()
      where feedback_id = p_feedback_id and user_id = v_user_id;

      if p_reaction_type = 'like' then
        update public.feedback_posts set
          helpful_count = helpful_count + 1,
          downvote_count = greatest(0, downvote_count - 1)
        where id = p_feedback_id;
      else
        update public.feedback_posts set
          downvote_count = downvote_count + 1,
          helpful_count = greatest(0, helpful_count - 1)
        where id = p_feedback_id;
      end if;

      v_result := p_reaction_type;
    end if;
  else
    insert into public.feedback_reactions (feedback_id, user_id, reaction_type)
    values (p_feedback_id, v_user_id, p_reaction_type);

    if p_reaction_type = 'like' then
      update public.feedback_posts set helpful_count = helpful_count + 1 where id = p_feedback_id;
    else
      update public.feedback_posts set downvote_count = downvote_count + 1 where id = p_feedback_id;
    end if;

    v_result := p_reaction_type;
  end if;

  return v_result;
end;
$$;

grant execute on function toggle_feedback_reaction(uuid, text) to authenticated;
