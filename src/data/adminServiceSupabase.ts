import { supabase, supabaseConfigured } from "../lib/supabase/client"
import type { Client } from "../lib/types"
import type { FeedbackPost, FeedbackStatus, ServiceCategory } from "./feedbackStore"

const POSTS_TABLE = "feedback_posts"
const MEDIA_TABLE = "feedback_media"
const PROFILES_TABLE = "profiles"
const NOTIFICATIONS_TABLE = "admin_notifications"

export interface AdminDashboardStats {
  totalSubmissions: number
  approved: number
  pending: number
  avgResponseTimeMs: number
  responseCount: number
  trends: {
    totalSubmissions: number
    approved: number
    pending: number
    avgResponseTimeMs: number
  }
  recentFeedback: FeedbackPost[]
  activities: AdminActivity[]
  chartData: { date: string; count: number }[]
  channelData: { channel: string; count: number; color: string }[]
}

export interface AdminActivity {
  id: string
  action: string
  actor: string
  target: string
  timestamp: string
}

export interface AdminNotification {
  id: string
  type: "new_feedback" | "new_client" | "new_order" | string
  title: string
  message?: string
  read: boolean
  createdAt: string
}

function weekBounds() {
  const now = new Date()
  const day = now.getDay()
  const diffToMonday = (day + 6) % 7
  const currentStart = new Date(now)
  currentStart.setHours(0, 0, 0, 0)
  currentStart.setDate(currentStart.getDate() - diffToMonday)
  const previousStart = new Date(currentStart)
  previousStart.setDate(previousStart.getDate() - 7)
  return { currentStart, previousStart, now }
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

function mapPost(row: Record<string, unknown>): FeedbackPost {
  const media = ((row[MEDIA_TABLE] as Record<string, unknown>[] | undefined) || []).map((m) => ({
    url: String(m.url || ""),
    type: (m.type as "image" | "video") || "image",
    altText: String(m.alt_text || ""),
  }))

  return {
    id: String(row.id),
    userId: String(row.user_id || ""),
    userName: String(row.user_name || "Anonymous"),
    userAvatar: String(row.user_avatar || ""),
    serviceCategory: (row.service_category as ServiceCategory) || "Landing Page",
    projectTitle: String(row.project_title || ""),
    projectUrl: row.project_url ? String(row.project_url) : undefined,
    rating: Number(row.star_rating || 0),
    title: String(row.title || "Untitled"),
    content: String(row.body || ""),
    media,
    serviceDate: row.service_date ? String(row.service_date) : undefined,
    status: (row.status as FeedbackStatus) || "pending",
    isVerifiedClient: Boolean(row.is_verified_client),
    isVerifiedProject: Boolean(row.is_verified_project),
    isHighlighted: Boolean(row.is_highlighted),
    helpfulCount: Number(row.helpful_count || 0),
    downvoteCount: Number(row.downvote_count || 0),
    commentCount: Number(row.comment_count || 0),
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || row.created_at || new Date().toISOString()),
    improvementSuggestion: row.improvement_suggestion ? String(row.improvement_suggestion) : undefined,
  }
}

async function countPosts(filters: Record<string, string> = {}, from?: Date, to?: Date) {
  if (!supabase || !supabaseConfigured) return 0
  let query = supabase.from(POSTS_TABLE).select("*", { count: "exact", head: true })
  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value)
  })
  if (from) query = query.gte("created_at", from.toISOString())
  if (to) query = query.lt("created_at", to.toISOString())
  const { count } = await query
  return count || 0
}

