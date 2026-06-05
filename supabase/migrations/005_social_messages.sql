create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  participant_1 uuid not null references public.profiles(id) on delete cascade,
  participant_2 uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  unique(participant_1, participant_2),
  check (participant_1 <> participant_2)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.follows enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists "Users can read follows" on public.follows;
create policy "Users can read follows"
  on public.follows for select
  using (true);

drop policy if exists "Users can follow" on public.follows;
create policy "Users can follow"
  on public.follows for insert
  to authenticated
  with check ((select auth.uid()) = follower_id);

drop policy if exists "Users can unfollow" on public.follows;
create policy "Users can unfollow"
  on public.follows for delete
  to authenticated
  using ((select auth.uid()) = follower_id);

drop policy if exists "Participants can read conversations" on public.conversations;
create policy "Participants can read conversations"
  on public.conversations for select
  to authenticated
  using ((select auth.uid()) in (participant_1, participant_2));

drop policy if exists "Users can create conversations" on public.conversations;
create policy "Users can create conversations"
  on public.conversations for insert
  to authenticated
  with check ((select auth.uid()) in (participant_1, participant_2));

drop policy if exists "Participants can update conversations" on public.conversations;
create policy "Participants can update conversations"
  on public.conversations for update
  to authenticated
  using ((select auth.uid()) in (participant_1, participant_2))
  with check ((select auth.uid()) in (participant_1, participant_2));

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

drop policy if exists "Recipients can mark messages read" on public.messages;
create policy "Recipients can mark messages read"
  on public.messages for update
  to authenticated
  using (
    exists (
      select 1 from public.conversations
      where conversations.id = messages.conversation_id
      and (select auth.uid()) in (conversations.participant_1, conversations.participant_2)
    )
  )
  with check (
    exists (
      select 1 from public.conversations
      where conversations.id = messages.conversation_id
      and (select auth.uid()) in (conversations.participant_1, conversations.participant_2)
    )
  );

create index if not exists idx_follows_follower on public.follows(follower_id);
create index if not exists idx_follows_following on public.follows(following_id);
create index if not exists idx_conversations_participant_1 on public.conversations(participant_1);
create index if not exists idx_conversations_participant_2 on public.conversations(participant_2);
create index if not exists idx_conversations_last_message on public.conversations(last_message_at desc);
create index if not exists idx_messages_conversation_created on public.messages(conversation_id, created_at);
create index if not exists idx_messages_unread on public.messages(conversation_id, read, sender_id);

grant select, insert, delete on public.follows to authenticated;
grant select, insert, update on public.conversations to authenticated;
grant select, insert, update on public.messages to authenticated;
