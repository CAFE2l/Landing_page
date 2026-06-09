export type ProjectStatus =
  | "draft"
  | "pending_checkout"
  | "awaiting_payment"
  | "payment_claimed"
  | "payment_pending"
  | "paid"
  | "payment_failed"
  | "new_request"
  | "waiting_payment"
  | "paid_upfront"
  | "in_progress"
  | "waiting_delivery_payment"
  | "delivered"
  | "completed"
  | "cancelled"

export type PaymentStatus =
  | "not_paid"
  | "client_claimed_paid"
  | "paypal_confirmed"
  | "wise_confirmed"
  | "wise_manual_review"
  | "payment_pending"
  | "payment_failed"
  | "waiting_upfront_payment"
  | "paid_upfront"
  | "remaining_paid"
  | "fully_paid"
  | "refunded"

export type ServiceSlug = "landing-page" | "professional-website" | "website" | "saas-dashboard"

export interface ServiceOrderProfile {
  fullName: string | null
  avatarUrl: string | null
}

export interface ServiceOrder {
  id: string
  userId: string | null
  clientName: string
  clientEmail: string
  clientPhone: string
  profile: ServiceOrderProfile | null
  company: string | null
  serviceSlug: string
  serviceName: string
  totalPrice: number
  upfrontAmount: number
  remainingAmount: number
  upfrontPaid: boolean
  remainingPaid: boolean
  paymentStatus: PaymentStatus
  projectStatus: ProjectStatus
  paymentMethod: "paypal" | "wise" | "manual" | null
  paypalOrderId: string | null
  paypalCaptureId: string | null
  payerEmail: string | null
  paymentCurrency: string | null
  paymentAmount: number | null
  paymentClaimedAt: string | null
  paymentConfirmedAt: string | null
  projectType: string | null
  projectGoal: string | null
  projectDescription: string
  referencesText: string | null
  currentProjectUrl: string | null
  desiredDeadline: string | null
  budget: string | null
  budgetNotes: string | null
  additionalNotes: string | null
  adminNotes: string | null
  deliveredProjectUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface Notification {
  id: string
  type: string
  title: string
  message: string | null
  payload: unknown
  isRead: boolean
  createdAt: string
}

export const SERVICE_PLANS: Record<ServiceSlug, { name: string; price: number }> = {
  "landing-page": { name: "Landing Page", price: 240 },
  "professional-website": { name: "Professional Website", price: 560 },
  "website": { name: "Professional Website", price: 560 },
  "saas-dashboard": { name: "Web App & SaaS", price: 0 },
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  not_paid: "Not paid",
  client_claimed_paid: "Client claimed paid",
  paypal_confirmed: "PayPal confirmed",
  wise_confirmed: "Wise confirmed",
  wise_manual_review: "Wise manual confirmation needed",
  payment_pending: "Payment pending",
  payment_failed: "Payment failed",
  waiting_upfront_payment: "Payment Pending",
  paid_upfront: "Upfront Paid",
  remaining_paid: "Remaining Paid",
  fully_paid: "Fully Paid",
  refunded: "Refunded",
}

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  not_paid: "bg-zinc-500/10 text-zinc-300 border-zinc-500/20",
  client_claimed_paid: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  paypal_confirmed: "bg-green-500/10 text-green-400 border-green-500/20",
  wise_confirmed: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  wise_manual_review: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
  payment_pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  payment_failed: "bg-red-500/10 text-red-400 border-red-500/20",
  waiting_upfront_payment: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  paid_upfront: "bg-green-500/10 text-green-400 border-green-500/20",
  remaining_paid: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  fully_paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  refunded: "bg-red-500/10 text-red-400 border-red-500/20",
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: "Draft",
  pending_checkout: "Pending Checkout",
  awaiting_payment: "Awaiting Payment",
  payment_claimed: "Payment Claimed",
  payment_pending: "Payment Pending",
  paid: "Paid",
  payment_failed: "Payment Failed",
  new_request: "New Request",
  waiting_payment: "Awaiting Payment Instructions",
  paid_upfront: "Upfront Paid",
  in_progress: "In Progress",
  waiting_delivery_payment: "Waiting Delivery Payment",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
}

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  draft: "bg-zinc-500/10 text-zinc-300 border-zinc-500/20",
  pending_checkout: "bg-blue-500/10 text-blue-300 border-blue-500/20",
  awaiting_payment: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  payment_claimed: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  payment_pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  paid: "bg-green-500/10 text-green-400 border-green-500/20",
  payment_failed: "bg-red-500/10 text-red-400 border-red-500/20",
  new_request: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  waiting_payment: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  paid_upfront: "bg-green-500/10 text-green-400 border-green-500/20",
  in_progress: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  waiting_delivery_payment: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  delivered: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
}
