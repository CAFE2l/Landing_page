-- Migration 010: Complete private messaging system
-- Adds columns, tables, RLS, storage buckets, and helper functions.

-- ========== 1. Alter conversations table ==========
alter table public.conversations
  add column if not exists last_message text,
  add column if not exists updated_at timestamptz default now();

-- ========== 2. Alter messages table ==========
alter table public.messages
  add column if not exists receiver_id uuid references auth.users(id) on delete set null,
  add column if not exists message_type text not null default 'text' check (message_type in ('text','image','sticker','emoji')),
  add column if not exists media_url text,
  add column if not exists read_at timestamptz;

-- Migrate old read boolean to read_at
update public.messages set read_at = created_at where read = true and read_at is null;

-- Drop old read column
alter table public.messages drop column if exists read;

-- Drop old foreign keys referencing profiles and re-add referencing auth.users
-- (safe because profiles.id = auth.users.id via FK constraint)
alter table public.conversations drop constraint if exists conversations_participant_1_fkey;
alter table public.conversations drop constraint if exists conversations_participant_2_fkey;
alter table public.conversations
  add constraint conversations_participant_1_fkey foreign key (participant_1) references auth.users(id) on delete cascade,
  add constraint conversations_participant_2_fkey foreign key (participant_2) references auth.users(id) on delete cascade;

alter table public.messages drop constraint if exists messages_sender_id_fkey;
alter table public.messages
  add constraint messages_sender_id_fkey foreign key (sender_id) references auth.users(id) on delete cascade;

-- ========== 3. Create user_stickers table ==========
create table if not exists public.user_stickers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  image_url text not null,
  name text,
  created_at timestamptz not null default now()
);

-- ========== 4. RLS policies ==========

-- messages: select - only participants can read
drop policy if exists "Participants can read messages" on public.messages;
create policy "Participants can read messages"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.conversations
      where conversations.id = messages.conversation_id
      and (select auth.uid()) in (conversations.participant_1, conversations.participant_2)
    )
  );

-- messages: insert - sender must be auth.uid(), must be participant, receiver must be the other participant
drop policy if exists "Participants can send messages" on public.messages;
create policy "Participants can send messages"
  on public.messages for insert
  to authenticated
  with check (
    (select auth.uid()) = sender_id
    and exists (
      select 1 from public.conversations
      where conversations.id = messages.conversation_id
      and (select auth.uid()) in (conversations.participant_1, conversations.participant_2)
    )
  );

-- messages: update read_at - only the receiver can mark as read
drop policy if exists "Recipients can mark messages read" on public.messages;
create policy "Recipients can mark messages read"
  on public.messages for update
  to authenticated
  using (
    (select auth.uid()) = receiver_id
    and exists (
      select 1 from public.conversations
      where conversations.id = messages.conversation_id
      and (select auth.uid()) in (conversations.participant_1, conversations.participant_2)
    )
  )
  with check (
    (select auth.uid()) = receiver_id
    and exists (
      select 1 from public.conversations
      where conversations.id = messages.conversation_id
      and (select auth.uid()) in (conversations.participant_1, conversations.participant_2)
    )
  );

-- user_stickers: select - own stickers only
drop policy if exists "Users can view own stickers" on public.user_stickers;
create policy "Users can view own stickers"
  on public.user_stickers for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- user_stickers: insert - own stickers only
drop policy if exists "Users can insert own stickers" on public.user_stickers;
create policy "Users can insert own stickers"
  on public.user_stickers for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- user_stickers: delete - own stickers only
drop policy if exists "Users can delete own stickers" on public.user_stickers;
create policy "Users can delete own stickers"
  on public.user_stickers for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ========== 5. Storage buckets ==========
insert into storage.buckets (id, name, public, avif_autodetection)
values ('chat-media', 'chat-media', true, false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, avif_autodetection)
values ('stickers', 'stickers', true, false)
on conflict (id) do nothing;

-- Storage policies for chat-media
drop policy if exists "Chat media images are publicly accessible" on storage.objects;
create policy "Chat media images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'chat-media');

drop policy if exists "Authenticated users can upload chat media" on storage.objects;
create policy "Authenticated users can upload chat media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'chat-media' and (select auth.uid()) = owner);

-- Storage policies for stickers
drop policy if exists "Stickers are publicly accessible" on storage.objects;
create policy "Stickers are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'stickers');

drop policy if exists "Authenticated users can upload stickers" on storage.objects;
create policy "Authenticated users can upload stickers"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'stickers' and (select auth.uid()) = owner);

drop policy if exists "Users can delete own stickers" on storage.objects;
create policy "Users can delete own stickers"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'stickers' and (select auth.uid()) = owner);

-- ========== 6. Helper function: get or create conversation ==========
create or replace function public.get_or_create_conversation(p_participant_a uuid, p_participant_b uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  a uuid;
  b uuid;
begin
  a := least(p_participant_a, p_participant_b);
  b := greatest(p_participant_a, p_participant_b);

  select id into v_id
  from public.conversations
  where participant_1 = a and participant_2 = b;

  if v_id is null then
    insert into public.conversations (participant_1, participant_2, last_message_at, updated_at)
    values (a, b, now(), now())
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

grant execute on function public.get_or_create_conversation(uuid, uuid) to authenticated;

-- Enable realtime for messages
alter publication supabase_realtime add table public.messages;

-- ========== 7. Indexes ==========
create index if not exists idx_messages_conversation_created on public.messages(conversation_id, created_at asc);
create index if not exists idx_messages_receiver_unread on public.messages(conversation_id, receiver_id, read_at);
create index if not exists idx_user_stickers_user on public.user_stickers(user_id);
create index if not exists idx_conversations_updated on public.conversations(updated_at desc);

-- ========== 8. Grants ==========
grant select, insert, update on public.messages to authenticated;
grant select, insert, update on public.conversations to authenticated;
grant select, insert, delete on public.user_stickers to authenticated;
