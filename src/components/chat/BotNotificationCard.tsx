/* eslint-disable react-refresh/only-export-components */
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Inbox,
  MessageCircle,
  Package,
  Rocket,
  ShieldAlert,
  Upload,
  XCircle,
} from "lucide-react"
import toast from "react-hot-toast"
import { updateServiceOrder } from "../../lib/serviceOrdersService"
import { cn } from "../../lib/utils"

export type BotNotificationType =
  | "new_order"
  | "payment_claimed"
  | "payment_confirmed"
  | "payment_failed"
  | "deadline_warning"
  | "client_message"
  | "file_uploaded"
  | "project_approved"
  | "project_delivered"

export type BotNotificationAction =
  | "view_order"
  | "mark_paid"
  | "reply_client"
  | "view_proof"
  | "move_in_progress"
  | "open_dashboard"

export interface BotNotificationPayload {
  cafeBotNotification: true
  version: number
  type: BotNotificationType
  title: string
  description: string
  orderId?: string
  clientName?: string
  serviceName?: string
  amount?: number
  paymentMethod?: string
  status?: string
  priority?: "low" | "normal" | "high" | "urgent"
  proofUrl?: string
  clientConversationId?: string
  createdAt?: string
  updatedAt?: string
  count?: number
  actions?: BotNotificationAction[]
}

const TYPE_CONFIG: Record<BotNotificationType, {
  label: string
  icon: typeof Inbox
  badgeClass: string
  glowClass: string
}> = {
  new_order: {
    label: "New Order",
    icon: Package,
    badgeClass: "border-blue-400/25 bg-blue-400/10 text-blue-200",
    glowClass: "from-blue-500/18",
  },
  payment_claimed: {
    label: "Payment Claimed",
    icon: Banknote,
    badgeClass: "border-yellow-400/25 bg-yellow-400/10 text-yellow-200",
    glowClass: "from-yellow-500/18",
  },
  payment_confirmed: {
    label: "Payment Confirmed",
    icon: CheckCircle2,
    badgeClass: "border-green-400/25 bg-green-400/10 text-green-200",
    glowClass: "from-green-500/18",
  },
  payment_failed: {
    label: "Payment Failed",
    icon: XCircle,
    badgeClass: "border-red-400/25 bg-red-400/10 text-red-200",
    glowClass: "from-red-500/18",
  },
  deadline_warning: {
    label: "Deadline Warning",
    icon: Clock,
    badgeClass: "border-orange-400/25 bg-orange-400/10 text-orange-200",
    glowClass: "from-orange-500/18",
  },
  client_message: {
    label: "Client Message",
    icon: MessageCircle,
    badgeClass: "border-cyan-400/25 bg-cyan-400/10 text-cyan-200",
    glowClass: "from-cyan-500/18",
  },
  file_uploaded: {
    label: "File Uploaded",
    icon: Upload,
    badgeClass: "border-purple-400/25 bg-purple-400/10 text-purple-200",
    glowClass: "from-purple-500/18",
  },
  project_approved: {
    label: "Project Approved",
    icon: Rocket,
    badgeClass: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
    glowClass: "from-emerald-500/18",
  },
  project_delivered: {
    label: "Project Delivered",
    icon: FileText,
    badgeClass: "border-teal-400/25 bg-teal-400/10 text-teal-200",
    glowClass: "from-teal-500/18",
  },
}

function normalizeType(type: string): BotNotificationType {
  if (type in TYPE_CONFIG) return type as BotNotificationType
  if (type.includes("failed") || type.includes("denied")) return "payment_failed"
  if (type.includes("confirmed") || type.includes("approved") || type.includes("paypal_confirmed")) return "payment_confirmed"
  if (type.includes("payment")) return "payment_claimed"
  return "client_message"
}

function parseOldBotText(content: string): BotNotificationPayload | null {
  if (!content.includes("PAYMENT NOTIFICATION") && !content.includes("PAYMENT") && !content.includes("ORDER")) return null

  const read = (label: string) => {
    const match = content.match(new RegExp(`${label}:\\s*([^\\n]+)`, "i"))
    return match?.[1]?.trim()
  }

  const method = read("Method") || "manual"
  const orderId = read("Order ID") || read("Order")
  const amountText = read("Amount")?.replace(/[^0-9.]/g, "")
  const type = method.toLowerCase().includes("confirmed") ? "payment_confirmed" : "payment_claimed"

  return {
    cafeBotNotification: true,
    version: 1,
    type,
    title: type === "payment_confirmed" ? "Payment Notification" : "Payment Notification",
    description: "Payment needs manual verification.",
    orderId,
    clientName: read("Client"),
    serviceName: read("Service"),
    amount: amountText ? Number(amountText) : undefined,
    paymentMethod: method,
    status: "Awaiting verification",
    priority: "high",
    actions: ["view_order", "mark_paid", "open_dashboard"],
  }
}

export function parseBotNotification(content: string): BotNotificationPayload | null {
  try {
    const parsed = JSON.parse(content) as Partial<BotNotificationPayload>
    if (parsed?.cafeBotNotification && parsed.type && parsed.title) {
      return {
        cafeBotNotification: true,
        version: parsed.version || 1,
        type: normalizeType(parsed.type),
        title: parsed.title,
        description: parsed.description || "Action needed.",
        orderId: parsed.orderId,
        clientName: parsed.clientName,
        serviceName: parsed.serviceName,
        amount: parsed.amount,
        paymentMethod: parsed.paymentMethod,
        status: parsed.status,
        priority: parsed.priority || "normal",
        proofUrl: parsed.proofUrl,
        clientConversationId: parsed.clientConversationId,
        createdAt: parsed.createdAt,
        updatedAt: parsed.updatedAt,
        count: parsed.count,
        actions: parsed.actions || ["open_dashboard"],
      }
    }
  } catch {
    return parseOldBotText(content)
  }
  return parseOldBotText(content)
}

