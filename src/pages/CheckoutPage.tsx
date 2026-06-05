"use client"

import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { motion } from "framer-motion"
import {
  Check, Loader2, ArrowLeft, AlertCircle, DollarSign, Calendar, User,
  Clock, MessageSquare, CreditCard, FileText, Send,
} from "lucide-react"
import {
  fetchServiceOrder,
  requestPaymentLink,
  getOrderDisplayName,
  getOrderAvatarUrl,
} from "../lib/serviceOrdersService"
import type { ServiceOrder } from "../lib/types/serviceOrders"
import { PAYMENT_STATUS_LABELS } from "../lib/types/serviceOrders"
import { formatPhoneDisplay } from "../components/ui/PhoneInput"
import TechPremiumBackground from "../components/ui/TechPremiumBackground"
import { cn } from "../lib/utils"

const STEPS = [
  { key: "details", label: "Project Details", icon: FileText },
  { key: "review", label: "Review", icon: Check },
  { key: "payment", label: "Payment Pending", icon: Clock },
  { key: "contact", label: "Admin Contact", icon: MessageSquare },
] as const

const PAYMENT_METHODS = [
  { id: "paypal", name: "PayPal", configured: false },
  { id: "wise", name: "Wise", configured: false },
  { id: "mercadopago", name: "Mercado Pago", configured: false },
  { id: "manual", name: "Manual Invoice", configured: true },
] as const

function OrderAvatar({ order }: { order: ServiceOrder }) {
  const avatarUrl = getOrderAvatarUrl(order)
  const name = getOrderDisplayName(order)

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="h-12 w-12 shrink-0 rounded-full object-cover border border-white/10"
      />
    )
  }

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 text-lg font-bold text-blue-400 border border-blue-500/20">
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

