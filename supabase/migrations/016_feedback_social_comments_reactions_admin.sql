-- Feedback social hardening:
-- - atomic reactions with final counters
-- - comment media columns
-- - admin-only delete RPCs
-- - stricter comment RLS

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    or lower(coalesce(auth.jwt() ->> 'email', '')) in ('gutiajs@gmail.com')
$$;

alter table public.feedback_comments
  add column if not exists media_url text,
  add column if not exists media_type text check (media_type in ('image', 'video'));

create index if not exists idx_feedback_comments_post_created
  on public.feedback_comments(post_id, created_at asc);

drop policy if exists "Public can read comments on approved posts" on public.feedback_comments;
create policy "Public can read comments on approved posts"
  on public.feedback_comments
  for select
  to anon, authenticated
  using (
    status = 'visible'
    and exists (
      select 1
      from public.feedback_posts
      where feedback_posts.id = feedback_comments.post_id
        and feedback_posts.status in ('approved', 'highlighted')
    )
  );

drop policy if exists "Authenticated users can comment" on public.feedback_comments;
create policy "Authenticated users can comment"
  on public.feedback_comments
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and status = 'visible'
    and exists (
      select 1
      from public.feedback_posts
      where feedback_posts.id = feedback_comments.post_id
        and feedback_posts.status in ('approved', 'highlighted')
    )
  );

drop policy if exists "Users can delete own comments" on public.feedback_comments;

drop policy if exists "Admin can manage comments" on public.feedback_comments;
create policy "Admin can manage comments"
  on public.feedback_comments
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.feedback_comments to anon;
grant select, insert, delete on public.feedback_comments to authenticated;

drop policy if exists "Users manage own reactions" on public.feedback_reactions;
create policy "Users manage own reactions"
  on public.feedback_reactions
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke insert, update, delete on public.feedback_reactions from authenticated;
grant select on public.feedback_reactions to authenticated;

create or replace function public.toggle_feedback_reaction_with_counts(
  p_feedback_id uuid,
  p_reaction_type text
) returns table (
  reaction_type text,
  helpful_count integer,
  downvote_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_existing text;
  v_result text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_reaction_type not in ('like', 'dislike') then
    raise exception 'Invalid reaction type';
  end if;

  perform 1
  from public.feedback_posts
  where id = p_feedback_id
  for update;

  if not found then
    raise exception 'Feedback not found';
  end if;

  select fr.reaction_type
    into v_existing
  from public.feedback_reactions fr
  where fr.feedback_id = p_feedback_id
    and fr.user_id = v_user_id
  for update;

  if v_existing is null then
    insert into public.feedback_reactions (feedback_id, user_id, reaction_type)
    values (p_feedback_id, v_user_id, p_reaction_type)
    on conflict (feedback_id, user_id)
    do update set reaction_type = excluded.reaction_type, created_at = now();

    if p_reaction_type = 'like' then
      update public.feedback_posts
      set helpful_count = helpful_count + 1
      where id = p_feedback_id;
    else
      update public.feedback_posts
      set downvote_count = downvote_count + 1
      where id = p_feedback_id;
    end if;

    v_result := p_reaction_type;
  elsif v_existing = p_reaction_type then
    delete from public.feedback_reactions
    where feedback_id = p_feedback_id
      and user_id = v_user_id;

    if p_reaction_type = 'like' then
      update public.feedback_posts
      set helpful_count = greatest(0, helpful_count - 1)
      where id = p_feedback_id;
    else
      update public.feedback_posts
      set downvote_count = greatest(0, downvote_count - 1)
      where id = p_feedback_id;
    end if;

    v_result := null;
  else
    update public.feedback_reactions
    set reaction_type = p_reaction_type,
        created_at = now()
    where feedback_id = p_feedback_id
      and user_id = v_user_id;

    if p_reaction_type = 'like' then
      update public.feedback_posts
      set helpful_count = helpful_count + 1,
          downvote_count = greatest(0, downvote_count - 1)
      where id = p_feedback_id;
    else
      update public.feedback_posts
      set downvote_count = downvote_count + 1,
          helpful_count = greatest(0, helpful_count - 1)
      where id = p_feedback_id;
    end if;

    v_result := p_reaction_type;
  end if;

  return query
  select
    v_result,
    fp.helpful_count,
    fp.downvote_count
  from public.feedback_posts fp
  where fp.id = p_feedback_id;
end;
$$;

grant execute on function public.toggle_feedback_reaction_with_counts(uuid, text) to authenticated;

create or replace function public.admin_delete_feedback_post(p_feedback_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'error', 'Not authenticated');
  end if;

  if not public.is_admin() then
    return jsonb_build_object('success', false, 'error', 'Admin access required');
  end if;

  delete from public.feedback_posts
  where id = p_feedback_id;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Feedback not found');
  end if;

  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.admin_delete_feedback_comment(
  p_post_id uuid,
  p_comment_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'error', 'Not authenticated');
  end if;

  if not public.is_admin() then
    return jsonb_build_object('success', false, 'error', 'Admin access required');
  end if;

  delete from public.feedback_comments
  where id = p_comment_id
    and post_id = p_post_id;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Comment not found');
  end if;

  update public.feedback_posts
  set comment_count = greatest(0, comment_count - 1)
  where id = p_post_id;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.admin_delete_feedback_post(uuid) to authenticated;
grant execute on function public.admin_delete_feedback_comment(uuid, uuid) to authenticated;