export async function fetchAdminDashboardStats(): Promise<AdminDashboardStats> {
  if (!supabase || !supabaseConfigured) {
    return {
      totalSubmissions: 0,
      approved: 0,
      pending: 0,
      avgResponseTimeMs: 0,
      responseCount: 0,
      trends: { totalSubmissions: 0, approved: 0, pending: 0, avgResponseTimeMs: 0 },
      recentFeedback: [],
      activities: [],
      chartData: [],
      channelData: [],
    }
  }

  const { currentStart, previousStart, now } = weekBounds()
  const [
    totalSubmissions,
    approved,
    pending,
    currentTotal,
    previousTotal,
    currentApproved,
    previousApproved,
    currentPending,
    previousPending,
    postsResult,
  ] = await Promise.all([
    countPosts(),
    countPosts({ status: "approved" }),
    countPosts({ status: "pending" }),
    countPosts({}, currentStart, now),
    countPosts({}, previousStart, currentStart),
    countPosts({ status: "approved" }, currentStart, now),
    countPosts({ status: "approved" }, previousStart, currentStart),
    countPosts({ status: "pending" }, currentStart, now),
    countPosts({ status: "pending" }, previousStart, currentStart),
    supabase
      .from(POSTS_TABLE)
      .select(`*, ${MEDIA_TABLE}(*)`)
      .order("created_at", { ascending: false })
      .limit(200),
  ])

  const rows = (postsResult.data || []) as Record<string, unknown>[]
  const posts = rows.map(mapPost)
  const resolved = posts.filter((post) => ["approved", "rejected", "highlighted"].includes(post.status) && post.updatedAt)
  const responseTimeMs = resolved.map((post) => Math.max(0, new Date(post.updatedAt).getTime() - new Date(post.createdAt).getTime()))
  const avgResponseTimeMs = resolved.length
    ? Math.round(responseTimeMs.reduce((sum, ms) => sum + ms, 0) / resolved.length)
    : 0
  const currentResolved = resolved.filter((post) => new Date(post.updatedAt) >= currentStart)
  const previousResolved = resolved.filter((post) => new Date(post.updatedAt) >= previousStart && new Date(post.updatedAt) < currentStart)
  const currentAvgMs = currentResolved.length
    ? currentResolved.reduce((sum, post) => sum + (new Date(post.updatedAt).getTime() - new Date(post.createdAt).getTime()), 0) / currentResolved.length
    : 0
  const previousAvgMs = previousResolved.length
    ? previousResolved.reduce((sum, post) => sum + (new Date(post.updatedAt).getTime() - new Date(post.createdAt).getTime()), 0) / previousResolved.length
    : 0

  const chartData = Array.from({ length: 30 }, (_, index) => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - (29 - index))
    const next = new Date(date)
    next.setDate(next.getDate() + 1)
    return {
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count: posts.filter((post) => {
        const created = new Date(post.createdAt)
        return created >= date && created < next
      }).length,
    }
  })

  const colors = ["#4f6ef7", "#22c55e", "#f59e0b", "#8b5cf6", "#0ea5e9"]
  const counts = new Map<string, number>()
  posts.forEach((post) => counts.set(post.serviceCategory, (counts.get(post.serviceCategory) || 0) + 1))
  const channelData = [...counts.entries()].map(([channel, count], index) => ({ channel, count, color: colors[index % colors.length] }))

  const recentFeedback = posts.slice(0, 6)
  const activities = recentFeedback.map((post) => ({
    id: post.id,
    action: post.status === "pending" ? "submitted" : post.status,
    actor: post.userName,
    target: post.title,
    timestamp: post.createdAt,
  }))

  return {
    totalSubmissions,
    approved,
    pending,
    avgResponseTimeMs,
    responseCount: resolved.length,
    trends: {
      totalSubmissions: percentChange(currentTotal, previousTotal),
      approved: percentChange(currentApproved, previousApproved),
      pending: percentChange(currentPending, previousPending),
      avgResponseTimeMs: -percentChange(Math.round(currentAvgMs / 3600000), Math.round(previousAvgMs / 3600000)),
    },
    recentFeedback,
    activities,
    chartData,
    channelData,
  }
}

export async function fetchAdminClients(): Promise<Client[]> {
  if (!supabase || !supabaseConfigured) return []

  const { data, error } = await supabase
    .from(PROFILES_TABLE)
    .select("id, full_name, username, email, company, avatar_url, role, orders_count, services_count, created_at, updated_at")
    .eq("role", "client")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("fetchAdminClients failed", error)
    return []
  }

  const rows = (data || []) as Record<string, unknown>[]
  const feedbackCounts = await Promise.all(
    rows.map(async (row) => ({
      id: String(row.id),
      count: await countPosts({ user_id: String(row.id) }),
    })),
  )
  const feedbackByUser = new Map(feedbackCounts.map((item) => [item.id, item.count]))

  return rows.map((row) => ({
    id: String(row.id),
    uid: String(row.id),
    name: String(row.full_name || row.username || (row.email != null ? String(row.email).split("@")[0] : "") || "Unknown client"),
    email: String(row.email || ""),
    company: row.company ? String(row.company) : undefined,
    avatarUrl: row.avatar_url ? String(row.avatar_url) : undefined,
    role: "client",
    projectsCount: Number(row.orders_count || 0),
    servicesCount: Number(row.services_count || 0),
    feedbackCount: feedbackByUser.get(String(row.id)) || 0,
    lastActivity: String(row.updated_at || row.created_at || ""),
    createdAt: String(row.created_at || row.updated_at || new Date().toISOString()),
  }))
}

export async function fetchAdminNotifications(): Promise<AdminNotification[]> {
  if (!supabase || !supabaseConfigured) return []
  const { data, error } = await supabase
    .from(NOTIFICATIONS_TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10)
  if (error) {
    console.error("fetchAdminNotifications failed", error)
    return []
  }
  return ((data || []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    type: String(row.type),
    title: String(row.title),
    message: row.message ? String(row.message) : undefined,
    read: Boolean(row.read),
    createdAt: String(row.created_at),
  }))
}

export async function getUnreadAdminNotificationCount(): Promise<number> {
  if (!supabase || !supabaseConfigured) return 0
  const { count } = await supabase
    .from(NOTIFICATIONS_TABLE)
    .select("*", { count: "exact", head: true })
    .eq("read", false)
  return count || 0
}

export async function markAllAdminNotificationsRead() {
  if (!supabase || !supabaseConfigured) return
  await supabase.from(NOTIFICATIONS_TABLE).update({ read: true }).eq("read", false)
}

export async function markAdminNotificationRead(id: string) {
  if (!supabase || !supabaseConfigured) return
  await supabase.from(NOTIFICATIONS_TABLE).update({ read: true }).eq("id", id)
}

export function getSupabaseClient() {
  return supabase
}
