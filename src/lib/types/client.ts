export type ClientStatus = "active" | "new" | "inactive"

export interface Client {
  id: string
  uid?: string
  name: string
  email: string
  company?: string
  avatarUrl?: string
  role: "client" | "admin"
  projectsCount: number
  servicesCount?: number
  feedbackCount: number
  lastActivity?: string
  createdAt: string
  // Extended fields
  phone?: string
  location?: string
  bio?: string
  username?: string
  status?: ClientStatus
  unreadMessagesCount?: number
  lastMessageAt?: string
  lastMessageSnippet?: string
}

export interface ClientNote {
  id: string
  clientId: string
  adminId: string
  note: string
  createdAt: string
  updatedAt: string
  adminName?: string
  adminAvatar?: string
}
