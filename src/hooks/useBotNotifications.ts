import { useEffect, useRef } from "react"
import { supabase, supabaseConfigured } from "../lib/supabase/client"

const BOT_ID = "00000000-0000-0000-0000-000000000001"

export function useBotNotifications(currentUserId: string | undefined) {
  const permissionRef = useRef<NotificationPermission>("default")

  // Request permission on mount
  useEffect(() => {
    if (!("Notification" in window)) return
    if (Notification.permission === "granted") {
      permissionRef.current = "granted"
      return
    }
    if (Notification.permission !== "denied") {
      Notification.requestPermission().then((p) => {
        permissionRef.current = p
      })
    }
  }, [])

  // Listen for new bot messages directed at current user
  useEffect(() => {
    if (!currentUserId || !supabase || !supabaseConfigured) return

    const client = supabase
    const channel = client
      .channel(`bot-notify:${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${currentUserId}`,
        },
        (payload) => {
          const msg = payload.new as Record<string, unknown>
          if (msg.sender_id !== BOT_ID) return
          if (permissionRef.current !== "granted") return
          if (document.visibilityState === "visible") return // already looking at the app

          new Notification("CAFÉ Bot 🤖", {
            body: (msg.content as string)?.split("\n").find((l) => l.trim() && !l.includes("━")) || "New notification",
            icon: "/imgs/img/favicon.png",
            tag: "cafe-bot",
          })
        },
      )
      .subscribe()

    return () => { client.removeChannel(channel) }
  }, [currentUserId])
}
