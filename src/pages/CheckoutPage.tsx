"use client"

import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { motion } from "framer-motion"
import {
  Check, ArrowLeft, AlertCircle, DollarSign, Calendar, User,
  MessageSquare, CreditCard, FileText, Send, Copy, Loader2,
} from "lucide-react"
import {
  fetchServiceOrder,
  getOrderDisplayName,
  getOrderAvatarUrl,
  confirmPayment,
} from "../lib/serviceOrdersService"
import type { ServiceOrder } from "../lib/types/serviceOrders"
import { PAYMENT_STATUS_LABELS } from "../lib/types/serviceOrders"
import { formatPhoneDisplay } from "../components/ui/PhoneInput"
import TechPremiumBackground from "../components/ui/TechPremiumBackground"
import { cn } from "../lib/utils"
import toast from "react-hot-toast"

const STEPS = [
  { key: "details", label: "Project Details", icon: FileText },
  { key: "review", label: "Review", icon: Check },
  { key: "payment", label: "Payment", icon: CreditCard },
  { key: "contact", label: "Admin Contact", icon: MessageSquare },
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
    <div className="mb-8 grid grid-cols-4 gap-3">
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
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!orderId) return
    setLoading(true)
    fetchServiceOrder(orderId).then((data) => {
      setOrder(data)
      setLoading(false)
    })
  }, [orderId])

  // Check for PayPal return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("paypal") === "success" && orderId) {
      toast.success("Payment approved! Processing confirmation...")
      confirmPayment(orderId, "paypal").then((ok) => {
        if (ok) {
          toast.success("Payment confirmed! We'll start your project soon.")
          fetchServiceOrder(orderId).then(setOrder)
        }
      })
      // Clean URL
      window.history.replaceState({}, "", `/checkout/${orderId}`)
    }
    if (params.get("paypal") === "cancel" && orderId) {
      toast.error("Payment was cancelled.")
      window.history.replaceState({}, "", `/checkout/${orderId}`)
    }
  }, [orderId])

  const PAYPAL_EMAIL = "gutiajs@gmail.com"

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(PAYPAL_EMAIL)
    setCopied(true)
    toast.success("PayPal email copied!")
    setTimeout(() => setCopied(false), 2000)
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
  const currentStep = order.upfrontPaid ? 3 : 2

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

          {order.upfrontPaid ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 rounded-2xl border border-green-500/20 bg-green-500/10 p-5 text-center shadow-[0_0_30px_rgba(34,197,94,0.08)]"
            >
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/15">
                <Check size={26} className="text-green-400" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Payment Confirmed!</h1>
              <p className="text-sm text-green-200/80 max-w-md mx-auto">
                Your upfront payment of ${order.upfrontAmount} has been received. We'll start working on your project shortly.
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-5 text-center shadow-[0_0_30px_rgba(234,179,8,0.08)]"
            >
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-500/15">
                <Send size={26} className="text-yellow-400" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Order Submitted</h1>
              <p className="text-sm text-yellow-200/80 mb-1 font-medium">Upfront Payment Required</p>
              <p className="text-sm text-zinc-400 max-w-md mx-auto">
                Pay ${order.upfrontAmount} now to start. The remaining ${order.remainingAmount} is due on delivery.
              </p>
            </motion.div>
          )}

          <div className="mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400 mb-3">
              <CreditCard size={12} />
              {order.upfrontPaid ? "Upfront Paid" : PAYMENT_STATUS_LABELS[order.paymentStatus]}
            </div>
            <h2 className="text-2xl font-bold mb-2">Review Your Order</h2>
            <p className="text-zinc-400 text-sm">
              {order.upfrontPaid
                ? "Payment confirmed. We'll start your project soon."
                : "Choose a payment method below to start your project."}
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
              <span className={cn(
                "ml-auto shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-medium",
                order.upfrontPaid
                  ? "border-green-500/20 bg-green-500/10 text-green-400"
                  : "border-yellow-500/20 bg-yellow-500/10 text-yellow-400",
              )}>
                {order.upfrontPaid ? "Upfront Paid" : PAYMENT_STATUS_LABELS[order.paymentStatus]}
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
              <div className={cn(
                "flex justify-between items-center py-2 px-3 rounded-lg border",
                order.upfrontPaid
                  ? "bg-green-500/10 border-green-500/20"
                  : "bg-yellow-500/10 border-yellow-500/20",
              )}>
                <span className={cn(
                  "font-semibold flex items-center gap-2",
                  order.upfrontPaid ? "text-green-400" : "text-yellow-400",
                )}>
                  <DollarSign size={15} />
                  Upfront Payment (50%)
                </span>
                <span className={cn(
                  "font-bold text-lg",
                  order.upfrontPaid ? "text-green-400" : "text-yellow-400",
                )}>${order.upfrontAmount}</span>
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
              <h3 className="text-lg font-semibold mb-1">Pay with PayPal</h3>
              <p className="text-xs text-zinc-500 mb-4">
                Send the payment to the PayPal email below. After paying, click "I've Paid" to notify us.
              </p>

              <div className="flex items-center gap-2 rounded-xl border border-[#0070BA]/30 bg-[#0070BA]/10 px-4 py-3 mb-3">
                <span className="text-sm font-bold text-[#0070BA] flex-1">gutiajs@gmail.com</span>
                <button
                  onClick={handleCopyEmail}
                  className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all"
                >
                  {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>

              <p className="text-xs text-zinc-500 mb-3">
                Amount to send: <span className="text-white font-semibold">${order.upfrontAmount} USD</span>
              </p>

              <button
                onClick={() => {
                  confirmPayment(order.id, "paypal_manual")
                  toast.success("Thanks! We'll confirm your payment and start your project soon.")
                }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0070BA] hover:bg-[#003087] px-5 py-3.5 text-sm font-semibold text-white transition-all shadow-lg"
              >
                <Check size={16} />
                I've Paid — Notify CAFÉ
              </button>

              <div className="mt-4 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <p className="text-xs text-zinc-500 font-medium mb-2">💳 Other payment methods</p>
                <button
                  onClick={() => {
                    toast.success("Request sent! We'll contact you with payment details.")
                    confirmPayment(order.id, "request_manual")
                  }}
                  className="flex items-center gap-2 rounded-lg border border-white/[0.08] px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-all w-full"
                >
                  <Send size={14} />
                  Request Manual Invoice
                </button>
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
            {order.upfrontPaid
              ? "We've received your payment. We'll start your project soon!"
              : "PayPal is processed securely. No payment data is stored on our servers."}
          </p>
        </motion.div>
      </div>
    </div>
  )
}
