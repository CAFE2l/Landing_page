const SESSION_KEY = "cafe-services-user"

export type UserRole = "client" | "admin"

export interface UserProfile {
  uid?: string
  name: string
  email: string
  role: UserRole
  username?: string
  company?: string
  photoUrl?: string
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
  // Feedback persistence belongs to the backend. This no-op keeps the UI ready
  // until the API/database layer is connected.
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
