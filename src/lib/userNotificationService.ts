import { supabase, supabaseConfigured } from "./supabase/client"

export type UserNotificationType =
  | "order_created"
  | "payment_claimed"
  | "payment_confirmed"
  | "payment_failed"
  | "project_started"
  | "project_ready"
  | "remaining_payment_requested"
  | "remaining_payment_confirmed"
  | "project_delivered"
  | "feedback_requested"
  | "admin_message"
  | "file_uploaded"

export interface UserNotification {
  id: string
  user_id: string
  type: UserNotificationType
  title: string
  message: string | null
  payload: Record<string, unknown> | null
  action_url: string | null
  is_read: boolean
  created_at: string
}

const TYPE_LABELS: Record<UserNotificationType, string> = {
  order_created: "Order Created",
  payment_claimed: "Payment Claimed",
  payment_confirmed: "Payment Confirmed",
  payment_failed: "Payment Failed",
  project_started: "Project Started",
  project_ready: "Project Ready",
  remaining_payment_requested: "Remaining Payment Requested",
  remaining_payment_confirmed: "Remaining Payment Confirmed",
  project_delivered: "Project Delivered",
  feedback_requested: "Feedback Requested",
  admin_message: "Message from CAFÉ",
  file_uploaded: "File Uploaded",
}

export function getTypeLabel(type: UserNotificationType): string {
  return TYPE_LABELS[type]
}

export async function createUserNotification(input: {
  userId: string
  type: UserNotificationType
  title: string
  message?: string
  payload?: Record<string, unknown>
  actionUrl?: string
}): Promise<void> {
  if (!supabase || !supabaseConfigured) return
  await supabase.from("user_notifications").insert({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    message: input.message || null,
    payload: input.payload || null,
    action_url: input.actionUrl || null,
    is_read: false,
  })
}

export async function fetchUserNotifications(
  userId: string,
  options?: { type?: UserNotificationType; limit?: number; offset?: number },
): Promise<UserNotification[]> {
  if (!supabase || !supabaseConfigured) return []

  let query = supabase
    .from("user_notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 50)

  if (options?.offset) query = query.range(options.offset, options.offset + (options.limit ?? 50) - 1)
  if (options?.type) query = query.eq("type", options.type)

  const { data } = await query
  return ((data as Record<string, unknown>[]) || []).map(mapRow)
}

export async function fetchUnreadCount(userId: string): Promise<number> {
  if (!supabase || !supabaseConfigured) return 0
  const { count } = await supabase
    .from("user_notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false)
  return count ?? 0
}

export async function markNotificationRead(id: string): Promise<void> {
  if (!supabase || !supabaseConfigured) return
  await supabase.from("user_notifications").update({ is_read: true }).eq("id", id)
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  if (!supabase || !supabaseConfigured) return
  await supabase
    .from("user_notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false)
}

export async function clearReadNotifications(userId: string): Promise<void> {
  if (!supabase || !supabaseConfigured) return
  await supabase
    .from("user_notifications")
    .delete()
    .eq("user_id", userId)
    .eq("is_read", true)
}

export function subscribeToUserNotifications(
  userId: string,
  onNotification: (notification: UserNotification) => void,
) {
  const client = supabase
  if (!client || !supabaseConfigured) return () => {}
  const channelId = `user-notifications:${userId}:${Date.now()}:${Math.random().toString(36).slice(2)}`
  const channel = client
    .channel(channelId)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "user_notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onNotification(mapRow(payload.new as Record<string, unknown>))
      },
    )
    .subscribe()
  return () => {
    client.removeChannel(channel)
  }
}

function mapRow(row: Record<string, unknown>): UserNotification {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    type: row.type as UserNotificationType,
    title: row.title as string,
    message: (row.message as string) || null,
    payload: row.payload ? (row.payload as Record<string, unknown>) : null,
    action_url: (row.action_url as string) || null,
    is_read: row.is_read as boolean,
    created_at: row.created_at as string,
  }
}
