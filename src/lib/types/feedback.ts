export type FeedbackStatus = "pending" | "approved" | "rejected"
export type FeedbackChannel = "website" | "email" | "whatsapp" | "telegram" | "discord" | "direct"

export interface FeedbackEntry {
  id: string
  userId?: string
  userName: string
  userEmail?: string
  userAvatar?: string
  title: string
  body: string
  bodyHtml?: string
  channel: FeedbackChannel
  status: FeedbackStatus
  rating: number
  isTestimonial: boolean
  verifiedResult?: string
  adminNote?: string
  metrics?: Record<string, number>
  mediaCount: number
  createdAt: string
  updatedAt?: string
}

export interface FeedbackMedia {
  id: string
  postId: string
  type: "image" | "video" | "embed"
  url: string
  thumbnailUrl?: string
  orderIndex: number
}

export interface FeedbackComment {
  id: string
  postId: string
  parentId?: string
  userId: string
  userName: string
  body: string
  reactions: Record<string, number>
  createdAt: string
}
