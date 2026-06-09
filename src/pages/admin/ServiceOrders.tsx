"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search, MessageSquare, ExternalLink,
  ChevronDown, Clock, CheckCircle2, XCircle, AlertCircle,
  Phone, Mail, DollarSign, Calendar,
  FileText, Edit3, RefreshCw,
  Loader2, Trash2, Link2, X, Package,
  TrendingUp, Rocket,
} from "lucide-react"
import {
  fetchServiceOrders,
  deleteServiceOrder,
  updateServiceOrder,
  subscribeToServiceOrders,
  getOrderDisplayName,
  getOrderAvatarUrl,
} from "../../lib/serviceOrdersService"
import { formatPhoneDisplay } from "../../components/ui/PhoneInput"
import type { ServiceOrder, ProjectStatus } from "../../lib/types/serviceOrders"
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
} from "../../lib/types/serviceOrders"
import { cn, timeAgo } from "../../lib/utils"
import toast from "react-hot-toast"
import { useAuth } from "../../contexts/AuthContext"

type StatusTab = "all" | ProjectStatus

const TABS: { key: StatusTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending_checkout", label: "Checkout" },
  { key: "waiting_payment", label: "Awaiting Payment" },
  { key: "payment_claimed", label: "Claimed Paid" },
  { key: "paid", label: "Paid" },
  { key: "in_progress", label: "In Progress" },
  { key: "delivered", label: "Delivered" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
]

const STATUS_ACTIONS: { from: ProjectStatus[]; to: ProjectStatus; label: string; icon: typeof ChevronDown; needsUrl?: boolean }[] = [
  { from: ["draft", "pending_checkout"], to: "awaiting_payment", label: "Mark Awaiting Payment", icon: AlertCircle },
  { from: ["awaiting_payment", "payment_claimed", "payment_pending", "new_request", "waiting_payment"], to: "paid", label: "Confirm Payment Manually", icon: CheckCircle2 },
  { from: ["paid", "paid_upfront"], to: "in_progress", label: "Start Project", icon: Rocket },
  { from: ["in_progress", "waiting_delivery_payment"], to: "delivered", label: "Deliver Project", icon: CheckCircle2, needsUrl: true },
  { from: ["delivered"], to: "completed", label: "Mark Completed", icon: CheckCircle2 },
  { from: ["draft", "pending_checkout", "awaiting_payment", "payment_claimed", "payment_pending", "paid", "new_request", "waiting_payment", "paid_upfront", "in_progress", "waiting_delivery_payment"], to: "cancelled", label: "Cancel Order", icon: XCircle },
]

const PIPELINE = ["pending_checkout", "payment_claimed", "paid", "in_progress", "delivered", "completed"] as const

function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", PROJECT_STATUS_COLORS[status])}>
      {status === "new_request" && <AlertCircle size={10} />}
      {status === "cancelled" && <XCircle size={10} />}
      {(status === "completed" || status === "delivered") && <CheckCircle2 size={10} />}
      {status === "in_progress" && <Clock size={10} />}
      {PROJECT_STATUS_LABELS[status]}
    </span>
  )
}

function AdminPaymentBadge({ order }: { order: ServiceOrder }) {
  let label = PAYMENT_STATUS_LABELS[order.paymentStatus]
  if (order.paymentStatus === "not_paid") label = "Not paid"
  if (order.paymentStatus === "client_claimed_paid") label = "Client claimed paid"
  if (order.paymentStatus === "paypal_confirmed") label = "PayPal confirmed"
  if (order.paymentStatus === "wise_manual_review") {
    label = order.upfrontPaid ? "Wise manually confirmed" : "Wise manual confirmation needed"
  }

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", PAYMENT_STATUS_COLORS[order.paymentStatus])}>
      <DollarSign size={10} />
      {label}
    </span>
  )
}

