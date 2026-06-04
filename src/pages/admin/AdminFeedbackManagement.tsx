import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search, Loader2, CheckCircle, XCircle, Star, Trash2, BadgeCheck,
  MessageSquare, Image, Eye, Reply,
} from "lucide-react"
import {
  fetchFeedbackPosts, updateFeedbackPost, deleteFeedbackPost,
  setAdminReply, getFeedbackStats,
} from "../../data/feedbackServiceSupabase"
import type { FeedbackPost, FeedbackStatus } from "../../data/feedbackStore"
import { SERVICE_CATEGORIES } from "../../data/feedbackStore"
import { useAuth } from "../../contexts/AuthContext"
import { loadCurrentUser } from "../../data/feedbackStore"
import toast from "react-hot-toast"

type AdminTab = "posts" | "categories" | "stats"

export default function AdminFeedbackManagement() {
  const { user: supabaseUser } = useAuth()
  const localUser = loadCurrentUser()
  const currentUser = supabaseUser || localUser
  const adminProfile = currentUser ? (currentUser as unknown as { uid?: string; id: string; name?: string }) : null
  const adminId = adminProfile?.uid || adminProfile?.id || ""
  const adminName = adminProfile?.name || "Admin"

  const [tab, setTab] = useState<AdminTab>("posts")
  const [posts, setPosts] = useState<FeedbackPost[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | "all">("pending")
  const [selectedPost, setSelectedPost] = useState<FeedbackPost | null>(null)
  const [replyText, setReplyText] = useState("")
  const [showReplyModal, setShowReplyModal] = useState(false)
  const [replying, setReplying] = useState(false)

  // Stats
  const [stats, setStats] = useState({
    totalFeedbacks: 0, totalComments: 0, totalHelpful: 0,
    averageRating: 0, pendingCount: 0, mediaCount: 0,
    categoryCounts: [] as { name: string; count: number }[],
    topFeedbacks: [] as { id: string; title: string; helpfulCount: number; rating: number }[],
  })

  const loadData = async () => {
    setLoading(true)
    const [allPosts, allStats] = await Promise.all([
      fetchFeedbackPosts(200),
      getFeedbackStats(),
    ])
    setPosts(allPosts)
    setStats(allStats)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const filtered = posts.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return p.title.toLowerCase().includes(q) ||
        p.userName.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        p.projectTitle.toLowerCase().includes(q)
    }
    return true
  })

  const handleStatus = async (id: string, status: FeedbackStatus) => {
    await updateFeedbackPost(id, { status } as Partial<FeedbackPost>)
    setPosts((prev) => prev.map((p) => p.id === id ? { ...p, status } : p))
    toast.success(`Feedback ${status}`)
    loadData()
  }

  const handleDelete = async (id: string) => {
    await deleteFeedbackPost(id)
    setPosts((prev) => prev.filter((p) => p.id !== id))
    toast.success("Feedback deleted")
    loadData()
  }

  const handleToggleVerified = async (id: string, field: "isVerifiedClient" | "isVerifiedProject") => {
    const post = posts.find((p) => p.id === id)
    if (!post) return
    await updateFeedbackPost(id, { [field]: !post[field] } as Partial<FeedbackPost>)
    setPosts((prev) => prev.map((p) => p.id === id ? { ...p, [field]: !p[field] } : p))
    toast.success(!post[field] ? "Verified" : "Unverified")
  }

  const handleToggleHighlight = async (id: string) => {
    const post = posts.find((p) => p.id === id)
    if (!post) return
    await updateFeedbackPost(id, { isHighlighted: !post.isHighlighted } as Partial<FeedbackPost>)
    setPosts((prev) => prev.map((p) => p.id === id ? { ...p, isHighlighted: !p.isHighlighted } : p))
    toast.success(!post.isHighlighted ? "Highlighted" : "Unhighlighted")
  }

  const handleReply = async () => {
    if (!selectedPost || !replyText.trim()) return
    setReplying(true)
    await setAdminReply(selectedPost.id, {
      content: replyText.trim(),
      adminId,
      adminName,
    })
    setPosts((prev) =>
      prev.map((p) =>
        p.id === selectedPost.id
          ? { ...p, adminReply: { content: replyText.trim(), adminId, adminName, createdAt: new Date().toISOString() } }
          : p,
      ),
    )
    toast.success("Reply posted")
    setShowReplyModal(false)
    setReplyText("")
    setReplying(false)
  }

  const statusColors: Record<string, string> = {
    pending: "bg-[#F59E0B]/10 text-[#F59E0B]",
    approved: "bg-[#22C55E]/10 text-[#22C55E]",
    rejected: "bg-[#EF4444]/10 text-[#EF4444]",
    highlighted: "bg-[#4F6EF7]/10 text-[#4F6EF7]",
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/[0.06] pb-4">
        {(["posts", "categories", "stats"] as AdminTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-xs font-medium capitalize transition-all ${
              tab === t
                ? "bg-[#4F6EF7]/10 text-[#4F6EF7] border border-[#4F6EF7]/20"
                : "text-[#6B6B80] hover:text-[#F0F0F5] border border-transparent"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "posts" && (
        <div>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-5">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B80]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search feedbacks..."
                className="w-full bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#F0F0F5] placeholder-[#6B6B80] focus:outline-none focus:border-[#4F6EF7]/50 transition-all"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FeedbackStatus | "all")}
              className="bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl px-4 py-2.5 text-sm text-[#F0F0F5] focus:outline-none focus:border-[#4F6EF7]/50 transition-all"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="highlighted">Highlighted</option>
            </select>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              { label: "Total", value: stats.totalFeedbacks, color: "text-[#4F6EF7]" },
              { label: "Pending", value: stats.pendingCount, color: "text-[#F59E0B]" },
              { label: "Avg Rating", value: stats.averageRating, color: "text-[#F59E0B]" },
              { label: "With Media", value: stats.mediaCount, color: "text-[#22C55E]" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="text-[10px] text-[#6B6B80] font-medium uppercase tracking-wider">{s.label}</p>
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={24} className="animate-spin text-[#4F6EF7]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-sm text-[#6B6B80]">No feedbacks found</div>
          ) : (
            <div className="space-y-3">
              {filtered.map((post) => (
                <div key={post.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 hover:bg-white/[0.04] transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[post.status]}`}>
                          {post.status}
                        </span>
                        <span className="text-xs text-[#6B6B80]">{post.userName}</span>
                        <span className="text-xs text-[#6B6B80]">•</span>
                        <span className="text-xs text-[#4F6EF7]">{post.serviceCategory}</span>
                        <span className="text-xs text-[#6B6B80]">•</span>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star key={n} size={10} className={n <= Math.round(post.rating) ? "text-[#F59E0B] fill-[#F59E0B]" : "text-[#3A3A4A]"} />
                          ))}
                        </div>
                      </div>
                      <h3 className="text-sm font-semibold text-[#F0F0F5] mb-1">{post.title}</h3>
                      <p className="text-xs text-[#6B6B80] line-clamp-2 mb-2">{post.content}</p>
                      <div className="flex items-center gap-3 text-[10px] text-[#6B6B80]">
                        <span className="flex items-center gap-1"><MessageSquare size={10} /> {post.commentCount}</span>
                        <span className="flex items-center gap-1"><Image size={10} /> {post.media.length}</span>
                        {post.isVerifiedClient && <BadgeCheck size={10} className="text-[#22C55E]" />}
                        {post.adminReply && <Reply size={10} className="text-[#4F6EF7]" />}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => handleStatus(post.id, "approved")} className="p-1.5 rounded-lg text-[#6B6B80] hover:text-[#22C55E] hover:bg-[#22C55E]/10 transition-all" title="Approve">
                        <CheckCircle size={14} />
                      </button>
                      <button onClick={() => handleStatus(post.id, "rejected")} className="p-1.5 rounded-lg text-[#6B6B80] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-all" title="Reject">
                        <XCircle size={14} />
                      </button>
                      <button onClick={() => handleToggleHighlight(post.id)} className={`p-1.5 rounded-lg transition-all ${post.isHighlighted ? "text-[#F59E0B]" : "text-[#6B6B80] hover:text-[#F59E0B]"}`} title="Highlight">
                        <Star size={14} />
                      </button>
                      <button
                        onClick={() => { setSelectedPost(post); setReplyText(post.adminReply?.content || ""); setShowReplyModal(true) }}
                        className="p-1.5 rounded-lg text-[#6B6B80] hover:text-[#4F6EF7] hover:bg-[#4F6EF7]/10 transition-all"
                        title="Reply"
                      >
                        <Reply size={14} />
                      </button>
                      <button onClick={() => handleToggleVerified(post.id, "isVerifiedClient")} className={`p-1.5 rounded-lg transition-all ${post.isVerifiedClient ? "text-[#22C55E]" : "text-[#6B6B80] hover:text-[#22C55E]"}`} title="Toggle Verified Client">
                        <BadgeCheck size={14} />
                      </button>
                      <button onClick={() => handleDelete(post.id)} className="p-1.5 rounded-lg text-[#6B6B80] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-all" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "categories" && (
        <CategoryManager />
      )}

      {tab === "stats" && (
        <StatsView stats={stats} />
      )}

      {/* Reply Modal */}
      <AnimatePresence>
        {showReplyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowReplyModal(false)}>
            <div className="relative w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#0A0A0F] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-sm font-bold text-[#F0F0F5] mb-3">Official Reply</h3>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write official reply from CAFÉ Services..."
                rows={4}
                className="w-full bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl px-4 py-3 text-sm text-[#F0F0F5] placeholder-[#6B6B80] focus:outline-none focus:border-[#4F6EF7]/50 transition-all resize-none mb-4"
              />
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowReplyModal(false)} className="px-4 py-2 rounded-xl text-xs font-medium text-[#6B6B80] border border-[#1E1E2A] hover:text-[#F0F0F5] transition-all">
                  Cancel
                </button>
                <button
                  onClick={handleReply}
                  disabled={replying || !replyText.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#4F6EF7] text-white hover:bg-[#6B85FF] transition-all disabled:opacity-50"
                >
                  {replying ? "Posting..." : "Post Reply"}
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function CategoryManager() {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
      <p className="text-sm text-[#6B6B80] mb-4">Service categories are fixed. Feedback posts use these categories automatically.</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {SERVICE_CATEGORIES.map((cat) => (
          <div key={cat} className="rounded-xl border border-[#1E1E2A] p-3 text-center">
            <p className="text-xs font-medium text-[#F0F0F5]">{cat}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatsView({ stats }: {
  stats: {
    totalFeedbacks: number
    totalComments: number
    totalHelpful: number
    averageRating: number
    pendingCount: number
    categoryCounts: { name: string; count: number }[]
    topFeedbacks: { id: string; title: string; helpfulCount: number; rating: number }[]
    mediaCount: number
  }
}) {
  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Feedbacks", value: stats.totalFeedbacks, icon: MessageSquare },
          { label: "Avg Rating", value: stats.averageRating, icon: Star, suffix: "/5" },
          { label: "Total Helpful", value: stats.totalHelpful, icon: BadgeCheck },
          { label: "Pending Review", value: stats.pendingCount, icon: Eye },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon size={14} className="text-[#4F6EF7]" />
              <span className="text-[10px] text-[#6B6B80] font-medium uppercase">{s.label}</span>
            </div>
            <p className="text-2xl font-bold text-[#F0F0F5]">
              {s.value}{s.suffix || ""}
            </p>
          </div>
        ))}
      </div>

      {/* Per Category */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <h3 className="text-sm font-bold text-[#F0F0F5] mb-4">Feedbacks by Category</h3>
        {stats.categoryCounts.length === 0 ? (
          <p className="text-xs text-[#6B6B80]">No data</p>
        ) : (
          <div className="space-y-3">
            {stats.categoryCounts.map((c) => (
              <div key={c.name} className="flex items-center gap-3">
                <span className="text-xs text-[#F0F0F5] w-32 truncate">{c.name}</span>
                <div className="flex-1 h-2 rounded-full bg-[#1E1E2A] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#4F6EF7] transition-all"
                    style={{ width: `${Math.min(100, (c.count / Math.max(...stats.categoryCounts.map((x) => x.count), 1)) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-[#6B6B80] w-8 text-right">{c.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Feedbacks */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <h3 className="text-sm font-bold text-[#F0F0F5] mb-4">Top Feedbacks</h3>
        {stats.topFeedbacks.length === 0 ? (
          <p className="text-xs text-[#6B6B80]">No data</p>
        ) : (
          <div className="space-y-2">
            {stats.topFeedbacks.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 text-xs text-[#6B6B80]">
                <span className="text-[#4A4A5A] w-5">#{i + 1}</span>
                <span className="flex-1 text-[#F0F0F5] truncate">{p.title}</span>
                <span className="flex items-center gap-1"><Star size={10} className="text-[#F59E0B]" /> {p.rating}</span>
                <span className="flex items-center gap-1 text-[#4F6EF7]">{p.helpfulCount} helpful</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
