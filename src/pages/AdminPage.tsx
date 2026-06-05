import { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowUp,
  BarChart3,
  Check,
  Clock,
  ExternalLink,
  Eye,
  Flame,
  LayoutDashboard,
  Loader2,
  MessageSquare,
  MessageSquarePlus,
  Search,
  Settings,
  Shield,
  Star,
  Trash2,
  TrendingUp,
  Users,
  X,
} from "lucide-react"
import {
  deleteFeedbackEntry,
  deleteUserProfile,
  listFeedbacks,
  listUsers,
  updateFeedbackStatus,
  updateTestimonialOrder,
  updateTestimonialVisibility,
  updateUserRole,
  type FeedbackStatus,
} from "../data/firestoreStore"
import { getInitials, type FeedbackEntry, type UserProfile, type UserRole } from "../data/feedbackStore"

interface AdminPageProps {
  user: UserProfile | null
}

type AdminSection = "dashboard" | "users" | "feedbacks" | "testimonials" | "analytics" | "settings"
type RoleFilter = "all" | "client" | "admin"
type SortMode = "newest" | "oldest" | "az"

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "users", label: "Users", icon: Users },
  { id: "feedbacks", label: "Feedbacks", icon: MessageSquare },
  { id: "testimonials", label: "Testimonials", icon: Star },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
] satisfies Array<{ id: AdminSection; label: string; icon: typeof LayoutDashboard }>

const sectionTitles: Record<AdminSection, string> = {
  dashboard: "Dashboard",
  users: "Users",
  feedbacks: "Feedbacks",
  testimonials: "Testimonials",
  analytics: "Analytics",
  settings: "Settings",
}

const pageMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: "easeOut" as const },
}

function CountUp({ value }: { value: number }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const start = performance.now()
    const duration = 900
    let frame = 0
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      setCount(Math.round(value * progress))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value])

  return <span>{count}</span>
}

function Avatar({ user, name, photoUrl, size = "h-9 w-9" }: { user?: UserProfile; name?: string; photoUrl?: string; size?: string }) {
  const displayName = user?.name || name || "Admin"
  const src = user?.photoUrl || photoUrl
  return (
    <div className={`flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#2563eb] to-[#0ea5e9] text-xs font-bold text-white`}>
      {src ? <img src={src} alt={displayName} className="h-full w-full object-cover" /> : getInitials(displayName)}
    </div>
  )
}

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span
      className={
        role === "admin"
          ? "inline-flex rounded-full border border-[#2563eb]/20 bg-[#2563eb]/10 px-2.5 py-1 text-xs font-semibold text-[#60a5fa]"
          : "inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-[#94a3b8]"
      }
    >
      {role === "admin" ? "Admin" : "Client"}
    </span>
  )
}

