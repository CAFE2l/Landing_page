import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Star, ThumbsUp, BadgeCheck, Link as LinkIcon, Play, ChevronLeft, ChevronRight, Send } from "lucide-react"
import type { FeedbackPost, FeedbackComment } from "../../data/feedbackStore"
import { fetchFeedbackComments, addFeedbackComment } from "../../data/feedbackService"
import { useAuth } from "../../contexts/AuthContext"
import { loadCurrentUser } from "../../data/feedbackStore"
import toast from "react-hot-toast"

interface FeedbackDetailProps {
  post: FeedbackPost | null
  open: boolean
  onClose: () => void
  onHelpful: (postId: string) => void
  helpful: boolean
}

export default function FeedbackDetail({ post, open, onClose, onHelpful, helpful }: FeedbackDetailProps) {
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
      setLoaded(false)
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

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/[0.08] bg-[#0A0A0F] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button onClick={onClose} className="sticky top-3 z-10 float-right m-3 p-2 rounded-xl bg-[#0A0A0F]/80 backdrop-blur-sm border border-white/[0.08] text-[#6B6B80] hover:text-[#F0F0F5] transition-colors">
              <X size={16} />
            </button>

            <div className="p-6 sm:p-8">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#4F6EF7]/10 text-base font-bold text-[#4F6EF7] overflow-hidden">
                    {post.userAvatar ? (
                      <img src={post.userAvatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      post.userName[0]?.toUpperCase()
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base font-bold text-[#F0F0F5]">{post.userName}</span>
                      {post.isVerifiedClient && <BadgeCheck size={16} className="text-[#4F6EF7]" />}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#6B6B80]">
                      <span className="px-2 py-0.5 rounded-full bg-[#4F6EF7]/8 border border-[#4F6EF7]/15 text-[#4F6EF7]">{post.serviceCategory}</span>
                      <span>{new Date(post.createdAt).toLocaleDateString("en-US")}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} size={16} className={n <= displayRating ? "text-[#F59E0B] fill-[#F59E0B]" : "text-[#3A3A4A]"} />
                  ))}
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                {post.isVerifiedProject && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] text-xs font-medium">
                    <BadgeCheck size={12} /> Verified Project
                  </span>
                )}
                {post.isHighlighted && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#4F6EF7]/10 border border-[#4F6EF7]/20 text-[#4F6EF7] text-xs font-medium">
                    <Star size={12} /> Highlighted
                  </span>
                )}
                {post.projectUrl && (
                  <a href={post.projectUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0EA5E9]/10 border border-[#0EA5E9]/20 text-[#0EA5E9] text-xs font-medium hover:bg-[#0EA5E9]/20 transition-colors"
                  >
                    <LinkIcon size={12} /> View Project
                  </a>
                )}
                {post.projectTitle && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[#6B6B80] text-xs">
                    {post.projectTitle}
                  </span>
                )}
              </div>

              {/* Title & Content */}
              <h2 className="text-xl font-bold text-[#F0F0F5] mb-3">{post.title}</h2>
              <p className="text-sm text-[#6B6B80] leading-relaxed mb-6 whitespace-pre-line">{post.content}</p>

              {/* Service Date */}
              {post.serviceDate && (
                <p className="text-xs text-[#6B6B80] mb-4">
                  Service completed: {new Date(post.serviceDate).toLocaleDateString("en-US")}
                </p>
              )}

              {/* Media Gallery */}
              {post.media.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
                  {post.media.map((m, i) => (
                    <div
                      key={i}
                      onClick={() => setLightboxIndex(i)}
                      className="relative aspect-video rounded-xl overflow-hidden border border-[#1E1E2A] bg-[#050508] cursor-pointer group"
                    >
                      {m.type === "image" ? (
                        <img src={m.url} alt={m.altText || ""} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <video src={m.url} className="w-full h-full object-cover" />
                      )}
                      {m.type === "video" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Play size={24} className="text-white opacity-70" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Lightbox */}
              <AnimatePresence>
                {lightboxIndex !== null && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-lg p-4"
                    onClick={() => setLightboxIndex(null)}
                  >
                    <button onClick={() => setLightboxIndex(null)} className="absolute top-4 right-4 p-2 rounded-xl bg-black/40 text-white hover:bg-black/60 transition-colors z-10">
                      <X size={20} />
                    </button>
                    {post.media.length > 1 && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); setLightboxIndex((prev) => prev !== null ? (prev - 1 + post.media.length) % post.media.length : 0) }}
                          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-black/40 text-white hover:bg-black/60 transition-colors z-10"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setLightboxIndex((prev) => prev !== null ? (prev + 1) % post.media.length : 0) }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-black/40 text-white hover:bg-black/60 transition-colors z-10"
                        >
                          <ChevronRight size={20} />
                        </button>
                      </>
                    )}
                    <motion.div
                      key={lightboxIndex}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {post.media[lightboxIndex].type === "image" ? (
                        <img src={post.media[lightboxIndex].url} alt="" className="max-w-full max-h-[85vh] object-contain" />
                      ) : (
                        <video src={post.media[lightboxIndex].url} controls className="max-w-full max-h-[85vh]" />
                      )}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Improvement Suggestion */}
              {post.improvementSuggestion && (
                <div className="mb-6 p-4 rounded-xl bg-[#F59E0B]/5 border border-[#F59E0B]/10">
                  <p className="text-xs font-semibold text-[#F59E0B] mb-1">Improvement Suggestion</p>
                  <p className="text-sm text-[#F0F0F5]">{post.improvementSuggestion}</p>
                </div>
              )}

              {/* Admin Reply */}
              {post.adminReply && (
                <div className="mb-6 p-4 rounded-xl bg-[#4F6EF7]/5 border border-[#4F6EF7]/10">
                  <p className="text-xs font-semibold text-[#4F6EF7] mb-1">Official reply from CAFÉ Services</p>
                  <p className="text-sm text-[#F0F0F5] leading-relaxed">{post.adminReply.content}</p>
                  <p className="text-[10px] text-[#6B6B80] mt-2">
                    {new Date(post.adminReply.createdAt).toLocaleDateString("en-US")}
                  </p>
                </div>
              )}

              {/* Helpful Button */}
              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={() => onHelpful(post.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    helpful
                      ? "bg-[#4F6EF7]/10 text-[#4F6EF7] border border-[#4F6EF7]/20"
                      : "bg-white/[0.04] text-[#6B6B80] hover:text-[#F0F0F5] border border-white/[0.08] hover:bg-white/[0.06]"
                  }`}
                >
                  <ThumbsUp size={16} />
                  Was this helpful? ({post.helpfulCount})
                </button>
              </div>

              {/* Comments */}
              <div className="border-t border-white/[0.06] pt-6">
                <h3 className="text-sm font-bold text-[#F0F0F5] mb-4">
                  Comments ({comments.length})
                </h3>

                {/* Comment Form */}
                <form onSubmit={handleComment} className="flex gap-3 mb-6">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl px-4 py-2.5 text-sm text-[#F0F0F5] placeholder-[#6B6B80] focus:outline-none focus:border-[#4F6EF7]/50 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={posting || !commentText.trim()}
                    className="p-2.5 rounded-xl bg-[#4F6EF7] text-white hover:bg-[#6B85FF] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={16} />
                  </button>
                </form>

                {/* Comments List */}
                <div className="space-y-3">
                  {comments.length === 0 && loaded && (
                    <p className="text-xs text-[#6B6B80] text-center py-4">No comments yet</p>
                  )}
                  {!loaded && (
                    <div className="flex justify-center py-4">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#4F6EF7] border-t-transparent" />
                    </div>
                  )}
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#4F6EF7]/10 text-xs font-bold text-[#4F6EF7] overflow-hidden">
                        {comment.userAvatar ? (
                          <img src={comment.userAvatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          comment.userName[0]?.toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-[#F0F0F5]">{comment.userName}</span>
                          <span className="text-[10px] text-[#6B6B80]">
                            {new Date(comment.createdAt).toLocaleDateString("en-US")}
                          </span>
                        </div>
                        <p className="text-xs text-[#6B6B80] leading-relaxed">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
