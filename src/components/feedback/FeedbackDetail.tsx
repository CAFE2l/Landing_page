import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  Star,
  ThumbsDown,
  ThumbsUp,
  BadgeCheck,
  Link as LinkIcon,
  Play,
  Send,
  Image as ImageIcon,
  Paperclip,
  Trash2,
  Loader2,
} from "lucide-react"
import type { FeedbackPost, FeedbackComment, CommentMedia, ReactionType } from "../../data/feedbackStore"
import { fetchFeedbackComments, addFeedbackComment, deleteFeedbackComment } from "../../data/feedbackServiceSupabase"
import { useAuth } from "../../contexts/AuthContext"
import { loadCurrentUser } from "../../data/feedbackStore"
import toast from "react-hot-toast"
import MediaModal from "./MediaModal"
import { uploadFeedbackMedia } from "../../lib/cloudinary"
import { useUserProfile } from "../../hooks/useUserProfile"

interface FeedbackDetailProps {
  post: FeedbackPost | null
  open: boolean
  onClose: () => void
  onReaction: (postId: string, reactionType: ReactionType) => void
  reactionLoading?: boolean
  userReaction?: ReactionType | null
  isAdmin?: boolean
  onCommentCountChange?: (postId: string, delta: number) => void
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

const MAX_COMMENT_MEDIA_SIZE = 50 * 1024 * 1024
const COMMENT_MEDIA_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4", "video/webm", "video/quicktime"]

export default function FeedbackDetail({
  post,
  open,
  onClose,
  onReaction,
  reactionLoading,
  userReaction,
  isAdmin,
  onCommentCountChange,
}: FeedbackDetailProps) {
  const [comments, setComments] = useState<FeedbackComment[]>([])
  const [commentText, setCommentText] = useState("")
  const [commentFiles, setCommentFiles] = useState<File[]>([])
  const [commentPreviews, setCommentPreviews] = useState<string[]>([])
  const [posting, setPosting] = useState(false)
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [loaded, setLoaded] = useState(false)
  const { user: supabaseUser } = useAuth()
  const localUser = loadCurrentUser()
  const currentUser = supabaseUser || localUser
  const userProfile = currentUser ? (currentUser as unknown as { uid?: string; id: string; name?: string; email?: string; photoUrl?: string }) : null
  const uid = supabaseUser?.id || userProfile?.uid || userProfile?.id
  const { profile: loggedProfile } = useUserProfile(uid)
  const postId = post?.id

  useEffect(() => {
    if (open && postId) {
      queueMicrotask(() => setLoaded(false))
      fetchFeedbackComments(postId).then((c) => {
        setComments(c)
        setLoaded(true)
      })
    }
  }, [open, postId])

  useEffect(() => {
    return () => {
      commentPreviews.forEach((p) => URL.revokeObjectURL(p))
    }
  }, [commentPreviews])

  if (!post) return null

  const handleCommentFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const valid: File[] = []
    for (const file of Array.from(files)) {
      if (!COMMENT_MEDIA_TYPES.includes(file.type)) {
        toast.error(`${file.name}: use an image or video file`)
        continue
      }
      if (file.size > MAX_COMMENT_MEDIA_SIZE) {
        toast.error(`${file.name}: file is too large (max 50MB)`)
        continue
      }
      valid.push(file)
    }
    if (valid.length === 0) return
    setCommentFiles((prev) => [...prev, ...valid])
    setCommentPreviews((prev) => [...prev, ...valid.map((f) => URL.createObjectURL(f))])
  }

