import { supabase, supabaseConfigured } from "./supabase/client"
import type { PaymentStatus, ProjectStatus, ServiceOrder } from "./types/serviceOrders"
import type { SocialPost } from "../data/feedbackStore"

export type DataAvailability = "ready" | "not_configured" | "error"

export interface CommandMetric {
  key: string
  label: string
  value: number | null
  money?: boolean
  availability: DataAvailability
  detail?: string
}

export interface AdminUserRow {
  id: string
  name: string
  username: string | null
  email: string | null
  phone: string | null
  country: string | null
  role: string
  status: "active" | "inactive" | "unknown"
  avatarUrl: string | null
  createdAt: string | null
  lastActivity: string | null
}

export interface PaymentRow {
  paymentId: string
  orderId: string
  client: string
  method: string | null
  amount: number
  currency: string
  status: PaymentStatus
  createdAt: string
  updatedAt: string
  transactionId: string | null
  captureId: string | null
  webhookData: unknown
}

export interface WebhookLogRow {
  id: string
  eventType: string
  status: string
  response: string | null
  payload: unknown
  timestamp: string
}

export interface CommunityStats {
  postsToday: number | null
  storiesToday: number | null
  reportsPending: number | null
  comments: number | null
  reactions: number | null
  recentStatus: SocialPost[]
  availability: DataAvailability
}

export interface BotNotificationRow {
  id: string
  type: string
  title: string
  orderId: string | null
  clientName: string | null
  amount: number | null
  status: string | null
  createdAt: string
  raw: unknown
}

export interface AdminCommandCenterData {
  metrics: CommandMetric[]
  orders: ServiceOrder[]
  payments: PaymentRow[]
  webhookLogs: WebhookLogRow[]
  wisePayments: PaymentRow[]
  users: AdminUserRow[]
  community: CommunityStats
  botNotifications: BotNotificationRow[]
  auditLogs: WebhookLogRow[]
  errors: string[]
}

type QueryResult<T> = {
  availability: DataAvailability
  data: T
  error?: string
}

type CountQuery = {
  eq: (column: string, value: unknown) => CountQuery
  neq: (column: string, value: unknown) => CountQuery
  is: (column: string, value: unknown) => CountQuery
}

const BOT_ID = "00000000-0000-0000-0000-000000000001"

function startOfToday() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date.toISOString()
}

function startOfMonth() {
  const date = new Date()
  date.setDate(1)
  date.setHours(0, 0, 0, 0)
  return date.toISOString()
}

function last30Days() {
  const date = new Date()
  date.setDate(date.getDate() - 30)
  return date.toISOString()
}

function isMissingRelation(error: unknown) {
  const message = String((error as { message?: string })?.message || error || "").toLowerCase()
  return message.includes("does not exist") || message.includes("schema cache") || message.includes("could not find")
}

async function safeQuery<T>(label: string, run: () => PromiseLike<{ data: T | null; error: unknown }>, fallback: T): Promise<QueryResult<T>> {
  if (!supabase || !supabaseConfigured) return { availability: "not_configured", data: fallback, error: "Supabase is not configured" }
  const result = await run()
  if (!result.error) return { availability: "ready", data: result.data ?? fallback }
  if (isMissingRelation(result.error)) return { availability: "not_configured", data: fallback, error: `${label} backend is not configured` }
  console.error(`${label} query failed`, result.error)
  return { availability: "error", data: fallback, error: `${label} could not be loaded` }
}

async function safeCount(table: string, label: string, apply?: (query: CountQuery) => CountQuery): Promise<QueryResult<number>> {
  if (!supabase || !supabaseConfigured) return { availability: "not_configured", data: 0, error: "Supabase is not configured" }
  let query = supabase.from(table).select("*", { count: "exact", head: true })
  if (apply) query = apply(query as unknown as CountQuery) as unknown as typeof query
  const { count, error } = await query
  if (!error) return { availability: "ready", data: count || 0 }
  if (isMissingRelation(error)) return { availability: "not_configured", data: 0, error: `${label} backend is not configured` }
  console.error(`${label} count failed`, error)
  return { availability: "error", data: 0, error: `${label} could not be counted` }
}