function shortId(id?: string) {
  if (!id) return null
  return id.length > 12 ? id.slice(0, 8).toUpperCase() : id
}

function formatTime(value?: string) {
  if (!value) return null
  return new Date(value).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
}

export default function BotNotificationCard({
  payload,
  timestamp,
}: {
  payload: BotNotificationPayload
  timestamp: string
}) {
  const navigate = useNavigate()
  const [workingAction, setWorkingAction] = useState<string | null>(null)
  const config = TYPE_CONFIG[payload.type]
  const Icon = config.icon
  const actions: BotNotificationAction[] = payload.actions?.length ? payload.actions : ["open_dashboard"]
  const displayedAt = formatTime(payload.updatedAt || payload.createdAt || timestamp)

  const fields = useMemo(() => [
    ["Client", payload.clientName],
    ["Service", payload.serviceName],
    ["Amount", payload.amount != null ? `$${payload.amount}` : null],
    ["Method", payload.paymentMethod],
    ["Status", payload.status],
    ["Order ID", shortId(payload.orderId)],
  ].filter(([, value]) => !!value), [payload])

  const runAction = async (action: BotNotificationAction) => {
    if (action === "view_order") {
      navigate(payload.orderId ? `/admin/service-orders?order=${payload.orderId}` : "/admin/service-orders")
      return
    }
    if (action === "open_dashboard") {
      navigate("/admin/service-orders")
      return
    }
    if (action === "reply_client") {
      if (payload.clientConversationId) navigate(`/dashboard/messages?conversationId=${payload.clientConversationId}`)
      else toast("Open the client from the order details.")
      return
    }
    if (action === "view_proof") {
      if (payload.proofUrl) window.open(payload.proofUrl, "_blank", "noopener,noreferrer")
      else toast("No payment proof attached.")
      return
    }
    if (action === "mark_paid" || action === "move_in_progress") {
      if (!payload.orderId) {
        toast.error("Missing order ID.")
        return
      }
      setWorkingAction(action)
      const ok = await updateServiceOrder(payload.orderId, action === "mark_paid"
        ? {
            projectStatus: "paid",
            paymentStatus: payload.paymentMethod?.toLowerCase() === "wise" ? "wise_manual_review" : "paypal_confirmed",
            paymentMethod: payload.paymentMethod?.toLowerCase() === "wise" ? "wise" : "manual",
            upfrontPaid: true,
          }
        : { projectStatus: "in_progress" })
      setWorkingAction(null)
      if (ok) toast.success(action === "mark_paid" ? "Payment marked as paid." : "Order moved to in progress.")
    }
  }

  const actionLabel: Record<BotNotificationAction, string> = {
    view_order: "View Order",
    mark_paid: "Mark as Paid",
    reply_client: "Reply Client",
    view_proof: "View Proof",
    move_in_progress: "Move to In Progress",
    open_dashboard: "Open Dashboard",
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-3 flex justify-start"
    >
      <article className="relative w-full max-w-[720px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101018]/86 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.26)] backdrop-blur-xl transition hover:border-white/[0.14]">
        <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r to-transparent", config.glowClass)} />
        <div className="flex items-start gap-3">
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", config.badgeClass)}>
            <Icon size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-white">{payload.title}</h3>
              <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", config.badgeClass)}>
                {config.label}
              </span>
              {payload.priority === "urgent" && (
                <span className="inline-flex items-center gap-1 rounded-full border border-red-400/25 bg-red-400/10 px-2 py-0.5 text-[10px] font-semibold text-red-200">
                  <ShieldAlert size={10} />
                  Urgent
                </span>
              )}
              {(payload.count || 0) > 1 && (
                <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/45">
                  {payload.count} updates
                </span>
              )}
            </div>

            <p className="mt-2 text-sm leading-relaxed text-white/62">{payload.description}</p>

            {fields.length > 0 && (
              <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                {fields.map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2">
                    <dt className="text-[10px] uppercase tracking-[0.16em] text-white/28">{label}</dt>
                    <dd className="mt-0.5 truncate text-xs font-semibold text-white/78">{value}</dd>
                  </div>
                ))}
              </dl>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {actions.map((action) => (
                <button
                  key={action}
                  onClick={() => void runAction(action)}
                  disabled={workingAction === action}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 text-xs font-semibold text-white/58 transition hover:border-[#4F6EF7]/35 hover:bg-[#4F6EF7]/12 hover:text-white disabled:opacity-50"
                >
                  {workingAction === action ? (
                    <Clock size={12} className="animate-spin" />
                  ) : action === "open_dashboard" || action === "view_order" ? (
                    <ExternalLink size={12} />
                  ) : action === "mark_paid" ? (
                    <CheckCircle2 size={12} />
                  ) : action === "move_in_progress" ? (
                    <Rocket size={12} />
                  ) : action === "reply_client" ? (
                    <MessageCircle size={12} />
                  ) : action === "view_proof" ? (
                    <FileText size={12} />
                  ) : (
                    <AlertTriangle size={12} />
                  )}
                  {actionLabel[action]}
                </button>
              ))}
            </div>

            {displayedAt && <p className="mt-3 text-[10px] text-white/28">{displayedAt}</p>}
          </div>
        </div>
      </article>
    </motion.div>
  )
}
