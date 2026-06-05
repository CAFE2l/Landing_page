export type ProjectStatus =
  | "new_request"
  | "waiting_payment"
  | "paid_upfront"
  | "in_progress"
  | "waiting_delivery_payment"
  | "delivered"
  | "completed"
  | "cancelled"

export type PaymentStatus =
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
  waiting_upfront_payment: "Payment Pending",
  paid_upfront: "Upfront Paid",
  remaining_paid: "Remaining Paid",
  fully_paid: "Fully Paid",
  refunded: "Refunded",
}

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  waiting_upfront_payment: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  paid_upfront: "bg-green-500/10 text-green-400 border-green-500/20",
  remaining_paid: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  fully_paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  refunded: "bg-red-500/10 text-red-400 border-red-500/20",
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
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
  new_request: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  waiting_payment: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  paid_upfront: "bg-green-500/10 text-green-400 border-green-500/20",
  in_progress: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  waiting_delivery_payment: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  delivered: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
}