function mapOrder(row: Record<string, unknown>): ServiceOrder {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
  const profileRow = profile as { full_name?: string | null; avatar_url?: string | null } | null
  return {
    id: String(row.id),
    userId: (row.user_id as string) || null,
    clientName: String(row.client_name || "Unknown client"),
    clientEmail: String(row.client_email || ""),
    clientPhone: String(row.client_phone || ""),
    profile: profileRow ? { fullName: profileRow.full_name || null, avatarUrl: profileRow.avatar_url || null } : null,
    company: (row.company as string) || null,
    serviceSlug: String(row.service_slug || ""),
    serviceName: String(row.service_name || "Service"),
    totalPrice: Number(row.total_price || 0),
    upfrontAmount: Number(row.upfront_amount || 0),
    remainingAmount: Number(row.remaining_amount || 0),
    upfrontPaid: Boolean(row.upfront_paid),
    remainingPaid: Boolean(row.remaining_paid),
    paymentStatus: (row.payment_status as PaymentStatus) || "not_paid",
    projectStatus: (row.project_status as ProjectStatus) || "pending_checkout",
    paymentMethod: (row.payment_method as "paypal" | "wise" | "manual") || null,
    paypalOrderId: (row.paypal_order_id as string) || null,
    paypalCaptureId: (row.paypal_capture_id as string) || null,
    payerEmail: (row.payer_email as string) || null,
    paymentCurrency: (row.payment_currency as string) || null,
    paymentAmount: row.payment_amount == null ? null : Number(row.payment_amount),
    paymentClaimedAt: (row.payment_claimed_at as string) || null,
    paymentConfirmedAt: (row.payment_confirmed_at as string) || null,
    projectType: (row.project_type as string) || null,
    projectGoal: (row.project_goal as string) || null,
    projectDescription: String(row.project_description || ""),
    referencesText: (row.references_text as string) || null,
    currentProjectUrl: (row.current_project_url as string) || null,
    desiredDeadline: (row.desired_deadline as string) || null,
    budget: (row.budget as string) || null,
    budgetNotes: (row.budget_notes as string) || null,
    additionalNotes: (row.additional_notes as string) || null,
    adminNotes: (row.admin_notes as string) || null,
    deliveredProjectUrl: (row.delivered_project_url as string) || null,
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || row.created_at || new Date().toISOString()),
  }
}

function mapSocialPost(row: Record<string, unknown>): SocialPost {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
  const profileRow = profile as { full_name?: string | null; username?: string | null; avatar_url?: string | null } | null
  return {
    id: String(row.id),
    userId: String(row.user_id || ""),
    content: String(row.content || ""),
    mediaUrl: (row.media_url as string) || null,
    mediaType: (row.media_type as "image" | "video" | "audio") || null,
    category: (row.category as SocialPost["category"]) || "business",
    likesCount: Number(row.likes_count || 0),
    commentsCount: Number(row.comments_count || 0),
    viewsCount: Number(row.views_count || 0),
    isHidden: Boolean(row.is_hidden),
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || row.created_at || new Date().toISOString()),
    liked: false,
    comments: [],
    user: {
      id: String(row.user_id || ""),
      name: profileRow?.full_name || profileRow?.username || "CAFÉ member",
      username: profileRow?.username || null,
      avatarUrl: profileRow?.avatar_url || null,
    },
  }
}

function paymentFromOrder(order: ServiceOrder): PaymentRow {
  return {
    paymentId: order.paypalCaptureId || order.paypalOrderId || order.id,
    orderId: order.id,
    client: order.profile?.fullName || order.clientName,
    method: order.paymentMethod,
    amount: order.paymentAmount || order.upfrontAmount,
    currency: order.paymentCurrency || "USD",
    status: order.paymentStatus,
    createdAt: order.paymentClaimedAt || order.createdAt,
    updatedAt: order.paymentConfirmedAt || order.updatedAt,
    transactionId: order.paypalOrderId,
    captureId: order.paypalCaptureId,
    webhookData: null,
  }
}

