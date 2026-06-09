import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { motion } from "framer-motion"
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  Command,
  CreditCard,
  Database,
  Inbox,
  Loader2,
  MessageSquare,
  PackageCheck,
  RefreshCcw,
  ShoppingCart,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import toast from "react-hot-toast"
import {
  type AdminCommandCenterData,
  type CommandMetric,
  type DataAvailability,
  type PaymentRow,
  type RecentMessageThread,
  fetchAdminCommandCenter,
} from "../../lib/adminCommandCenter"
import { updateServiceOrder } from "../../lib/serviceOrdersService"
import {
  PAYMENT_STATUS_COLORS,
  PROJECT_STATUS_COLORS,
  PROJECT_STATUS_LABELS,
  type PaymentStatus,
  type ServiceOrder,
} from "../../lib/types/serviceOrders"
import { cn, formatDate, timeAgo } from "../../lib/utils"

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const panel = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
}

const metricOrder = ["revenue_month", "pending_payments", "active_projects", "new_orders", "unread_messages", "completed_projects"]

const metricIcons: Record<string, typeof Activity> = {
  revenue_month: CircleDollarSign,
  pending_payments: CreditCard,
  active_projects: Activity,
  new_orders: ShoppingCart,
  unread_messages: MessageSquare,
  completed_projects: PackageCheck,
}

const alertStatuses = new Set<PaymentStatus>(["client_claimed_paid", "wise_manual_review", "payment_failed", "payment_pending", "waiting_upfront_payment"])

function formatMoney(value: number | null, currency = "USD") {
  if (value == null) return "Not configured"
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value)
}

function formatNumber(value: number | null) {
  if (value == null) return "Not configured"
  return new Intl.NumberFormat("en-US").format(value)
}

function StatusPill({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold", className)}>{children}</span>
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.025] px-5 py-8 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-[#6f86ff]">
        <Database size={18} />
      </div>
      <p className="mt-3 text-sm font-semibold text-white">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-[#85859a]">{description}</p>
    </div>
  )
}

function Section({
  title,
  icon: Icon,
  children,
  action,
}: {
  title: string
  icon: typeof Activity
  children: ReactNode
  action?: { label: string; onClick: () => void }
}) {
  return (
    <motion.section variants={panel} className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0f16]/75 shadow-[0_20px_70px_rgba(0,0,0,0.24)] backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.045] text-[#6f86ff]">
            <Icon size={17} />
          </div>
          <h2 className="truncate text-base font-semibold text-white">{title}</h2>
        </div>
        {action ? (
          <button
            type="button"
            onClick={action.onClick}
            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.045] px-3 py-2 text-xs font-semibold text-[#e8e8f2] transition hover:border-[#4f6ef7]/45 hover:bg-[#4f6ef7]/15"
          >
            {action.label}
            <ArrowUpRight size={14} />
          </button>
        ) : null}
      </div>
      {children}
    </motion.section>
  )
}

function MetricCard({ metric, index }: { metric: CommandMetric; index: number }) {
  const Icon = metricIcons[metric.key] || Activity

  return (
    <motion.div
      variants={panel}
      transition={{ delay: index * 0.02 }}
      className="rounded-2xl border border-white/[0.08] bg-[linear-gradient(145deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] p-4 shadow-[0_16px_50px_rgba(0,0,0,0.2)] backdrop-blur-xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-[#4f6ef7]/10 text-[#7d92ff]">
          <Icon size={18} />
        </div>
        <StatusPill className="border-emerald-500/20 bg-emerald-500/10 text-emerald-300">Live</StatusPill>
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight text-white">
        {metric.money ? formatMoney(metric.value) : formatNumber(metric.value)}
      </p>
      <p className="mt-1 text-sm font-medium text-[#c8c8d4]">{metric.label}</p>
    </motion.div>
  )
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-6">
        <div className="flex items-center gap-3 text-sm text-[#b8b8c8]">
          <Loader2 className="animate-spin text-[#6f86ff]" size={18} />
          Loading admin dashboard...
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="h-[132px] animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.035]" />
        ))}
      </div>
    </div>
  )
}

