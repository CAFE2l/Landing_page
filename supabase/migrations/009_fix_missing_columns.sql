-- Migration 009: Fix missing columns on profiles and users tables
-- The code in src/lib/supabaseProfile.ts queries/upserts columns
-- that were never added to the users table and may be missing from profiles.

-- ========== PROFILES: ensure all columns exist ==========
alter table public.profiles
  add column if not exists email text,
  add column if not exists role text default 'client',
  add column if not exists company text,
  add column if not exists phone text,
  add column if not exists country_code text,
  add column if not exists location_country text,
  add column if not exists location_country_code text;

-- ========== USERS: add missing columns ==========
alter table public.users
  add column if not exists phone text,
  add column if not exists country_code text,
  add column if not exists bio text,
  add column if not exists location_country text,
  add column if not exists location_country_code text;

-- ========== FEEDBACK MEDIA: ensure RLS policies exist ==========
-- Without these, users cannot upload media (RLS blocks INSERT)
-- and the SELECT policy might be outdated (only 'approved', not 'highlighted').
grant insert on public.feedback_media to authenticated;
grant select on public.feedback_media to anon;
grant select on public.feedback_media to authenticated;

drop policy if exists "Public can view approved post media" on public.feedback_media;
create policy "Public can view approved post media"
  on public.feedback_media for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.feedback_posts
      where feedback_posts.id = feedback_media.post_id
      and feedback_posts.status in ('approved', 'highlighted')
    )
  );

drop policy if exists "Authenticated users can add media to own posts" on public.feedback_media;
create policy "Authenticated users can add media to own posts"
  on public.feedback_media for insert
  to authenticated
  with check (
    exists (
      select 1 from public.feedback_posts
      where feedback_posts.id = feedback_media.post_id
      and feedback_posts.user_id = (select auth.uid())
    )
  );
