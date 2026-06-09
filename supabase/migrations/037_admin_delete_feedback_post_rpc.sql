-- Ensure the admin feedback delete RPC exists in remote projects that missed migration 016.

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    or lower(coalesce(auth.jwt() ->> 'email', '')) in ('gutiajs@gmail.com')
$$;

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

grant execute on function public.admin_delete_feedback_post(uuid) to authenticated;
