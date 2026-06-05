"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search, MessageSquare, ExternalLink,
  ChevronDown, Clock, CheckCircle2, XCircle, AlertCircle,
  Phone, Mail, DollarSign, Calendar,
  FileText, Edit3, RefreshCw,
} from "lucide-react"
import { fetchServiceOrders, updateServiceOrder, subscribeToServiceOrders, generateAdminWhatsAppLink } from "../../lib/serviceOrdersService"
import type { ServiceOrder, ProjectStatus } from "../../lib/types/serviceOrders"
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from "../../lib/types/serviceOrders"
import { cn, timeAgo } from "../../lib/utils"
import toast from "react-hot-toast"

type StatusTab = "all" | ProjectStatus

const TABS: { key: StatusTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "new_request", label: "New" },
  { key: "waiting_payment", label: "Waiting" },
  { key: "paid_upfront", label: "Upfront Paid" },
  { key: "in_progress", label: "In Progress" },
  { key: "waiting_delivery_payment", label: "Delivery" },
  { key: "delivered", label: "Delivered" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
]

const STATUS_ACTIONS: { from: ProjectStatus[]; to: ProjectStatus; label: string; icon: typeof ChevronDown }[] = [
  { from: ["new_request"], to: "waiting_payment", label: "Move to Waiting Payment", icon: AlertCircle },
  { from: ["waiting_payment"], to: "paid_upfront", label: "Mark Upfront Paid", icon: CheckCircle2 },
  { from: ["paid_upfront"], to: "in_progress", label: "Start Project", icon: Clock },
  { from: ["in_progress"], to: "waiting_delivery_payment", label: "Ready for Delivery Payment", icon: AlertCircle },
  { from: ["waiting_delivery_payment"], to: "delivered", label: "Deliver Project", icon: CheckCircle2 },
  { from: ["delivered"], to: "completed", label: "Complete Project", icon: CheckCircle2 },
  { from: ["new_request", "waiting_payment", "paid_upfront", "in_progress", "waiting_delivery_payment"], to: "cancelled", label: "Cancel Order", icon: XCircle },
]

function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium", PROJECT_STATUS_COLORS[status])}>
      {status === "new_request" && <AlertCircle size={11} />}
      {status === "cancelled" && <XCircle size={11} />}
      {status === "completed" && <CheckCircle2 size={11} />}
      {PROJECT_STATUS_LABELS[status]}
    </span>
  )
}

