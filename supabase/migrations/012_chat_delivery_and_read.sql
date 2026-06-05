-- Migration 012: Add delivered_at column and mark_conversation_as_read RPC
-- Supports WhatsApp-style delivery/read indicators and correct badge counting.

-- ========== 1. Add delivered_at column ==========
alter table public.messages add column if not exists delivered_at timestamptz;

-- Backfill: existing messages were already delivered
update public.messages set delivered_at = created_at where delivered_at is null;

-- ========== 2. Create RPC: mark conversation as read ==========
-- This is more efficient than multiple client-side updates and ensures
-- only messages where receiver_id = auth.uid() are updated.
create or replace function public.mark_conversation_as_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.messages
  set read_at = now()
  where conversation_id = p_conversation_id
    and receiver_id = auth.uid()
    and read_at is null;
end;
$$;

grant execute on function public.mark_conversation_as_read(uuid) to authenticated;

-- ========== 3. Create RPC: get global unread count ==========
create or replace function public.get_global_unread_count()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count bigint;
begin
  select count(*) into v_count
  from public.messages
  where receiver_id = auth.uid()
    and read_at is null;
  return v_count;
end;
$$;

grant execute on function public.get_global_unread_count() to authenticated;

-- ========== 4. Create RPC: get conversation unread counts ==========
-- Returns a JSON object of conversation_id -> unread_count for the current user
create or replace function public.get_conversation_unread_counts()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  select coalesce(jsonb_object_agg(conversation_id, cnt), '{}'::jsonb) into v_result
  from (
    select m.conversation_id, count(*) as cnt
    from public.messages m
    where m.receiver_id = auth.uid()
      and m.read_at is null
    group by m.conversation_id
  ) sub;
  return v_result;
end;
$$;

grant execute on function public.get_conversation_unread_counts() to authenticated;

-- ========== 5. Index for delivery queries ==========
create index if not exists idx_messages_delivered_at on public.messages(conversation_id, delivered_at);