function Stepper({ currentStep }: { currentStep: number }) {
  return (
    <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {STEPS.map((step, index) => {
        const Icon = step.icon
        const active = index <= currentStep
        const current = index === currentStep
        return (
          <motion.div
            key={step.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            className={cn(
              "rounded-xl border px-3 py-3 text-center transition-all",
              current
                ? "border-blue-500/40 bg-blue-500/10 shadow-[0_0_24px_rgba(37,99,235,0.15)]"
                : active
                  ? "border-white/[0.1] bg-white/[0.04]"
                  : "border-white/[0.05] bg-white/[0.02] opacity-60",
            )}
          >
            <Icon size={16} className={cn("mx-auto mb-1.5", current ? "text-blue-400" : "text-zinc-500")} />
            <p className={cn("text-[10px] font-medium leading-tight", current ? "text-blue-300" : "text-zinc-500")}>
              {step.label}
            </p>
          </motion.div>
        )
      })}
    </div>
  )
}

export default function CheckoutPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const [order, setOrder] = useState<ServiceOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState<string | null>(null)
  const [submitted] = useState(true)

  useEffect(() => {
    if (!orderId) return
    setLoading(true)
    fetchServiceOrder(orderId).then((data) => {
      setOrder(data)
      setLoading(false)
    })
  }, [orderId])

  const handleRequestPaymentLink = async (methodId: string, methodName: string) => {
    if (!order) return
    setRequesting(methodId)
    await requestPaymentLink(order.id, methodName)
    setRequesting(null)
  }

  if (loading) {
    return (
      <div className="relative min-h-screen text-[#f0f0f5] flex items-center justify-center">
        <TechPremiumBackground />
        <div className="relative z-10 text-center">
          <Loader2 size={32} className="animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-zinc-500 text-sm">Loading order...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="relative min-h-screen text-[#f0f0f5] flex items-center justify-center">
        <TechPremiumBackground />
        <div className="relative z-10 text-center max-w-md px-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15">
            <AlertCircle size={32} className="text-red-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Order Not Found</h1>
          <p className="text-zinc-500 mb-6">This order doesn't exist or has been removed.</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1d4ed8] transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  const displayName = getOrderDisplayName(order)
  const currentStep = order.upfrontPaid ? 3 : submitted ? 2 : 1

  return (
    <div className="relative min-h-screen text-[#f0f0f5]">
      <TechPremiumBackground />
      <div className="relative z-10 container mx-auto px-4 py-12 max-w-2xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft size={15} />
          Back to Home
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Stepper currentStep={currentStep} />

          {submitted && !order.upfrontPaid && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-5 text-center shadow-[0_0_30px_rgba(234,179,8,0.08)]"
            >
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-500/15">
                <Send size={26} className="text-yellow-400" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Order Submitted</h1>
              <p className="text-sm text-yellow-200/80 mb-1 font-medium">Payment Pending</p>
              <p className="text-sm text-zinc-400 max-w-md mx-auto">
                Your order has been submitted. The upfront payment is still pending. CAFÉ Services will contact you with the payment details.
              </p>
            </motion.div>
          )}

          <div className="mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400 mb-3">
              <CreditCard size={12} />
              {PAYMENT_STATUS_LABELS[order.paymentStatus] || "Payment Pending"}
            </div>
            <h2 className="text-2xl font-bold mb-2">Review Your Order</h2>
            <p className="text-zinc-400 text-sm">
              We'll contact you with payment instructions. No payment has been processed yet.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-white/[0.1] bg-white/[0.04] backdrop-blur-xl p-6 mb-6 space-y-4 shadow-[0_8px_40px_rgba(0,0,0,0.3)]"
          >
            <div className="flex items-center gap-3 pb-4 border-b border-white/[0.06]">
              <OrderAvatar order={order} />
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-white truncate">{displayName}</h3>
                <p className="text-sm text-zinc-500 truncate">{order.serviceName}</p>
              </div>
              <span className="ml-auto shrink-0 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2.5 py-0.5 text-[10px] font-medium text-yellow-400">
                {PAYMENT_STATUS_LABELS[order.paymentStatus]}
              </span>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 text-zinc-400">
                <User size={14} className="shrink-0" />
                <span className="truncate">{displayName}</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-400">
                <span className="text-base leading-none shrink-0">✉️</span>
                <span className="truncate">{order.clientEmail}</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-400">
                <span className="text-base leading-none shrink-0">📞</span>
                <span>{formatPhoneDisplay(order.clientPhone)}</span>
              </div>
              {order.company && (
                <div className="flex items-center gap-3 text-zinc-400">
                  <User size={14} className="shrink-0" />
                  <span className="truncate">{order.company}</span>
                </div>
              )}
              {order.desiredDeadline && (
                <div className="flex items-center gap-3 text-zinc-400">
                  <Calendar size={14} className="shrink-0" />
                  <span>Deadline: {order.desiredDeadline}</span>
                </div>
              )}
            </div>

            <div className="border-t border-white/[0.06] pt-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Total Price</span>
                <span className="text-white font-semibold">${order.totalPrice}</span>
              </div>
              <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <span className="text-yellow-400 font-semibold flex items-center gap-2">
                  <DollarSign size={15} />
                  Upfront Payment (50%)
                </span>
                <span className="text-yellow-400 font-bold text-lg">${order.upfrontAmount}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500">Due on Delivery (50%)</span>
                <span className="text-zinc-400">${order.remainingAmount}</span>
              </div>
            </div>
          </motion.div>

          {!order.upfrontPaid && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-white/[0.1] bg-white/[0.04] backdrop-blur-xl p-6 mb-6"
            >
              <h3 className="text-lg font-semibold mb-1">Payment Methods</h3>
              <p className="text-xs text-zinc-500 mb-4">
                Choose how you'd like to pay. Real payment gateways are coming soon.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    disabled={!!requesting}
                    onClick={() => handleRequestPaymentLink(method.id, method.name)}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-xl border px-4 py-3 text-left transition-all",
                      method.configured
                        ? "border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/15 hover:border-blue-500/40"
                        : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.14] hover:bg-white/[0.04]",
                    )}
                  >
                    <span className="text-sm font-semibold text-white">{method.name}</span>
                    <span className="text-[10px] text-zinc-500">
                      {method.configured ? (
                        requesting === method.id ? "Sending request..." : "Request payment link"
                      ) : (
                        "Coming soon"
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/dashboard/orders"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1d4ed8] transition-colors"
            >
              View My Orders
            </Link>
            <Link
              to="/"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.03] px-5 py-3 text-sm font-semibold text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Home
            </Link>
          </div>

          <p className="text-xs text-zinc-600 text-center mt-4">
            Awaiting Payment Instructions — CAFÉ Services will reach out shortly.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
