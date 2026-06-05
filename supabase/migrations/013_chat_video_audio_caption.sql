-- Migration 013: Add video, audio, caption support to messages
-- Extends message_type check constraint to include video and audio,
-- adds caption, media_mime_type, media_size, media_duration columns.

-- ========== 1. Extend message_type check constraint ==========
alter table public.messages drop constraint if exists messages_message_type_check;
alter table public.messages add constraint messages_message_type_check
  check (message_type in ('text','image','video','audio','sticker','emoji'));

-- ========== 2. Add new columns ==========
alter table public.messages add column if not exists caption text;
alter table public.messages add column if not exists media_mime_type text;
alter table public.messages add column if not exists media_size integer;
alter table public.messages add column if not exists media_duration numeric;

-- ========== 3. Indexes ==========
create index if not exists idx_messages_media_type on public.messages(conversation_id, message_type);

-- ========== 4. Storage policies for video/audio in chat-media ==========
-- Drop old policy and recreate with broader name
drop policy if exists "Authenticated users can upload chat media" on storage.objects;
create policy "Authenticated users can upload chat media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'chat-media' and (select auth.uid()) = owner);
