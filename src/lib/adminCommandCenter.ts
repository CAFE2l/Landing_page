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

export interface RecentMessageThread {
  id: string
  clientName: string
  username: string | null
  avatarUrl: string | null
  lastMessage: string | null
  lastMessageAt: string
  unreadCount: number
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
  recentMessages: RecentMessageThread[]
  recentMessagesAvailability: DataAvailability
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

function startOfMonth() {
  const date = new Date()
  date.setDate(1)
  date.setHours(0, 0, 0, 0)
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

function summarizeMessage(row: Record<string, unknown> | null | undefined) {
  if (!row) return null
  const content = String(row.content || "")
  try {
    const parsed = JSON.parse(content) as { cafeBotNotification?: boolean; title?: string; clientName?: string; amount?: number }
    if (parsed.cafeBotNotification && parsed.title) {
      return [parsed.title, parsed.clientName, parsed.amount == null ? null : `$${parsed.amount}`].filter(Boolean).join(" · ")
    }
  } catch {
    // Plain chat messages are expected here.
  }

  const messageType = String(row.message_type || "text")
  if (messageType === "image") return row.caption ? `Image · ${String(row.caption).slice(0, 80)}` : "Image"
  if (messageType === "video") return row.caption ? `Video · ${String(row.caption).slice(0, 80)}` : "Video"
  if (messageType === "audio") return "Audio message"
  if (messageType === "file") return row.file_name ? `File · ${String(row.file_name).slice(0, 80)}` : "File"
  if (messageType === "sticker") return "Sticker"
  return content || null
}

async function fetchRecentMessageThreads(currentUserId: string | null): Promise<QueryResult<RecentMessageThread[]>> {
  if (!currentUserId) return { availability: supabaseConfigured ? "ready" : "not_configured", data: [] }

  const conversationsResult = await safeQuery("Recent messages", () =>
    supabase!
      .from("conversations")
      .select("id, participant_1, participant_2, last_message, last_message_at, created_at, updated_at")
      .or(`participant_1.eq.${currentUserId},participant_2.eq.${currentUserId}`)
      .order("last_message_at", { ascending: false })
      .limit(8),
  [] as Record<string, unknown>[])

  if (conversationsResult.availability !== "ready" || conversationsResult.data.length === 0) {
    return { availability: conversationsResult.availability, data: [], error: conversationsResult.error }
  }

  const conversationIds = conversationsResult.data.map((row) => String(row.id))
  const otherIds = conversationsResult.data
    .map((row) => String(row.participant_1) === currentUserId ? String(row.participant_2) : String(row.participant_1))
    .filter(Boolean)

  const [profilesResult, messagesResult] = await Promise.all([
    safeQuery("Message profiles", () =>
      supabase!
        .from("profiles")
        .select("id, full_name, username, email, avatar_url")
        .in("id", otherIds),
    [] as Record<string, unknown>[]),
    safeQuery("Message previews", () =>
      supabase!
        .from("messages")
        .select("conversation_id, sender_id, receiver_id, read_at, created_at, content, message_type, caption, file_name")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false }),
    [] as Record<string, unknown>[]),
  ])

  const profileMap = new Map(profilesResult.data.map((profile) => [String(profile.id), profile]))
  const latestByConversation = new Map<string, Record<string, unknown>>()
  const unreadByConversation = new Map<string, number>()

  for (const message of messagesResult.data) {
    const conversationId = String(message.conversation_id)
    if (!latestByConversation.has(conversationId)) latestByConversation.set(conversationId, message)
    if (String(message.receiver_id || "") === currentUserId && !message.read_at) {
      unreadByConversation.set(conversationId, (unreadByConversation.get(conversationId) || 0) + 1)
    }
  }

  const threads = conversationsResult.data.map((row) => {
    const id = String(row.id)
    const otherId = String(row.participant_1) === currentUserId ? String(row.participant_2) : String(row.participant_1)
    const profile = profileMap.get(otherId)
    const latest = latestByConversation.get(id)
    const rowPreview = row.last_message ? { content: row.last_message, message_type: "text" } : null
    return {
      id,
      clientName: String(profile?.full_name || profile?.username || profile?.email || "Unknown client"),
      username: (profile?.username as string) || null,
      avatarUrl: (profile?.avatar_url as string) || null,
      lastMessage: summarizeMessage(latest || rowPreview),
      lastMessageAt: String(latest?.created_at || row.last_message_at || row.updated_at || row.created_at || new Date().toISOString()),
      unreadCount: unreadByConversation.get(id) || 0,
    }
  })