function ErrorState({ errors, onRetry }: { errors: string[]; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-base font-semibold text-red-100">Admin data could not be loaded.</p>
          <p className="mt-1 text-sm text-red-200/70">{errors.slice(0, 3).join(" · ")}</p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-xl border border-red-300/20 bg-red-300/10 px-4 py-2 text-sm font-semibold text-red-50 transition hover:bg-red-300/15"
        >
          <RefreshCcw size={16} />
          Retry
        </button>
      </div>
    </div>
  )
}

function RecentOrders({ orders }: { orders: ServiceOrder[] }) {
  const navigate = useNavigate()

  return (
    <Section title="Recent Orders" icon={Inbox} action={{ label: "Open Orders", onClick: () => navigate("/admin/service-orders") }}>
      {orders.length === 0 ? (
        <div className="p-5">
          <EmptyState title="No orders yet" description="Real client orders will appear here after checkout or project requests are submitted." />
        </div>
      ) : (
        <div className="divide-y divide-white/[0.045]">
          {orders.slice(0, 6).map((order) => (
            <button
              key={order.id}
              type="button"
              onClick={() => navigate(`/admin/service-orders?order=${order.id}`)}
              className="flex w-full flex-wrap items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-white/[0.025]"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{order.profile?.fullName || order.clientName}</p>
                <p className="mt-1 truncate text-xs text-[#85859a]">{order.serviceName} · {formatDate(order.createdAt, "MMM dd, HH:mm")}</p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <span className="text-sm font-semibold text-white">{formatMoney(order.totalPrice, order.paymentCurrency || "USD")}</span>
                <StatusPill className={PROJECT_STATUS_COLORS[order.projectStatus]}>{PROJECT_STATUS_LABELS[order.projectStatus]}</StatusPill>
              </div>
            </button>
          ))}
        </div>
      )}
    </Section>
  )
}

function alertLabel(payment: PaymentRow) {
  if (payment.status === "client_claimed_paid" && payment.method === "paypal") return "PayPal claimed"
  if (payment.status === "client_claimed_paid") return "Payment claimed"
  if (payment.status === "wise_manual_review") return "Wise awaiting manual confirmation"
  if (payment.status === "payment_failed") return "Failed payment"
  return "Payment needs review"
}