  const removeCommentFile = (index: number) => {
    setCommentFiles((prev) => prev.filter((_, i) => i !== index))
    setCommentPreviews((prev) => {
      URL.revokeObjectURL(prev[index])
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim() && commentFiles.length === 0) return
    if (!uid) { toast.error("Login to comment"); return }
    setPosting(true)
    const media: CommentMedia[] = []

    if (commentFiles.length > 0) {
      for (const file of commentFiles) {
        try {
          const upload = await uploadFeedbackMedia(file, undefined, "feedback_comment_media")
          media.push({ url: upload.secure_url, type: file.type.startsWith("video/") ? "video" : "image" })
        } catch (error) {
          setPosting(false)
          toast.error(error instanceof Error ? error.message : "Media upload failed")
          return
        }
      }
    }

    const displayName = loggedProfile?.full_name || userProfile?.name || userProfile?.email?.split("@")[0] || "User"
    const avatarUrl = loggedProfile?.avatar_url || userProfile?.photoUrl || ""
    const comment: Omit<FeedbackComment, "id" | "postId" | "createdAt"> = {
      userId: uid,
      userName: displayName,
      userAvatar: avatarUrl,
      content: commentText.trim(),
      media: media.length > 0 ? media : undefined,
      status: "visible",
    }
    const id = await addFeedbackComment(post.id, comment)
    if (id) {
      setComments((prev) => [...prev, { ...comment, id, postId: post.id, createdAt: new Date().toISOString() }])
      setCommentText("")
      setCommentFiles([])
      setCommentPreviews((prev) => {
        prev.forEach((p) => URL.revokeObjectURL(p))
        return []
      })
      onCommentCountChange?.(post.id, 1)
    } else {
      toast.error("Failed to post comment")
    }
    setPosting(false)
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!isAdmin) return
    if (!confirm("Delete this comment?")) return
    const previous = comments
    setDeletingCommentId(commentId)
    setComments((prev) => prev.filter((comment) => comment.id !== commentId))
    const ok = await deleteFeedbackComment(post.id, commentId)
    setDeletingCommentId(null)
    if (!ok) {
      setComments(previous)
      toast.error("Could not delete comment")
      return
    }
    onCommentCountChange?.(post.id, -1)
  }

  const displayRating = Math.round(post.rating)

  return (
    <>
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
                          <video src={m.url} className="h-full w-full object-cover" preload="metadata" muted playsInline />
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
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      whileHover={{ x: [0, -1, 1, -1, 0] }}
                      onClick={() => onReaction(post.id, "like")}
                      disabled={reactionLoading}
                      className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${
                        userReaction === "like"
                          ? "bg-gradient-to-br from-[#2563EB]/30 to-[#8B5CF6]/25 text-white"
                          : "text-[#8E8EA3] hover:bg-white/[0.06] hover:text-white"
                      } disabled:cursor-wait disabled:opacity-70`}
                      aria-label="Like feedback"
                    >
                      {reactionLoading && userReaction === "like" ? <Loader2 size={17} className="animate-spin" /> : <ThumbsUp size={17} className={userReaction === "like" ? "fill-current" : ""} />}
                    </motion.button>
                    <span className="min-w-10 px-2 text-center text-sm font-semibold tabular-nums text-[#F0F0F5]">
                      {post.helpfulCount}
                    </span>
                    <div className="h-6 w-px bg-white/[0.06]" />
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      whileHover={{ x: [0, 1, -1, 1, 0] }}
                      onClick={() => onReaction(post.id, "dislike")}
                      disabled={reactionLoading}
                      className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${
                        userReaction === "dislike"
                          ? "bg-gradient-to-br from-[#8B5CF6]/30 to-[#2563EB]/20 text-white"
                          : "text-[#8E8EA3] hover:bg-white/[0.06] hover:text-white"
                      } disabled:cursor-wait disabled:opacity-70`}
                      aria-label="Dislike feedback"
                    >
                      {reactionLoading && userReaction === "dislike" ? <Loader2 size={17} className="animate-spin" /> : <ThumbsDown size={17} className={userReaction === "dislike" ? "fill-current" : ""} />}
                    </motion.button>
                    <span className="min-w-10 px-2 text-center text-sm font-semibold tabular-nums text-[#F0F0F5]">
                      {post.downvoteCount || 0}
                    </span>
                  </div>
                  <span className="text-xs text-[#8E8EA3]">Was this helpful?</span>
                </motion.div>

                <motion.div variants={contentVariants} className="border-t border-white/[0.06] pt-6">
                  <h3 className="mb-4 text-sm font-semibold text-[#F0F0F5]">Comments ({comments.length})</h3>

