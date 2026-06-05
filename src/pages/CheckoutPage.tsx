"use client"

import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { motion } from "framer-motion"
import { Check, Loader2, ArrowLeft, AlertCircle, DollarSign, Calendar, User, Mail, Phone, CreditCard } from "lucide-react"
import { fetchServiceOrder, updateServiceOrder } from "../lib/serviceOrdersService"
import type { ServiceOrder } from "../lib/types/serviceOrders"
import { cn } from "../lib/utils"
import toast from "react-hot-toast"

export default function CheckoutPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const [order, setOrder] = useState<ServiceOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!orderId) return
    setLoading(true)
    fetchServiceOrder(orderId).then((data) => {
      setOrder(data)
      setLoading(false)
      if (data?.upfrontPaid) {
        setConfirmed(true)
      }
    })
  }, [orderId])

  const handleConfirmPayment = async () => {
    if (!order) return
    setConfirming(true)
    setError("")

    const ok = await updateServiceOrder(order.id, {
      upfrontPaid: true,
      paymentStatus: "paid_upfront",
      projectStatus: "paid_upfront",
    })

    setConfirming(false)

    if (ok) {
      setConfirmed(true)
      toast.success("Upfront payment confirmed!")
    } else {
      setError("Failed to confirm payment. Try again.")
      toast.error("Failed to confirm payment")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020408] text-[#f0f0f5] flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-zinc-500 text-sm">Loading order...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#020408] text-[#f0f0f5] flex items-center justify-center">
        <div className="text-center max-w-md">
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

  if (confirmed) {
    return (
      <div className="min-h-screen bg-[#020408] text-[#f0f0f5]">
        <div className="container mx-auto px-4 py-20 max-w-lg">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-8 text-center"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15">
              <Check size={32} className="text-green-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Payment Confirmed!</h1>
            <p className="text-zinc-400 mb-6">
              Your upfront payment for <span className="text-white font-semibold">{order.serviceName}</span> has been confirmed. Your project is now in progress.
            </p>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 mb-6 text-left space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Order</span>
                <span className="text-zinc-400 font-mono text-xs">{order.id.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Client</span>
                <span>{order.clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Service</span>
                <span>{order.serviceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Total</span>
                <span>${order.totalPrice}</span>
              </div>
              <div className="flex justify-between border-t border-white/[0.06] pt-2">
                <span className="text-zinc-500">Upfront Paid</span>
                <span className="text-green-400 font-semibold">${order.upfrontAmount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Due on Delivery</span>
                <span>${order.remainingAmount}</span>
              </div>
            </div>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1d4ed8] transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Home
            </Link>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#020408] text-[#f0f0f5]">
      <div className="container mx-auto px-4 py-20 max-w-lg">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft size={15} />
          Back to Home
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-xs font-medium text-yellow-400 mb-3">
              <CreditCard size={12} />
              Confirm Upfront Payment
            </div>
            <h1 className="text-3xl font-bold mb-2">Review & Confirm</h1>
            <p className="text-zinc-400 text-sm">
              Please review your order details before confirming the 50% upfront payment.
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6 mb-6 space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-white/[0.06]">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 text-lg font-bold text-blue-400">
                {order.clientName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">{order.clientName}</h2>
                <p className="text-sm text-zinc-500">{order.serviceName}</p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 text-zinc-400">
                <Mail size={14} />
                <span>{order.clientEmail}</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-400">
                <Phone size={14} />
                <span>{order.clientPhone}</span>
              </div>
              {order.company && (
                <div className="flex items-center gap-3 text-zinc-400">
                  <User size={14} />
                  <span>{order.company}</span>
                </div>
              )}
              {order.desiredDeadline && (
                <div className="flex items-center gap-3 text-zinc-400">
                  <Calendar size={14} />
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
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            onClick={handleConfirmPayment}
            disabled={confirming}
            className={cn(
              "w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold text-white transition-all",
              "bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            {confirming ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Check size={16} />
            )}
            {confirming ? "Confirming..." : `Confirm Upfront Payment — $${order.upfrontAmount}`}
          </button>

          <p className="text-xs text-zinc-600 text-center mt-4">
            By confirming, you agree to pay 50% upfront. The remaining 50% is due on delivery.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
