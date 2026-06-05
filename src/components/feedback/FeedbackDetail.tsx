import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Star, ThumbsDown, ThumbsUp, BadgeCheck, Link as LinkIcon, Play, ChevronLeft, ChevronRight, Send } from "lucide-react"
import type { FeedbackPost, FeedbackComment, FeedbackVoteType } from "../../data/feedbackStore"
import { fetchFeedbackComments, addFeedbackComment } from "../../data/feedbackServiceSupabase"
import { useAuth } from "../../contexts/AuthContext"
import { loadCurrentUser } from "../../data/feedbackStore"
import toast from "react-hot-toast"

interface FeedbackDetailProps {
  post: FeedbackPost | null
  open: boolean
  onClose: () => void
  onHelpful: (postId: string) => void
  helpful: boolean
  onVote?: (postId: string, voteType: FeedbackVoteType) => void
  vote?: FeedbackVoteType | null
}

const modalVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 16 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 28,
      staggerChildren: 0.06,
    },
  },
  exit: { opacity: 0, scale: 0.96, y: 16, transition: { duration: 0.18 } },
}

const contentVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

export default function FeedbackDetail({ post, open, onClose, onHelpful, helpful, onVote, vote }: FeedbackDetailProps) {
  const [comments, setComments] = useState<FeedbackComment[]>([])
  const [commentText, setCommentText] = useState("")
  const [posting, setPosting] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [loaded, setLoaded] = useState(false)
  const { user: supabaseUser } = useAuth()
  const localUser = loadCurrentUser()
  const currentUser = localUser || supabaseUser
  const userProfile = currentUser ? (currentUser as unknown as { uid?: string; id: string; name?: string; email?: string; photoUrl?: string }) : null

  useEffect(() => {
    if (open && post) {
      queueMicrotask(() => setLoaded(false))
      fetchFeedbackComments(post.id).then((c) => {
        setComments(c)
        setLoaded(true)
      })
    }
  }, [open, post])

  if (!post) return null

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim()) return
    const uid = userProfile?.uid || userProfile?.id
    if (!uid) { toast.error("Login to comment"); return }
    setPosting(true)
    const comment: Omit<FeedbackComment, "id" | "postId" | "createdAt"> = {
      userId: uid,
      userName: userProfile?.name || userProfile?.email?.split("@")[0] || "User",
      userAvatar: userProfile?.photoUrl || "",
      content: commentText.trim(),
      status: "visible",
    }
    const id = await addFeedbackComment(post.id, comment)
    if (id) {
      setComments((prev) => [...prev, { ...comment, id, postId: post.id, createdAt: new Date().toISOString() }])
      setCommentText("")
    } else {
      toast.error("Failed to post comment")
    }
    setPosting(false)
  }

  const displayRating = Math.round(post.rating)
  const currentVote = vote || (helpful ? "up" : null)
  const score = post.helpfulCount - (post.downvoteCount || 0)
  const handleVote = (voteType: FeedbackVoteType) => {
    if (onVote) onVote(post.id, voteType)
    else if (voteType === "up") onHelpful(post.id)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_0%,rgba(79,110,247,0.18),transparent_38%),linear-gradient(180deg,rgba(0,0,0,0.58),rgba(0,0,0,0.88))] p-3 backdrop-blur-[12px] sm:p-5"
          onClick={onClose}
        >
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-white/[0.08] bg-[rgba(255,255,255,0.04)] shadow-[0_32px_64px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              aria-label="Close feedback"
              className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-black/30 text-[#8E8EA3] backdrop-blur-md transition-all hover:rotate-90 hover:border-white/[0.16] hover:bg-white/[0.06] hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="overflow-y-auto scroll-smooth p-5 sm:p-8">
              <motion.div variants={contentVariants} className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-3">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/[0.1] bg-gradient-to-br from-[#4F6EF7]/20 to-[#8B5CF6]/10 text-base font-bold text-[#AEB7FF] ring-1 ring-transparent transition-shadow hover:shadow-[0_0_28px_rgba(79,110,247,0.35)] hover:ring-[#4F6EF7]/30"
                  >
                    {post.userAvatar ? (
                      <img src={post.userAvatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      post.userName[0]?.toUpperCase()
                    )}
                  </motion.div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-semibold text-[#F0F0F5]">{post.userName}</span>
                      {post.isVerifiedClient && <BadgeCheck size={16} className="text-[#7C8CFF]" />}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#8E8EA3]">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F59E0B]/20 bg-white/[0.035] px-2.5 py-1 text-[#F7C66A]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B] shadow-[0_0_12px_rgba(245,158,11,0.9)] animate-pulse" />
                        {post.serviceCategory}
                      </span>
                      <span>{new Date(post.createdAt).toLocaleDateString("en-US")}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <motion.span
                      key={n}
                      initial={{ opacity: 0, scale: 0.4, rotate: -16 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      transition={{ delay: n * 0.07, type: "spring", stiffness: 360, damping: 18 }}
                      whileHover={{ scale: 1.3 }}
                      className="drop-shadow-[0_0_10px_rgba(245,158,11,0.35)]"
                    >
                      <Star size={18} className={n <= displayRating ? "fill-[#F59E0B] text-[#F59E0B]" : "text-[#3A3A4A]"} />
                    </motion.span>
                  ))}
                </div>
              </motion.div>

              <motion.div variants={contentVariants} className="mb-5 flex flex-wrap gap-2">
                {post.isVerifiedProject && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#22C55E]/20 bg-[#22C55E]/10 px-2.5 py-1 text-xs font-medium text-[#7EE7A0]">
                    <BadgeCheck size={12} /> Verified Project
                  </span>
                )}
                {post.isHighlighted && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#F59E0B]/20 bg-[#F59E0B]/10 px-2.5 py-1 text-xs font-medium text-[#F7C66A]">
                    <Star size={12} /> Highlighted
                  </span>
                )}
                {post.projectUrl && (
                  <a href={post.projectUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border border-[#0EA5E9]/20 bg-[#0EA5E9]/10 px-2.5 py-1 text-xs font-medium text-[#7DD3FC] transition-colors hover:bg-[#0EA5E9]/20">
                    <LinkIcon size={12} /> View Project
                  </a>
                )}
                {post.projectTitle && (
                  <span className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-xs text-[#B9B9C8]">
                    {post.projectTitle}
                  </span>
                )}
              </motion.div>

              <motion.div variants={contentVariants}>
                <h2 className="mb-3 max-w-2xl font-['Clash_Display','Space_Grotesk',Inter,sans-serif] text-2xl font-semibold tracking-normal text-[#F8F8FF] sm:text-3xl">{post.title}</h2>
                <p className="mb-6 text-sm leading-7 text-[#A0A0B5] whitespace-pre-line">{post.content}</p>
                {post.serviceDate && (
                  <p className="mb-4 text-xs text-[#8E8EA3]">
                    Service completed: {new Date(post.serviceDate).toLocaleDateString("en-US")}
                  </p>
                )}
              </motion.div>

              {post.media.length > 0 && (
                <motion.div variants={contentVariants} className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {post.media.map((m, i) => (
                    <button
                      type="button"
                      key={`${m.url}-${i}`}
                      onClick={() => setLightboxIndex(i)}
                      className="group relative aspect-video overflow-hidden rounded-2xl border border-white/[0.08] bg-[#050508] text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                    >
                      {m.type === "image" ? (
                        <img src={m.url} alt={m.altText || ""} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <video src={m.url} className="h-full w-full object-cover" preload="metadata" muted />
                      )}
                      {m.type === "video" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-md">
                            <Play size={20} />
                          </span>
                        </div>
                      )}
                    </button>
                  ))}
                </motion.div>
              )}

              <AnimatePresence>
                {lightboxIndex !== null && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur-lg"
                    onClick={() => setLightboxIndex(null)}
                  >
                    <button onClick={() => setLightboxIndex(null)} className="absolute right-4 top-4 z-10 rounded-xl bg-black/40 p-2 text-white transition-colors hover:bg-black/60">
                      <X size={20} />
                    </button>
                    {post.media.length > 1 && (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); setLightboxIndex((prev) => prev !== null ? (prev - 1 + post.media.length) % post.media.length : 0) }} className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-xl bg-black/40 p-2 text-white transition-colors hover:bg-black/60">
                          <ChevronLeft size={20} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setLightboxIndex((prev) => prev !== null ? (prev + 1) % post.media.length : 0) }} className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-xl bg-black/40 p-2 text-white transition-colors hover:bg-black/60">
                          <ChevronRight size={20} />
                        </button>
                      </>
                    )}
                    <motion.div key={lightboxIndex} initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} className="max-h-[85vh] max-w-4xl overflow-hidden rounded-2xl" onClick={(e) => e.stopPropagation()}>
                      {post.media[lightboxIndex].type === "image" ? (
                        <img src={post.media[lightboxIndex].url} alt="" className="max-h-[85vh] max-w-full object-contain" />
                      ) : (
                        <video src={post.media[lightboxIndex].url} controls className="max-h-[85vh] max-w-full" />
                      )}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {post.improvementSuggestion && (
                <motion.div variants={contentVariants} className="mb-6 rounded-2xl border border-[#F59E0B]/12 bg-[#F59E0B]/5 p-4">
                  <p className="mb-1 text-xs font-semibold text-[#F7C66A]">Improvement Suggestion</p>
                  <p className="text-sm text-[#F0F0F5]">{post.improvementSuggestion}</p>
                </motion.div>
              )}

              {post.adminReply && (
                <motion.div variants={contentVariants} className="mb-6 rounded-2xl border border-[#4F6EF7]/14 bg-[#4F6EF7]/6 p-4">
                  <p className="mb-1 text-xs font-semibold text-[#8FA0FF]">Official reply from CAFÉ Services</p>
                  <p className="text-sm leading-relaxed text-[#F0F0F5]">{post.adminReply.content}</p>
                  <p className="mt-2 text-[10px] text-[#8E8EA3]">{new Date(post.adminReply.createdAt).toLocaleDateString("en-US")}</p>
                </motion.div>
              )}

              <motion.div variants={contentVariants} className="mb-6 flex items-center gap-3">
                <div className="inline-flex items-center rounded-2xl border border-white/[0.08] bg-white/[0.035] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                  <motion.button whileTap={{ scale: 0.95 }} whileHover={{ x: [0, -1, 1, -1, 0] }} onClick={() => handleVote("up")} className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${currentVote === "up" ? "bg-gradient-to-br from-[#2563EB]/30 to-[#8B5CF6]/25 text-white" : "text-[#8E8EA3] hover:bg-white/[0.06] hover:text-white"}`} aria-label="Like feedback">
                    <ThumbsUp size={17} />
                  </motion.button>
                  <span className="min-w-10 px-2 text-center text-sm font-semibold text-[#F0F0F5]">{score}</span>
                  <motion.button whileTap={{ scale: 0.95 }} whileHover={{ x: [0, 1, -1, 1, 0] }} onClick={() => handleVote("down")} className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${currentVote === "down" ? "bg-gradient-to-br from-[#8B5CF6]/30 to-[#2563EB]/20 text-white" : "text-[#8E8EA3] hover:bg-white/[0.06] hover:text-white"}`} aria-label="Dislike feedback">
                    <ThumbsDown size={17} />
                  </motion.button>
                </div>
                <span className="text-xs text-[#8E8EA3]">Was this helpful?</span>
              </motion.div>

              <motion.div variants={contentVariants} className="border-t border-white/[0.06] pt-6">
                <h3 className="mb-4 text-sm font-semibold text-[#F0F0F5]">Comments ({comments.length})</h3>

                <form onSubmit={handleComment} className="mb-6 flex gap-3">
                  <div className="feedback-input-ring group relative flex-1 rounded-2xl p-px">
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Compartilhe sua resposta sobre este feedback..."
                      className="relative w-full rounded-2xl border border-white/[0.08] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[#F0F0F5] placeholder-[#77778F] outline-none backdrop-blur-md transition-all group-focus-within:border-transparent"
                    />
                  </div>
                  <motion.button
                    type="submit"
                    whileTap={{ scale: 0.95 }}
                    disabled={posting || !commentText.trim()}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#8B5CF6] text-white shadow-[0_14px_28px_rgba(79,110,247,0.28)] transition-all disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <motion.span animate={posting ? { rotate: [45, 0] } : { rotate: 0 }} transition={{ duration: 0.35 }}>
                      <Send size={17} />
                    </motion.span>
                  </motion.button>
                </form>

                <div className="space-y-3">
                  {comments.length === 0 && loaded && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-7 text-center">
                      <motion.svg width="54" height="54" viewBox="0 0 54 54" fill="none" className="mx-auto mb-3 text-[#7C8CFF]" animate={{ y: [0, -5, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}>
                        <motion.path d="M15 18.5C15 14.9 17.9 12 21.5 12H32.5C36.1 12 39 14.9 39 18.5V27.5C39 31.1 36.1 34 32.5 34H25L18 40V34H21.5C17.9 34 15 31.1 15 27.5V18.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: "easeInOut" }} />
                        <motion.path d="M22 23H34M22 28H30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.3, duration: 0.8 }} />
                      </motion.svg>
                      <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-sm font-medium text-[#F0F0F5]">Seja o primeiro a comentar</motion.p>
                    </motion.div>
                  )}
                  {!loaded && (
                    <div className="flex justify-center py-4">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#7C8CFF] border-t-transparent" />
                    </div>
                  )}
                  {comments.map((comment) => (
                    <motion.div variants={contentVariants} key={comment.id} className="flex gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#4F6EF7]/10 text-xs font-bold text-[#9BA7FF]">
                        {comment.userAvatar ? <img src={comment.userAvatar} alt="" className="h-full w-full object-cover" /> : comment.userName[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#F0F0F5]">{comment.userName}</span>
                          <span className="text-[10px] text-[#8E8EA3]">{new Date(comment.createdAt).toLocaleDateString("en-US")}</span>
                        </div>
                        <p className="text-xs leading-relaxed text-[#A0A0B5]">{comment.content}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
