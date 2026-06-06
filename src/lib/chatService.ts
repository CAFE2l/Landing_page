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
    .select("id, full_name, username, avatar_url, email")
    .in("id", otherIds)

  const profileMap = new Map(
    (profiles || []).map((p: Record<string, unknown>) => [p.id as string, p]),
  )

  const conversationIds = rows.map((r) => r.id as string)

  const { data: allMessages } = await supabase
    .from("messages")
    .select("conversation_id, sender_id, read_at, created_at, content, message_type, caption, media_url, file_name")
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
    const lastMsgFromRow = (row.last_message as string) || null
    const lastContent = latest?.content as string | undefined
    const lastMsgType = latest?.message_type as string | undefined
    const lastCaption = latest?.caption as string | undefined
    const lastFileName = latest?.file_name as string | undefined

    let displayLastMessage = lastMsgFromRow
    if (!displayLastMessage && lastContent && lastMsgType === "text") {
      displayLastMessage = lastContent
    }

    const typeLabel = (type?: string) => {
      if (type === "image") return "🖼️ Photo"
      if (type === "video") return "🎥 Video"
      if (type === "audio") return "🎧 Audio"
      if (type === "sticker") return "Sticker"
      if (type === "file") return lastFileName ? `📎 ${lastFileName.slice(0, 40)}` : "📎 File"
      if (type === "emoji") return "😊 Emoji"
      return null
    }

    if (!displayLastMessage) {
      displayLastMessage = typeLabel(lastMsgType)
    }

    if (displayLastMessage && lastCaption && (lastMsgType === "image" || lastMsgType === "video" || lastMsgType === "file")) {
      displayLastMessage = `${displayLastMessage} — ${lastCaption.slice(0, 40)}`
    }

    return {
      id: row.id as string,
      participantA: row.participant_1 as string,
      participantB: row.participant_2 as string,
      lastMessage: displayLastMessage,
      lastMessageAt: (row.last_message_at as string) || (latest?.created_at as string) || row.created_at as string,
      updatedAt: (row.updated_at as string) || row.created_at as string,
      createdAt: row.created_at as string,
      otherUser: {
        id: otherId,
        name: (profile?.full_name as string) || (profile?.username as string) || (profile?.email as string)?.split("@")[0] || "Unknown user",
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
  caption?: string,
  mediaMimeType?: string,
  mediaSize?: number,
  mediaDuration?: number,
  fileName?: string,
): Promise<ChatMessage | null> {
  if (!supabase || !supabaseConfigured) return null

  const now = new Date().toISOString()

  const payload: Record<string, unknown> = {
    conversation_id: conversationId,
    sender_id: senderId,
    receiver_id: receiverId,
    content,
    message_type: messageType,
    delivered_at: now,
  }

  if (mediaUrl) payload.media_url = mediaUrl
  if (caption) payload.caption = caption
  if (mediaMimeType) payload.media_mime_type = mediaMimeType
  if (mediaSize !== undefined) payload.media_size = mediaSize
  if (mediaDuration !== undefined) payload.media_duration = mediaDuration
  if (fileName) payload.file_name = fileName

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

  const lastMsgType = messageType
  let lastMessageStr = content
  if (lastMsgType === "image") lastMessageStr = caption ? `📷 Image — ${caption.slice(0, 40)}` : "📷 Image"
  else if (lastMsgType === "video") lastMessageStr = caption ? `🎥 Video — ${caption.slice(0, 40)}` : "🎥 Video"
  else if (lastMsgType === "audio") lastMessageStr = "🎙️ Audio"
  else if (lastMsgType === "sticker") lastMessageStr = "Sticker"
  else if (lastMsgType === "file") lastMessageStr = fileName ? `📎 File — ${fileName.slice(0, 40)}` : caption ? `📎 File — ${caption.slice(0, 40)}` : "📎 File"
  else if (lastMsgType === "emoji") lastMessageStr = content || "😊 Emoji"

  await supabase
    .from("conversations")
    .update({
      last_message: lastMessageStr,
      last_message_at: now,
      updated_at: now,
    })
    .eq("id", conversationId)

  return mapMessage(data as Record<string, unknown>)
}

export async function markMessagesAsRead(
  conversationId: string,
  _currentUserId?: string,
): Promise<void> {
  if (!supabase || !supabaseConfigured) return

  await supabase.rpc("mark_conversation_as_read", {
    p_conversation_id: conversationId,
  })
}

export async function getGlobalUnreadCount(): Promise<number> {
  if (!supabase || !supabaseConfigured) return 0

  const { data, error } = await supabase.rpc("get_global_unread_count")
  if (error) {
    console.error("getGlobalUnreadCount failed", error)
    return 0
  }
  return (data as number) || 0
}

export async function getConversationUnreadCounts(): Promise<Record<string, number>> {
  if (!supabase || !supabaseConfigured) return {}

  const { data, error } = await supabase.rpc("get_conversation_unread_counts")
  if (error) {
    console.error("getConversationUnreadCounts failed", error)
    return {}
  }
  return (data as Record<string, number>) || {}
}

// ========== Media Upload ==========

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"]
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"]
const ALLOWED_AUDIO_TYPES = ["audio/webm", "audio/mp4", "audio/ogg", "audio/wav"]
const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "application/gzip",
  "application/json",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]
