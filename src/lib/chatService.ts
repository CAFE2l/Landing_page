import { supabase, supabaseConfigured } from "./supabase/client"
import type { ChatMessage, ChatConversation, UserSticker, MessageType } from "../data/feedbackStore"
import toast from "react-hot-toast"

// ========== Conversations ==========

export async function createOrGetConversation(
  currentUserId: string,
  otherUserId: string,
): Promise<string | null> {
  if (!supabase || !supabaseConfigured || currentUserId === otherUserId) return null

  const { data, error } = await supabase.rpc("get_or_create_conversation", {
    p_participant_a: currentUserId,
    p_participant_b: otherUserId,
  })

  if (error) {
    console.error("createOrGetConversation RPC failed", error)
    return null
  }

  return data as string
}

export async function fetchConversations(userId: string): Promise<ChatConversation[]> {
  if (!supabase || !supabaseConfigured) return []

  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
    .order("updated_at", { ascending: false })

  if (error || !data) return []

  const rows = data as Record<string, unknown>[]
  const otherIds = rows.map((r) =>
    r.participant_1 === userId ? (r.participant_2 as string) : (r.participant_1 as string),
  )

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url")
    .in("id", otherIds)

  const profileMap = new Map(
    (profiles || []).map((p: Record<string, unknown>) => [p.id as string, p]),
  )

  const conversationIds = rows.map((r) => r.id as string)

  const { data: allMessages } = await supabase
    .from("messages")
    .select("conversation_id, sender_id, read_at, created_at")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false })

  const unreadByConv = new Map<string, number>()
  const latestByConv = new Map<string, Record<string, unknown>>()

  for (const msg of (allMessages || []) as Record<string, unknown>[]) {
    const cid = msg.conversation_id as string
    if (!latestByConv.has(cid)) latestByConv.set(cid, msg)
    if (msg.sender_id !== userId && !msg.read_at) {
      unreadByConv.set(cid, (unreadByConv.get(cid) || 0) + 1)
    }
  }

  return rows.map((row) => {
    const otherId =
      row.participant_1 === userId ? (row.participant_2 as string) : (row.participant_1 as string)
    const profile = profileMap.get(otherId)
    const latest = latestByConv.get(row.id as string)

    return {
      id: row.id as string,
      participantA: row.participant_1 as string,
      participantB: row.participant_2 as string,
      lastMessage: (row.last_message as string) || (latest?.content as string) || null,
      lastMessageAt: (row.last_message_at as string) || (latest?.created_at as string) || row.created_at as string,
      updatedAt: (row.updated_at as string) || row.created_at as string,
      createdAt: row.created_at as string,
      otherUser: {
        id: otherId,
        name: (profile?.full_name as string) || (profile?.username as string) || "User",
        avatarUrl: (profile?.avatar_url as string) || null,
        username: (profile?.username as string) || null,
      },
      unreadCount: unreadByConv.get(row.id as string) || 0,
    }
  })
}

// ========== Messages ==========

