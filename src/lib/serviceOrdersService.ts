import { supabase, supabaseConfigured } from "./supabase/client"
import type { ServiceOrder, Notification, ProjectStatus, PaymentStatus } from "./types/serviceOrders"
import toast from "react-hot-toast"

function mapOrder(row: Record<string, unknown>): ServiceOrder {
  return {
    id: row.id as string,
    userId: (row.user_id as string) || null,
    clientName: row.client_name as string,
    clientEmail: row.client_email as string,
    clientPhone: row.client_phone as string,
    company: (row.company as string) || null,
    serviceSlug: row.service_slug as string,
    serviceName: row.service_name as string,
    totalPrice: Number(row.total_price),
    upfrontAmount: Number(row.upfront_amount),
    remainingAmount: Number(row.remaining_amount),
    upfrontPaid: row.upfront_paid as boolean,
    remainingPaid: row.remaining_paid as boolean,
    paymentStatus: row.payment_status as PaymentStatus,
    projectStatus: row.project_status as ProjectStatus,
    projectType: (row.project_type as string) || null,
    projectGoal: (row.project_goal as string) || null,
    projectDescription: row.project_description as string,
    referencesText: (row.references_text as string) || null,
    currentProjectUrl: (row.current_project_url as string) || null,
    desiredDeadline: (row.desired_deadline as string) || null,
    budget: (row.budget as string) || null,
    budgetNotes: (row.budget_notes as string) || null,
    additionalNotes: (row.additional_notes as string) || null,
    adminNotes: (row.admin_notes as string) || null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export async function fetchServiceOrders(): Promise<ServiceOrder[]> {
  if (!supabase || !supabaseConfigured) return []
  const { data, error } = await supabase
    .from("service_orders")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("fetchServiceOrders failed", error)
    return []
  }
  return ((data || []) as Record<string, unknown>[]).map(mapOrder)
}

export async function fetchServiceOrder(id: string): Promise<ServiceOrder | null> {
  if (!supabase || !supabaseConfigured) return null
  const { data, error } = await supabase
    .from("service_orders")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error || !data) return null
  return mapOrder(data as Record<string, unknown>)
}

export async function createServiceOrder(
  input: {
    userId?: string
    clientName: string
    clientEmail: string
    clientPhone: string
    company?: string
    serviceSlug: string
    serviceName: string
    totalPrice: number
    projectType?: string
    projectGoal?: string
    projectDescription: string
    referencesText?: string
    currentProjectUrl?: string
    desiredDeadline?: string
    budget?: string
    budgetNotes?: string
    additionalNotes?: string
  },
): Promise<ServiceOrder | null> {
  if (!supabase || !supabaseConfigured) return null

  const upfrontAmount = Math.round(input.totalPrice * 0.5 * 100) / 100
  const remainingAmount = input.totalPrice - upfrontAmount

  const payload: Record<string, unknown> = {
    user_id: input.userId || null,
    client_name: input.clientName,
    client_email: input.clientEmail,
    client_phone: input.clientPhone,
    company: input.company || null,
    service_slug: input.serviceSlug,
    service_name: input.serviceName,
    total_price: input.totalPrice,
    upfront_amount: upfrontAmount,
    remaining_amount: remainingAmount,
    project_type: input.projectType || null,
    project_goal: input.projectGoal || null,
    project_description: input.projectDescription,
    references_text: input.referencesText || null,
    current_project_url: input.currentProjectUrl || null,
    desired_deadline: input.desiredDeadline || null,
    budget: input.budget || null,
    budget_notes: input.budgetNotes || null,
    additional_notes: input.additionalNotes || null,
  }

  const { data, error } = await supabase
    .from("service_orders")
    .insert(payload)
    .select()
    .single()

  if (error) {
    console.error("createServiceOrder failed", error)
    toast.error("Failed to create service order")
    return null
  }

  const order = mapOrder(data as Record<string, unknown>)

  await createNotification({
    type: "new_service_order",
    title: "New Service Order",
    message: `${input.clientName} — ${input.serviceName} — $${upfrontAmount}`,
    payload: { orderId: order.id },
  })

  await createWebsiteBotMessage(order)

  return order
}

export async function updateServiceOrder(
  id: string,
  updates: Partial<{
    projectStatus: ProjectStatus
    paymentStatus: PaymentStatus
    upfrontPaid: boolean
    remainingPaid: boolean
    adminNotes: string
  }>,
): Promise<boolean> {
  if (!supabase || !supabaseConfigured) return false

  const dbPayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (updates.projectStatus !== undefined) dbPayload.project_status = updates.projectStatus
  if (updates.paymentStatus !== undefined) dbPayload.payment_status = updates.paymentStatus
  if (updates.upfrontPaid !== undefined) dbPayload.upfront_paid = updates.upfrontPaid
  if (updates.remainingPaid !== undefined) dbPayload.remaining_paid = updates.remainingPaid
  if (updates.adminNotes !== undefined) dbPayload.admin_notes = updates.adminNotes

  const { error } = await supabase
    .from("service_orders")
    .update(dbPayload)
    .eq("id", id)

  if (error) {
    console.error("updateServiceOrder failed", error)
    toast.error("Failed to update order")
    return false
  }

  if (updates.projectStatus) {
    await createNotification({
      type: "order_status",
      title: "Order Status Updated",
      message: `Order ${id.slice(0, 8)} → ${updates.projectStatus}`,
      payload: { orderId: id, status: updates.projectStatus },
    })
  }

  return true
}

