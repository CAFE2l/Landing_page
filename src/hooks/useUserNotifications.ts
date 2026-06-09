import { useState, useEffect, useCallback } from "react"
import {
  fetchUserNotifications,
  fetchUnreadCount,
  subscribeToUserNotifications,
  markAllNotificationsRead,
  clearReadNotifications,
  type UserNotification,
  type UserNotificationType,
} from "../lib/userNotificationService"

export function useUserNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<UserNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<UserNotificationType | undefined>()

  const load = useCallback(async () => {
    if (!userId) {
      setNotifications([])
      setUnreadCount(0)
      setLoading(false)
      return
    }
    const [items, count] = await Promise.all([
      fetchUserNotifications(userId, { type: typeFilter }),
      fetchUnreadCount(userId),
    ])
    setNotifications(items)
    setUnreadCount(count)
    setLoading(false)
  }, [userId, typeFilter])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!userId) return
    const cleanup = subscribeToUserNotifications(userId, (notification) => {
      setNotifications((prev) => [notification, ...prev])
      if (!notification.is_read) setUnreadCount((prev) => prev + 1)
    })
    return cleanup
  }, [userId])

  const markAllRead = useCallback(async () => {
    if (!userId) return
    await markAllNotificationsRead(userId)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }, [userId])

  const clearRead = useCallback(async () => {
    if (!userId) return
    await clearReadNotifications(userId)
    setNotifications((prev) => prev.filter((n) => !n.is_read))
  }, [userId])

  return {
    notifications,
    unreadCount,
    loading,
    typeFilter,
    setTypeFilter,
    markAllRead,
    clearRead,
    refresh: load,
  }
}