function StatusBadge({ status }: { status?: FeedbackStatus }) {
  const value = status || "pending"
  const className =
    value === "approved"
      ? "border-green-500/20 bg-green-500/10 text-green-400"
      : value === "rejected"
        ? "border-red-500/20 bg-red-500/10 text-red-400"
        : "border-yellow-500/20 bg-yellow-500/10 text-yellow-400"

  return (
    <motion.span
      key={value}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${className}`}
    >
      {value}
    </motion.span>
  )
}

function AdminStatCard({
  label,
  value,
  icon: Icon,
  color,
  index,
}: {
  label: string
  value: number
  icon: typeof Users
  color: string
  index: number
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.35 }}
      className="rounded-2xl border border-[#1a2d4a] bg-[#0a1628] p-6 transition-all duration-300 hover:border-[#2a4a7a] hover:shadow-[0_0_24px_rgba(37,99,235,0.08)]"
    >
      <div className="mb-5 flex items-center justify-between">
        <div className="rounded-xl p-2.5" style={{ backgroundColor: `${color}18`, color }}>
          <Icon size={20} />
        </div>
        <span className="inline-flex items-center gap-1 font-mono text-xs text-green-400">
          <ArrowUp size={12} />
          Live
        </span>
      </div>
      <p className="text-4xl font-bold text-white">
        <CountUp value={value} />
      </p>
      <p className="mt-2 font-mono text-sm uppercase tracking-wider text-[#475569]">{label}</p>
    </motion.article>
  )
}

export default function AdminPage({ user }: AdminPageProps) {
  const [active, setActive] = useState<AdminSection>("dashboard")
  const [users, setUsers] = useState<UserProfile[]>([])
  const [feedbacks, setFeedbacks] = useState<FeedbackEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all")
  const [sortMode, setSortMode] = useState<SortMode>("newest")
  const [page, setPage] = useState(1)
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackEntry | null>(null)
  const [roleMenuUid, setRoleMenuUid] = useState("")
  const [deleteUserUid, setDeleteUserUid] = useState("")
  const [draggedFeedbackId, setDraggedFeedbackId] = useState("")
  const [currentTime] = useState(() => Date.now())
  const pageSize = 10

  const isAdmin = user?.role === "admin"

  useEffect(() => {
    if (!isAdmin) return
    const load = async () => {
      setLoading(true)
      const [nextUsers, nextFeedbacks] = await Promise.all([listUsers(), listFeedbacks()])
      setUsers(nextUsers)
      setFeedbacks(nextFeedbacks)
      setLoading(false)
    }
    load().catch(() => setLoading(false))
  }, [isAdmin])

  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/profile" replace state={{ error: "Admin access only." }} />

  const pendingFeedbacks = feedbacks.filter((item) => (item.status || "pending") === "pending")
  const approvedFeedbacks = feedbacks.filter((item) => (item.status || (item.approved ? "approved" : "pending")) === "approved")
  const weekAgo = currentTime - 7 * 24 * 60 * 60 * 1000
  const newThisWeek = users.filter((item) => item.createdAt && new Date(item.createdAt).getTime() >= weekAgo).length

  const filteredUsers = users
    .filter((item) => {
      const queryText = `${item.name} ${item.email} ${item.username || ""}`.toLowerCase()
      const matchesSearch = queryText.includes(search.toLowerCase())
      const matchesRole = roleFilter === "all" || item.role === roleFilter
      return matchesSearch && matchesRole
    })
    .sort((a, b) => {
      if (sortMode === "az") return a.name.localeCompare(b.name)
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return sortMode === "oldest" ? aTime - bTime : bTime - aTime
    })

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize))
  const paginatedUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize)
  const testimonials = approvedFeedbacks.slice().sort((a, b) => (a.order || 0) - (b.order || 0))

  const refreshFeedbacks = async () => setFeedbacks(await listFeedbacks())
  const refreshUsers = async () => setUsers(await listUsers())

  const changeStatus = async (id: string, status: FeedbackStatus) => {
    await updateFeedbackStatus(id, status)
    await refreshFeedbacks()
    setSelectedFeedback((current) => (current?.id === id ? { ...current, status, approved: status === "approved" } : current))
  }

  const removeFeedback = async (id: string) => {
    await deleteFeedbackEntry(id)
    await refreshFeedbacks()
    setSelectedFeedback(null)
  }

  const changeRole = async (uid: string, role: UserRole) => {
    await updateUserRole(uid, role)
    setRoleMenuUid("")
    await refreshUsers()
  }

  const removeUser = async () => {
    if (!deleteUserUid) return
    await deleteUserProfile(deleteUserUid)
    setDeleteUserUid("")
    await refreshUsers()
  }

  const reorderTestimonials = async (targetId: string) => {
    if (!draggedFeedbackId || draggedFeedbackId === targetId) return
    const ordered = testimonials.slice()
    const from = ordered.findIndex((item) => item.id === draggedFeedbackId)
    const to = ordered.findIndex((item) => item.id === targetId)
    if (from < 0 || to < 0) return
    const [moved] = ordered.splice(from, 1)
    ordered.splice(to, 0, moved)
    await Promise.all(ordered.map((item, index) => updateTestimonialOrder(item.id, index + 1)))
    setDraggedFeedbackId("")
    await refreshFeedbacks()
  }

  const renderDashboard = () => (
    <motion.div {...pageMotion} className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard index={0} label="Total Users" value={users.length} icon={Users} color="#3b82f6" />
        <AdminStatCard index={1} label="Pending Feedbacks" value={pendingFeedbacks.length} icon={Clock} color="#f59e0b" />
        <AdminStatCard index={2} label="Approved Testimonials" value={approvedFeedbacks.length} icon={Star} color="#22c55e" />
        <AdminStatCard index={3} label="New this week" value={newThisWeek} icon={TrendingUp} color="#a78bfa" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.6fr_0.4fr]">
        <section className="overflow-hidden rounded-2xl border border-[#1a2d4a] bg-[#0a1628]">
          <div className="flex items-center justify-between border-b border-[#1a2d4a] bg-[#060d14] px-6 py-4">
            <h2 className="font-semibold text-white">Recent Users</h2>
            <button onClick={() => setActive("users")} className="text-sm text-[#3b82f6] hover:underline">View all →</button>
          </div>
          <div>
            {users.slice(0, 8).map((item, index) => (
              <motion.div
                key={item.uid || item.email}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04 }}
                className="flex flex-wrap items-center gap-4 border-b border-[#1a2d4a]/50 px-6 py-4 transition-colors duration-150 last:border-0 hover:bg-white/[0.02]"
              >
                <Avatar user={item} />
                <div className="min-w-[150px] flex-1">
                  <p className="font-medium text-white">{item.name}</p>
                  <p className="text-sm text-[#475569]">@{item.username || "unset"}</p>
                </div>
                <p className="min-w-[210px] text-sm text-[#94a3b8]">{item.email}</p>
                <p className="font-mono text-xs text-[#475569]">{item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-US") : "-"}</p>
                <RoleBadge role={item.role} />
              </motion.div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[#1a2d4a] bg-[#0a1628] p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-semibold text-white">Pending Feedbacks</h2>
            <button onClick={() => setActive("feedbacks")} className="text-sm text-[#3b82f6] hover:underline">Review →</button>
          </div>
          <div className="space-y-3">
            {pendingFeedbacks.length === 0 ? (
              <p className="rounded-xl border border-[#1a2d4a] bg-[#060d14] p-4 text-sm text-[#475569]">No pending feedbacks.</p>
            ) : (
              pendingFeedbacks.slice(0, 5).map((item) => (
                <button key={item.id} onClick={() => setSelectedFeedback(item)} className="flex w-full gap-3 rounded-xl border border-[#1a2d4a] bg-[#060d14] p-3 text-left transition-colors hover:border-[#2a4a7a]">
                  <Avatar name={item.name} />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-white">{item.name}</span>
                    <span className="block truncate text-sm text-[#94a3b8]">{item.quote.slice(0, 60)}</span>
                    <span className="mt-1 block text-sm text-[#3b82f6]">Review →</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </section>
      </div>
    </motion.div>
  )

  const renderUsers = () => (
    <motion.div {...pageMotion} className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#1a2d4a] bg-[#0a1628] p-4">
        <label className="relative min-w-[260px] flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#475569]" />
          <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Search by name, email, username" className="w-full rounded-xl border border-[#1a2d4a] bg-[#060d14] px-11 py-2.5 text-sm text-white outline-none placeholder:text-[#475569] focus:border-[#2563eb]" />
        </label>
        <div className="flex gap-2">
          {(["all", "client", "admin"] as const).map((role) => (
            <button key={role} onClick={() => { setRoleFilter(role); setPage(1) }} className={`rounded-xl px-3 py-2 text-sm font-semibold capitalize ${roleFilter === role ? "bg-[#2563eb] text-white" : "border border-[#1a2d4a] text-[#94a3b8] hover:text-white"}`}>
              {role}
            </button>
          ))}
        </div>
        <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} className="rounded-xl border border-[#1a2d4a] bg-[#060d14] px-4 py-2.5 text-sm text-white outline-none">
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="az">A-Z</option>
        </select>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#1a2d4a] bg-[#0a1628]">
        <div className="grid grid-cols-[1.1fr_1fr_0.5fr_0.6fr_0.7fr] gap-4 border-b border-[#1a2d4a] bg-[#060d14] px-6 py-4 font-mono text-xs uppercase tracking-wider text-[#475569] max-lg:hidden">
          <span>Name</span><span>Email</span><span>Role</span><span>Joined</span><span>Actions</span>
        </div>
        {paginatedUsers.map((item, index) => (
          <motion.article key={item.uid || item.email} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04 }} className="grid gap-4 border-b border-[#1a2d4a]/60 px-6 py-4 transition-colors duration-150 last:border-0 hover:bg-[#2563eb]/[0.04] lg:grid-cols-[1.1fr_1fr_0.5fr_0.6fr_0.7fr] lg:items-center">
            <div className="flex items-center gap-4">
              <Avatar user={item} />
              <div>
                <p className="font-medium text-white">{item.name}</p>
                <p className="text-sm text-[#475569]">@{item.username || "unset"}</p>
              </div>
            </div>
            <p className="text-sm text-[#94a3b8]">{item.email}</p>
            <RoleBadge role={item.role} />
            <p className="font-mono text-xs text-[#475569]">{item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-US") : "-"}</p>
            <div className="relative flex items-center gap-2">
              <button title="View profile" className="rounded-lg p-2 text-[#475569] hover:bg-white/5 hover:text-white"><Eye size={17} /></button>
              <button title="Change role" onClick={() => setRoleMenuUid(roleMenuUid === item.uid ? "" : item.uid || "")} className="rounded-lg p-2 text-[#475569] hover:bg-white/5 hover:text-[#3b82f6]"><Shield size={17} /></button>
              <button title="Delete user" onClick={() => setDeleteUserUid(item.uid || "")} className="rounded-lg p-2 text-[#475569] hover:bg-white/5 hover:text-red-400"><Trash2 size={17} /></button>
              {roleMenuUid && roleMenuUid === item.uid && (
                <div className="absolute right-8 top-10 z-20 overflow-hidden rounded-xl border border-[#1a2d4a] bg-[#060d14] shadow-2xl">
                  <button onClick={() => changeRole(item.uid || "", "client")} className="block w-full px-4 py-2 text-left text-sm text-[#94a3b8] hover:bg-white/5 hover:text-white">Client</button>
                  <button onClick={() => changeRole(item.uid || "", "admin")} className="block w-full px-4 py-2 text-left text-sm text-[#94a3b8] hover:bg-white/5 hover:text-white">Admin</button>
                </div>
              )}
            </div>
          </motion.article>
        ))}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#1a2d4a] bg-[#060d14] px-6 py-4">
          <p className="font-mono text-xs text-[#475569]">Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filteredUsers.length)} of {filteredUsers.length} users</p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-xl border border-[#1a2d4a] bg-[#060d14] px-3 py-1.5 text-sm text-[#94a3b8] disabled:opacity-40">Prev</button>
            <button disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="rounded-xl border border-[#1a2d4a] bg-[#060d14] px-3 py-1.5 text-sm text-[#94a3b8] disabled:opacity-40">Next</button>
          </div>
        </div>
      </section>
    </motion.div>
  )

  const renderFeedbacks = () => (
    <motion.div {...pageMotion} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <AdminStatCard index={0} label="Total" value={feedbacks.length} icon={MessageSquare} color="#3b82f6" />
        <AdminStatCard index={1} label="Approved" value={approvedFeedbacks.length} icon={Check} color="#22c55e" />
        <AdminStatCard index={2} label="Pending" value={pendingFeedbacks.length} icon={Clock} color="#f59e0b" />
      </div>
      {feedbacks.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-[#1a2d4a] bg-[#0a1628] py-24">
          <MessageSquarePlus size={48} className="text-[#1a2d4a]" />
          <p className="font-semibold text-white">No feedbacks yet</p>
          <p className="text-sm text-[#475569]">Feedbacks submitted by clients will appear here</p>
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-[#1a2d4a] bg-[#0a1628]">
          <div className="grid grid-cols-[0.8fr_0.8fr_0.35fr_1.2fr_0.5fr_0.55fr_0.65fr] gap-4 border-b border-[#1a2d4a] bg-[#060d14] px-6 py-4 font-mono text-xs uppercase tracking-wider text-[#475569] max-xl:hidden">
            <span>Client</span><span>Project</span><span>Rating</span><span>Feedback</span><span>Status</span><span>Submitted</span><span>Actions</span>
          </div>
          {feedbacks.map((item, index) => (
            <motion.article key={item.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04 }} className="grid gap-4 border-b border-[#1a2d4a]/60 px-6 py-4 last:border-0 hover:bg-[#2563eb]/[0.04] xl:grid-cols-[0.8fr_0.8fr_0.35fr_1.2fr_0.5fr_0.55fr_0.65fr] xl:items-center">
              <div className="flex items-center gap-3"><Avatar name={item.name} /><span className="text-sm font-medium text-white">{item.name}</span></div>
              <p className="text-sm text-[#94a3b8]">{item.project || "Project feedback"}</p>
              <p className="text-sm text-yellow-400">{"★".repeat(item.rating)}</p>
              <p className="line-clamp-2 text-sm text-[#94a3b8]">{item.quote}</p>
              <StatusBadge status={item.status} />
              <p className="font-mono text-xs text-[#475569]">{new Date(item.createdAt).toLocaleDateString("en-US")}</p>
              <div className="flex gap-2">
                <button onClick={() => setSelectedFeedback(item)} className="rounded-lg p-2 text-[#475569] hover:bg-white/5 hover:text-white"><Eye size={17} /></button>
                <button onClick={() => changeStatus(item.id, "approved")} className="rounded-lg p-2 text-[#475569] hover:bg-white/5 hover:text-green-400"><Check size={17} /></button>
                <button onClick={() => changeStatus(item.id, "rejected")} className="rounded-lg p-2 text-[#475569] hover:bg-white/5 hover:text-red-400"><X size={17} /></button>
                <button onClick={() => removeFeedback(item.id)} className="rounded-lg p-2 text-[#475569] hover:bg-white/5 hover:text-red-400"><Trash2 size={17} /></button>
              </div>
            </motion.article>
          ))}
        </section>
      )}
    </motion.div>
  )

  const renderTestimonials = () => (
    <motion.div {...pageMotion} className="space-y-4">
      {testimonials.length === 0 ? (
        <div className="rounded-2xl border border-[#1a2d4a] bg-[#0a1628] p-10 text-center text-[#475569]">Approved feedbacks will appear here.</div>
      ) : testimonials.map((item) => (
        <article key={item.id} draggable onDragStart={() => setDraggedFeedbackId(item.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => reorderTestimonials(item.id)} className="cursor-grab rounded-2xl border border-[#1a2d4a] bg-[#0a1628] p-5 active:cursor-grabbing">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <Avatar name={item.name} />
              <div className="min-w-0">
                <p className="font-medium text-white">{item.name}</p>
                <p className="truncate text-sm text-[#94a3b8]">{item.quote}</p>
              </div>
            </div>
            <button onClick={async () => { await updateTestimonialVisibility(item.id, !item.showOnPublicPage); await refreshFeedbacks() }} className={`relative h-6 w-10 rounded-full transition-colors duration-200 ${item.showOnPublicPage ? "bg-[#2563eb]" : "bg-[#1a2d4a]"}`} aria-label="Toggle public visibility">
              <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${item.showOnPublicPage ? "translate-x-5" : "translate-x-1"}`} />
            </button>
          </div>
        </article>
      ))}
    </motion.div>
  )

  const renderPlaceholder = (title: string) => (
    <motion.div {...pageMotion} className="rounded-2xl border border-[#1a2d4a] bg-[#0a1628] p-8">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm text-[#475569]">This section is ready for the next database-backed controls.</p>
    </motion.div>
  )

  return (
    <main className="min-h-screen bg-[#020408] text-white">
      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-[#1a2d4a] bg-[#060d14] p-5 lg:block">
          <div className="mb-8 flex items-center gap-3">
            <Flame className="text-[#f97316]" size={24} />
            <div>
              <p className="font-bold">CAFÉ</p>
              <p className="font-mono text-xs font-semibold text-[#3b82f6]">ADMIN</p>
            </div>
          </div>
          <div className="mb-8 flex items-center gap-3 rounded-2xl border border-[#1a2d4a] bg-[#0a1628] p-3">
            <Avatar user={user} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{user.name}</p>
              <span className="font-mono text-xs text-[#3b82f6]">Administrator</span>
            </div>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const activeItem = active === item.id
              return (
                <button key={item.id} onClick={() => setActive(item.id)} className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-all ${activeItem ? "border-l-2 border-[#2563eb] bg-[#2563eb]/10 text-white shadow-[inset_0_0_12px_rgba(37,99,235,0.08)]" : "text-[#475569] hover:bg-white/[0.04] hover:text-[#94a3b8]"}`}>
                  <Icon size={18} />
                  {item.label}
                </button>
              )
            })}
          </nav>
          <div className="my-5 border-t border-[#1a2d4a]" />
          <button onClick={() => window.open("/", "_blank", "noreferrer")} className="flex w-full items-center gap-3 px-4 py-3 text-sm text-[#475569] hover:bg-white/[0.04] hover:text-[#94a3b8]">
            <ExternalLink size={18} />
            Back to site
          </button>
          <p className="absolute bottom-5 font-mono text-xs text-[#475569]">v1.0.0</p>
        </aside>

        <section className="min-h-screen flex-1 overflow-y-auto bg-[#020408] pb-24 lg:pb-0">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#1a2d4a] bg-[#060d14]/80 px-5 py-4 backdrop-blur-xl md:px-8">
            <h1 className="text-xl font-bold text-white">{sectionTitles[active]}</h1>
            <div className="flex items-center gap-4">
              <span className="hidden font-mono text-xs text-[#475569] sm:block">{new Date().toLocaleDateString("en-US")}</span>
              <Avatar user={user} />
              <span className="hidden text-sm font-medium text-white md:block">{user.name}</span>
            </div>
          </header>

          <div className="p-5 md:p-8">
            {loading ? (
              <div className="flex h-72 items-center justify-center text-[#475569]"><Loader2 className="animate-spin" /></div>
            ) : (
              <AnimatePresence mode="wait">
                {active === "dashboard" && renderDashboard()}
                {active === "users" && renderUsers()}
                {active === "feedbacks" && renderFeedbacks()}
                {active === "testimonials" && renderTestimonials()}
                {active === "analytics" && renderPlaceholder("Analytics")}
                {active === "settings" && renderPlaceholder("Settings")}
              </AnimatePresence>
            )}
          </div>
        </section>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-[#1a2d4a] bg-[#060d14]/95 px-2 py-2 backdrop-blur-xl lg:hidden">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <button key={item.id} onClick={() => setActive(item.id)} className={`flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] ${active === item.id ? "bg-[#2563eb]/10 text-white" : "text-[#475569]"}`}>
              <Icon size={17} />
              {item.label.split(" ")[0]}
            </button>
          )
        })}
      </nav>

      <AnimatePresence>
        {selectedFeedback && (
          <>
            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedFeedback(null)} className="fixed inset-0 z-40 bg-black/50" aria-label="Close feedback preview" />
            <motion.aside initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="fixed right-0 top-0 z-50 h-screen w-full border-l border-[#1a2d4a] bg-[#0a1628] p-6 shadow-[-20px_0_60px_rgba(0,0,0,0.4)] sm:w-96">
              <button onClick={() => setSelectedFeedback(null)} className="mb-6 rounded-xl border border-[#1a2d4a] p-2 text-[#94a3b8] hover:text-white"><X size={18} /></button>
              <div className="mb-6 flex items-center gap-3"><Avatar name={selectedFeedback.name} /><div><p className="font-semibold text-white">{selectedFeedback.name}</p><p className="text-sm text-[#475569]">{selectedFeedback.project || "Project feedback"}</p></div></div>
              <p className="mb-4 text-yellow-400">{"★".repeat(selectedFeedback.rating)}</p>
              <blockquote className="mb-5 rounded-2xl border border-[#1a2d4a] bg-[#060d14] p-4 text-sm leading-relaxed text-[#94a3b8]">“{selectedFeedback.quote}”</blockquote>
              {selectedFeedback.result && <p className="mb-5 rounded-xl border border-[#2563eb]/20 bg-[#2563eb]/10 p-3 text-sm text-[#93c5fd]">{selectedFeedback.result}</p>}
              {selectedFeedback.mediaUrl && (
                <div className="mb-5 overflow-hidden rounded-xl border border-[#1a2d4a]">
                  {selectedFeedback.mediaType === "video" ? <video src={selectedFeedback.mediaUrl} controls className="w-full" /> : <img src={selectedFeedback.mediaUrl} alt={selectedFeedback.project || selectedFeedback.name} className="w-full object-cover" />}
                </div>
              )}
              <p className="font-mono text-xs text-[#475569]">{new Date(selectedFeedback.createdAt).toLocaleString("en-US")}</p>
              <div className="absolute inset-x-6 bottom-6 grid grid-cols-2 gap-3">
                <button onClick={() => changeStatus(selectedFeedback.id, "approved")} className="rounded-xl bg-green-500/10 px-4 py-3 text-sm font-semibold text-green-400 hover:bg-green-500/15">Approve</button>
                <button onClick={() => changeStatus(selectedFeedback.id, "rejected")} className="rounded-xl bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-400 hover:bg-red-500/15">Reject</button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteUserUid && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-2xl border border-[#1a2d4a] bg-[#0a1628] p-6">
              <h2 className="text-lg font-semibold text-white">Delete user profile?</h2>
              <p className="mt-2 text-sm text-[#94a3b8]">This removes the Firestore profile document. Firebase Auth account deletion requires a server-side admin action.</p>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setDeleteUserUid("")} className="rounded-xl border border-[#1a2d4a] px-4 py-2 text-sm text-[#94a3b8]">Cancel</button>
                <button onClick={removeUser} className="rounded-xl bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400">Delete</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
