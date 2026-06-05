import { supabase, supabaseConfigured } from "./supabase/client"
import type { Client, ClientNote, ClientStatus } from "./types/client"

export interface ClientSummary {
  total: number
  active: number
  newThisMonth: number
  pendingMessages: number
}

export async function fetchClientSummary(): Promise<ClientSummary> {
  if (!supabase || !supabaseConfigured) {
    return { total: 0, active: 0, newThisMonth: 0, pendingMessages: 0 }
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [{ count: total }, { count: newThisMonth }, { data: unreadData }] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "client"),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "client")
      .gte("created_at", monthStart),
    supabase.rpc("get_total_unread_messages_for_admin" as never).catch(() => ({ data: null })),
  ])

  const pendingMessages = unreadData ? Number(unreadData) : 0

  return {
    total: total || 0,
    active: total || 0,
    newThisMonth: newThisMonth || 0,
    pendingMessages,
  }
}

export async function fetchEnhancedClients(): Promise<Client[]> {
  if (!supabase || !supabaseConfigured) return []

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, username, email, company, avatar_url, role, phone, bio, location_country, orders_count, services_count, created_at, updated_at, last_seen_at",
    )
    .eq("role", "client")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("fetchEnhancedClients failed", error)
    return []
  }

  const rows = (data || []) as Record<string, unknown>[]
  if (rows.length === 0) return []

  const clientIds = rows.map((r) => r.id as string)

  const [feedbackResult, messagesResult] = await Promise.all([
    supabase
      .from("feedback_posts")
      .select("user_id, id")
      .in("user_id", clientIds),
    supabase
      .from("messages")
      .select("conversation_id, receiver_id, read_at, content, created_at, sender_id")
      .or(clientIds.map((id) => `receiver_id.eq.${id}`).join(","))
      .is("read_at", null)
      .order("created_at", { ascending: false }),
  ])

  const feedbackCounts = new Map<string, number>()
  for (const fb of (feedbackResult.data || []) as { user_id: string }[]) {
    feedbackCounts.set(fb.user_id, (feedbackCounts.get(fb.user_id) || 0) + 1)
  }

  const unreadCounts = new Map<string, number>()
  for (const msg of (messagesResult.data || []) as { receiver_id: string }[]) {
    unreadCounts.set(msg.receiver_id, (unreadCounts.get(msg.receiver_id) || 0) + 1)
  }

  return rows.map((row) => {
    const id = row.id as string
    const createdAt = (row.created_at as string) || new Date().toISOString()
    const updatedAt = (row.updated_at as string) || createdAt
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const createdDate = new Date(createdAt)

    let status: ClientStatus = "inactive"
    const lastSeen = row.last_seen_at ? new Date(row.last_seen_at as string) : null
    if (lastSeen && lastSeen > sevenDaysAgo) {
      status = "active"
    } else if (createdDate > thirtyDaysAgo) {
      status = "new"
    }

    return {
      id,
      name: (row.full_name as string) || (row.username as string) || (row.email as string) || "Client",
      email: (row.email as string) || "",
      company: (row.company as string) || undefined,
      avatarUrl: (row.avatar_url as string) || undefined,
      role: "client",
      projectsCount: Number(row.orders_count || 0),
      servicesCount: Number(row.services_count || 0),
      feedbackCount: feedbackCounts.get(id) || 0,
      lastActivity: updatedAt,
      createdAt,
      phone: (row.phone as string) || undefined,
      location: (row.location_country as string) || undefined,
      bio: (row.bio as string) || undefined,
      username: (row.username as string) || undefined,
      status,
      unreadMessagesCount: unreadCounts.get(id) || 0,
    }
  })
}

// ========== Client Notes ==========

export async function fetchClientNotes(clientId: string): Promise<ClientNote[]> {
  if (!supabase || !supabaseConfigured) return []

  const { data, error } = await supabase
    .from("client_notes")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("fetchClientNotes failed", error)
    return []
  }

  const rows = (data || []) as Record<string, unknown>[]
  const adminIds = [...new Set(rows.map((r) => r.admin_id as string).filter(Boolean))]

  let adminNames = new Map<string, { name: string; avatar: string | null }>()
  if (adminIds.length > 0) {
    const { data: admins } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", adminIds)
    for (const a of (admins || []) as Record<string, unknown>[]) {
      adminNames.set(a.id as string, {
        name: (a.full_name as string) || "Admin",
        avatar: (a.avatar_url as string) || null,
      })
    }
  }

  return rows.map((row) => {
    const adminId = row.admin_id as string
    const adminInfo = adminNames.get(adminId)
    return {
      id: row.id as string,
      clientId: row.client_id as string,
      adminId,
      note: row.note as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      adminName: adminInfo?.name || "Admin",
      adminAvatar: adminInfo?.avatar || null,
    }
  })
}

export async function createClientNote(
  clientId: string,
  adminId: string,
  note: string,
): Promise<ClientNote | null> {
  if (!supabase || !supabaseConfigured) return null

  const { data, error } = await supabase
    .from("client_notes")
    .insert({ client_id: clientId, admin_id: adminId, note })
    .select()
    .single()

  if (error) {
    console.error("createClientNote failed", error)
    return null
  }

  const row = data as Record<string, unknown>
  return {
    id: row.id as string,
    clientId: row.client_id as string,
    adminId: row.admin_id as string,
    note: row.note as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export async function updateClientNote(
  noteId: string,
  note: string,
): Promise<boolean> {
  if (!supabase || !supabaseConfigured) return false

  const { error } = await supabase
    .from("client_notes")
    .update({ note, updated_at: new Date().toISOString() })
    .eq("id", noteId)

  if (error) {
    console.error("updateClientNote failed", error)
    return false
  }
  return true
}

export async function deleteClientNote(noteId: string): Promise<boolean> {
  if (!supabase || !supabaseConfigured) return false

  const { error } = await supabase.from("client_notes").delete().eq("id", noteId)
  if (error) {
    console.error("deleteClientNote failed", error)
    return false
  }
  return true
}

// ========== Service History (fake for now, based on services_count) ==========

export interface ServiceHistoryItem {
  id: string
  name: string
  status: string
  date: string
}

export async function fetchClientServiceHistory(
  _clientId: string,
): Promise<ServiceHistoryItem[]> {
  return []
}
