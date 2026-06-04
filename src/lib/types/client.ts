export interface Client {
  id: string
  uid?: string
  name: string
  email: string
  company?: string
  avatarUrl?: string
  role: "client" | "admin"
  projectsCount: number
  feedbackCount: number
  lastActivity?: string
  createdAt: string
}
