import { useState, useEffect } from "react"
import { Link, Navigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  Bell,
  CheckCheck,
  Trash2,
  Loader2,
  Package,
  Banknote,
  CheckCircle2,
  XCircle,
  Play,
  Rocket,
  MessageCircle,
  Upload,
  ExternalLink,
  Filter,
  X,
  ArrowRight,
  AlertCircle,
} from "lucide-react"
import { useAuth } from "../contexts/AuthContext"
import {
  fetchUserNotifications,
  fetchUnreadCount,
  subscribeToUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearReadNotifications,
  type UserNotification,
  type UserNotificationType,
  getTypeLabel,
} from "../lib/userNotificationService"
import TechPremiumBackground from "../components/ui/TechPremiumBackground"
import Navbar from "../components/landing/Navbar"
import { cn } from "../lib/utils"

const TYPE_ICONS: Record<string, typeof Bell> = {
  order_created: Package,
  payment_claimed: Banknote,
  payment_confirmed: CheckCircle2,
  payment_failed: XCircle,
  project_started: Play,
  project_ready: Rocket,
  remaining_payment_requested: Banknote,
  remaining_payment_confirmed: CheckCircle2,
  project_delivered: Rocket,
  feedback_requested: MessageCircle,
  admin_message: MessageCircle,
  file_uploaded: Upload,
}

const TYPE_COLORS: Record<string, string> = {
  order_created: "border-blue-400/25 bg-blue-400/10 text-blue-300",
  payment_claimed: "border-yellow-400/25 bg-yellow-400/10 text-yellow-300",
  payment_confirmed: "border-green-400/25 bg-green-400/10 text-green-300",
  payment_failed: "border-red-400/25 bg-red-400/10 text-red-300",
  project_started: "border-cyan-400/25 bg-cyan-400/10 text-cyan-300",
  project_ready: "border-teal-400/25 bg-teal-400/10 text-teal-300",
  remaining_payment_requested: "border-yellow-400/25 bg-yellow-400/10 text-yellow-300",
  remaining_payment_confirmed: "border-green-400/25 bg-green-400/10 text-green-300",
  project_delivered: "border-teal-400/25 bg-teal-400/10 text-teal-300",
  feedback_requested: "border-purple-400/25 bg-purple-400/10 text-purple-300",
  admin_message: "border-pink-400/25 bg-pink-400/10 text-pink-300",
  file_uploaded: "border-orange-400/25 bg-orange-400/10 text-orange-300",
}