function OrderCard({ order, onUpdate }: { order: ServiceOrder; onUpdate: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [updating, setUpdating] = useState(false)

  const availableActions = STATUS_ACTIONS.filter((a) => a.from.includes(order.projectStatus))

  const handleStatusUpdate = async (newStatus: ProjectStatus) => {
    setUpdating(true)
    const ok = await updateServiceOrder(order.id, { projectStatus: newStatus })
    setUpdating(false)
    if (ok) {
      toast.success(`Order → ${PROJECT_STATUS_LABELS[newStatus]}`)
      onUpdate()
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm hover:border-white/[0.12] transition-all duration-300 overflow-hidden"
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 text-sm font-bold text-blue-400">
              {order.clientName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-white truncate">{order.clientName}</h3>
              <p className="text-xs text-zinc-500 truncate">{order.serviceName}</p>
              {order.company && (
                <p className="text-xs text-zinc-600 truncate">{order.company}</p>
              )}
            </div>
          </div>
          <StatusBadge status={order.projectStatus} />
        </div>

        <div className="flex items-center gap-4 text-xs text-zinc-500 mb-3">
          <span className="flex items-center gap-1">
            <DollarSign size={12} />
            ${order.totalPrice}
          </span>
          <span className="flex items-center gap-1">
            <Calendar size={12} />
            {timeAgo(order.createdAt)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2">
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Upfront</p>
            <p className={cn("text-sm font-semibold", order.upfrontPaid ? "text-green-400" : "text-yellow-400")}>
              ${order.upfrontAmount}
              {order.upfrontPaid && " ✓"}
            </p>
          </div>
          <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2">
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Remaining</p>
            <p className={cn("text-sm font-semibold", order.remainingPaid ? "text-green-400" : "text-zinc-400")}>
              ${order.remainingAmount}
              {order.remainingPaid && " ✓"}
            </p>
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-3 overflow-hidden"
            >
              <div className="border-t border-white/[0.06] pt-3 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Mail size={12} />
                  <a href={`mailto:${order.clientEmail}`} className="hover:text-blue-400 transition-colors">{order.clientEmail}</a>
                </div>
                <div className="flex items-center gap-2 text-zinc-400">
                  <Phone size={12} />
                  <a href={`https://wa.me/${order.clientPhone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="hover:text-green-400 transition-colors">
                    {order.clientPhone}
                  </a>
                </div>
                {order.currentProjectUrl && (
                  <div className="flex items-center gap-2 text-zinc-400">
                    <ExternalLink size={12} />
                    <a href={order.currentProjectUrl} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors truncate">
                      {order.currentProjectUrl}
                    </a>
                  </div>
                )}
                {order.desiredDeadline && (
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Calendar size={12} />
                    <span>Deadline: {order.desiredDeadline}</span>
                  </div>
                )}
              </div>

              <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1.5 font-medium">Project Notes</p>
                <p className="text-xs text-zinc-400 whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
                  {order.projectDescription}
                </p>
              </div>

              {order.referencesText && (
                <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1.5 font-medium">References</p>
                  <p className="text-xs text-zinc-400 whitespace-pre-wrap">{order.referencesText}</p>
                </div>
              )}

              {order.adminNotes && (
                <div className="rounded-lg bg-blue-500/5 border border-blue-500/10 p-3">
                  <p className="text-[10px] text-blue-400 uppercase tracking-wider mb-1.5 font-medium">Admin Notes</p>
                  <p className="text-xs text-blue-300/70 whitespace-pre-wrap">{order.adminNotes}</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.06]">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
          >
            <FileText size={13} />
            {expanded ? "Less" : "Details"}
          </button>

          <a
            href={`https://wa.me/${order.clientPhone.replace(/[^0-9]/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-zinc-500 hover:text-green-400 hover:bg-green-500/10 transition-colors"
          >
            <MessageSquare size={13} />
            WhatsApp
          </a>

          <a
            href={`mailto:${order.clientEmail}`}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
          >
            <Mail size={13} />
            Email
          </a>

          <a
            href={generateAdminWhatsAppLink(order)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-zinc-500 hover:text-green-400 hover:bg-green-500/10 transition-colors"
          >
            <MessageSquare size={13} />
            My WhatsApp
          </a>

          <div className="flex-1" />

          {availableActions.length > 0 && (
            <div className="relative group/actions">
              <button
                disabled={updating}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
              >
                <Edit3 size={13} />
                Update
                <ChevronDown size={12} />
              </button>
              <div className="absolute right-0 top-full mt-1 w-56 origin-top-right rounded-xl border border-white/[0.08] bg-[#0a0a0f] shadow-2xl opacity-0 invisible group-hover/actions:opacity-100 group-hover/actions:visible transition-all duration-150 z-10">
                <div className="p-1">
                  {availableActions.map((action) => (
                    <button
                      key={action.to}
                      onClick={() => handleStatusUpdate(action.to)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <action.icon size={14} />
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-full bg-white/5" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-32 rounded bg-white/5" />
          <div className="h-3 w-20 rounded bg-white/5" />
        </div>
        <div className="h-5 w-20 rounded-full bg-white/5" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-24 rounded bg-white/5" />
        <div className="grid grid-cols-2 gap-2">
          <div className="h-12 rounded-lg bg-white/5" />
          <div className="h-12 rounded-lg bg-white/5" />
        </div>
      </div>
    </div>
  )
}

export default function ServiceOrders() {
  const [orders, setOrders] = useState<ServiceOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<StatusTab>("all")
  const [search, setSearch] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    const data = await fetchServiceOrders()
    setOrders(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const unsub = subscribeToServiceOrders(load)
    return () => { unsub.then((fn) => fn()) }
  }, [load])

  const filtered = useMemo(() => {
    let result = orders
    if (activeTab !== "all") {
      result = result.filter((o) => o.projectStatus === activeTab)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (o) =>
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
    for (const o of orders) {
      c[o.projectStatus] = (c[o.projectStatus] || 0) + 1
    }
    return c
  }, [orders])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Service Orders</h2>
          <p className="text-sm text-zinc-500 mt-0.5">{orders.length} total orders</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/5 px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, service, company..."
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-blue-500/40 transition-colors"
          />
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-2 mb-6 scrollbar-none">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
              activeTab === tab.key
                ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                : "text-zinc-500 hover:text-zinc-300 border border-transparent",
            )}
          >
            {tab.label}
            <span className="ml-1.5 text-[10px] opacity-60">({counts[tab.key] || 0})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.04]">
            <Search size={28} className="text-zinc-600" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-400 mb-1">
            {search ? "No orders match your search" : "No orders yet"}
          </h3>
          <p className="text-sm text-zinc-600">
            {search ? "Try a different search term" : "New requests will appear here"}
          </p>
        </motion.div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((order) => (
              <OrderCard key={order.id} order={order} onUpdate={load} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}