  const error = profilesResult.error || messagesResult.error
  return { availability: error ? "error" : "ready", data: threads, error }
}

export async function fetchAdminCommandCenter(): Promise<AdminCommandCenterData> {
  const errors: string[] = []
  const month = startOfMonth()
  const currentUserId = supabase && supabaseConfigured ? (await supabase.auth.getUser()).data.user?.id || null : null

  const [ordersResult, unreadMessages, notificationsResult] = await Promise.all([
    safeQuery("Orders", () =>
      supabase!
        .from("service_orders")
        .select("*, profiles(full_name, avatar_url)")
        .order("created_at", { ascending: false })
        .limit(300),
    [] as Record<string, unknown>[],
    ),
    safeCount("messages", "Unread messages", (query) => query.is("read_at", null)),
    safeQuery("Notifications", () =>
      supabase!
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
    [] as Record<string, unknown>[],
    ),
  ])

  for (const item of [ordersResult, unreadMessages, notificationsResult]) {
    if (item.error) errors.push(item.error)
  }

  const orders = ordersResult.data.map(mapOrder)

  const paidOrders = orders.filter((order) => order.upfrontPaid || ["paid", "paid_upfront"].includes(order.projectStatus))
  const activeProjects = orders.filter((order) => ["paid", "paid_upfront", "in_progress", "waiting_delivery_payment"].includes(order.projectStatus))
  const completedProjects = orders.filter((order) => ["delivered", "completed"].includes(order.projectStatus))
  const pendingPayments = orders.filter((order) => ["awaiting_payment", "payment_claimed", "payment_pending", "waiting_payment"].includes(order.projectStatus) || ["client_claimed_paid", "wise_manual_review", "payment_pending", "waiting_upfront_payment"].includes(order.paymentStatus))
  const revenueThisMonth = paidOrders
    .filter((order) => (order.paymentConfirmedAt || order.updatedAt) >= month)
    .reduce((sum, order) => sum + (order.upfrontPaid ? order.upfrontAmount : 0) + (order.remainingPaid ? order.remainingAmount : 0), 0)
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
  const recentMessagesResult = await fetchRecentMessageThreads(currentUserId)
  if (recentMessagesResult.error) errors.push(recentMessagesResult.error)

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
  const payments = orders
    .filter((order) => order.paymentStatus !== "not_paid" || order.paymentMethod || order.paypalOrderId || order.paypalCaptureId)
    .map(paymentFromOrder)

  const metrics: CommandMetric[] = [
    { key: "revenue_month", label: "Revenue This Month", value: revenueThisMonth, money: true, availability: ordersResult.availability },
    { key: "pending_payments", label: "Pending Payments", value: pendingPayments.length, availability: ordersResult.availability },
    { key: "active_projects", label: "Active Projects", value: activeProjects.length, availability: ordersResult.availability },
    { key: "new_orders", label: "New Orders", value: orders.filter((order) => order.createdAt >= month).length, availability: ordersResult.availability },
    { key: "unread_messages", label: "Unread Messages", value: unreadMessages.data, availability: unreadMessages.availability },
    { key: "completed_projects", label: "Completed Projects", value: completedProjects.length, availability: ordersResult.availability },
  ]

  return {
    metrics,
    orders,
    payments,
    webhookLogs,
    wisePayments: payments.filter((payment) => payment.method === "wise"),
    users: [],
    community: {
      postsToday: null,
      storiesToday: null,
      reportsPending: null,
      comments: null,
      reactions: null,
      recentStatus: [],
      availability: "not_configured",
    },
    botNotifications,
    recentMessages: recentMessagesResult.data,
    recentMessagesAvailability: recentMessagesResult.availability,
    auditLogs: [],
    errors,
  }
}
