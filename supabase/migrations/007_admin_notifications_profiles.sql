alter table public.profiles
  add column if not exists email text,
  add column if not exists company text,
  add column if not exists role text not null default 'client',
  add column if not exists orders_count integer not null default 0,
  add column if not exists services_count integer not null default 0,
  add column if not exists created_at timestamptz not null default now();

create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  title text not null,
  message text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.admin_notifications enable row level security;

drop policy if exists "Admins can read notifications" on public.admin_notifications;
create policy "Admins can read notifications"
  on public.admin_notifications
  for select
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can update notifications" on public.admin_notifications;
create policy "Admins can update notifications"
  on public.admin_notifications
  for update
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

grant select, update on public.admin_notifications to authenticated;

create or replace function public.notify_new_feedback_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_notifications (type, title, message)
  values (
    'new_feedback',
    'New feedback submitted',
    coalesce(new.title, 'Untitled feedback') || ' from ' || coalesce(new.user_name, 'Anonymous')
  );
  return new;
end;
$$;

create or replace function public.notify_new_client_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'client' then
    insert into public.admin_notifications (type, title, message)
    values (
      'new_client',
      'New client registered',
      coalesce(new.full_name, new.email, 'Client') || ' joined CAFÉ Services'
    );
  end if;
  return new;
end;
$$;

revoke execute on function public.notify_new_feedback_post() from public, anon, authenticated;
revoke execute on function public.notify_new_client_profile() from public, anon, authenticated;

drop trigger if exists on_feedback_post_admin_notification on public.feedback_posts;
create trigger on_feedback_post_admin_notification
  after insert on public.feedback_posts
  for each row execute function public.notify_new_feedback_post();

drop trigger if exists on_client_profile_admin_notification on public.profiles;
create trigger on_client_profile_admin_notification
  after insert on public.profiles
  for each row execute function public.notify_new_client_profile();
