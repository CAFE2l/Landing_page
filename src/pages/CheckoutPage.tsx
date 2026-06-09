"use client"

import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { motion } from "framer-motion"
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  DollarSign,
  FileText,
  Loader2,
  Mail,
  ShieldCheck,
  User,
  WalletCards,
} from "lucide-react"
import {
  confirmPayment,
  fetchServiceOrder,
  getOrderAvatarUrl,
  getOrderDisplayName,
} from "../lib/serviceOrdersService"
import type { ServiceOrder } from "../lib/types/serviceOrders"
import { PAYMENT_STATUS_LABELS } from "../lib/types/serviceOrders"
import { formatPhoneDisplay } from "../components/ui/PhoneInput"
import TechPremiumBackground from "../components/ui/TechPremiumBackground"
import { cn } from "../lib/utils"
import toast from "react-hot-toast"

type PaymentMethod = "paypal" | "wise"

const PAYPAL_EMAIL = "gutiajs@gmail.com"
const WISE_DETAILS = {
  accountHolder: "CAFÉ Services",
  email: "gutiajs@gmail.com",
  currency: "USD",
  note: "Use your order ID as payment reference.",
}

const STEPS = [
  { label: "Project details", icon: FileText },
  { label: "Review order", icon: Check },
  { label: "Payment method", icon: WalletCards },
  { label: "Payment confirmation", icon: ShieldCheck },
] as const

function OrderAvatar({ order }: { order: ServiceOrder }) {
  const avatarUrl = getOrderAvatarUrl(order)
  const name = getOrderDisplayName(order)

  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className="h-12 w-12 shrink-0 rounded-full border border-white/10 object-cover" />
  }

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-blue-500/20 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 text-lg font-bold text-blue-300">
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
          <div
            key={step.label}
            className={cn(
              "rounded-xl border px-3 py-3 text-center transition-all",
              current
                ? "border-blue-500/40 bg-blue-500/10 shadow-[0_0_24px_rgba(37,99,235,0.15)]"
                : active
                  ? "border-white/[0.1] bg-white/[0.04]"
                  : "border-white/[0.05] bg-white/[0.02] opacity-60",
            )}
          >
            <Icon size={16} className={cn("mx-auto mb-1.5", current ? "text-blue-300" : "text-zinc-500")} />
            <p className={cn("text-[10px] font-medium leading-tight", current ? "text-blue-200" : "text-zinc-500")}>
              {step.label}
            </p>
          </div>
        )
      })}
    </div>
  )
}

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    toast.success("Copied")
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-xs text-zinc-400 transition-all hover:bg-white/[0.06] hover:text-white"
    >
      {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
      {copied ? "Copied" : label}
    </button>
  )
}

function PaymentMethodCard({
  method,
  selected,
  onSelect,
}: {
  method: PaymentMethod
  selected: boolean
  onSelect: () => void
}) {
  const isPayPal = method === "paypal"
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "rounded-2xl border p-5 text-left transition-all",
        selected
          ? "border-blue-500/45 bg-blue-500/12 shadow-[0_0_34px_rgba(37,99,235,0.18)]"
          : "border-white/[0.08] bg-white/[0.035] hover:border-white/[0.16] hover:bg-white/[0.055]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", isPayPal ? "bg-[#0070BA]/15 text-[#4DB4FF]" : "bg-cyan-500/12 text-cyan-300")}>
          {isPayPal ? <CreditCard size={20} /> : <Banknote size={20} />}
        </div>
        <span className={cn("rounded-full border px-2.5 py-0.5 text-[10px] font-semibold", selected ? "border-blue-400/30 text-blue-200" : "border-white/[0.08] text-white/35")}>
          {selected ? "Selected" : "Choose"}
        </span>
      </div>
      <h3 className="mt-4 text-lg font-semibold text-white">{isPayPal ? "PayPal" : "Wise"}</h3>
      <p className="mt-1 text-sm leading-relaxed text-zinc-500">
        {isPayPal
          ? "Pay by PayPal email, then notify us after the transfer."
          : "International transfer option for clients outside Brazil."}
      </p>
    </button>
  )
}