export async function fetchUserServiceOrders(userId: string): Promise<ServiceOrder[]> {
  if (!supabase || !supabaseConfigured) return []
  const { data, error } = await supabase
    .from("service_orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) return []
  return ((data || []) as Record<string, unknown>[]).map(mapOrder)
}

// ========== Notifications ==========

export async function createNotification(input: {
  type: string
  title: string
  message?: string
  payload?: unknown
}): Promise<void> {
  if (!supabase || !supabaseConfigured) return

  await supabase.from("notifications").insert({
    type: input.type,
    title: input.title,
    message: input.message || null,
    payload: input.payload ? JSON.parse(JSON.stringify(input.payload)) : null,
    is_read: false,
  })
}

export async function fetchNotifications(limit = 10): Promise<Notification[]> {
  if (!supabase || !supabaseConfigured) return []

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("is_read", false)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) return []
  return ((data || []) as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    type: row.type as string,
    title: row.title as string,
    message: (row.message as string) || null,
    payload: row.payload as unknown,
    isRead: row.is_read as boolean,
    createdAt: row.created_at as string,
  }))
}

export async function markNotificationsRead(): Promise<void> {
  if (!supabase || !supabaseConfigured) return
  await supabase.from("notifications").update({ is_read: true }).eq("is_read", false)
}

export async function subscribeToNotifications(onNotification: () => void) {
  const client = supabase
  if (!client || !supabaseConfigured) return () => {}
  const channel = client
    .channel("notifications")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, onNotification)
    .subscribe()
  return () => { client.removeChannel(channel) }
}

export async function subscribeToServiceOrders(onChange: () => void) {
  const client = supabase
  if (!client || !supabaseConfigured) return () => {}
  const channel = client
    .channel("service-orders")
    .on("postgres_changes", { event: "*", schema: "public", table: "service_orders" }, onChange)
    .subscribe()
  return () => { client.removeChannel(channel) }
}

// ========== CAFÉ Website Bot ==========

async function createWebsiteBotMessage(order: ServiceOrder): Promise<void> {
  if (!supabase || !supabaseConfigured) return

  const fakeBotUserId = "00000000-0000-0000-0000-000000000001"
  const adminUserId = "00000000-0000-0000-0000-000000000002"

  const botMessage = [
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🆕 NEW SERVICE ORDER RECEIVED`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `Client: ${order.clientName}`,
    `Email: ${order.clientEmail}`,
    `WhatsApp: ${order.clientPhone}`,
    order.company ? `Company: ${order.company}` : ``,
    `Service: ${order.serviceName}`,
    `Total: $${order.totalPrice}`,
    `Upfront (50%): $${order.upfrontAmount}`,
    `Remaining (50%): $${order.remainingAmount}`,
    `Deadline: ${order.desiredDeadline || "To be discussed"}`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Description:`,
    order.projectDescription,
    ``,
    order.referencesText ? `References: ${order.referencesText}` : ``,
    order.currentProjectUrl ? `Project URL: ${order.currentProjectUrl}` : ``,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Actions needed:`,
    `  • Open in admin → /admin/service-orders`,
    `  • Contact client via WhatsApp`,
    `  • Set project status`,
  ]
    .filter(Boolean)
    .join("\n")

  const { data: botConv } = await supabase
    .from("conversations")
    .select("id")
    .or(`and(participant_1.eq.${fakeBotUserId},participant_2.eq.${adminUserId}),and(participant_1.eq.${adminUserId},participant_2.eq.${fakeBotUserId})`)
    .maybeSingle()

  let convId: string
  if (botConv) {
    convId = botConv.id as string
  } else {
    const { data: newConv } = await supabase
      .from("conversations")
      .insert({
        participant_1: fakeBotUserId,
        participant_2: adminUserId,
        last_message: botMessage.slice(0, 200),
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (!newConv) return
    convId = (newConv as Record<string, unknown>).id as string
  }

  await supabase.from("messages").insert({
    conversation_id: convId,
    sender_id: fakeBotUserId,
    receiver_id: adminUserId,
    content: botMessage,
    message_type: "text",
    delivered_at: new Date().toISOString(),
  })

  await supabase
    .from("conversations")
    .update({
      last_message: `📦 New order: ${order.serviceName} — ${order.clientName}`,
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", convId)
}

// ========== WhatsApp notification ==========

export function generateAdminWhatsAppLink(order: ServiceOrder): string {
  const msg = encodeURIComponent(
    `*New Service Order Received*\n\n` +
    `Client: ${order.clientName}\n` +
    `Email: ${order.clientEmail}\n` +
    `Phone: ${order.clientPhone}\n` +
    `Service: ${order.serviceName}\n` +
    `Total: $${order.totalPrice}\n` +
    `Upfront: $${order.upfrontAmount}\n` +
    `Status: ${order.projectStatus}`
  )
  return `https://wa.me/554199999999?text=${msg}`
}