const MAX_IMAGE_SIZE = 10 * 1024 * 1024
const MAX_VIDEO_SIZE = 100 * 1024 * 1024
const MAX_AUDIO_SIZE = 25 * 1024 * 1024
const MAX_FILE_SIZE = 150 * 1024 * 1024

export function validateMediaFile(file: File): { valid: boolean; error?: string } {
  if (ALLOWED_IMAGE_TYPES.includes(file.type)) {
    if (file.size > MAX_IMAGE_SIZE) return { valid: false, error: "Image must be under 10MB" }
    return { valid: true }
  }
  if (ALLOWED_VIDEO_TYPES.includes(file.type)) {
    if (file.size > MAX_VIDEO_SIZE) return { valid: false, error: "Video must be under 100MB" }
    return { valid: true }
  }
  if (ALLOWED_AUDIO_TYPES.includes(file.type)) {
    if (file.size > MAX_AUDIO_SIZE) return { valid: false, error: "Audio must be under 25MB" }
    return { valid: true }
  }
  if (ALLOWED_FILE_TYPES.includes(file.type)) {
    if (file.size > MAX_FILE_SIZE) return { valid: false, error: "File must be under 150MB" }
    return { valid: true }
  }
  return { valid: false, error: "File type not supported. Allowed: images, videos, audio, PDF, DOC, XLS, ZIP, and more." }
}

export function getMediaType(file: File): "image" | "video" | "audio" | "file" | null {
  if (ALLOWED_IMAGE_TYPES.includes(file.type)) return "image"
  if (ALLOWED_VIDEO_TYPES.includes(file.type)) return "video"
  if (ALLOWED_AUDIO_TYPES.includes(file.type)) return "audio"
  if (ALLOWED_FILE_TYPES.includes(file.type)) return "file"
  return null
}

export async function uploadChatMedia(
  file: File,
  userId: string,
): Promise<{ url: string; mimeType: string; size: number } | null> {
  if (!supabase || !supabaseConfigured) return null

  const ext = file.name.split(".").pop() || "bin"
  const path = `${userId}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from("chat-media")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    })

  if (error) {
    console.error("uploadChatMedia failed", error)
    toast.error("Failed to upload media")
    return null
  }

  const { data: urlData } = supabase.storage.from("chat-media").getPublicUrl(path)
  if (!urlData?.publicUrl) return null

  return {
    url: urlData.publicUrl,
    mimeType: file.type,
    size: file.size,
  }
}

// ========== Audio Upload ==========

export async function uploadAudio(
  blob: Blob,
  userId: string,
  _conversationId: string,
): Promise<{ url: string; mimeType: string; size: number } | null> {
  if (!supabase || !supabaseConfigured) return null

  const path = `${userId}/audio_${Date.now()}.webm`

  const { error } = await supabase.storage
    .from("chat-media")
    .upload(path, blob, {
      cacheControl: "3600",
      upsert: false,
      contentType: blob.type,
    })

  if (error) {
    console.error("uploadAudio failed", error)
    toast.error("Failed to upload audio")
    return null
  }

  const { data: urlData } = supabase.storage.from("chat-media").getPublicUrl(path)
  if (!urlData?.publicUrl) return null

  return {
    url: urlData.publicUrl,
    mimeType: blob.type,
    size: blob.size,
  }
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
  const channelName = `conversations:${userId}:${Date.now()}`

  const channel = client
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "messages",
        filter: `receiver_id=eq.${userId}`,
      },
      onUpdate,
    )
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `sender_id=eq.${userId}`,
      },
      onUpdate,
    )
    .subscribe()

  return () => {
    client.removeChannel(channel)
  }
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
    caption: (row.caption as string) || null,
    messageType: (row.message_type as MessageType) || "text",
    mediaUrl: (row.media_url as string) || null,
    mediaMimeType: (row.media_mime_type as string) || null,
    mediaSize: (row.media_size as number) || null,
    mediaDuration: (row.media_duration as number) || null,
    fileName: (row.file_name as string) || null,
    deliveredAt: (row.delivered_at as string) || null,
    readAt: (row.read_at as string) || null,
    createdAt: row.created_at as string,
  }
}