function parseBotNotification(row: Record<string, unknown>): BotNotificationRow | null {
  try {
    const parsed = JSON.parse(String(row.content || "{}")) as Record<string, unknown>
    if (!parsed.cafeBotNotification) return null
    return {
      id: String(row.id),
      type: String(parsed.type || "notification"),
      title: String(parsed.title || "CAFÉ Bot notification"),
      orderId: (parsed.orderId as string) || null,
      clientName: (parsed.clientName as string) || null,
      amount: parsed.amount == null ? null : Number(parsed.amount),
      status: (parsed.status as string) || null,
      createdAt: String(row.created_at || parsed.createdAt || new Date().toISOString()),
      raw: parsed,
    }
  } catch {
    return null
  }
}

export async function fetchAdminCommandCenter(): Promise<AdminCommandCenterData> {
  const errors: string[] = []
  const today = startOfToday()
  const month = startOfMonth()
  const recent = last30Days()

  const [ordersResult, usersResult, postsResult, unreadMessages, feedbackPending, notificationsResult, socialComments, socialLikes, ticketsCount, auditResult] = await Promise.all([
    safeQuery("Orders", () =>
      supabase!
        .from("service_orders")
        .select("*, profiles(full_name, avatar_url)")
        .order("created_at", { ascending: false })
        .limit(300),
    [] as Record<string, unknown>[],
    ),
    safeQuery("Users", () =>
      supabase!
        .from("profiles")
        .select("id, full_name, username, email, phone, avatar_url, role, status, location_country, country, created_at, updated_at, last_seen_at")
        .order("created_at", { ascending: false })
        .limit(500),
    [] as Record<string, unknown>[],
    ),
    safeQuery("Community posts", () =>
      supabase!
        .from("social_posts")
        .select("*, profiles(full_name, username, avatar_url)")
        .order("created_at", { ascending: false })
        .limit(500),
    [] as Record<string, unknown>[],
    ),
    safeCount("messages", "Unread messages", (query) => query.is("read_at", null)),
    safeCount("feedback_posts", "Pending reviews", (query) => query.eq("status", "pending")),
    safeQuery("Notifications", () =>
      supabase!
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
    [] as Record<string, unknown>[],
    ),
    safeCount("social_post_comments", "Social comments"),
    safeCount("social_post_likes", "Social reactions"),
    safeCount("support_tickets", "Support tickets", (query) => query.neq("status", "closed")),
    safeQuery("Audit logs", () =>
      supabase!
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
    [] as Record<string, unknown>[],
    ),
  ])

  for (const item of [ordersResult, usersResult, postsResult, unreadMessages, feedbackPending, notificationsResult, socialComments, socialLikes, ticketsCount, auditResult]) {
    if (item.error) errors.push(item.error)
  }

  const orders = ordersResult.data.map(mapOrder)
  const posts = postsResult.data.map(mapSocialPost)
  const users: AdminUserRow[] = usersResult.data.map((row) => ({
    id: String(row.id),
    name: String(row.full_name || row.username || row.email || "Unknown user"),
    username: (row.username as string) || null,
    email: (row.email as string) || null,
    phone: (row.phone as string) || null,
    country: (row.location_country as string) || (row.country as string) || null,
    role: String(row.role || "user"),
    status: row.last_seen_at && String(row.last_seen_at) >= recent ? "active" : row.status ? String(row.status) === "active" ? "active" : "inactive" : "unknown",
    avatarUrl: (row.avatar_url as string) || null,
    createdAt: (row.created_at as string) || null,
    lastActivity: (row.last_seen_at as string) || (row.updated_at as string) || null,
  }))

  const paidOrders = orders.filter((order) => order.upfrontPaid || ["paid", "paid_upfront"].includes(order.projectStatus))
  const activeProjects = orders.filter((order) => ["paid", "paid_upfront", "in_progress", "waiting_delivery_payment"].includes(order.projectStatus))
  const completedProjects = orders.filter((order) => ["delivered", "completed"].includes(order.projectStatus))
  const pendingPayments = orders.filter((order) => ["awaiting_payment", "payment_claimed", "payment_pending", "waiting_payment"].includes(order.projectStatus) || ["client_claimed_paid", "wise_manual_review", "payment_pending", "waiting_upfront_payment"].includes(order.paymentStatus))
  const revenueAllTime = paidOrders.reduce((sum, order) => sum + (order.upfrontPaid ? order.upfrontAmount : 0) + (order.remainingPaid ? order.remainingAmount : 0), 0)
  const revenueThisMonth = paidOrders
    .filter((order) => (order.paymentConfirmedAt || order.updatedAt) >= month)
    .reduce((sum, order) => sum + (order.upfrontPaid ? order.upfrontAmount : 0) + (order.remainingPaid ? order.remainingAmount : 0), 0)
  const postsToday = posts.filter((post) => post.createdAt >= today).length
  const botRows = await safeQuery("CAFÉ Bot notifications", () =>
    supabase!
      .from("messages")
      .select("id, content, created_at")
      .eq("sender_id", BOT_ID)
      .order("created_at", { ascending: false })
      .limit(100),
  [] as Record<string, unknown>[],
  )
  if (botRows.error) errors.push(botRows.error)

  const botNotifications = botRows.data.map(parseBotNotification).filter((row): row is BotNotificationRow => !!row)
  const webhookLogs: WebhookLogRow[] = notificationsResult.data
    .filter((row) => String(row.type || "").includes("webhook") || String(row.type || "").includes("payment"))
    .map((row) => ({
      id: String(row.id),
      eventType: String((row.payload as Record<string, unknown> | null)?.eventType || row.type || "payment_event"),
      status: String(row.title || "Received"),
      response: row.message ? String(row.message) : null,
      payload: row.payload,
      timestamp: String(row.created_at || new Date().toISOString()),
    }))
  const auditLogs: WebhookLogRow[] = auditResult.data.map((row) => ({
    id: String(row.id),
    eventType: String(row.action || row.event_type || row.type || "admin_action"),
    status: String(row.status || row.title || "Recorded"),
    response: row.description || row.message ? String(row.description || row.message) : null,
    payload: row.payload || row.metadata || row,
    timestamp: String(row.created_at || row.timestamp || new Date().toISOString()),
  }))

  const payments = orders
    .filter((order) => order.paymentStatus !== "not_paid" || order.paymentMethod || order.paypalOrderId || order.paypalCaptureId)
    .map(paymentFromOrder)

  const metrics: CommandMetric[] = [
    { key: "total_orders", label: "Total Orders", value: orders.length, availability: ordersResult.availability },
    { key: "active_projects", label: "Active Projects", value: activeProjects.length, availability: ordersResult.availability },
    { key: "completed_projects", label: "Completed Projects", value: completedProjects.length, availability: ordersResult.availability },
    { key: "revenue_month", label: "Revenue This Month", value: revenueThisMonth, money: true, availability: ordersResult.availability },
    { key: "revenue_all", label: "Revenue All Time", value: revenueAllTime, money: true, availability: ordersResult.availability },
    { key: "pending_payments", label: "Pending Payments", value: pendingPayments.length, availability: ordersResult.availability },
    { key: "pending_reviews", label: "Pending Reviews", value: feedbackPending.data, availability: feedbackPending.availability },
    { key: "new_users", label: "New Users", value: users.filter((user) => user.createdAt && user.createdAt >= month).length, availability: usersResult.availability },
    { key: "active_users", label: "Active Users", value: users.filter((user) => user.status === "active").length, availability: usersResult.availability },
    { key: "stories_today", label: "Stories Today", value: postsToday, availability: postsResult.availability, detail: "Backed by social_posts status updates" },
    { key: "community_posts", label: "Community Posts", value: posts.length, availability: postsResult.availability },
    { key: "unread_messages", label: "Unread Messages", value: unreadMessages.data, availability: unreadMessages.availability },
    { key: "open_tickets", label: "Open Support Tickets", value: ticketsCount.availability === "ready" ? ticketsCount.data : null, availability: ticketsCount.availability },
  ]

  return {
    metrics,
    orders,
    payments,
    webhookLogs,
    wisePayments: payments.filter((payment) => payment.method === "wise"),
    users,
    community: {
      postsToday,
      storiesToday: postsToday,
      reportsPending: null,
      comments: socialComments.availability === "ready" ? socialComments.data : null,
      reactions: socialLikes.availability === "ready" ? socialLikes.data : null,
      recentStatus: posts.slice(0, 6),
      availability: postsResult.availability,
    },
    botNotifications,
    auditLogs,
    errors,
  }
}
