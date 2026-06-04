import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Star, PenLine } from "lucide-react"
import { Link } from "react-router-dom"
import { getInitials } from "../lib/utils"
import PageShell from "./PageShell"
import FeedbackFeed from "../components/feedback/FeedbackFeed"
import FeedbackSidebar from "../components/feedback/FeedbackSidebar"
import FeedbackDetail from "../components/feedback/FeedbackDetail"
import FeedbackForm, { type FeedbackFormData } from "../components/feedback/FeedbackForm"
import type { FeedbackPost, ServiceCategory } from "../data/feedbackStore"
import { searchFeedbackPosts, createFeedbackPost, toggleHelpfulVote, getUserHelpfulVote } from "../data/feedbackServiceSupabase"
import { useAuth } from "../contexts/AuthContext"
import { loadCurrentUser } from "../data/feedbackStore"
import { uploadToCloudinary, isCloudinaryConfigured } from "../lib/cloudinary"
import toast from "react-hot-toast"

export default function FeedbackPage() {
  const { user: supabaseUser } = useAuth()
  const localUser = loadCurrentUser()
  const currentUser = localUser || supabaseUser
  const userProfile = currentUser ? (currentUser as unknown as { uid?: string; id: string; name?: string; email?: string; photoUrl?: string }) : null
  const uid = userProfile?.uid || userProfile?.id

  const [posts, setPosts] = useState<FeedbackPost[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<"recent" | "rating" | "helpful" | "media" | "verified">("recent")
  const [category, setCategory] = useState<ServiceCategory | "">("")
  const [rating, setRating] = useState(0)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [helpfulPosts, setHelpfulPosts] = useState<Set<string>>(new Set())
  const [selectedPost, setSelectedPost] = useState<FeedbackPost | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadPosts = useCallback(async () => {
    setLoading(true)
    const result = await searchFeedbackPosts(search, category, rating, sort)
    setPosts(result.posts)
    setLoading(false)
  }, [search, category, rating, sort])

  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  useEffect(() => {
    if (uid) {
      const fetchVotes = async () => {
        const helpful = new Set<string>()
        for (const p of posts) {
          const voted = await getUserHelpfulVote(p.id, uid)
          if (voted) helpful.add(p.id)
        }
        setHelpfulPosts(helpful)
      }
      fetchVotes()
    }
  }, [posts, uid])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setSearch(searchInput), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchInput])

  const handleHelpful = async (postId: string) => {
    const uid = userProfile?.uid || userProfile?.id
    if (!uid) { toast.error("Login to vote"); return }
    const result = await toggleHelpfulVote(postId, uid)
    setHelpfulPosts((prev) => {
      const next = new Set(prev)
      if (result) next.add(postId)
      else next.delete(postId)
      return next
    })
    setPosts((prev) =>
      prev.map((p) => p.id === postId ? { ...p, helpfulCount: p.helpfulCount + (result ? 1 : -1) } : p)
    )
  }

  const handleSubmitFeedback = async (data: FeedbackFormData) => {
    const uid = userProfile?.uid || userProfile?.id
    if (!uid) { toast.error("You must be logged in"); return }
    setSubmitting(true)

    const cloudinaryAvailable = isCloudinaryConfigured()
    const uploadedMedia: FeedbackPost["media"] = []

    for (const m of data.media) {
      if (!m.url.startsWith("blob:")) {
        uploadedMedia.push(m)
        continue
      }
      if (!cloudinaryAvailable) {
        toast.error("Cloudinary not configured — upload preset missing")
        continue
      }
      try {
        toast.loading(`Uploading ${m.altText || "file"}...`, { id: `upload-${m.url}` })
        const response = await fetch(m.url)
        const blob = await response.blob()
        const file = new File([blob], m.altText || "upload", { type: blob.type })
        const result = await uploadToCloudinary(file, "feedback")
        uploadedMedia.push({ url: result.secure_url, type: m.type, altText: m.altText })
        toast.success(`Uploaded ${m.altText || "file"}`, { id: `upload-${m.url}` })
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed"
        toast.error(`${msg} — file skipped`, { id: `upload-${m.url}` })
      }
    }

    try {
      const id = await createFeedbackPost({
        userId: uid,
        userName: userProfile?.name || userProfile?.email?.split("@")[0] || "User",
        userAvatar: userProfile?.photoUrl || "",
        serviceCategory: data.serviceCategory,
        projectTitle: data.projectTitle,
        projectUrl: data.projectUrl,
        rating: data.rating,
        title: data.title,
        content: data.content,
        media: uploadedMedia,
        serviceDate: data.serviceDate,
        status: "pending",
        isVerifiedClient: false,
        isVerifiedProject: false,
        isHighlighted: false,
        improvementSuggestion: data.improvementSuggestion,
      })

      if (id) {
        toast.success("Feedback submitted! It will appear after admin approval.")
        setShowForm(false)
      } else {
        toast.error("Failed to submit feedback — check console for details")
      }
    } catch (e) {
      console.error("handleSubmitFeedback error", e)
      toast.error(`Failed to submit feedback: ${e instanceof Error ? e.message : "Unknown error"}`)
    }
    setSubmitting(false)
  }

  const categoryCounts: Record<string, number> = {}
  for (const p of posts) {
    categoryCounts[p.serviceCategory] = (categoryCounts[p.serviceCategory] || 0) + 1
  }

  return (
    <PageShell
      eyebrow="Client Reviews"
      title="Feedback Forum"
      subtitle="Real feedback from real clients. Share your experience with CAFÉ Services — your review helps us improve."
    >
      {/* CTA Bar */}
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 sm:p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#4F6EF7]/10 text-sm font-bold text-[#4F6EF7] overflow-hidden">
          {userProfile?.photoUrl ? (
            <img src={userProfile.photoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            userProfile?.name ? getInitials(userProfile.name) : "CS"
          )}
        </div>
        <button
          onClick={() => uid ? setShowForm(true) : setShowLoginPrompt(true)}
          className="flex-1 rounded-xl border border-white/[0.08] bg-black/20 px-4 py-2.5 text-left text-sm text-[#6B6B80] transition-colors hover:border-[#4F6EF7]/30 hover:text-[#F0F0F5]"
        >
          Share your feedback...
        </button>
        <button
          onClick={() => uid ? setShowForm(true) : setShowLoginPrompt(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#4F6EF7] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#6B85FF] shadow-[0_0_20px_rgba(79,110,247,0.15)] transition-all"
        >
          <PenLine size={16} />
          <span className="hidden sm:inline">Share Your Feedback</span>
        </button>
      </div>

      <div className="flex gap-6">
        <FeedbackSidebar
          category={category}
          onCategoryChange={setCategory}
          rating={rating}
          onRatingChange={setRating}
          search={searchInput}
          onSearch={setSearchInput}
          categoryCounts={categoryCounts}
        />

        <FeedbackFeed
          posts={posts}
          loading={loading}
          sort={sort}
          onSortChange={setSort}
          onPostClick={setSelectedPost}
          onHelpful={handleHelpful}
          helpfulPosts={helpfulPosts}
          onCommentClick={setSelectedPost}
          category={category}
          rating={rating}
          search={search}
        />
      </div>

      {/* Detail Modal */}
      <FeedbackDetail
        post={selectedPost}
        open={!!selectedPost}
        onClose={() => setSelectedPost(null)}
        onHelpful={handleHelpful}
        helpful={selectedPost ? helpfulPosts.has(selectedPost.id) : false}
      />

      {/* Feedback Form */}
      <FeedbackForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleSubmitFeedback}
        isSubmitting={submitting}
      />

      {/* Login Prompt */}
      <AnimatePresence>
        {showLoginPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowLoginPrompt(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm rounded-3xl border border-white/[0.08] bg-[#0A0A0F] p-6 text-center shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <Star size={32} className="mx-auto mb-4 text-[#F59E0B]" />
              <h2 className="text-lg font-bold text-[#F0F0F5] mb-2">Share Your Experience</h2>
              <p className="text-sm text-[#6B6B80] mb-6">Login to submit your feedback and help us improve.</p>
              <div className="flex flex-col gap-3">
                <Link
                  to="/login"
                  onClick={() => setShowLoginPrompt(false)}
                  className="w-full py-2.5 rounded-xl bg-[#4F6EF7] text-white text-sm font-semibold hover:bg-[#6B85FF] transition-all text-center block"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setShowLoginPrompt(false)}
                  className="w-full py-2.5 rounded-xl border border-white/[0.08] text-[#F0F0F5] text-sm font-medium hover:bg-white/[0.04] transition-all text-center block"
                >
                  Sign Up
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  )
}