function OrderSummary({ order }: { order: ServiceOrder }) {
  const displayName = getOrderDisplayName(order)
  return (
    <div className="rounded-2xl border border-white/[0.1] bg-white/[0.04] p-6 shadow-[0_8px_40px_rgba(0,0,0,0.3)] backdrop-blur-xl">
      <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4">
        <OrderAvatar order={order} />
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-white">{displayName}</h3>
          <p className="truncate text-sm text-zinc-500">{order.serviceName}</p>
        </div>
        <span className="ml-auto shrink-0 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-medium text-zinc-300">
          {PAYMENT_STATUS_LABELS[order.paymentStatus]}
        </span>
      </div>

      <div className="space-y-3 py-4 text-sm">
        <div className="flex items-center gap-3 text-zinc-400">
          <User size={14} className="shrink-0" />
          <span className="truncate">{displayName}</span>
        </div>
        <div className="flex items-center gap-3 text-zinc-400">
          <Mail size={14} className="shrink-0" />
          <span className="truncate">{order.clientEmail}</span>
        </div>
        <div className="flex items-center gap-3 text-zinc-400">
          <span className="text-base leading-none">📞</span>
          <span>{formatPhoneDisplay(order.clientPhone)}</span>
        </div>
      </div>

      <div className="space-y-3 border-t border-white/[0.06] pt-4">
        <div className="flex items-center justify-between">
          <span className="text-zinc-500">Total Price</span>
          <span className="font-semibold text-white">${order.totalPrice}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-3 py-2">
          <span className="flex items-center gap-2 font-semibold text-yellow-300">
            <DollarSign size={15} />
            Upfront Payment (50%)
          </span>
          <span className="text-lg font-bold text-yellow-300">${order.upfrontAmount}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-500">Due on Delivery (50%)</span>
          <span className="text-zinc-400">${order.remainingAmount}</span>
        </div>
      </div>
    </div>
  )
}

