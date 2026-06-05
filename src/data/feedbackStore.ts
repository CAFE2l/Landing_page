const SESSION_KEY = "cafe-services-user"

export type UserRole = "client" | "admin"

export interface UserProfile {
  uid?: string
  name: string
  email: string
  role: UserRole
  username?: string
  company?: string
  country?: string
  photoUrl?: string
  phone?: string
  countryCode?: string
  location?: string
  locationCountryCode?: string
  bio?: string
  createdAt?: string
}

export interface FeedbackEntry {
  id: string
  quote: string
  name: string
  role: string
  company: string
  flag: string
  initials: string
  rating: number
  project?: string
  result?: string
  mediaType?: "image" | "video"
  mediaUrl?: string
  status?: "pending" | "approved" | "rejected"
  approved?: boolean
  userId?: string
  username?: string
  showOnPublicPage?: boolean
  order?: number
  createdAt: string
  updatedAt?: string
}

export type FeedbackStatus = "pending" | "approved" | "rejected" | "highlighted"

export type ServiceCategory = "Landing Page" | "Website Profissional" | "Web App" | "SaaS/Dashboard"

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  "Landing Page",
  "Website Profissional",
  "Web App",
  "SaaS/Dashboard",
]

export interface FeedbackMedia {
  url: string
  type: "image" | "video"
  altText?: string
}

export interface FeedbackAdminReply {
  content: string
  adminId: string
  adminName: string
  createdAt: string
}

export interface FeedbackPost {
  id: string
  userId: string
  userName: string
  userAvatar: string
  serviceCategory: ServiceCategory
  projectTitle: string
  projectUrl?: string
  rating: number
  title: string
  content: string
  media: FeedbackMedia[]
  serviceDate?: string
  status: FeedbackStatus
  isVerifiedClient: boolean
  isVerifiedProject: boolean
  isHighlighted: boolean
  helpfulCount: number
  downvoteCount?: number
  commentCount: number
  createdAt: string
  updatedAt: string
  adminReply?: FeedbackAdminReply
  improvementSuggestion?: string
  savedAt?: string
}

export type FeedbackVoteType = "up" | "down"
export type ReactionType = "like" | "dislike"

export interface FeedbackComment {
  id: string
  postId: string
  userId: string
  userName: string
  userAvatar: string
  content: string
  status: "visible" | "hidden"
  createdAt: string
}

export const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "CS"

export const loadFeedbacks = (): FeedbackEntry[] => {
  return []
}

export const saveFeedbacks = (feedbacks: FeedbackEntry[]) => {
  void feedbacks
}

export const loadCurrentUser = (): UserProfile | null => {
  if (typeof window === "undefined") return null
  const saved = window.localStorage.getItem(SESSION_KEY)
  if (!saved) return null
  try {
    return JSON.parse(saved) as UserProfile
  } catch {
    return null
  }
}

export const saveCurrentUser = (user: UserProfile) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(user))
  }
}

export const clearCurrentUser = () => {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(SESSION_KEY)
  }
}

// ========== Chat Types ==========

export type MessageType = "text" | "image" | "sticker" | "emoji"

export interface ChatMessage {
  id: string
  conversationId: string
  senderId: string
  receiverId: string | null
  content: string
  messageType: MessageType
  mediaUrl: string | null
  readAt: string | null
  createdAt: string
}

export interface ChatConversation {
  id: string
  participantA: string
  participantB: string
  lastMessage: string | null
  lastMessageAt: string
  updatedAt: string
  createdAt: string
  otherUser: {
    id: string
    name: string
    avatarUrl: string | null
    username: string | null
  }
  unreadCount: number
}

export interface UserSticker {
  id: string
  userId: string
  imageUrl: string
  name: string | null
  createdAt: string
}
