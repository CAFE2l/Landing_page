import { supabase, supabaseConfigured } from "./supabase/client"
import type { ServiceOrder, Notification, ProjectStatus, PaymentStatus } from "./types/serviceOrders"
import type { PhoneFields } from "../components/ui/PhoneInput"
import { ensureProfileFromAuthUser } from "./supabaseProfile"
import { isAdminEmail } from "./adminUsers"
import toast from "react-hot-toast"

type ProfileJoin = { full_name: string | null; avatar_url: string | null } | null

function mapOrder(row: Record<string, unknown>): ServiceOrder {
  const profileRow = row.profiles as ProfileJoin | ProfileJoin[] | undefined
  const profile = Array.isArray(profileRow) ? profileRow[0] : profileRow

  return {
    id: row.id as string,
    userId: (row.user_id as string) || null,
    clientName: row.client_name as string,
    clientEmail: row.client_email as string,
    clientPhone: row.client_phone as string,
    profile: profile
      ? { fullName: profile.full_name, avatarUrl: profile.avatar_url }
      : null,
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
    deliveredProjectUrl: (row.delivered_project_url as string) || null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export function getOrderDisplayName(order: ServiceOrder): string {
  if (order.userId && order.profile?.fullName) return order.profile.fullName
  return order.clientName
}

export function getOrderAvatarUrl(order: ServiceOrder): string | null {
  return order.profile?.avatarUrl || null
}

const ORDER_SELECT = `
  *,
  profiles (
    full_name,
    avatar_url
  )
`

async function fetchOrdersWithFallback(filter?: { userId?: string }): Promise<ServiceOrder[]> {
  if (!supabase || !supabaseConfigured) return []

  let query = supabase.from("service_orders").select(ORDER_SELECT).order("created_at", { ascending: false })
  if (filter?.userId) query = query.eq("user_id", filter.userId)

  const { data, error } = await query
  if (!error) return ((data || []) as Record<string, unknown>[]).map(mapOrder)

  let fallbackQuery = supabase.from("service_orders").select("*").order("created_at", { ascending: false })
  if (filter?.userId) fallbackQuery = fallbackQuery.eq("user_id", filter.userId)
  const retry = await fallbackQuery
  if (retry.error) {
    console.error("fetchServiceOrders failed", retry.error)
    return []
  }
  return ((retry.data || []) as Record<string, unknown>[]).map(mapOrder)
}

export async function fetchServiceOrders(): Promise<ServiceOrder[]> {
  return fetchOrdersWithFallback()
}

export async function fetchServiceOrder(id: string): Promise<ServiceOrder | null> {
  if (!supabase || !supabaseConfigured) return null
  const { data, error } = await supabase
    .from("service_orders")
    .select(ORDER_SELECT)
    .eq("id", id)
    .maybeSingle()

  if (!error && data) return mapOrder(data as Record<string, unknown>)

  const retry = await supabase
    .from("service_orders")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (retry.error || !retry.data) return null
  return mapOrder(retry.data as Record<string, unknown>)
}

async function resolveClientFromProfile(
  userId: string | undefined,
  fallback: { clientName: string; clientEmail: string; clientPhone: string },
): Promise<{ clientName: string; clientEmail: string; clientPhone: string; avatarUrl?: string }> {
  if (!userId || !supabase || !supabaseConfigured) return fallback

  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== userId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, phone, avatar_url")
      .eq("id", userId)
      .maybeSingle()

    if (profile) {
      return {
        clientName: (profile.full_name as string) || fallback.clientName,
        clientEmail: (profile.email as string) || fallback.clientEmail,
        clientPhone: (profile.phone as string) || fallback.clientPhone,
        avatarUrl: (profile.avatar_url as string) || undefined,
      }
    }
    return fallback
  }

  const profile = await ensureProfileFromAuthUser(user)
  return {
    clientName: profile.name || fallback.clientName,
    clientEmail: profile.email || fallback.clientEmail,
    clientPhone: profile.phone || fallback.clientPhone,
    avatarUrl: profile.photoUrl,
  }
}

export async function createServiceOrder(
  input: {
    userId?: string
    clientName: string
    clientEmail: string
    clientPhone: string
    phoneFields?: PhoneFields
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

  const resolved = await resolveClientFromProfile(input.userId, {
    clientName: input.clientName,
    clientEmail: input.clientEmail,
    clientPhone: input.clientPhone,
  })

  const phoneE164 = input.phoneFields?.phone_e164 || input.clientPhone

  const payload: Record<string, unknown> = {
    user_id: input.userId || null,
    client_name: input.clientName.trim(),
    client_email: resolved.clientEmail,
    client_phone: phoneE164,
    company: input.company || null,
    service_slug: input.serviceSlug,
    service_name: input.serviceName,
    total_price: input.totalPrice,
    upfront_amount: upfrontAmount,
    remaining_amount: remainingAmount,
    upfront_paid: false,
    remaining_paid: false,
    payment_status: "waiting_upfront_payment",
    project_status: "new_request",
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

  if (input.phoneFields) {
    payload.phone_country_code = input.phoneFields.phone_country_code
    payload.phone_country = input.phoneFields.phone_country
    payload.phone_number = input.phoneFields.phone_number
    payload.phone_e164 = input.phoneFields.phone_e164
  }

  const { data, error } = await supabase
    .from("service_orders")
    .insert(payload)
    .select(ORDER_SELECT)
    .single()

  if (error) {
    if (input.phoneFields && error.message?.includes("phone_country")) {
      const { phone_country_code: _a, phone_country: _b, phone_number: _c, phone_e164: _d, ...fallbackPayload } = payload
      const retry = await supabase
        .from("service_orders")
        .insert(fallbackPayload)
        .select(ORDER_SELECT)
        .single()
      if (retry.error) {
        console.error("createServiceOrder failed", retry.error)
        toast.error("Failed to create service order")
        return null
      }
      const order = mapOrder(retry.data as Record<string, unknown>)
      await notifyNewOrder(order, input.serviceName, upfrontAmount)
      return order
    }
    console.error("createServiceOrder failed", error)
    toast.error("Failed to create service order")
    return null
  }

  const order = mapOrder(data as Record<string, unknown>)
  await notifyNewOrder(order, input.serviceName, upfrontAmount)
  return order
}

async function sendBotMessageToUser(userId: string, message: string, preview: string): Promise<void> {
  if (!supabase || !supabaseConfigured) return
  const fakeBotUserId = "00000000-0000-0000-0000-000000000001"

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .or(`and(participant_1.eq.${fakeBotUserId},participant_2.eq.${userId}),and(participant_1.eq.${userId},participant_2.eq.${fakeBotUserId})`)
    .maybeSingle()

  let convId: string
  if (existing) {
    convId = existing.id as string
  } else {
    const { data: newConv } = await supabase
      .from("conversations")
      .insert({
        participant_1: fakeBotUserId,
        participant_2: userId,
        last_message: preview.slice(0, 200),
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
    receiver_id: userId,
    content: message,
    message_type: "text",
    delivered_at: new Date().toISOString(),
  })

  await supabase
    .from("conversations")
    .update({ last_message: preview.slice(0, 200), last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", convId)
}

async function notifyNewOrder(order: ServiceOrder, serviceName: string, upfrontAmount: number): Promise<void> {
  const displayName = getOrderDisplayName(order)

  await createNotification({
    type: "new_service_order",
    title: "New order received",
    message: `${displayName} — ${serviceName} — Payment Pending ($${upfrontAmount} upfront)`,
  })

  // Notify the client via bot DM if they have an account
  if (order.userId) {
    const userMsg = [
      `🎉 Your order was received!`,
      ``,
      `Service: ${serviceName}`,
      `Total: $${order.totalPrice}`,
      `Upfront (50%): $${upfrontAmount}`,
      ``,
      `✅ Your order has been added to your order history. You can track it anytime in your profile under "My Orders".`,
      ``,
      `Next step: complete your upfront payment so we can start your project. We'll be in touch shortly!`,
    ].join("\n")
    await sendBotMessageToUser(order.userId, userMsg, `🎉 Order received: ${serviceName} — check your order history!`)
  }

  const { data: adminProfile } = await supabase!
    .from("profiles")
    .select("id")
    .eq("email", "gutiajs@gmail.com")
    .maybeSingle()

  if (adminProfile?.id) {
    await supabase!.rpc("notify_payment_bot", {
      p_order_id: order.id,
      p_display_name: displayName,
      p_service_name: serviceName,
      p_amount: upfrontAmount,
      p_method: "new_order",
      p_admin_id: adminProfile.id,
    })
  }
}

export async function requestPaymentLink(orderId: string, method: string): Promise<boolean> {
  const order = await fetchServiceOrder(orderId)
  if (!order) return false

  await createNotification({
    type: "payment_link_request",
    title: "Client requested a payment link",
    message: `${getOrderDisplayName(order)} requested ${method} payment for order ${order.id.slice(0, 8)}`,
    payload: { orderId, method, status: order.paymentStatus },
  })

  toast.success("Request sent! CAFÉ Services will contact you with payment details.")
  return true
}

export async function confirmPayment(
  orderId: string,
  method: string,
): Promise<boolean> {
  if (!supabase || !supabaseConfigured) return false

  const order = await fetchServiceOrder(orderId)
  if (!order) return false

  const displayName = getOrderDisplayName(order)

  await createNotification({
    type: "payment_confirmation",
    title: "Payment Notified",
    message: `${displayName} sent payment via ${method} for order ${order.id.slice(0, 8)}`,
    payload: { orderId, method, status: order.paymentStatus, amount: order.upfrontAmount },
  })

  // Notify the client via bot DM
  if (order.userId) {
    const userMsg = [
      `✅ Payment notification sent!`,
      ``,
      `We received your payment notification for:`,
      `Service: ${order.serviceName}`,
      `Amount: $${order.upfrontAmount}`,
      ``,
      `Our team will verify and confirm your payment shortly. You can track your order status in your profile under "My Orders".`,
    ].join("\n")
    await sendBotMessageToUser(order.userId, userMsg, `✅ Payment notification received for ${order.serviceName}`)
  }

  // Get the real admin user ID to send the bot message to
  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", "gutiajs@gmail.com")
    .maybeSingle()

  if (adminProfile?.id) {
    await supabase.rpc("notify_payment_bot", {
      p_order_id: order.id,
      p_display_name: displayName,
      p_service_name: order.serviceName,
      p_amount: order.upfrontAmount,
      p_method: method,
      p_admin_id: adminProfile.id,
    })
  }

  return true
}

async function sendBotPaymentConfirmation(order: ServiceOrder): Promise<void> {
  if (!supabase || !supabaseConfigured) return

  const fakeBotUserId = "00000000-0000-0000-0000-000000000001"
  const adminUserId = "00000000-0000-0000-0000-000000000002"
  const displayName = getOrderDisplayName(order)

  const botMessage = [
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `✅ UPFRONT PAYMENT CONFIRMED`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `Client: ${displayName}`,
    `Service: ${order.serviceName}`,
    `Amount: $${order.upfrontAmount}`,
    `Order: ${order.id}`,
    ``,
    `Status: Ready to start! 🚀`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
  ].join("\n")
  const preview = `✅ Payment confirmed: ${displayName} — $${order.upfrontAmount} — Ready to start! 🚀`

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
        last_message: preview.slice(0, 200),
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
      last_message: preview.slice(0, 200),
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", convId)
}

async function sendBotDeliveryMessage(order: ServiceOrder, projectUrl?: string): Promise<void> {
  if (!supabase || !supabaseConfigured) return

  const fakeBotUserId = "00000000-0000-0000-0000-000000000001"
  const adminUserId = "00000000-0000-0000-0000-000000000002"
  const displayName = getOrderDisplayName(order)

  const botMessage = [
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🎉 PROJECT DELIVERED`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `Client: ${displayName}`,
    `Service: ${order.serviceName}`,
    projectUrl ? `Project URL: ${projectUrl}` : ``,
    ``,
    `A congratulations message has been sent to the client.`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
  ].filter(Boolean).join("\n")

  const preview = `🎉 Delivered: ${order.serviceName} — ${displayName}`

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
        last_message: preview.slice(0, 200),
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
    .update({ last_message: preview.slice(0, 200), last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", convId)
}

async function sendBotPaymentNotification(order: ServiceOrder, event: string): Promise<void> {
  if (!supabase || !supabaseConfigured) return

  const fakeBotUserId = "00000000-0000-0000-0000-000000000001"
  const adminUserId = "00000000-0000-0000-0000-000000000002"
  const displayName = getOrderDisplayName(order)

  const isApproved = event === "approved_via_paypal"
  const isRequest = event.startsWith("requested_")

  let botMessage: string
  let preview: string

  if (isApproved) {
    botMessage = [
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `💳 PAYMENT APPROVED VIA PAYPAL`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `Client: ${displayName}`,
      `Service: ${order.serviceName}`,
      `Amount: $${order.upfrontAmount}`,
      `Order: ${order.id}`,
      ``,
      `Action needed:`,
      `1. Verify in PayPal dashboard`,
      `2. Mark "Upfront Paid" in admin`,
      `3. Start the project 🚀`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ].join("\n")
    preview = `💳 PayPal approved: ${displayName} — $${order.upfrontAmount}`
  } else if (isRequest) {
    const methodLabel = event.replace("requested_", "")
    botMessage = [
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `📋 PAYMENT METHOD REQUESTED`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `Client: ${displayName}`,
      `Service: ${order.serviceName}`,
      `Method: ${methodLabel.toUpperCase()}`,
      `Amount: $${order.upfrontAmount}`,
      `Order: ${order.id}`,
      ``,
      `Action needed:`,
      `  • Send payment instructions to client`,
      `  • Update order status in admin panel`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ].join("\n")
    preview = `📋 Payment requested: ${displayName} — ${methodLabel.toUpperCase()}`
  } else {
    return
  }

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
        last_message: preview.slice(0, 200),
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
      last_message: preview.slice(0, 200),
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", convId)
}

export async function updateServiceOrder(
  id: string,
  updates: Partial<{
    projectStatus: ProjectStatus
    paymentStatus: PaymentStatus
    upfrontPaid: boolean
    remainingPaid: boolean
    adminNotes: string
    deliveredProjectUrl: string
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
  if (updates.deliveredProjectUrl !== undefined) dbPayload.delivered_project_url = updates.deliveredProjectUrl

  if (updates.projectStatus === "paid_upfront") {
    dbPayload.upfront_paid = true
    dbPayload.payment_status = "paid_upfront"
  }

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

    if (updates.projectStatus === "paid_upfront") {
      const order = await fetchServiceOrder(id)
      if (order) await sendBotPaymentConfirmation(order)
    }

    if (updates.projectStatus === "delivered") {
      const order = await fetchServiceOrder(id)
      if (order) await sendBotDeliveryMessage(order, updates.deliveredProjectUrl)
    }
  }

  return true
}

export async function deleteServiceOrder(id: string): Promise<boolean> {
  if (!supabase || !supabaseConfigured) return false

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  const isAdmin =
    user?.app_metadata?.role === "admin" ||
    user?.user_metadata?.role === "admin" ||
    isAdminEmail(user?.email)

  if (userError || !user || !isAdmin) {
    toast.error("Only admins can delete orders")
    return false
  }

  const { error } = await supabase
    .from("service_orders")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("deleteServiceOrder failed", error)
    toast.error("Failed to delete order")
    return false
  }

  return true
}

export async function fetchUserServiceOrders(userId: string): Promise<ServiceOrder[]> {
  return fetchOrdersWithFallback({ userId })
}

// ========== Notifications ==========

export async function createNotification(input: {
  type: string
  title: string
  message?: string
  payload?: unknown
}): Promise<void> {
  if (!supabase || !supabaseConfigured) return

  const { error: notifError } = await supabase.from("notifications").insert({
    type: input.type,
    title: input.title,
    message: input.message || null,
    is_read: false,
  })
  if (notifError) console.error("createNotification error:", notifError)
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
  const displayName = getOrderDisplayName(order)

  const botMessage = [
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🆕 NEW SERVICE ORDER RECEIVED`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `Client: ${displayName}`,
    `Email: ${order.clientEmail}`,
    `WhatsApp: ${order.clientPhone}`,
    order.company ? `Company: ${order.company}` : ``,
    `Service: ${order.serviceName}`,
    `Total: $${order.totalPrice}`,
    `Upfront (50%): $${order.upfrontAmount}`,
    `Remaining (50%): $${order.remainingAmount}`,
    `Payment Status: Payment Pending`,
    `Project Status: New Request`,
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
    `  • Payment is pending. Send payment instructions to the client.`,
    `  • Open in admin → /admin/service-orders`,
    `  • Contact client via WhatsApp`,
    `  • Mark upfront paid only after real payment`,
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
      last_message: `📦 New order: ${order.serviceName} — ${displayName} (Payment Pending)`,
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", convId)
}

// ========== WhatsApp notification ==========

export function generateAdminWhatsAppLink(order: ServiceOrder): string {
  const displayName = getOrderDisplayName(order)
  const msg = encodeURIComponent(
    `*New Service Order Received*\n\n` +
    `Client: ${displayName}\n` +
    `Email: ${order.clientEmail}\n` +
    `Phone: ${order.clientPhone}\n` +
    `Service: ${order.serviceName}\n` +
    `Total: $${order.totalPrice}\n` +
    `Upfront: $${order.upfrontAmount}\n` +
    `Payment: ${order.paymentStatus}\n` +
    `Status: ${order.projectStatus}`
  )
  return `https://wa.me/554199999999?text=${msg}`
}
