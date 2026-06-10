import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import {
  Bell,
  CheckCheck,
  Loader2,
  Package,
  Banknote,
  CheckCircle2,
  XCircle,
  Play,
  Rocket,
  MessageCircle,
  Upload,
  ArrowRight,
  AlertCircle,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "../../contexts/AuthContext"
import {
  fetchUserNotifications,
  fetchUnreadCount,
  subscribeToUserNotifications,
  markNotificationRead,
  type UserNotification,
  type UserNotificationType,
  getTypeLabel,
} from "../../lib/userNotificationService"

const TYPE_ICONS: Record<string, typeof Bell> = {
  order_created: Package,
  payment_claimed: Banknote,
  payment_confirmed: CheckCircle2,
  payment_failed: XCircle,
  project_started: Play,
  project_ready: Rocket,
  project_delivered: Rocket,
  remaining_payment_requested: Banknote,
  remaining_payment_confirmed: CheckCircle2,
  feedback_requested: MessageCircle,
  admin_message: MessageCircle,
  file_uploaded: Upload,
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return "now"
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default function NotificationDropdown() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [recent, setRecent] = useState<UserNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [workingId, setWorkingId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout>>()

  const load = useCallback(async () => {
    if (!user?.id) return
    const [items, count] = await Promise.all([
      fetchUserNotifications(user.id, { limit: 3 }),
      fetchUnreadCount(user.id),
    ])
    setRecent(items)
    setUnreadCount(count)
    setLoading(false)
  }, [user?.id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!user?.id) return
    const cleanup = subscribeToUserNotifications(user.id, (notification) => {
      setRecent((prev) => [notification, ...prev].slice(0, 3))
      if (!notification.is_read) setUnreadCount((prev) => prev + 1)
    })
    return cleanup
  }, [user?.id])

  const handleClickNotification = async (n: UserNotification) => {
    setWorkingId(n.id)
    if (!n.is_read) {
      await markNotificationRead(n.id)
      setRecent((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
    setWorkingId(null)
    setOpen(false)
    if (n.action_url) {
      navigate(n.action_url)
    } else {
      navigate("/dashboard/notifications")
    }
  }

  const handleToggle = () => {
    if (open) {
      setOpen(false)
    } else {
      load()
      setOpen(true)
    }
  }

  const handleOpen = () => {
    clearTimeout(closeTimerRef.current)
    load()
    setOpen(true)
  }

  const handleClose = () => {
    closeTimerRef.current = setTimeout(() => setOpen(false), 150)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false)
    }
  }

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      <button
        onClick={handleToggle}
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-zinc-300 transition-all hover:border-[#3b82f6]/35 hover:text-white"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <motion.span
            key={unreadCount}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            onMouseEnter={() => clearTimeout(closeTimerRef.current)}
            onMouseLeave={handleClose}
            className="absolute right-0 top-full mt-2 w-[360px] origin-top-right overflow-hidden rounded-2xl border border-white/[0.08] bg-[#090b14]/95 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
            role="menu"
            aria-label="Notifications"
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <span className="text-sm font-semibold text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="max-h-[320px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 size={18} className="animate-spin text-zinc-500" />
                </div>
              ) : recent.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <Bell size={28} className="mb-2 text-zinc-600" />
                  <p className="text-sm text-zinc-500">No notifications yet</p>
                  <p className="text-xs text-zinc-600 mt-1">We'll notify you when something arrives</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.06]">
                  {recent.map((n) => {
                    const Icon = TYPE_ICONS[n.type] || Bell
                    const isWorking = workingId === n.id
                    return (
                      <button
                        key={n.id}
                        onClick={() => handleClickNotification(n)}
                        disabled={isWorking}
                        className={`w-full text-left transition-all ${
                          n.is_read
                            ? "opacity-50 hover:opacity-80"
                            : "bg-blue-500/5 hover:bg-blue-500/8"
                        } ${isWorking ? "cursor-wait" : "cursor-pointer"}`}
                        role="menuitem"
                      >
                        <div className="flex items-start gap-3 px-4 py-3.5">
                          <div className={`relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                            n.is_read
                              ? "border-white/[0.06] bg-white/[0.03] text-zinc-500"
                              : "border-blue-400/20 bg-blue-400/10 text-blue-300"
                          }`}>
                            <Icon size={14} />
                            {!n.is_read && (
                              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-blue-500" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm leading-snug ${n.is_read ? "text-zinc-500" : "text-white"}`}>
                                {n.title}
                              </p>
                              <span className="shrink-0 text-[10px] text-zinc-600">{formatRelativeDate(n.created_at)}</span>
                            </div>
                            {n.message && (
                              <p className="mt-0.5 text-xs text-zinc-500 line-clamp-2">{n.message}</p>
                            )}
                          </div>
                          {isWorking && (
                            <Loader2 size={12} className="mt-1 animate-spin shrink-0 text-blue-400" />
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-white/[0.06] p-2">
              <button
                onClick={() => { setOpen(false); navigate("/dashboard/notifications") }}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-medium text-white/60 hover:text-white hover:bg-white/[0.06] transition-all"
                role="menuitem"
              >
                View all notifications
                <ArrowRight size={12} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
