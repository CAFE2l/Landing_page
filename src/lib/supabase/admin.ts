import { supabase, supabaseConfigured } from "./client"
import type { FeedbackEntry, FeedbackStatus, Client } from "../types"

export async function listFeedbacks(): Promise<FeedbackEntry[]> {
  if (!supabase || !supabaseConfigured) return []
  const { data, error } = await supabase
    .from("feedback_posts")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data || []).map(mapFeedbackFromDB)
}

export async function getPendingFeedback() {
  if (!supabase || !supabaseConfigured) return { data: [], error: null }
  return supabase
    .from("feedback_posts")
    .select("*, profiles(full_name, avatar_url)")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
}

export async function approveFeedback(id: string, adminNote?: string) {
  if (!supabase || !supabaseConfigured) return { data: null, error: null }
  return supabase
    .from("feedback_posts")
    .update({ status: "approved", admin_note: adminNote || null, updated_at: new Date().toISOString() })
    .eq("id", id)
}

export async function rejectFeedback(id: string, adminNote?: string) {
  if (!supabase || !supabaseConfigured) return { data: null, error: null }
  return supabase
    .from("feedback_posts")
    .update({ status: "rejected", admin_note: adminNote || null, updated_at: new Date().toISOString() })
    .eq("id", id)
}

export async function deleteFeedback(id: string) {
  if (!supabase || !supabaseConfigured) return
  const { error } = await supabase
    .from("feedback_posts")
    .delete()
    .eq("id", id)
  if (error) throw error
}

export async function getAllFeedback(filters?: {
  status?: string, channel?: string, search?: string
}) {
  if (!supabase || !supabaseConfigured) return { data: [], error: null }
  let query = supabase
    .from("feedback_posts")
    .select("*, profiles(full_name, avatar_url)")
    .order("created_at", { ascending: false })

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status)
  }
  if (filters?.channel) {
    query = query.eq("channel", filters.channel)
  }
  if (filters?.search) {
    query = query.ilike("title", `%${filters.search}%`)
  }

  return query
}

export async function getPendingCount() {
  if (!supabase || !supabaseConfigured) return 0
  const { count, error } = await supabase
    .from("feedback_posts")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending")
  if (error) return 0
  return count || 0
}

export async function updateFeedbackStatus(id: string, status: FeedbackStatus) {
  if (!supabase || !supabaseConfigured) return
  const { error } = await supabase
    .from("feedback_posts")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) throw error
}

export async function updateAdminNote(id: string, note: string) {
  if (!supabase || !supabaseConfigured) return
  const { error } = await supabase
    .from("feedback_posts")
    .update({ admin_note: note, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) throw error
}

export async function listClients(): Promise<Client[]> {
  if (!supabase || !supabaseConfigured) return []
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data || []).map(mapClientFromDB)
}

export async function logAdminAction(action: string, targetType: string, targetId: string, metadata?: Record<string, unknown>) {
  if (!supabase || !supabaseConfigured) return
  const { data: { session } } = await supabase.auth.getSession()
  await supabase.from("admin_activity_log").insert({
    admin_id: session?.user?.id,
    action,
    target_type: targetType,
    target_id: targetId,
    metadata: metadata || null,
  })
}

export async function getStats() {
  if (!supabase || !supabaseConfigured) {
    return { total: 0, approved: 0, pending: 0, rejected: 0, avgResponseTime: 0 }
  }
  const { data, error } = await supabase.from("feedback_posts").select("status, created_at, updated_at")
  if (error) throw error
  const total = data.length
  const approved = data.filter((f) => f.status === "approved").length
  const pending = data.filter((f) => f.status === "pending").length
  const rejected = data.filter((f) => f.status === "rejected").length
  const times = data
    .filter((f) => f.status === "approved" && f.updated_at)
    .map((f) => (new Date(f.updated_at).getTime() - new Date(f.created_at).getTime()) / 3600000)
  const avgResponseTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0
  return { total, approved, pending, rejected, avgResponseTime }
}

function mapFeedbackFromDB(data: Record<string, unknown>): FeedbackEntry {
  return {
    id: String(data.id),
    userId: String(data.user_id || ""),
    userName: String(data.user_name || "Anonymous"),
    userEmail: String(data.user_email || ""),
    userAvatar: String(data.user_avatar || ""),
    title: String(data.title || ""),
    body: String(data.body || ""),
    bodyHtml: String(data.body_html || ""),
    channel: (data.channel as FeedbackEntry["channel"]) || "website",
    status: (data.status as FeedbackStatus) || "pending",
    rating: Number(data.star_rating || 0),
    isTestimonial: Boolean(data.is_testimonial),
    verifiedResult: String(data.verified_result || ""),
    adminNote: String(data.admin_note || ""),
    metrics: data.metrics as Record<string, number> | undefined,
    mediaCount: Number(data.media_count || 0),
    createdAt: String(data.created_at),
    updatedAt: String(data.updated_at || ""),
  }
}

function mapClientFromDB(data: Record<string, unknown>): Client {
  return {
    id: String(data.id),
    uid: String(data.user_id || ""),
    name: String(data.name || ""),
    email: String(data.email || ""),
    company: String(data.company || ""),
    avatarUrl: String(data.avatar_url || ""),
    role: (data.role as "client" | "admin") || "client",
    projectsCount: Number(data.projects_count || 0),
    feedbackCount: Number(data.feedback_count || 0),
    lastActivity: String(data.last_activity || ""),
    createdAt: String(data.created_at),
  }
}
