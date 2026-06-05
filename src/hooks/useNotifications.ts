import { useState, useEffect } from "react"
import { supabase, supabaseConfigured } from "../lib/supabase/client"

export interface Notification {
  id: string
  type: "info" | "success" | "warning" | "feedback" | "client"
  title: string
  message?: string
  read: boolean
  created_at: string
}

export function useNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId || !supabase || !supabaseConfigured) {
      setLoading(false)
      return
    }

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .eq("read", false)
        .order("created_at", { ascending: false })
        .limit(20)

      setNotifications((data as Notification[]) ?? [])
      setLoading(false)
    }

    fetchNotifications()

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev])
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const markAllRead = async () => {
    if (!supabase || !supabaseConfigured || !userId) return
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false)
    setNotifications([])
  }

  return { notifications, unreadCount: notifications.length, loading, markAllRead }
}
