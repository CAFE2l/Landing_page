import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { motion } from "framer-motion"
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  Bot,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Command,
  CreditCard,
  Database,
  Globe2,
  Inbox,
  KeyRound,
  Loader2,
  MessageSquare,
  PackageCheck,
  RefreshCcw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  Webhook,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import toast from "react-hot-toast"
import {
  type AdminCommandCenterData,
  type BotNotificationRow,
  type CommandMetric,
  type DataAvailability,
  type PaymentRow,
  type WebhookLogRow,
  fetchAdminCommandCenter,
} from "../../lib/adminCommandCenter"
import { updateServiceOrder } from "../../lib/serviceOrdersService"
import {
  PAYMENT_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
  PROJECT_STATUS_LABELS,
  type ProjectStatus,
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

const ORDER_FILTERS: Array<{ label: string; value: ProjectStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Pending Checkout", value: "pending_checkout" },
  { label: "Awaiting Payment", value: "awaiting_payment" },
  { label: "Payment Claimed", value: "payment_claimed" },
  { label: "Paid", value: "paid" },
  { label: "In Progress", value: "in_progress" },
  { label: "Delivered", value: "delivered" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
]

const SETTING_AREAS = [
  "Site Settings",
  "Community Settings",
  "Story Settings",
  "Streak Settings",
  "Payment Settings",
  "PayPal Settings",
  "Wise Settings",
  "Notification Settings",
  "Email Settings",
  "Bot Settings",
  "Security Settings",
]

const ROLE_LABELS = ["owner", "admin", "moderator", "support", "user", "client", "freelancer", "builder", "creator"]

function formatMoney(value: number | null, currency = "USD") {
  if (value == null) return "Not configured"
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value)
}

function formatNumber(value: number | null) {
  if (value == null) return "Not configured"
  return new Intl.NumberFormat("en-US").format(value)
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.025] px-5 py-8 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-[#6f86ff]">
        <Database size={18} />
      </div>
      <p className="mt-3 text-sm font-semibold text-white">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-[#85859a]">{description}</p>
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.05] px-3 py-2 text-xs font-semibold text-white transition hover:border-[#4f6ef7]/50 hover:bg-[#4f6ef7]/15"
        >
          {action.label}
          <ChevronRight size={14} />
        </button>
      ) : null}
    </div>
  )
}

function StatusPill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold", className)}>
      {children}
    </span>
  )
}

function AvailabilityPill({ availability }: { availability: DataAvailability }) {
  if (availability === "ready") return <StatusPill className="border-emerald-500/20 bg-emerald-500/10 text-emerald-300">Live data</StatusPill>
  if (availability === "not_configured") return <StatusPill className="border-amber-500/20 bg-amber-500/10 text-amber-300">Backend not configured</StatusPill>
  return <StatusPill className="border-red-500/20 bg-red-500/10 text-red-300">Load error</StatusPill>
}

function MetricCard({ metric, index }: { metric: CommandMetric; index: number }) {
  const iconMap: Record<string, typeof Activity> = {
    total_orders: Inbox,
    active_projects: Activity,
    completed_projects: PackageCheck,
    revenue_month: CircleDollarSign,
    revenue_all: Banknote,
    pending_payments: CreditCard,
    pending_reviews: BadgeCheck,
    new_users: UserCheck,
    active_users: Users,
    stories_today: Sparkles,
    community_posts: Globe2,
    unread_messages: MessageSquare,
    open_tickets: AlertTriangle,
  }
  const Icon = iconMap[metric.key] || Activity
  const unavailable = metric.availability !== "ready"

  return (
    <motion.div
      variants={panel}
      transition={{ delay: index * 0.02 }}
      className="group rounded-2xl border border-white/[0.08] bg-[linear-gradient(145deg,rgba(255,255,255,0.065),rgba(255,255,255,0.025))] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl transition hover:border-[#4f6ef7]/35 hover:bg-white/[0.07]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#4f6ef7]/10 text-[#7d92ff]">
          <Icon size={18} />
        </div>
        <AvailabilityPill availability={metric.availability} />
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight text-white">
        {metric.money ? formatMoney(metric.value) : formatNumber(metric.value)}
      </p>
      <p className="mt-1 text-sm font-medium text-[#c8c8d4]">{metric.label}</p>
      <p className="mt-2 min-h-[18px] text-xs text-[#737387]">
        {unavailable ? "Connect the backend table to activate this metric." : metric.detail || "Synced from backend records."}
      </p>
    </motion.div>
  )
}