function PaymentInstructions({
  order,
  method,
  notifying,
  onNotify,
}: {
  order: ServiceOrder
  method: PaymentMethod
  notifying: boolean
  onNotify: () => Promise<void>
}) {
  const isPayPal = method === "paypal"
  const details = isPayPal
    ? `PayPal email: ${PAYPAL_EMAIL}\nAmount: $${order.upfrontAmount} USD\nReference: ${order.id}`
    : `Wise recipient: ${WISE_DETAILS.accountHolder}\nEmail: ${WISE_DETAILS.email}\nCurrency: ${WISE_DETAILS.currency}\nAmount: $${order.upfrontAmount} USD\nReference: ${order.id}`

  return (
    <div className="rounded-2xl border border-white/[0.1] bg-white/[0.04] p-6 shadow-[0_8px_40px_rgba(0,0,0,0.25)] backdrop-blur-xl">
      <div className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-300">Payment confirmation</p>
        <h3 className="mt-2 text-xl font-semibold text-white">{isPayPal ? "Pay with PayPal" : "Pay with Wise"}</h3>
        <p className="mt-1 text-sm leading-relaxed text-zinc-500">
          Notify us only after completing the payment. Your project starts after payment confirmation.
        </p>
      </div>

      <div className={cn("space-y-3 rounded-2xl border p-4", isPayPal ? "border-[#0070BA]/30 bg-[#0070BA]/10" : "border-cyan-400/25 bg-cyan-400/8")}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-zinc-500">{isPayPal ? "PayPal email" : "Wise email"}</p>
            <p className={cn("font-bold", isPayPal ? "text-[#4DB4FF]" : "text-cyan-200")}>{isPayPal ? PAYPAL_EMAIL : WISE_DETAILS.email}</p>
          </div>
          <CopyButton value={isPayPal ? PAYPAL_EMAIL : WISE_DETAILS.email} />
        </div>
        {!isPayPal && (
          <div className="grid gap-3 border-t border-white/[0.08] pt-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-zinc-500">Account holder</p>
              <p className="font-semibold text-white">{WISE_DETAILS.accountHolder}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Currency</p>
              <p className="font-semibold text-white">{WISE_DETAILS.currency}</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-sm text-zinc-400">
          Amount to send: <span className="font-semibold text-white">${order.upfrontAmount} USD</span>
          <br />
          Reference: <span className="font-mono text-xs text-zinc-300">{order.id}</span>
        </div>
        <CopyButton value={details} label="Copy details" />
      </div>

      <div className="mt-5 rounded-xl border border-amber-400/15 bg-amber-400/8 p-4 text-sm leading-relaxed text-amber-100/80">
        After paying, click the button below. This is the only manual action that notifies CAFÉ before admin verification.
      </div>

      <button
        disabled={notifying}
        onClick={onNotify}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2563eb] to-[#6d28d9] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(37,99,235,0.24)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {notifying ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
        {notifying ? "Sending notification..." : "I've Paid — Notify CAFÉ"}
      </button>
    </div>
  )
}

export default function CheckoutPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const [order, setOrder] = useState<ServiceOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [notifying, setNotifying] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!orderId) return
    queueMicrotask(() => {
      setLoading(true)
      fetchServiceOrder(orderId).then((data) => {
        setOrder(data)
        setLoading(false)
      })
    })
  }, [orderId])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("paypal") === "success") {
      toast.success("PayPal returned successfully. Final confirmation happens by webhook or admin verification.")
      window.history.replaceState({}, "", `/checkout/${orderId}`)
    }
    if (params.get("paypal") === "cancel") {
      toast.error("Payment was cancelled.")
      window.history.replaceState({}, "", `/checkout/${orderId}`)
    }
  }, [orderId])

  const currentStep = useMemo(() => {
    if (!order) return 1
    if (order.upfrontPaid || order.projectStatus === "paid") return 3
    if (order.projectStatus === "payment_claimed") return 3
    if (selectedMethod) return 2
    return 1
  }, [order, selectedMethod])

  const notifyPaid = async () => {
    if (!order || !selectedMethod) return
    setNotifying(true)
    const ok = await confirmPayment(order.id, selectedMethod)
    setNotifying(false)
    if (!ok) return
    toast.success("Thanks. CAFÉ was notified and will verify your payment.")
    const refreshed = await fetchServiceOrder(order.id)
    setOrder(refreshed)
  }

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center text-[#f0f0f5]">
        <TechPremiumBackground />
        <div className="relative z-10 text-center">
          <Loader2 size={32} className="mx-auto mb-4 animate-spin text-blue-400" />
          <p className="text-sm text-zinc-500">Loading order...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="relative flex min-h-screen items-center justify-center text-[#f0f0f5]">
        <TechPremiumBackground />
        <div className="relative z-10 max-w-md px-4 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15">
            <AlertCircle size={32} className="text-red-400" />
          </div>
          <h1 className="mb-2 text-2xl font-bold">Order Not Found</h1>
          <p className="mb-6 text-zinc-500">This order doesn't exist or has been removed.</p>
          <Link to="/" className="inline-flex items-center gap-2 rounded-xl bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8]">
            <ArrowLeft size={16} />
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  const paid = order.upfrontPaid || order.projectStatus === "paid"
  const claimed = order.projectStatus === "payment_claimed"

  return (
    <div className="relative min-h-screen text-[#f0f0f5]">
      <TechPremiumBackground />
      <div className="relative z-10 container mx-auto max-w-3xl px-4 py-12">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-white">
          <ArrowLeft size={15} />
          Back to Home
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Stepper currentStep={currentStep} />

          <div className="mb-6">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
              <CreditCard size={12} />
              {paid ? "Payment confirmed" : claimed ? "Awaiting verification" : "Secure checkout"}
            </div>
            <h1 className="mb-2 text-3xl font-bold">
              {paid ? "Payment confirmed" : claimed ? "Payment notification sent" : "Choose payment method"}
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-zinc-400">
              {paid
                ? "Your project is ready to enter production."
                : claimed
                  ? "CAFÉ has been notified. We will verify your payment before starting production."
                  : "Choose how you want to pay. Payment instructions appear only after you select a method."}
            </p>
          </div>

          {paid && (
            <div className="mb-6 rounded-2xl border border-green-500/20 bg-green-500/10 p-5 text-center shadow-[0_0_30px_rgba(34,197,94,0.08)]">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/15">
                <CheckCircle2 size={26} className="text-green-400" />
              </div>
              <h2 className="mb-2 text-2xl font-bold">Your project can start</h2>
              <p className="mx-auto max-w-md text-sm text-green-100/75">
                Your upfront payment of ${order.upfrontAmount} has been confirmed.
              </p>
            </div>
          )}

          {claimed && !paid && (
            <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-center shadow-[0_0_30px_rgba(234,179,8,0.08)]">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15">
                <ShieldCheck size={26} className="text-amber-300" />
              </div>
              <h2 className="mb-2 text-2xl font-bold">Awaiting payment verification</h2>
              <p className="mx-auto max-w-md text-sm text-amber-100/75">
                We received your notification. Your project starts after payment confirmation.
              </p>
            </div>
          )}

          <div className="space-y-6">
            <OrderSummary order={order} />

            {!paid && !claimed && (
              <>
                <div className="rounded-2xl border border-white/[0.1] bg-white/[0.04] p-6 backdrop-blur-xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-300">Step 3</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">Choose how you want to pay</h2>
                  <p className="mt-1 text-sm text-zinc-500">Notify us only after completing the payment.</p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <PaymentMethodCard method="paypal" selected={selectedMethod === "paypal"} onSelect={() => setSelectedMethod("paypal")} />
                    <PaymentMethodCard method="wise" selected={selectedMethod === "wise"} onSelect={() => setSelectedMethod("wise")} />
                  </div>
                </div>

                {selectedMethod && (
                  <PaymentInstructions
                    order={order}
                    method={selectedMethod}
                    notifying={notifying}
                    onNotify={notifyPaid}
                  />
                )}
              </>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link to="/dashboard/orders" className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8]">
              View My Orders
            </Link>
            <button
              onClick={() => navigate("/")}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.03] px-5 py-3 text-sm font-semibold text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <ArrowLeft size={16} />
              Back to Home
            </button>
          </div>

          <p className="mt-4 text-center text-xs text-zinc-600">
            No payment data is stored on our servers. Your project starts after payment confirmation.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