function PaymentAlerts({ payments, webhookLogs, onChanged }: { payments: PaymentRow[]; webhookLogs: AdminCommandCenterData["webhookLogs"]; onChanged: () => void }) {
  const [busyPayment, setBusyPayment] = useState<string | null>(null)
  const navigate = useNavigate()
  const alerts = payments.filter((payment) => alertStatuses.has(payment.status)).slice(0, 6)
  const webhookIssues = webhookLogs
    .filter((log) => /fail|error|denied|missing|invalid/i.test(`${log.status} ${log.response || ""}`))
    .slice(0, 3)

  const runAction = async (payment: PaymentRow, label: string, updates: Parameters<typeof updateServiceOrder>[1]) => {
    setBusyPayment(`${payment.orderId}-${label}`)
    const ok = await updateServiceOrder(payment.orderId, updates)
    setBusyPayment(null)
    if (ok) {
      toast.success(`${label} saved`)
      onChanged()
    }
  }

  if (alerts.length === 0 && webhookIssues.length === 0) {
    return (
      <Section title="Payment Alerts" icon={CreditCard}>
        <div className="p-5">
          <EmptyState title="No payment alerts" description="PayPal claims, Wise manual confirmations, failed payments and webhook issues will appear here when action is required." />
        </div>
      </Section>
    )
  }

  return (
    <Section title="Payment Alerts" icon={CreditCard}>
      <div className="divide-y divide-white/[0.045]">
        {alerts.map((payment) => (
          <div key={`${payment.paymentId}-${payment.orderId}`} className="px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <StatusPill className={PAYMENT_STATUS_COLORS[payment.status]}>{alertLabel(payment)}</StatusPill>
                <p className="mt-2 text-sm font-semibold text-white">{payment.client}</p>
                <p className="mt-1 text-xs text-[#85859a]">Order {payment.orderId.slice(0, 8)} · {formatMoney(payment.amount, payment.currency)}</p>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/admin/service-orders?order=${payment.orderId}`)}
                className="rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-xs text-white transition hover:bg-white/[0.06]"
              >
                View
              </button>
            </div>
            {payment.status === "wise_manual_review" ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busyPayment === `${payment.orderId}-Approve`}
                  onClick={() => runAction(payment, "Approve", { projectStatus: "paid", paymentStatus: "wise_confirmed", paymentMethod: "wise", upfrontPaid: true })}
                  className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={busyPayment === `${payment.orderId}-Reject`}
                  onClick={() => runAction(payment, "Reject", { projectStatus: "payment_failed", paymentStatus: "payment_failed", paymentMethod: "wise" })}
                  className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            ) : null}
          </div>
        ))}
        {webhookIssues.map((log) => (
          <div key={log.id} className="px-5 py-4">
            <StatusPill className="border-red-500/20 bg-red-500/10 text-red-300">Webhook issue</StatusPill>
            <p className="mt-2 text-sm font-semibold text-white">{log.eventType}</p>
            <p className="mt-1 text-xs text-[#85859a]">{log.response || log.status} · {formatDate(log.timestamp, "MMM dd, HH:mm")}</p>
          </div>
        ))}
      </div>
    </Section>
  )
}

function RecentMessages({ messages, availability }: { messages: RecentMessageThread[]; availability: DataAvailability }) {
  const navigate = useNavigate()

  return (
    <Section title="Recent Messages" icon={MessageSquare} action={{ label: "Open Messages", onClick: () => navigate("/dashboard/messages") }}>
      {availability !== "ready" ? (
        <div className="p-5">
          <EmptyState title="Messages backend not configured" description="Recent conversations will appear here after the conversations and messages backend is available." />
        </div>
      ) : messages.length === 0 ? (
        <div className="p-5">
          <EmptyState title="No recent conversations" description="Client conversations and unread messages will appear here when there is real chat activity." />
        </div>
      ) : (
        <div className="divide-y divide-white/[0.045]">
          {messages.slice(0, 6).map((thread) => (
            <button
              key={thread.id}
              type="button"
              onClick={() => navigate(`/dashboard/messages?conversationId=${thread.id}`)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-white/[0.025]"
            >
              <div className="flex min-w-0 items-center gap-3">
                {thread.avatarUrl ? (
                  <img src={thread.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#4f6ef7]/15 text-sm font-semibold text-[#9ea8ff]">
                    {thread.clientName.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{thread.clientName}</p>
                  <p className="truncate text-xs text-[#85859a]">{thread.lastMessage || "No messages yet"}</p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-[#77778b]">{timeAgo(thread.lastMessageAt)}</p>
                {thread.unreadCount > 0 ? <StatusPill className="mt-2 border-blue-500/20 bg-blue-500/10 text-blue-300">{thread.unreadCount} unread</StatusPill> : null}
              </div>
            </button>
          ))}
        </div>
      )}
    </Section>
  )
}

function SystemHealth({ data, offline }: { data: AdminCommandCenterData; offline: boolean }) {
  const warnings = [
    ...(offline ? ["Browser is offline"] : []),
    ...data.metrics.filter((metric) => metric.availability === "not_configured").map((metric) => `${metric.label} backend not configured`),
    ...data.metrics.filter((metric) => metric.availability === "error").map((metric) => `${metric.label} database error`),
    ...(data.recentMessagesAvailability === "not_configured" ? ["Messages backend not configured"] : []),
    ...(data.recentMessagesAvailability === "error" ? ["Messages database error"] : []),
    ...data.errors.filter((error) => /webhook|payment provider|backend not configured|database|could not be loaded|could not be counted/i.test(error)),
  ]

  const uniqueWarnings = Array.from(new Set(warnings)).slice(0, 6)

  return (
    <Section title="System Health" icon={AlertTriangle}>
      {uniqueWarnings.length === 0 ? (
        <div className="px-5 py-4">
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.06] p-4">
            <CheckCircle2 className="shrink-0 text-emerald-400" size={18} />
            <p className="text-sm text-emerald-100">No important system warnings.</p>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-white/[0.045]">
          {uniqueWarnings.map((warning) => (
            <div key={warning} className="flex items-start gap-3 px-5 py-4">
              <AlertTriangle className="mt-0.5 shrink-0 text-amber-300" size={16} />
              <p className="text-sm text-[#f3e6c0]">{warning}</p>
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}

export default function Dashboard() {
  const [data, setData] = useState<AdminCommandCenterData | null>(null)
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(!navigator.onLine)
  const navigate = useNavigate()

  const load = useCallback(async () => {
    setLoading(true)
    const next = await fetchAdminCommandCenter()
    setData(next)
    setLoading(false)
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [load])

  useEffect(() => {
    const onOnline = () => setOffline(false)
    const onOffline = () => setOffline(true)
    window.addEventListener("online", onOnline)
    window.addEventListener("offline", onOffline)
    return () => {
      window.removeEventListener("online", onOnline)
      window.removeEventListener("offline", onOffline)
    }
  }, [])

  const mainMetrics = useMemo(() => {
    if (!data) return []
    return data.metrics
      .filter((metric) => metric.availability === "ready")
      .sort((a, b) => metricOrder.indexOf(a.key) - metricOrder.indexOf(b.key))
  }, [data])

  if (loading) return <LoadingState />

  if (!data) {
    return <ErrorState errors={["Admin dashboard returned no data"]} onRetry={load} />
  }

  return (
    <motion.div variants={container} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={panel} className="rounded-2xl border border-white/[0.08] bg-[linear-gradient(145deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill className="border-[#4f6ef7]/30 bg-[#4f6ef7]/15 text-[#9ea8ff]">
                <Command size={12} className="mr-1" /> Admin Dashboard
              </StatusPill>
              {offline ? <StatusPill className="border-red-500/20 bg-red-500/10 text-red-300">Offline</StatusPill> : <StatusPill className="border-emerald-500/20 bg-emerald-500/10 text-emerald-300">Online</StatusPill>}
            </div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white md:text-3xl">CAFÉ SERVICES Admin</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#a5a5b8]">
              A focused command center for selling services, managing clients and tracking payments from backend records only.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.05] px-4 py-2 text-sm font-semibold text-white transition hover:border-[#4f6ef7]/45 hover:bg-[#4f6ef7]/15"
            >
              <RefreshCcw size={16} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => navigate("/admin/service-orders")}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2f68ff] px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(47,104,255,0.32)] transition hover:bg-[#4579ff]"
            >
              Open Orders
              <ArrowUpRight size={16} />
            </button>
          </div>
        </div>
        <p className="mt-5 text-xs text-[#85859a]">Last refresh {formatDate(new Date(), "MMM dd, HH:mm")}</p>
      </motion.div>

      {mainMetrics.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {mainMetrics.map((metric, index) => (
            <MetricCard key={metric.key} metric={metric} index={index} />
          ))}
        </div>
      ) : (
        <EmptyState title="No dashboard metrics available" description="Main cards are hidden until their backend source is configured and returns real data." />
      )}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <RecentOrders orders={data.orders} />
        <PaymentAlerts payments={data.payments} webhookLogs={data.webhookLogs} onChanged={load} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <RecentMessages messages={data.recentMessages} availability={data.recentMessagesAvailability} />
        <SystemHealth data={data} offline={offline} />
      </div>
    </motion.div>
  )
}