                  <form onSubmit={handleComment} className="mb-6 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <textarea
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Share your thoughts on this feedback..."
                          rows={3}
                          maxLength={1200}
                          className="min-h-20 w-full resize-none rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-[#F0F0F5] placeholder-[#77778F] outline-none transition-colors focus:border-blue-500/40"
                        />
                        {commentPreviews.length > 0 && (
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            {commentPreviews.map((preview, i) => {
                              const isVideo = commentFiles[i]?.type.startsWith("video/")
                              return (
                                <div key={preview} className="relative aspect-video overflow-hidden rounded-xl border border-white/[0.08] bg-black/30">
                                  {isVideo ? (
                                    <video src={preview} className="h-full w-full object-cover" controls />
                                  ) : (
                                    <img src={preview} alt="" className="h-full w-full object-cover" />
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => removeCommentFile(i)}
                                    className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-red-500"
                                    aria-label="Remove media"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col gap-2">
                        <label className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-[#8E8EA3] transition-all hover:border-[#4F6EF7]/30 hover:text-white">
                          <input
                            type="file"
                            multiple
                            accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
                            className="sr-only"
                            onChange={(e) => handleCommentFiles(e.target.files)}
                          />
                          {commentFiles.length > 0 ? <ImageIcon size={17} /> : <Paperclip size={17} />}
                        </label>
                        <motion.button
                          type="submit"
                          whileTap={{ scale: 0.95 }}
                          disabled={posting || (!commentText.trim() && commentFiles.length === 0)}
                          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#8B5CF6] text-white shadow-[0_14px_28px_rgba(79,110,247,0.28)] transition-all disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {posting ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                        </motion.button>
                      </div>
                    </div>
                  </form>

                  <div className="space-y-3">
                    {comments.length === 0 && loaded && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-7 text-center">
                        <motion.svg width="54" height="54" viewBox="0 0 54 54" fill="none" className="mx-auto mb-3 text-[#7C8CFF]" animate={{ y: [0, -5, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}>
                          <motion.path d="M15 18.5C15 14.9 17.9 12 21.5 12H32.5C36.1 12 39 14.9 39 18.5V27.5C39 31.1 36.1 34 32.5 34H25L18 40V34H21.5C17.9 34 15 31.1 15 27.5V18.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: "easeInOut" }} />
                          <motion.path d="M22 23H34M22 28H30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.3, duration: 0.8 }} />
                        </motion.svg>
                        <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-sm font-medium text-[#F0F0F5]">Be the first to comment</motion.p>
                      </motion.div>
                    )}
                    {!loaded && (
                      <div className="flex justify-center py-4">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#7C8CFF] border-t-transparent" />
                      </div>
                    )}
                    {comments.map((comment) => (
                      <motion.div variants={contentVariants} key={comment.id} className="relative flex gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3">
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(comment.id)}
                            disabled={deletingCommentId === comment.id}
                            aria-label="Delete comment"
                            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/15 bg-red-500/10 text-red-300 transition-colors hover:bg-red-500/20 disabled:cursor-wait disabled:opacity-60"
                          >
                            {deletingCommentId === comment.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        )}
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#4F6EF7]/10 text-xs font-bold text-[#9BA7FF]">
                          {comment.userAvatar ? <img src={comment.userAvatar} alt="" className="h-full w-full object-cover" /> : comment.userName[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1 pr-8">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="text-xs font-semibold text-[#F0F0F5]">{comment.userName}</span>
                            <span className="text-[10px] text-[#8E8EA3]">{new Date(comment.createdAt).toLocaleDateString("en-US")}</span>
                          </div>
                          {comment.content && <p className="text-xs leading-relaxed text-[#A0A0B5]">{comment.content}</p>}
                          {comment.media && comment.media.length > 0 && (
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              {comment.media.map((m, i) => (
                                <div key={i} className="overflow-hidden rounded-xl border border-white/[0.08] bg-black/30">
                                  {m.type === "video" ? (
                                    <video src={m.url} controls className="max-h-48 w-full object-cover" />
                                  ) : (
                                    <img src={m.url} alt="" className="max-h-48 w-full object-cover" />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
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

      <MediaModal
        media={post.media}
        initialIndex={lightboxIndex ?? 0}
        open={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
      />
    </>
  )
}
