"use client"

import { useEffect, useState } from "react"
import { Link, Navigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  ArrowRight, Clock, Loader2, Package, DollarSign,
} from "lucide-react"
import { useAuth } from "../contexts/AuthContext"
import {
  fetchUserServiceOrders,
  getOrderDisplayName,
  getOrderAvatarUrl,
  subscribeToServiceOrders,
} from "../lib/serviceOrdersService"
import type { ServiceOrder } from "../lib/types/serviceOrders"
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
} from "../lib/types/serviceOrders"
import TechPremiumBackground from "../components/ui/TechPremiumBackground"
import Navbar from "../components/landing/Navbar"
import { cn } from "../lib/utils"

function OrderCard({ order }: { order: ServiceOrder }) {
  const displayName = getOrderDisplayName(order)
  const avatarUrl = getOrderAvatarUrl(order)
  const awaitingRemaining = order.projectStatus === "awaiting_remaining_payment"
  const remainingClaimed = order.projectStatus === "remaining_payment_claimed"
  const checkoutHref = awaitingRemaining
    ? `/checkout/${order.id}?paymentStage=remaining`
    : `/checkout/${order.id}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="group rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-5 transition-all duration-300 hover:border-blue-500/25 hover:shadow-[0_8px_40px_rgba(37,99,235,0.12)]"
    >
      <div className="flex items-start gap-4 mb-4">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="h-10 w-10 shrink-0 rounded-full object-cover border border-white/10"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 text-sm font-bold text-blue-400">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-white truncate">{order.serviceName}</h3>
          <p className="text-xs text-zinc-500 truncate">{displayName}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
              PROJECT_STATUS_COLORS[order.projectStatus],
            )}>
              {PROJECT_STATUS_LABELS[order.projectStatus]}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2 py-0.5 text-[10px] font-medium text-yellow-400">
              <Clock size={10} />
              {PAYMENT_STATUS_LABELS[order.paymentStatus]}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-2">
          <p className="text-[10px] text-zinc-600 uppercase">Total</p>
          <p className="font-semibold text-white">${order.totalPrice}</p>
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-2">
          <p className="text-[10px] text-zinc-600 uppercase">Upfront</p>
          <p className={cn("font-semibold", order.upfrontPaid ? "text-green-400" : "text-yellow-400")}>
            ${order.upfrontAmount}
          </p>
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-2">
          <p className="text-[10px] text-zinc-600 uppercase">Remaining</p>
          <p className={cn("font-semibold", order.remainingPaid ? "text-green-400" : awaitingRemaining ? "text-orange-300" : "text-zinc-400")}>
            ${order.remainingAmount}
          </p>
        </div>
      </div>

      {(awaitingRemaining || remainingClaimed) && (
        <div className="mb-4 rounded-xl border border-orange-400/20 bg-orange-400/10 p-3 text-xs">
          <p className="font-semibold text-orange-200">
            {remainingClaimed ? "Awaiting remaining payment verification" : "Remaining Payment Required"}
          </p>
          <p className="mt-1 leading-relaxed text-orange-100/70">
            {remainingClaimed
              ? "CAFÉ will confirm your payment before final delivery unlocks."
              : `Preview is ready. Pay the remaining $${order.remainingAmount} to unlock final delivery.`}
          </p>
        </div>
      )}

      {order.previewUrl && (
        <a
          href={order.previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-violet-300/20 bg-violet-300/10 px-4 py-2.5 text-sm font-medium text-violet-100 transition-colors hover:bg-violet-300/15"
        >
          Preview Link
          <ArrowRight size={14} />
        </a>
      )}

      <Link
        to={checkoutHref}
        className="touch-target inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm font-medium text-blue-300 hover:bg-blue-500/15 transition-colors"
      >
        {awaitingRemaining ? "Pay Remaining Balance" : remainingClaimed ? "View Payment Status" : "View Details"}
        <ArrowRight size={14} />
      </Link>
    </motion.div>
  )
}

export default function OrdersDashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const [orders, setOrders] = useState<ServiceOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    const loadOrders = () => fetchUserServiceOrders(user.id)
      .then(setOrders)
      .finally(() => setLoading(false))
    loadOrders()
    return subscribeToServiceOrders(loadOrders)
  }, [user?.id])

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
        className="relative z-10 mx-auto max-w-5xl"
      >
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400 mb-3">
            <Package size={12} />
            My Orders
          </div>
          <h1 className="text-2xl font-bold text-white">Service Orders</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Track your project requests and payment status.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-blue-400" />
          </div>
        ) : orders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 text-center backdrop-blur-xl sm:p-12"
          >
            <Package size={40} className="mx-auto mb-4 text-zinc-600" />
            <h2 className="text-lg font-semibold text-zinc-400 mb-2">No orders yet</h2>
            <p className="text-sm text-zinc-600 mb-6">
              Start a project from our services page to see your orders here.
            </p>
            <Link
              to="/#work"
                className="touch-target inline-flex items-center gap-2 rounded-xl bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1d4ed8] transition-colors"
            >
              Browse Services
              <ArrowRight size={14} />
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}

        <div className="mt-8 flex items-start gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-400">
            <DollarSign size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">Payment Pending</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Orders are not marked as paid until CAFÉ Services confirms your payment.
              You'll receive payment instructions via email or WhatsApp.
            </p>
          </div>
        </div>
      </motion.div>
    </main>
  )
}
