import { type ClassValue, clsx } from "clsx"

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatDate(date: string | Date, fmt: string = "MMM dd, yyyy") {
  const d = new Date(date)
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const map: Record<string, string> = {
    MMM: months[d.getMonth()],
    MM: String(d.getMonth() + 1).padStart(2, "0"),
    dd: String(d.getDate()).padStart(2, "0"),
    yyyy: String(d.getFullYear()),
    HH: String(d.getHours()).padStart(2, "0"),
    mm: String(d.getMinutes()).padStart(2, "0"),
  }
  return fmt.replace(/MMM|MM|dd|yyyy|HH|mm/g, (k) => map[k] || k)
}

export function timeAgo(date: string | Date): string {
  const now = Date.now()
  const then = new Date(date).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(date)
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "?"
}

export function getUserDisplayName(user: {
  fullName?: string | null
  displayName?: string | null
  username?: string | null
  name?: string | null
  email?: string | null
  full_name?: string | null
} | null | undefined): string {
  if (!user) return "Unknown user"
  return (
    user.fullName ||
    user.full_name ||
    user.displayName ||
    user.name ||
    user.username ||
    user.email?.split("@")[0] ||
    "Unknown user"
  )
}

export function getUserAvatar(user: {
  avatarUrl?: string | null
  avatar_url?: string | null
  photoUrl?: string | null
  photoURL?: string | null
} | null | undefined): string | null {
  if (!user) return null
  return user.avatarUrl || user.avatar_url || user.photoUrl || user.photoURL || null
}

const WA_PHONE = "5541996713782"

export function wa(text: string) {
  return `https://wa.me/${WA_PHONE}?text=${encodeURIComponent(text)}`
}

export const WA_MESSAGES = {
  general: "Hello! I'm interested in your services. Can you tell me more?",
  contact: "Hello! I saw your work and I'd like to know more about how we can work together.",
  planLanding: "Hello! I'm interested in the Landing Page plan. Can you tell me more about the process and starting price?",
  planWebsite: "Hello! I'm interested in the Professional Website plan. I'd like to discuss building a complete website for my business.",
  planSaaS: "Hello! I'd like to discuss a Web App or SaaS project. Can we schedule a call to talk about the scope?",
} as const
