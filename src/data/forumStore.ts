export interface ForumCategory {
  id: string
  name: string
  slug: string
  description: string
  icon: string
  postCount: number
}

export interface ForumAuthor {
  uid: string
  name: string
  avatar: string
  role: "admin" | "client" | "member"
  verified: boolean
  company?: string
  photoUrl?: string
}

export interface ForumMedia {
  type: "image" | "video" | "embed"
  url: string
  thumbnail?: string
}

export interface ForumMetric {
  label: string
  value: string
}

export type PostStatus = "published" | "draft" | "archived"

export interface ForumPost {
  id: string
  slug: string
  title: string
  body: string
  author: ForumAuthor
  categoryId: string
  tags: string[]
  media: ForumMedia[]
  metrics: ForumMetric[]
  featured: boolean
  pinned: boolean
  verifiedResult: boolean
  upvotes: number
  commentCount: number
  createdAt: string
  updatedAt: string
  status: PostStatus
}

export interface ForumComment {
  id: string
  postId: string
  author: ForumAuthor
  body: string
  createdAt: string
  parentId: string | null
  replies?: ForumComment[]
}

export type SortMode = "hot" | "new" | "top"

export const defaultCategories: ForumCategory[] = [
  { id: "", name: "Web Apps", slug: "web-apps", description: "Web application projects and case studies", icon: "Layout", postCount: 0 },
  { id: "", name: "Landing Pages", slug: "landing-pages", description: "Landing page designs and optimizations", icon: "FileText", postCount: 0 },
  { id: "", name: "SaaS", slug: "saas", description: "SaaS platform development and scaling", icon: "Cloud", postCount: 0 },
  { id: "", name: "Results", slug: "results", description: "Proven results and performance metrics", icon: "TrendingUp", postCount: 0 },
  { id: "", name: "Testimonials", slug: "testimonials", description: "Client testimonials and success stories", icon: "Star", postCount: 0 },
]