function OrderAvatar({ order, size = "md" }: { order: ServiceOrder; size?: "sm" | "md" | "lg" }) {
  const avatarUrl = getOrderAvatarUrl(order)
  const name = getOrderDisplayName(order)
  const cls = size === "lg" ? "h-14 w-14 text-xl" : size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm"
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className={cn(cls, "shrink-0 rounded-full object-cover border border-white/10")} />
  }
  return (
    <div className={cn(cls, "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/25 to-violet-500/20 font-bold text-blue-400")}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

function PipelineBar({ status }: { status: ProjectStatus }) {
  const cancelled = status === "cancelled"
  const currentIdx = PIPELINE.indexOf(status as typeof PIPELINE[number])
  return (
    <div className="flex items-center gap-0.5">
      {PIPELINE.map((step, i) => {
        const done = !cancelled && currentIdx >= i
        const active = !cancelled && currentIdx === i
        return (
          <div
            key={step}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-all",
              cancelled ? "bg-red-500/20" :
              done ? active ? "bg-blue-400" : "bg-blue-500/50" : "bg-white/[0.06]",
            )}
          />
        )
      })}
    </div>
  )
}

// ─── Deliver Modal ────────────────────────────────────────────────
function DeliverModal({
  order,
  onConfirm,
  onClose,
}: {
  order: ServiceOrder
  onConfirm: (url: string) => Promise<void>
  onClose: () => void
}) {
  const [url, setUrl] = useState(order.deliveredProjectUrl ?? "")
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) { toast.error("Please enter the project URL"); return }
    setSaving(true)
    await onConfirm(url.trim())
    setSaving(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0a0a10] p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#4F6EF7]">Deliver Project</p>
            <h3 className="mt-1 text-lg font-bold text-white">Add the project URL</h3>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.05] text-white/40 hover:text-white transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="mb-5 flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
          <OrderAvatar order={order} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{getOrderDisplayName(order)}</p>
            <p className="text-xs text-white/40 truncate">{order.serviceName}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/40">
              Project URL <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-client-project.com"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-3 pl-9 pr-4 text-sm text-white outline-none transition-all placeholder:text-white/25 focus:border-[#4F6EF7]/50 focus:bg-white/[0.06]"
                autoFocus
              />
            </div>
            <p className="mt-1.5 text-[11px] text-white/30">
              This URL will be shown to the client in their profile orders tab with a congrats message.
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/[0.08] py-2.5 text-sm font-semibold text-white/50 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !url.trim()}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#6D28D9] py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              Deliver & Notify Client
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ─── Order Card ───────────────────────────────────────────────────
function OrderCard({
  order,
  deleting,
  isAdmin,
  onDelete,
  onUpdate,
}: {
  order: ServiceOrder
  deleting: boolean
  isAdmin: boolean
  onDelete: (order: ServiceOrder) => void
  onUpdate: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [deliverTarget, setDeliverTarget] = useState<ServiceOrder | null>(null)
  const displayName = getOrderDisplayName(order)
  const availableActions = STATUS_ACTIONS.filter((a) => a.from.includes(order.projectStatus))

  const handleStatusUpdate = async (action: typeof STATUS_ACTIONS[number]) => {
    if (action.needsUrl) {
      setDeliverTarget(order)
      return
    }
    setUpdating(true)
    const updates: Parameters<typeof updateServiceOrder>[1] = { projectStatus: action.to }
    if (action.to === "paid" || action.to === "paid_upfront") {
      updates.upfrontPaid = true
      updates.paymentStatus = order.paymentMethod === "wise" ? "wise_manual_review" : "paypal_confirmed"
      updates.paymentMethod = order.paymentMethod || "manual"
    }
    const ok = await updateServiceOrder(order.id, updates)
    setUpdating(false)
    if (ok) {
      toast.success(`${PROJECT_STATUS_LABELS[action.to]}`)
      onUpdate()
    }
  }

  const handleDeliver = async (url: string) => {
    setDeliverTarget(null)
    setUpdating(true)
    const ok = await updateServiceOrder(order.id, {
      projectStatus: "delivered",
      deliveredProjectUrl: url,
    })
    setUpdating(false)
    if (ok) {
      toast.success("Project delivered! Client notified 🎉")
      onUpdate()
    }
  }

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        className="group flex flex-col rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.035] to-white/[0.015] backdrop-blur-sm hover:border-white/[0.12] hover:shadow-[0_8px_40px_rgba(0,0,0,0.4)] transition-all duration-300"
      >
        {/* Card header */}
        <div className="p-5 pb-4">
          <div className="flex items-start gap-3">
            <OrderAvatar order={order} />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">{displayName}</h3>
                  <p className="text-xs text-white/40 truncate mt-0.5">{order.serviceName}</p>
                  {order.company && <p className="text-xs text-white/25 truncate">{order.company}</p>}
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => onDelete(order)}
                    disabled={updating || deleting}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-red-500/15 bg-red-500/8 text-red-400/60 transition-all hover:border-red-400/30 hover:bg-red-500/15 hover:text-red-300 disabled:opacity-40"
                  >
                    {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  </button>
                )}
              </div>

              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <AdminPaymentBadge order={order} />
                <StatusBadge status={order.projectStatus} />
              </div>
            </div>
          </div>

          {/* Pipeline progress */}
          <div className="mt-4">
            <PipelineBar status={order.projectStatus} />
          </div>

          {/* Financials */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-white/[0.05] bg-white/[0.025] px-3 py-2.5 text-center">
              <p className="text-[10px] uppercase tracking-wider text-white/30 mb-0.5">Total</p>
              <p className="text-sm font-bold text-white">${order.totalPrice}</p>
            </div>
            <div className={cn("rounded-xl border px-3 py-2.5 text-center", order.upfrontPaid ? "border-green-500/15 bg-green-500/8" : "border-yellow-500/15 bg-yellow-500/8")}>
              <p className="text-[10px] uppercase tracking-wider text-white/30 mb-0.5">Upfront</p>
              <p className={cn("text-sm font-bold", order.upfrontPaid ? "text-green-400" : "text-yellow-400")}>
                ${order.upfrontAmount} {order.upfrontPaid ? "✓" : ""}
              </p>
            </div>
            <div className={cn("rounded-xl border px-3 py-2.5 text-center", order.remainingPaid ? "border-green-500/15 bg-green-500/8" : "border-white/[0.05] bg-white/[0.025]")}>
              <p className="text-[10px] uppercase tracking-wider text-white/30 mb-0.5">Remaining</p>
              <p className={cn("text-sm font-bold", order.remainingPaid ? "text-green-400" : "text-white/50")}>
                ${order.remainingAmount} {order.remainingPaid ? "✓" : ""}
              </p>
            </div>
          </div>

          {/* Delivered URL */}
          {order.deliveredProjectUrl && (
            <a
              href={order.deliveredProjectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center gap-2 rounded-xl border border-[#4F6EF7]/20 bg-[#4F6EF7]/8 px-3 py-2 text-xs font-medium text-[#7E95FF] hover:bg-[#4F6EF7]/15 transition-colors"
            >
              <ExternalLink size={12} />
              <span className="truncate">{order.deliveredProjectUrl}</span>
            </a>
          )}
        </div>

        {/* Expandable details */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="border-t border-white/[0.05] mx-5 pt-4 pb-4 space-y-3">
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-white/40">
                  <a href={`mailto:${order.clientEmail}`} className="flex items-center gap-1.5 hover:text-blue-400 transition-colors">
                    <Mail size={11} />{order.clientEmail}
                  </a>
                  <a
                    href={`https://wa.me/${order.clientPhone.replace(/[^0-9]/g, "")}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-green-400 transition-colors"
                  >
                    <Phone size={11} />{formatPhoneDisplay(order.clientPhone)}
                  </a>
                  {order.desiredDeadline && (
                    <span className="flex items-center gap-1.5">
                      <Calendar size={11} />{order.desiredDeadline}
                    </span>
                  )}
                  {order.currentProjectUrl && (
                    <a href={order.currentProjectUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-blue-400 transition-colors">
                      <ExternalLink size={11} />Reference site
                    </a>
                  )}
                </div>

                <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                  <p className="text-[10px] uppercase tracking-wider text-white/25 mb-1.5">Brief</p>
                  <p className="text-xs text-white/50 whitespace-pre-wrap leading-relaxed max-h-28 overflow-y-auto scrollbar-thin scrollbar-thumb-white/[0.06]">
                    {order.projectDescription}
                  </p>
                </div>

                {order.referencesText && (
                  <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                    <p className="text-[10px] uppercase tracking-wider text-white/25 mb-1.5">References</p>
                    <p className="text-xs text-white/50 whitespace-pre-wrap">{order.referencesText}</p>
                  </div>
                )}

                {order.adminNotes && (
                  <div className="rounded-xl border border-[#4F6EF7]/15 bg-[#4F6EF7]/5 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-[#4F6EF7]/60 mb-1.5">Admin Notes</p>
                    <p className="text-xs text-white/50 whitespace-pre-wrap">{order.adminNotes}</p>
                  </div>
                )}

                <p className="text-[10px] text-white/20 text-right">
                  #{order.id.slice(0, 8).toUpperCase()} · {timeAgo(order.createdAt)}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer actions */}
        <div className="mt-auto flex flex-wrap items-center gap-1 border-t border-white/[0.05] px-4 py-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-white/35 hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            <FileText size={12} />
            {expanded ? "Hide" : "Details"}
          </button>

          <a
            href={`https://wa.me/${order.clientPhone.replace(/[^0-9]/g, "")}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-white/35 hover:text-green-400 hover:bg-green-500/8 transition-colors"
          >
            <MessageSquare size={12} />
            WhatsApp
          </a>

          <a
            href={`mailto:${order.clientEmail}`}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-white/35 hover:text-blue-400 hover:bg-blue-500/8 transition-colors"
          >
            <Mail size={12} />
            Email
          </a>

          {availableActions.length > 0 && (
            <div className="relative group/actions ml-auto">
              <button
                disabled={updating}
                className="flex items-center gap-1.5 rounded-lg border border-[#4F6EF7]/20 bg-[#4F6EF7]/10 px-3 py-1.5 text-xs font-semibold text-[#7E95FF] hover:bg-[#4F6EF7]/18 transition-colors disabled:opacity-50"
              >
                {updating ? <Loader2 size={12} className="animate-spin" /> : <Edit3 size={12} />}
                Update
                <ChevronDown size={11} />
              </button>
              <div className="absolute right-0 top-full mt-1.5 w-58 origin-top-right rounded-xl border border-white/[0.08] bg-[#0a0a10] shadow-2xl opacity-0 invisible group-hover/actions:opacity-100 group-hover/actions:visible transition-all duration-150 z-20 py-1">
                {availableActions.map((action) => (
                  <button
                    key={action.to}
                    onClick={() => handleStatusUpdate(action)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors text-left",
                      action.to === "cancelled"
                        ? "text-red-400/70 hover:text-red-300 hover:bg-red-500/8"
                        : action.to === "delivered"
                        ? "text-emerald-400/80 hover:text-emerald-300 hover:bg-emerald-500/8"
                        : "text-white/50 hover:text-white hover:bg-white/[0.05]",
                    )}
                  >
                    <action.icon size={13} className="shrink-0" />
                    {action.label}
                    {action.needsUrl && <Link2 size={11} className="ml-auto opacity-50" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {deliverTarget && (
          <DeliverModal
            order={deliverTarget}
            onConfirm={handleDeliver}
            onClose={() => setDeliverTarget(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-5 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-full bg-white/[0.05]" />
        <div className="space-y-2 flex-1">
          <div className="h-3.5 w-28 rounded-lg bg-white/[0.05]" />
          <div className="h-3 w-20 rounded-lg bg-white/[0.04]" />
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.04] mb-4" />
      <div className="grid grid-cols-3 gap-2">
        {[1,2,3].map(i => <div key={i} className="h-14 rounded-xl bg-white/[0.04]" />)}
      </div>
    </div>
  )
}

export default function ServiceOrders() {
  const { isAdmin } = useAuth()
  const [orders, setOrders] = useState<ServiceOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<StatusTab>("all")
  const [search, setSearch] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    const data = await fetchServiceOrders()
    setOrders(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
    const unsub = subscribeToServiceOrders(load)
    return () => { unsub.then((fn) => fn()) }
  }, [load])

  const filtered = useMemo(() => {
    let result = orders
    if (activeTab !== "all") result = result.filter((o) => o.projectStatus === activeTab)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (o) =>
          getOrderDisplayName(o).toLowerCase().includes(q) ||
          o.clientName.toLowerCase().includes(q) ||
          o.clientEmail.toLowerCase().includes(q) ||
          o.clientPhone.includes(q) ||
          o.serviceName.toLowerCase().includes(q) ||
          o.company?.toLowerCase().includes(q),
      )
    }
    return result
  }, [orders, activeTab, search])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length }
    for (const o of orders) c[o.projectStatus] = (c[o.projectStatus] || 0) + 1
    return c
  }, [orders])

  const stats = useMemo(() => ({
    total: orders.length,
    revenue: orders.filter(o => o.upfrontPaid).reduce((s, o) => s + o.upfrontAmount, 0)
      + orders.filter(o => o.remainingPaid).reduce((s, o) => s + o.remainingAmount, 0),
    active: orders.filter(o => o.projectStatus === "in_progress").length,
    pending: orders.filter(o => ["pending_checkout", "awaiting_payment", "payment_claimed", "payment_pending", "new_request", "waiting_payment"].includes(o.projectStatus)).length,
  }), [orders])

  const handleDelete = async (order: ServiceOrder) => {
    if (!isAdmin || deletingId) return
    if (!window.confirm(`Delete order for ${getOrderDisplayName(order)}? This cannot be undone.`)) return
    setDeletingId(order.id)
    const ok = await deleteServiceOrder(order.id)
    setDeletingId(null)
    if (ok) {
      setOrders((prev) => prev.filter((item) => item.id !== order.id))
      toast.success("Order deleted")
    }
  }

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Service Orders</h2>
          <p className="text-sm text-white/35 mt-0.5">{orders.length} total · manage all client projects</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/50 hover:text-white hover:bg-white/[0.07] transition-all"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Orders", value: stats.total, icon: Package, color: "text-blue-400", bg: "bg-blue-500/8 border-blue-500/15" },
          { label: "Revenue Collected", value: `$${stats.revenue}`, icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/8 border-emerald-500/15" },
          { label: "In Progress", value: stats.active, icon: TrendingUp, color: "text-violet-400", bg: "bg-violet-500/8 border-violet-500/15" },
          { label: "Awaiting Action", value: stats.pending, icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-500/8 border-amber-500/15" },
        ].map((s) => (
          <div key={s.label} className={cn("rounded-2xl border p-4", s.bg)}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/30">{s.label}</p>
              <s.icon size={14} className={s.color} />
            </div>
            <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, service, company..."
          className="w-full rounded-xl border border-white/[0.07] bg-white/[0.03] py-3 pl-11 pr-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#4F6EF7]/40 focus:bg-white/[0.05] transition-all"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all",
              activeTab === tab.key
                ? "bg-[#4F6EF7]/15 text-[#7E95FF] border border-[#4F6EF7]/25 shadow-[0_0_12px_rgba(79,110,247,0.1)]"
                : "text-white/35 hover:text-white/60 border border-transparent hover:bg-white/[0.04]",
            )}
          >
            {tab.label}
            {(counts[tab.key] ?? 0) > 0 && (
              <span className={cn("ml-1.5 text-[10px]", activeTab === tab.key ? "text-[#7E95FF]/70" : "text-white/20")}>
                {counts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.05] bg-white/[0.02] py-20 text-center"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
            <Package size={28} className="text-white/20" />
          </div>
          <h3 className="text-base font-semibold text-white/40">
            {search ? "No orders match your search" : "No orders yet"}
          </h3>
          <p className="mt-1 text-sm text-white/20">
            {search ? "Try a different search term" : "New requests will appear here"}
          </p>
        </motion.div>
      ) : (
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                deleting={deletingId === order.id}
                isAdmin={isAdmin}
                onDelete={handleDelete}
                onUpdate={load}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}