const ALL_TYPES: UserNotificationType[] = [
  "order_created",
  "payment_claimed",
  "payment_confirmed",
  "payment_failed",
  "project_started",
  "project_ready",
  "remaining_payment_requested",
  "remaining_payment_confirmed",
  "project_delivered",
  "feedback_requested",
  "admin_message",
  "file_uploaded",
]

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function IconComponent({ icon: Icon }: { icon: typeof Bell }) {
  return <Icon size={11} />
}

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth()
  const [notifications, setNotifications] = useState<UserNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<UserNotificationType | "all">("all")

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    const load = async () => {
      const [items, count] = await Promise.all([
        fetchUserNotifications(user.id, {
          ...(typeFilter !== "all" ? { type: typeFilter } : {}),
        }),
        fetchUnreadCount(user.id),
      ])
      setNotifications(items)
      setUnreadCount(count)
      setLoading(false)
    }
    load()
  }, [user?.id, typeFilter])

  useEffect(() => {
    if (!user?.id) return
    const cleanup = subscribeToUserNotifications(user.id, (notification) => {
      setNotifications((prev) => [notification, ...prev])
      if (!notification.is_read) setUnreadCount((prev) => prev + 1)
    })
    return cleanup
  }, [user?.id])

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id)
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  const handleCardClick = async (n: UserNotification) => {
    if (!n.is_read) {
      await handleMarkRead(n.id)
    }
    if (n.action_url) {
      window.location.href = n.action_url
    }
  }

  const handleMarkAllRead = async () => {
    if (!user?.id) return
    await markAllNotificationsRead(user.id)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  const handleClearRead = async () => {
    if (!user?.id) return
    await clearReadNotifications(user.id)
    setNotifications((prev) => prev.filter((n) => !n.is_read))
  }

  const filtered = typeFilter === "all"
    ? notifications
    : notifications.filter((n) => n.type === typeFilter)

  if (authLoading) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-[#020408]">
        <Loader2 size={28} className="animate-spin text-blue-400" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020408] px-4 pb-8 pt-24 text-white sm:px-6 sm:pt-28">
      <TechPremiumBackground />
      <Navbar />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 mx-auto max-w-4xl"
      >
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400 mb-3">
            <Bell size={12} />
            Notifications
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Notifications</h1>
              <p className="mt-1 text-sm text-zinc-500">
                {unreadCount > 0
                  ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
                  : "No unread notifications"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="touch-target inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-white/70 hover:text-white hover:bg-white/[0.08] transition-all"
                >
                  <CheckCheck size={14} />
                  Mark all read
                </button>
              )}
              <button
                onClick={handleClearRead}
                className="touch-target inline-flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2 text-xs font-medium text-red-300 hover:bg-red-500/15 transition-all"
              >
                <Trash2 size={14} />
                Clear read
              </button>
            </div>
          </div>
        </div>

        {/* Filter chips */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setTypeFilter("all")}
            className={cn(
              "touch-target inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
              typeFilter === "all"
                ? "border-blue-400/30 bg-blue-400/12 text-blue-300"
                : "border-white/[0.08] bg-white/[0.04] text-white/50 hover:text-white/70 hover:bg-white/[0.06]",
            )}
          >
            <Filter size={11} />
            All
          </button>
          {ALL_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={cn(
                "touch-target inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                typeFilter === t
                  ? TYPE_COLORS[t]
                  : "border-white/[0.08] bg-white/[0.04] text-white/50 hover:text-white/70 hover:bg-white/[0.06]",
              )}
            >
              <IconComponent icon={TYPE_ICONS[t]} />
              {getTypeLabel(t)}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-blue-400" />
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 text-center backdrop-blur-xl sm:p-12"
          >
            <Bell size={40} className="mx-auto mb-4 text-zinc-600" />
            <h2 className="text-lg font-semibold text-zinc-400 mb-1">No notifications</h2>
            <p className="text-sm text-zinc-600">
              {typeFilter !== "all"
                ? "No notifications of this type yet."
                : "You're all caught up!"}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
                {filtered.map((notification) => {
                  const Icon = TYPE_ICONS[notification.type] || Bell
                  const colorClass = TYPE_COLORS[notification.type] || TYPE_COLORS.admin_message
                  return (
                    <motion.div
                      key={notification.id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      onClick={() => handleCardClick(notification)}
                      className={cn(
                        "group relative rounded-2xl border p-4 transition-all cursor-pointer",
                        notification.is_read
                          ? "border-white/[0.04] bg-white/[0.01] opacity-60 hover:opacity-90 hover:bg-white/[0.03] hover:border-white/[0.08]"
                          : "border-blue-500/20 bg-blue-500/[0.03] hover:bg-blue-500/[0.06] hover:border-blue-500/30",
                      )}
                    >
                      {!notification.is_read && (
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.5)]" />
                      )}
                      <div className={cn("flex items-start gap-3.5", !notification.is_read && "pl-4")}>
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                            colorClass,
                          )}
                        >
                          <Icon size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className={cn(
                                  "text-sm leading-snug",
                                  notification.is_read ? "text-zinc-400" : "text-white font-semibold",
                                )}>
                                  {notification.title}
                                </h3>
                              </div>
                              <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium text-white/30">
                                {getTypeLabel(notification.type)}
                                <span className="mx-1">·</span>
                                {formatDate(notification.created_at)}
                              </span>
                            </div>
                          </div>
                          {notification.message && (
                            <p className={cn(
                              "mt-1.5 text-sm leading-relaxed",
                              notification.is_read ? "text-zinc-600" : "text-zinc-400",
                            )}>
                              {notification.message}
                            </p>
                          )}
                          {notification.action_url && (
                            <span
                              onClick={(e) => {
                                e.stopPropagation()
                                window.open(notification.action_url!, "_blank", "noopener")
                              }}
                              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-300 hover:bg-blue-500/15 transition-all cursor-pointer"
                            >
                              <ExternalLink size={12} />
                              View details
                              <ArrowRight size={12} />
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
            </AnimatePresence>
          </div>
        )}

        <div className="mt-8 flex items-start gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
            <MessageCircle size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">Real-time Chat</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              For urgent matters, chat directly with CAFÉ Services via the{" "}
              <Link to="/dashboard/messages" className="text-blue-400 underline underline-offset-2 hover:text-blue-300">
                Messages
              </Link>{" "}
              panel. Notifications are for history — chat is for real-time.
            </p>
          </div>
        </div>
      </motion.div>
    </main>
  )
}
