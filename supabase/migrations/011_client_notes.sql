-- Migration 011: Client notes table and profile enhancements

-- Add missing profile columns for CRM
alter table public.profiles
  add column if not exists last_seen_at timestamptz,
  add column if not exists phone text,
  add column if not exists country_code text,
  add column if not exists bio text,
  add column if not exists location_country text,
  add column if not exists location_country_code text;

-- Create admin client notes table
create table if not exists public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  admin_id uuid not null references auth.users(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.client_notes enable row level security;

drop policy if exists "Admins can manage client notes" on public.client_notes;
create policy "Admins can manage client notes"
  on public.client_notes for all
  to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

grant select, insert, update, delete on public.client_notes to authenticated;

create index if not exists idx_client_notes_client on public.client_notes(client_id);
create index if not exists idx_client_notes_admin on public.client_notes(admin_id);