function Section({
  title,
  eyebrow,
  icon: Icon,
  children,
  action,
}: {
  title: string
  eyebrow?: string
  icon: typeof Activity
  children: ReactNode
  action?: { label: string; onClick: () => void }
}) {
  return (
    <motion.section variants={panel} className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0d0f16]/70 shadow-[0_24px_90px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.045] text-[#6f86ff]">
            <Icon size={18} />
          </div>
          <div className="min-w-0">
            {eyebrow ? <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#5d75ff]">{eyebrow}</p> : null}
            <h2 className="truncate text-base font-semibold text-white">{title}</h2>
          </div>
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

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-6">
        <div className="flex items-center gap-3 text-sm text-[#b8b8c8]">
          <Loader2 className="animate-spin text-[#6f86ff]" size={18} />
          Loading backend command center...
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((item) => (
          <div key={item} className="h-[156px] animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.035]" />
        ))}
      </div>
    </div>
  )
}

function ErrorState({ errors, onRetry }: { errors: string[]; onRetry: () => void }) {
  return (
    <div className="rounded-3xl border border-red-500/20 bg-red-500/[0.06] p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-base font-semibold text-red-100">Some admin data could not be loaded.</p>
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

function OrderActions({ order, onChanged }: { order: ServiceOrder; onChanged: () => void }) {
  const [busy, setBusy] = useState<string | null>(null)
  const navigate = useNavigate()

  const runAction = async (label: string, updates: Parameters<typeof updateServiceOrder>[1]) => {
    setBusy(label)
    const ok = await updateServiceOrder(order.id, updates)
    setBusy(null)
    if (ok) {
      toast.success(`${label} saved`)
      onChanged()
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => navigate(`/admin/service-orders?order=${order.id}`)} className="rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-xs text-white transition hover:bg-white/[0.06]">
        View
      </button>
      <button type="button" onClick={() => navigate(`/admin/service-orders?edit=${order.id}`)} className="rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-xs text-[#c8c8d4] transition hover:bg-white/[0.06]">
        Edit
      </button>
      {!order.upfrontPaid ? (
        <button
          type="button"
          disabled={busy === "Mark Paid"}
          onClick={() => runAction("Mark Paid", { projectStatus: "paid", paymentStatus: "paypal_confirmed", upfrontPaid: true })}
          className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/15 disabled:opacity-50"
        >
          Mark Paid
        </button>
      ) : null}
      {["paid", "paid_upfront"].includes(order.projectStatus) ? (
        <button
          type="button"
          disabled={busy === "Start Project"}
          onClick={() => runAction("Start Project", { projectStatus: "in_progress" })}
          className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-2.5 py-1.5 text-xs font-semibold text-blue-300 transition hover:bg-blue-500/15 disabled:opacity-50"
        >
          Start
        </button>
      ) : null}
      {order.projectStatus === "in_progress" ? (
        <button
          type="button"
          disabled={busy === "Deliver Project"}
          onClick={() => runAction("Deliver Project", { projectStatus: "delivered" })}
          className="rounded-lg border border-violet-500/20 bg-violet-500/10 px-2.5 py-1.5 text-xs font-semibold text-violet-300 transition hover:bg-violet-500/15 disabled:opacity-50"
        >
          Deliver
        </button>
      ) : null}
      {!["cancelled", "completed"].includes(order.projectStatus) ? (
        <button
          type="button"
          disabled={busy === "Cancel"}
          onClick={() => runAction("Cancel", { projectStatus: "cancelled" })}
          className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/15 disabled:opacity-50"
        >
          Cancel
        </button>
      ) : null}
    </div>
  )
}

function OrdersModule({ orders, onChanged }: { orders: ServiceOrder[]; onChanged: () => void }) {
  const [filter, setFilter] = useState<ProjectStatus | "all">("all")
  const [query, setQuery] = useState("")
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return orders
      .filter((order) => filter === "all" || order.projectStatus === filter)
      .filter((order) => {
        if (!normalized) return true
        return [order.id, order.clientName, order.clientEmail, order.serviceName, order.paymentMethod || ""]
          .join(" ")
          .toLowerCase()
          .includes(normalized)
      })
      .slice(0, 12)
  }, [filter, orders, query])

  return (
    <Section title="Orders" eyebrow="Real order operations" icon={Inbox}>
      <div className="border-b border-white/[0.07] p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {ORDER_FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={cn(
                  "shrink-0 rounded-xl border px-3 py-2 text-xs font-semibold transition",
                  filter === item.value
                    ? "border-[#4f6ef7]/50 bg-[#4f6ef7]/18 text-white"
                    : "border-white/[0.08] bg-white/[0.035] text-[#9a9aae] hover:bg-white/[0.06]",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <label className="flex min-w-0 items-center gap-2 rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2 text-sm text-[#8d8da0] xl:w-80">
            <Search size={15} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search orders, clients or services..."
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[#6b6b80]"
            />
          </label>
        </div>
      </div>
      {orders.length === 0 ? (
        <div className="p-5">
          <EmptyState title="No orders in the backend yet" description="Orders will appear here after clients submit project details and continue to checkout." />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="border-b border-white/[0.07] text-xs uppercase tracking-[0.14em] text-[#707084]">
              <tr>
                <th className="px-5 py-3 font-semibold">Order ID</th>
                <th className="px-5 py-3 font-semibold">Client</th>
                <th className="px-5 py-3 font-semibold">Service</th>
                <th className="px-5 py-3 font-semibold">Amount</th>
                <th className="px-5 py-3 font-semibold">Payment</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Updated</th>
                <th className="px-5 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr key={order.id} className="border-b border-white/[0.045] transition hover:bg-white/[0.025]">
                  <td className="px-5 py-4 font-mono text-xs text-[#9ea8ff]">{order.id.slice(0, 8)}</td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-white">{order.profile?.fullName || order.clientName}</p>
                    <p className="text-xs text-[#7a7a8e]">{order.clientEmail || "No email"}</p>
                  </td>
                  <td className="px-5 py-4 text-[#d6d6e2]">{order.serviceName}</td>
                  <td className="px-5 py-4 font-semibold text-white">{formatMoney(order.totalPrice)}</td>
                  <td className="px-5 py-4">
                    <StatusPill className={PAYMENT_STATUS_COLORS[order.paymentStatus]}>{PAYMENT_STATUS_LABELS[order.paymentStatus]}</StatusPill>
                  </td>
                  <td className="px-5 py-4">
                    <StatusPill className={PROJECT_STATUS_COLORS[order.projectStatus]}>{PROJECT_STATUS_LABELS[order.projectStatus]}</StatusPill>
                  </td>
                  <td className="px-5 py-4 text-xs text-[#85859a]">{formatDate(order.updatedAt, "MMM dd, HH:mm")}</td>
                  <td className="px-5 py-4">
                    <OrderActions order={order} onChanged={onChanged} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  )
}

function PaymentsModule({ payments, wisePayments, webhookLogs, onChanged }: { payments: PaymentRow[]; wisePayments: PaymentRow[]; webhookLogs: WebhookLogRow[]; onChanged: () => void }) {
  const [busyPayment, setBusyPayment] = useState<string | null>(null)
  const paymentClaims = payments.filter((payment) => payment.status === "client_claimed_paid" || payment.status === "wise_manual_review")
  const totalRevenue = payments.filter((payment) => ["paypal_confirmed", "wise_confirmed", "paid_upfront", "fully_paid", "remaining_paid"].includes(payment.status)).reduce((sum, payment) => sum + payment.amount, 0)
  const pendingRevenue = payments.filter((payment) => ["client_claimed_paid", "wise_manual_review", "payment_pending", "waiting_upfront_payment"].includes(payment.status)).reduce((sum, payment) => sum + payment.amount, 0)
  const failedPayments = payments.filter((payment) => payment.status === "payment_failed")
  const paypalPayments = payments.filter((payment) => payment.method === "paypal")

  const runWiseAction = async (payment: PaymentRow, label: string, updates: Parameters<typeof updateServiceOrder>[1]) => {
    setBusyPayment(`${payment.orderId}-${label}`)
    const ok = await updateServiceOrder(payment.orderId, updates)
    setBusyPayment(null)
    if (ok) {
      toast.success(`${label} saved`)
      onChanged()
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Section title="Payments Center" eyebrow="Revenue and claims" icon={CreditCard}>
        <div className="grid gap-3 border-b border-white/[0.07] p-4 sm:grid-cols-2 xl:grid-cols-3">
          {[
            ["Total Revenue", formatMoney(totalRevenue), "Confirmed payments"],
            ["Pending Revenue", formatMoney(pendingRevenue), "Needs verification"],
            ["Confirmed Revenue", formatMoney(totalRevenue), "Ready for production"],
            ["PayPal Payments", formatNumber(paypalPayments.length), "Backend records"],
            ["Wise Payments", formatNumber(wisePayments.length), "Manual review"],
            ["Failed Payments", formatNumber(failedPayments.length), "Requires follow-up"],
            ["Payment Claims", formatNumber(paymentClaims.length), "Client claimed paid"],
            ["Webhook Events", formatNumber(webhookLogs.length), "PayPal events"],
          ].map(([label, value, detail]) => (
            <div key={label} className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4">
              <p className="text-xs text-[#85859a]">{label}</p>
              <p className="mt-2 text-xl font-semibold text-white">{value}</p>
              <p className="mt-1 text-xs text-[#67677a]">{detail}</p>
            </div>
          ))}
        </div>
        {payments.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No payment records yet" description="Payments are derived from real orders, PayPal confirmations and Wise manual claims." />
          </div>
        ) : (
          <div className="divide-y divide-white/[0.045]">
            {payments.slice(0, 8).map((payment) => (
              <div key={`${payment.paymentId}-${payment.orderId}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="font-mono text-xs text-[#9ea8ff]">{payment.paymentId.slice(0, 14)}</p>
                  <p className="mt-1 text-sm font-medium text-white">{payment.client}</p>
                  <p className="text-xs text-[#77778b]">Order {payment.orderId.slice(0, 8)} · {payment.method || "No method"}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">{formatMoney(payment.amount, payment.currency)}</p>
                  <StatusPill className={PAYMENT_STATUS_COLORS[payment.status]}>{PAYMENT_STATUS_LABELS[payment.status]}</StatusPill>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Wise Manual Payments" eyebrow="Manual verification" icon={Banknote}>
        {wisePayments.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No Wise payments awaiting review" description="Wise claims will appear here only after a client selects Wise and clicks “I've Paid”." />
          </div>
        ) : (
          <div className="divide-y divide-white/[0.045]">
            {wisePayments.slice(0, 8).map((payment) => (
              <div key={payment.paymentId} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{payment.client}</p>
                    <p className="mt-1 text-xs text-[#85859a]">Order {payment.orderId.slice(0, 8)} · {formatMoney(payment.amount, payment.currency)}</p>
                  </div>
                  <StatusPill className={PAYMENT_STATUS_COLORS[payment.status]}>{PAYMENT_STATUS_LABELS[payment.status]}</StatusPill>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyPayment === `${payment.orderId}-Approve`}
                    onClick={() => runWiseAction(payment, "Approve", { projectStatus: "paid", paymentStatus: "wise_confirmed", paymentMethod: "wise", upfrontPaid: true })}
                    className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busyPayment === `${payment.orderId}-Reject`}
                    onClick={() => runWiseAction(payment, "Reject", { projectStatus: "payment_failed", paymentStatus: "payment_failed", paymentMethod: "wise" })}
                    className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    disabled={busyPayment === `${payment.orderId}-Request New Proof`}
                    onClick={() => runWiseAction(payment, "Request New Proof", { paymentStatus: "wise_manual_review", paymentMethod: "wise", adminNotes: `New Wise proof requested at ${new Date().toISOString()}` })}
                    className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-[#d6d6e2] disabled:opacity-50"
                  >
                    Request New Proof
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}

function WebhookModule({ logs }: { logs: WebhookLogRow[] }) {
  return (
    <Section title="PayPal Webhook Center" eyebrow="Verification events" icon={Webhook}>
      {logs.length === 0 ? (
        <div className="p-5">
          <EmptyState title="No PayPal webhook events recorded" description="PAYMENT.CAPTURE.COMPLETED, PAYMENT.CAPTURE.PENDING and PAYMENT.CAPTURE.DENIED will appear here after PayPal sends events." />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="border-b border-white/[0.07] text-xs uppercase tracking-[0.14em] text-[#707084]">
              <tr>
                <th className="px-5 py-3">Event Type</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Response</th>
                <th className="px-5 py-3">Timestamp</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {logs.slice(0, 10).map((log) => (
                <tr key={log.id} className="border-b border-white/[0.045]">
                  <td className="px-5 py-4 font-mono text-xs text-[#9ea8ff]">{log.eventType}</td>
                  <td className="px-5 py-4 text-white">{log.status}</td>
                  <td className="px-5 py-4 text-[#85859a]">{log.response || "No response body"}</td>
                  <td className="px-5 py-4 text-xs text-[#85859a]">{formatDate(log.timestamp, "MMM dd, HH:mm")}</td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button type="button" className="rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-xs text-white">View Payload</button>
                      <button type="button" className="rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-xs text-[#c8c8d4]">Retry Verification</button>
                      <button type="button" className="rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-xs text-[#c8c8d4]">Resync</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  )
}

function UsersModule({ data }: { data: AdminCommandCenterData }) {
  const roleCounts = ROLE_LABELS.map((role) => ({
    role,
    count: data.users.filter((user) => user.role.toLowerCase() === role).length,
  })).filter((item) => item.count > 0 || ["owner", "admin", "moderator", "support", "user"].includes(item.role))
  const onlineUsers = data.users.filter((user) => user.status === "active")
  const newUsers = data.users.filter((user) => user.createdAt && user.createdAt >= new Date(new Date().setDate(1)).toISOString())

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <Section title="User Management" eyebrow="Profiles and roles" icon={Users}>
        <div className="grid gap-3 border-b border-white/[0.07] p-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4">
            <p className="text-xs text-[#85859a]">Users</p>
            <p className="mt-2 text-2xl font-semibold text-white">{data.users.length}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4">
            <p className="text-xs text-[#85859a]">Online Users</p>
            <p className="mt-2 text-2xl font-semibold text-white">{onlineUsers.length}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4">
            <p className="text-xs text-[#85859a]">New Users</p>
            <p className="mt-2 text-2xl font-semibold text-white">{newUsers.length}</p>
          </div>
        </div>
        {data.users.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No backend users found" description="Profiles from Supabase will appear here with role, country, status and last activity." />
          </div>
        ) : (
          <div className="divide-y divide-white/[0.045]">
            {data.users.slice(0, 8).map((user) => (
              <div key={user.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#4f6ef7]/15 text-sm font-semibold text-[#9ea8ff]">{user.name.slice(0, 1).toUpperCase()}</div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{user.name}</p>
                    <p className="truncate text-xs text-[#85859a]">{user.email || user.username || "No contact"} · {user.country || "No country"}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill className="border-blue-500/20 bg-blue-500/10 text-blue-300">{user.role}</StatusPill>
                  <StatusPill className={user.status === "active" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-white/[0.1] bg-white/[0.04] text-[#b8b8c8]"}>{user.status}</StatusPill>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="RBAC" eyebrow="Real backend roles" icon={KeyRound}>
        <div className="grid gap-3 p-4">
          {roleCounts.map((item) => (
            <div key={item.role} className="flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.035] px-4 py-3">
              <div>
                <p className="text-sm font-semibold capitalize text-white">{item.role}</p>
                <p className="text-xs text-[#77778b]">Derived from backend profile role</p>
              </div>
              <span className="text-lg font-semibold text-white">{item.count}</span>
            </div>
          ))}
          <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.06] p-4 text-xs leading-5 text-amber-100/80">
            Permissions must be enforced by Supabase RLS/app metadata. This panel does not invent permission grants; it only displays roles stored in backend profiles.
          </div>
        </div>
      </Section>
    </div>
  )
}

function CommunityModule({ data }: { data: AdminCommandCenterData }) {
  const community = data.community

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <Section title="Community" eyebrow="Posts, stories and reports" icon={Globe2}>
        <div className="grid gap-3 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4">
              <p className="text-xs text-[#85859a]">Posts Today</p>
              <p className="mt-2 text-xl font-semibold text-white">{formatNumber(community.postsToday)}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4">
              <p className="text-xs text-[#85859a]">Stories Today</p>
              <p className="mt-2 text-xl font-semibold text-white">{formatNumber(community.storiesToday)}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4">
              <p className="text-xs text-[#85859a]">Comments</p>
              <p className="mt-2 text-xl font-semibold text-white">{formatNumber(community.comments)}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4">
              <p className="text-xs text-[#85859a]">Reactions</p>
              <p className="mt-2 text-xl font-semibold text-white">{formatNumber(community.reactions)}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4">
            <p className="text-xs text-[#85859a]">Reports Pending</p>
            <p className="mt-2 text-xl font-semibold text-white">{formatNumber(community.reportsPending)}</p>
            <p className="mt-1 text-xs text-[#67677a]">Requires a reports table to activate.</p>
          </div>
        </div>
      </Section>

      <Section title="Recent Status" eyebrow="Community feed" icon={TrendingUp}>
        {community.recentStatus.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No status updates yet" description="Community status updates will appear here after users publish them." />
          </div>
        ) : (
          <div className="divide-y divide-white/[0.045]">
            {community.recentStatus.slice(0, 6).map((post, index) => (
              <div key={post.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div>
                  <p className="line-clamp-1 text-sm font-semibold text-white">#{index + 1} {post.user?.name || "CAFÉ member"}</p>
                  <p className="line-clamp-1 text-xs text-[#85859a]">{post.content}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-white">{post.likesCount} likes</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Featured Creators" eyebrow="Curation" icon={Sparkles}>
        <div className="p-5">
          <EmptyState
            title="Featured creator backend not configured"
            description="Feature User, Unfeature User, Set Priority, Schedule Feature and Hide User require a persisted featured creators table."
          />
        </div>
      </Section>
    </div>
  )
}

function MessagesModule({ botNotifications }: { botNotifications: BotNotificationRow[] }) {
  const typeClass: Record<string, string> = {
    payment_claimed: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    payment_confirmed: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    payment_failed: "border-red-500/20 bg-red-500/10 text-red-300",
    new_order: "border-blue-500/20 bg-blue-500/10 text-blue-300",
    file_uploaded: "border-violet-500/20 bg-violet-500/10 text-violet-300",
  }

  return (
    <Section title="CAFÉ Bot" eyebrow="Structured notifications" icon={Bot}>
      {botNotifications.length === 0 ? (
        <div className="p-5">
          <EmptyState title="No structured bot notifications" description="The bot will notify only after payment claims, PayPal confirmation, failed payments, uploads, deadlines or admin-required actions." />
        </div>
      ) : (
        <div className="divide-y divide-white/[0.045]">
          {botNotifications.slice(0, 8).map((item) => (
            <div key={item.id} className="px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <StatusPill className={typeClass[item.type] || "border-white/[0.1] bg-white/[0.04] text-[#d6d6e2]"}>{item.type.replaceAll("_", " ")}</StatusPill>
                  <p className="mt-2 text-sm font-semibold text-white">{item.title}</p>
                  <p className="mt-1 text-xs text-[#85859a]">
                    {item.clientName || "Unknown client"} {item.amount ? `· ${formatMoney(item.amount)}` : ""} {item.status ? `· ${item.status}` : ""}
                  </p>
                </div>
                <span className="text-xs text-[#67677a]">{timeAgo(item.createdAt)}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-xs text-white">View Notification</button>
                {item.orderId ? <button type="button" className="rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-xs text-[#c8c8d4]">Open Order</button> : null}
                <button type="button" className="rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-xs text-[#c8c8d4]">Archive</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}

function AuditAndSettings({ data }: { data: AdminCommandCenterData }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Section title="Audit Logs" eyebrow="Immutable activity trail" icon={ShieldCheck}>
        {data.auditLogs.length === 0 ? (
          <div className="p-5">
            <EmptyState title="Audit log backend not configured or empty" description="User, order, payment, role, settings and admin actions should be persisted in an audit_logs table." />
          </div>
        ) : (
          <div className="divide-y divide-white/[0.045]">
            {data.auditLogs.slice(0, 8).map((log) => (
              <div key={log.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="font-mono text-xs text-[#9ea8ff]">{log.eventType}</p>
                  <p className="mt-1 text-sm text-white">{log.response || log.status}</p>
                </div>
                <span className="text-xs text-[#85859a]">{formatDate(log.timestamp, "MMM dd, HH:mm")}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Settings" eyebrow="Platform configuration" icon={Settings}>
        <div className="grid gap-2 p-4 sm:grid-cols-2">
          {SETTING_AREAS.map((area) => (
            <button
              key={area}
              type="button"
              className="flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.035] px-4 py-3 text-left transition hover:border-[#4f6ef7]/35 hover:bg-white/[0.055]"
            >
              <span className="text-sm font-medium text-white">{area}</span>
              <ChevronRight size={15} className="text-[#77778b]" />
            </button>
          ))}
        </div>
      </Section>
    </div>
  )
}

function AnalyticsModule({ data }: { data: AdminCommandCenterData }) {
  const totalOrders = data.metrics.find((metric) => metric.key === "total_orders")?.value || 0
  const paid = data.orders.filter((order) => order.upfrontPaid).length
  const conversion = totalOrders > 0 ? Math.round((paid / totalOrders) * 100) : null

  return (
    <Section title="Analytics" eyebrow="Backend-only signals" icon={Activity}>
      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4">
          <p className="text-xs text-[#85859a]">Visitors</p>
          <p className="mt-2 text-xl font-semibold text-white">Not configured</p>
          <p className="mt-1 text-xs text-[#67677a]">Requires analytics backend.</p>
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4">
          <p className="text-xs text-[#85859a]">Orders</p>
          <p className="mt-2 text-xl font-semibold text-white">{totalOrders}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4">
          <p className="text-xs text-[#85859a]">Conversions</p>
          <p className="mt-2 text-xl font-semibold text-white">{conversion == null ? "No data" : `${conversion}%`}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4">
          <p className="text-xs text-[#85859a]">Engagement</p>
          <p className="mt-2 text-xl font-semibold text-white">{formatNumber(data.community.reactions)}</p>
        </div>
      </div>
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

  const readyMetrics = data?.metrics.filter((metric) => metric.availability === "ready").length || 0
  const hasErrors = Boolean(data?.errors.length)

  if (loading) return <LoadingState />

  if (!data) {
    return <ErrorState errors={["Admin command center returned no data"]} onRetry={load} />
  }

  return (
    <motion.div variants={container} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={panel} className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[radial-gradient(circle_at_20%_0%,rgba(79,110,247,0.18),transparent_36%),linear-gradient(145deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] p-6 shadow-[0_26px_100px_rgba(0,0,0,0.34)] backdrop-blur-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill className="border-[#4f6ef7]/30 bg-[#4f6ef7]/15 text-[#9ea8ff]">
                <Command size={12} className="mr-1" /> Command Center
              </StatusPill>
              {offline ? <StatusPill className="border-red-500/20 bg-red-500/10 text-red-300">Offline</StatusPill> : <StatusPill className="border-emerald-500/20 bg-emerald-500/10 text-emerald-300">Online</StatusPill>}
            </div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white md:text-3xl">CAFÉ SERVICES Admin</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#a5a5b8]">
              Manage orders, payments, users, community, messages, bot notifications, analytics, audit logs and platform settings from backend records only.
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
        <div className="mt-5 flex flex-wrap gap-2 text-xs text-[#85859a]">
          <span>{readyMetrics}/{data.metrics.length} metric sources live</span>
          <span>·</span>
          <span>{data.errors.length} backend notices</span>
          <span>·</span>
          <span>Last refresh {formatDate(new Date(), "MMM dd, HH:mm")}</span>
        </div>
      </motion.div>

      {offline ? (
        <div className="rounded-3xl border border-amber-500/20 bg-amber-500/[0.07] p-5 text-sm text-amber-100">
          Offline state active. Existing data remains visible, but actions need a connection to persist.
        </div>
      ) : null}

      {hasErrors ? <ErrorState errors={data.errors} onRetry={load} /> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.metrics.map((metric, index) => (
          <MetricCard key={metric.key} metric={metric} index={index} />
        ))}
      </div>

      <OrdersModule orders={data.orders} onChanged={load} />
      <PaymentsModule payments={data.payments} wisePayments={data.wisePayments} webhookLogs={data.webhookLogs} onChanged={load} />
      <WebhookModule logs={data.webhookLogs} />
      <UsersModule data={data} />
      <CommunityModule data={data} />
      <div className="grid gap-6 xl:grid-cols-2">
        <MessagesModule botNotifications={data.botNotifications} />
        <AnalyticsModule data={data} />
      </div>
      <AuditAndSettings data={data} />

      <motion.div variants={panel} className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-5 text-sm leading-6 text-[#9a9aae]">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-400" size={18} />
          <p>
            This dashboard intentionally does not generate placeholder users, fake revenue, mock notifications or synthetic analytics. Missing backend modules are shown as empty, not configured, loading, error or offline states.
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}