export async function fetchMessages(conversationId: string): Promise<ChatMessage[]> {
  if (!supabase || !supabaseConfigured) return []

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })

  if (error) return []

  return ((data || []) as Record<string, unknown>[]).map(mapMessage)
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  receiverId: string,
  content: string,
  messageType: MessageType = "text",
  mediaUrl?: string,
): Promise<ChatMessage | null> {
  if (!supabase || !supabaseConfigured) return null

  const payload: Record<string, unknown> = {
    conversation_id: conversationId,
    sender_id: senderId,
    receiver_id: receiverId,
    content,
    message_type: messageType,
  }

  if (mediaUrl) payload.media_url = mediaUrl

  const { data, error } = await supabase
    .from("messages")
    .insert(payload)
    .select()
    .single()

  if (error) {
    console.error("sendMessage failed", error)
    toast.error("Failed to send message")
    return null
  }

  await supabase
    .from("conversations")
    .update({
      last_message: messageType === "text" ? content : messageType === "image" ? "📷 Image" : messageType === "sticker" ? "🎨 Sticker" : "😊 Emoji",
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId)

  return mapMessage(data as Record<string, unknown>)
}

export async function markMessagesAsRead(
  conversationId: string,
  currentUserId: string,
): Promise<void> {
  if (!supabase || !supabaseConfigured) return

  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("receiver_id", currentUserId)
    .is("read_at", null)
}

export async function getUnreadCount(userId: string): Promise<number> {
  const conversations = await fetchConversations(userId)
  return conversations.reduce((sum, c) => sum + c.unreadCount, 0)
}

// ========== Realtime ==========

export function subscribeToMessages(
  conversationId: string,
  onMessage: (message: ChatMessage) => void,
  onReadUpdate?: (messageId: string) => void,
) {
  if (!supabase || !supabaseConfigured) return () => {}
  const client = supabase

  const channel = client
    .channel(`chat:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        onMessage(mapMessage(payload.new as Record<string, unknown>))
      },
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        if (payload.new && (payload.new as Record<string, unknown>).read_at) {
          onReadUpdate?.((payload.new as Record<string, unknown>).id as string)
        }
      },
    )
    .subscribe()

  return () => {
    client.removeChannel(channel)
  }
}

export function subscribeToConversationUpdates(
  userId: string,
  onUpdate: () => void,
) {
  if (!supabase || !supabaseConfigured) return () => {}
  const client = supabase

  const channel = client
    .channel(`conversations:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "messages",
      },
      onUpdate,
    )
    .subscribe()

  return () => {
    client.removeChannel(channel)
  }
}

// ========== Image Upload ==========

export async function uploadChatImage(
  file: File,
  userId: string,
): Promise<string | null> {
  if (!supabase || !supabaseConfigured) return null

  const ext = file.name.split(".").pop() || "jpg"
  const path = `${userId}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from("chat-media")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    })

  if (error) {
    console.error("uploadChatImage failed", error)
    toast.error("Failed to upload image")
    return null
  }

  const { data: urlData } = supabase.storage.from("chat-media").getPublicUrl(path)
  return urlData?.publicUrl || null
}

// ========== Stickers ==========

export async function uploadSticker(
  file: File,
  userId: string,
): Promise<UserSticker | null> {
  if (!supabase || !supabaseConfigured) return null

  const ext = file.name.split(".").pop() || "png"
  const path = `${userId}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from("stickers")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    })

  if (uploadError) {
    console.error("uploadSticker failed", uploadError)
    toast.error("Failed to upload sticker")
    return null
  }

  const { data: urlData } = supabase.storage.from("stickers").getPublicUrl(path)
  const imageUrl = urlData?.publicUrl
  if (!imageUrl) return null

  const { data, error: insertError } = await supabase
    .from("user_stickers")
    .insert({ user_id: userId, image_url: imageUrl, name: file.name })
    .select()
    .single()

  if (insertError) {
    console.error("uploadSticker insert failed", insertError)
    return null
  }

  return {
    id: (data as Record<string, unknown>).id as string,
    userId,
    imageUrl,
    name: file.name,
    createdAt: new Date().toISOString(),
  }
}

export async function fetchUserStickers(userId: string): Promise<UserSticker[]> {
  if (!supabase || !supabaseConfigured) return []

  const { data, error } = await supabase
    .from("user_stickers")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) return []

  return ((data || []) as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    userId: row.user_id as string,
    imageUrl: row.image_url as string,
    name: (row.name as string) || null,
    createdAt: row.created_at as string,
  }))
}

export async function deleteSticker(stickerId: string): Promise<boolean> {
  if (!supabase || !supabaseConfigured) return false

  const { error } = await supabase
    .from("user_stickers")
    .delete()
    .eq("id", stickerId)

  if (error) {
    console.error("deleteSticker failed", error)
    return false
  }

  return true
}

// ========== Helpers ==========

function mapMessage(row: Record<string, unknown>): ChatMessage {
  return {
    id: row.id as string,
    conversationId: row.conversation_id as string,
    senderId: row.sender_id as string,
    receiverId: (row.receiver_id as string) || null,
    content: row.content as string,
    messageType: (row.message_type as MessageType) || "text",
    mediaUrl: (row.media_url as string) || null,
    readAt: (row.read_at as string) || null,
    createdAt: row.created_at as string,
  }
}
