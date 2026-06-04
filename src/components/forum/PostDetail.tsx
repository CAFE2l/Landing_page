import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { motion } from "framer-motion"
import {
  ArrowBigUp, MessageCircle, Share2, Bookmark, BadgeCheck,
  Star, ChevronLeft, Send, Flag, Loader2,
} from "lucide-react"
import type { ForumPost, ForumComment, ForumAuthor } from "../../data/forumStore"
import { fetchPostBySlug, fetchPostComments, addComment, votePost, getUserVote, toggleBookmark, getBookmarkStatus, deleteComment } from "../../data/forumService"
import { useAuth } from "../../contexts/AuthContext"
import { loadCurrentUser, type UserProfile } from "../../data/feedbackStore"
import toast from "react-hot-toast"

export default function PostDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { user: supabaseUser } = useAuth()
  const localUser = loadCurrentUser()
  const currentUser = supabaseUser || localUser
  const userProfile = currentUser ? (currentUser as unknown as UserProfile & { id: string }) : null

  const [post, setPost] = useState<ForumPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [upvoted, setUpvoted] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [expandedImage, setExpandedImage] = useState<string | null>(null)
  const [commentText, setCommentText] = useState("")
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [localComments, setLocalComments] = useState<ForumComment[]>([])
  const [imgError, setImgError] = useState<Record<string, boolean>>({})
  const [postingComment, setPostingComment] = useState(false)

  useEffect(() => {
    if (!slug) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    Promise.all([
      fetchPostBySlug(slug),
      fetchPostComments(slug),
    ]).then(([postData, comments]) => {
      if (postData) {
        setPost(postData)
        const uid = userProfile?.uid || userProfile?.id
        if (uid) {
          getUserVote(postData.id, uid).then((v) => setUpvoted(v === 1))
          getBookmarkStatus(postData.id, uid).then(setBookmarked)
        }
      }
      setLocalComments(comments)
      setLoading(false)
    })
  }, [slug, currentUser])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#4F6EF7] border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-[#F0F0F5] mb-2">Post not found</h2>
          <Link to="/forum" className="text-[#4F6EF7] hover:text-[#6B85FF] transition-colors text-sm">
            ← Back to forum
          </Link>
        </div>
      </div>
    )
  }

  const handleUpvote = async () => {
    const uid = userProfile?.uid || userProfile?.id
    if (!uid) { toast.error("Login to vote"); return }
    await votePost(post.id, uid, upvoted ? -1 : 1)
    setUpvoted(!upvoted)
    setPost((prev) => prev ? { ...prev, upvotes: prev.upvotes + (upvoted ? -1 : 1) } : prev)
  }

  const handleBookmark = async () => {
    const uid = userProfile?.uid || userProfile?.id
    if (!uid) { toast.error("Login to bookmark"); return }
    const newState = await toggleBookmark(post.id, uid)
    setBookmarked(newState)
  }

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim()) return
    const uid = userProfile?.uid || userProfile?.id
    if (!uid) { toast.error("Login to comment"); return }
    if (!slug) return
    setPostingComment(true)

    const author: ForumAuthor = {
      uid,
      name: userProfile?.name || userProfile?.email?.split("@")[0] || "User",
      avatar: (userProfile?.name?.[0] || "U").toUpperCase(),
      role: userProfile?.role === "admin" ? "admin" : "member",
      verified: userProfile?.role === "admin",
      photoUrl: userProfile?.photoUrl,
    }

    const comment: Omit<ForumComment, "id" | "postId" | "replies"> = {
      author,
      body: commentText.trim(),
      createdAt: new Date().toISOString(),
      parentId: null,
    }

    const id = await addComment(post.id, comment)
    if (id) {
      const newComment: ForumComment = { ...comment, id, postId: post.id, replies: [] }
      setLocalComments((prev) => [...prev, newComment])
      setPost((prev) => prev ? { ...prev, commentCount: prev.commentCount + 1 } : prev)
      setCommentText("")
    }
    setPostingComment(false)
  }

  const handleReply = async (e: React.FormEvent, parentId: string) => {
    e.preventDefault()
    if (!replyText.trim()) return
    const uid = userProfile?.uid || userProfile?.id
    if (!uid) { toast.error("Login to reply"); return }
    if (!slug) return

    const author: ForumAuthor = {
      uid,
      name: userProfile?.name || userProfile?.email?.split("@")[0] || "User",
      avatar: (userProfile?.name?.[0] || "U").toUpperCase(),
      role: userProfile?.role === "admin" ? "admin" : "member",
      verified: userProfile?.role === "admin",
      photoUrl: userProfile?.photoUrl,
    }

    const reply: Omit<ForumComment, "id" | "postId" | "replies"> = {
      author,
      body: replyText.trim(),
      createdAt: new Date().toISOString(),
      parentId,
    }

    const id = await addComment(post.id, reply)
    if (id) {
      const newReply: ForumComment = { ...reply, id, postId: post.id, replies: [] }
      setLocalComments((prev) =>
        prev.map((c) =>
          c.id === parentId ? { ...c, replies: [...(c.replies || []), newReply] } : c
        )
      )
      setPost((prev) => prev ? { ...prev, commentCount: prev.commentCount + 1 } : prev)
      setReplyText("")
      setReplyTo(null)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Delete this comment?")) return
    await deleteComment(post.id, commentId)
    setLocalComments((prev) => prev.filter((c) => c.id !== commentId))
    setPost((prev) => prev ? { ...prev, commentCount: Math.max(0, prev.commentCount - 1) } : prev)
  }

  const currentUserId = userProfile?.uid || userProfile?.id || ""

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <Link
          to="/forum"
          className="inline-flex items-center gap-1.5 text-sm text-[#6B6B80] hover:text-[#F0F0F5] transition-colors mb-6"
        >
          <ChevronLeft size={16} />
          Back to forum
        </Link>

        <motion.article
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[#111118] to-[#0D0D14] border border-[#1E1E2A] rounded-3xl p-6 sm:p-8"
        >
          {/* Badges */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#4F6EF7] bg-[#4F6EF7]/10 px-2.5 py-1 rounded-lg">
              {post.categoryId}
            </span>
            {post.verifiedResult && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#22C55E] bg-[#22C55E]/10 px-2.5 py-1 rounded-lg">
                <BadgeCheck size={12} /> Verified Result
              </span>
            )}
            {post.featured && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#8B5CF6] bg-[#8B5CF6]/10 px-2.5 py-1 rounded-lg">
                <Star size={12} /> Featured
              </span>
            )}
          </div>

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {post.tags.map((tag) => (
                <span key={tag} className="text-xs text-[#6B6B80] bg-white/[0.04] px-2 py-0.5 rounded-md font-mono">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <h1 className="text-2xl sm:text-3xl font-bold text-[#F0F0F5] mb-4 tracking-tight leading-tight">
            {post.title}
          </h1>

          {/* Author */}
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              post.author.role === "admin" ? "bg-[#4F6EF7]/20 text-[#4F6EF7]" : "bg-white/[0.06] text-[#6B6B80]"
            }`}>
              {post.author.photoUrl ? (
                <img src={post.author.photoUrl} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                post.author.avatar
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-[#F0F0F5]">{post.author.name}</span>
                {post.author.verified && <BadgeCheck size={14} className="text-[#22C55E]" />}
              </div>
              <p className="text-xs text-[#6B6B80]">
                {post.author.company && `${post.author.company} · `}
                {getRelativeTime(post.createdAt)}
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="text-sm text-[#6B6B80] leading-relaxed whitespace-pre-line mb-6">
            {post.body}
          </div>

          {/* Media */}
          {post.media.length > 0 && (
            <div className={`grid gap-3 mb-6 ${
              post.media.length === 1 ? "grid-cols-1" :
              post.media.length === 2 ? "grid-cols-2" :
              "grid-cols-2 sm:grid-cols-3"
            }`}>
              {post.media.map((m, i) => (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setExpandedImage(expandedImage === m.url ? null : m.url)}
                  className="relative aspect-video rounded-xl overflow-hidden bg-[#0A0A0F] cursor-pointer group border border-white/[0.04]"
                >
                  {m.type === "image" && !imgError[m.url] ? (
                    <img
                      src={m.url}
                      alt={`Media ${i + 1}`}
                      className={`w-full h-full object-cover transition-all duration-300 ${
                        expandedImage === m.url ? "object-contain" : ""
                      }`}
                      loading="lazy"
                      onError={() => setImgError((prev) => ({ ...prev, [m.url]: true }))}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#6B6B80] text-sm">
                      <Loader2 size={20} className="animate-spin" />
                    </div>
                  )}
                  {expandedImage === m.url && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-xs text-white">Click to collapse</span>
                    </div>
                  )}
                </motion.button>
              ))}
            </div>
          )}

          {/* Metrics */}
          {post.metrics.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {post.metrics.map((m, i) => (
                <div key={i} className="p-4 rounded-2xl bg-[#22C55E]/5 border border-[#22C55E]/10 text-center">
                  <p className="text-2xl font-bold text-[#22C55E] mb-1">{m.value}</p>
                  <p className="text-[10px] text-[#6B6B80] uppercase tracking-wider">{m.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Share */}

          {/* Actions */}
          <div className="flex items-center gap-4 pt-4 border-t border-[#1E1E2A]">
            <motion.button
              onClick={handleUpvote}
              whileTap={{ scale: 0.8 }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                upvoted
                  ? "text-[#4F6EF7] bg-[#4F6EF7]/10"
                  : "text-[#6B6B80] hover:text-[#4F6EF7] hover:bg-white/[0.04]"
              }`}
            >
              <ArrowBigUp size={18} />
              <span className="font-semibold tabular-nums">{post.upvotes}</span>
            </motion.button>

            <div className="flex items-center gap-1.5 text-sm text-[#6B6B80]">
              <MessageCircle size={16} />
              <span className="tabular-nums">{post.commentCount}</span>
            </div>

            <button
              onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success("Link copied!") }}
              className="flex items-center gap-1.5 text-sm text-[#6B6B80] hover:text-[#F0F0F5] transition-colors"
            >
              <Share2 size={16} />
              <span>Share</span>
            </button>

            <button
              onClick={handleBookmark}
              className={`flex items-center gap-1.5 text-sm transition-colors ml-auto ${
                bookmarked ? "text-[#4F6EF7]" : "text-[#6B6B80] hover:text-[#F0F0F5]"
              }`}
            >
              <Bookmark size={16} className={bookmarked ? "fill-[#4F6EF7]" : ""} />
            </button>
          </div>
        </motion.article>

        {/* Comments */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-8"
        >
          <h3 className="text-lg font-bold text-[#F0F0F5] mb-6">
            Comments <span className="text-[#6B6B80] font-normal">({localComments.length})</span>
          </h3>

          <form onSubmit={handleComment} className="flex gap-3 mb-8">
            <div className="w-9 h-9 rounded-full bg-[#4F6EF7]/20 flex items-center justify-center text-[#4F6EF7] text-xs font-bold flex-shrink-0">
              {userProfile ? (userProfile.name?.[0] || "U").toUpperCase() : "?"}
            </div>
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                placeholder={currentUser ? "Write a comment..." : "Login to comment"}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="flex-1 bg-[#111118] border border-[#1E1E2A] rounded-xl px-4 py-2.5 text-sm text-[#F0F0F5] placeholder-[#6B6B80] focus:outline-none focus:border-[#4F6EF7]/50 transition-all"
                disabled={!currentUser}
              />
              <motion.button
                type="submit"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                disabled={!commentText.trim() || postingComment || !currentUser}
                className="bg-[#4F6EF7] hover:bg-[#6B85FF] disabled:opacity-30 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl transition-all"
              >
                {postingComment ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </motion.button>
            </div>
          </form>

          <div className="space-y-4">
            {localComments.map((comment) => (
              <div key={comment.id}>
                <div className="bg-[#111118] border border-[#1E1E2A] rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center text-[8px] text-[#6B6B80] font-bold overflow-hidden">
                      {comment.author.photoUrl ? (
                        <img src={comment.author.photoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        comment.author.avatar
                      )}
                    </div>
                    <span className="text-sm font-medium text-[#F0F0F5]">{comment.author.name}</span>
                    {comment.author.verified && <BadgeCheck size={12} className="text-[#22C55E]" />}
                    <span className="text-xs text-[#6B6B80]">{getRelativeTime(comment.createdAt)}</span>
                    {(comment.author.uid === currentUserId || userProfile?.role === "admin") && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="ml-auto text-[#6B6B80] hover:text-red-400 transition-colors"
                      >
                        <Flag size={12} />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-[#6B6B80] leading-relaxed mb-3">{comment.body}</p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                      className="text-xs text-[#6B6B80] hover:text-[#4F6EF7] transition-colors font-medium"
                    >
                      Reply
                    </button>
                  </div>

                  {replyTo === comment.id && (
                    <form onSubmit={(e) => handleReply(e, comment.id)} className="flex gap-2 mt-3 pt-3 border-t border-[#1E1E2A]">
                      <input
                        type="text"
                        placeholder="Write a reply..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="flex-1 bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl px-3 py-2 text-sm text-[#F0F0F5] placeholder-[#6B6B80] focus:outline-none focus:border-[#4F6EF7]/50 transition-all"
                      />
                      <button
                        type="submit"
                        disabled={!replyText.trim()}
                        className="bg-[#4F6EF7] hover:bg-[#6B85FF] disabled:opacity-30 disabled:cursor-not-allowed text-white px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                      >
                        Reply
                      </button>
                    </form>
                  )}
                </div>

                {comment.replies && comment.replies.length > 0 && (
                  <div className="ml-8 mt-2 space-y-2">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="bg-[#111118]/70 border border-[#1E1E2A] rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-5 h-5 rounded-full bg-white/[0.06] flex items-center justify-center text-[7px] text-[#6B6B80] font-bold overflow-hidden">
                            {reply.author.photoUrl ? (
                              <img src={reply.author.photoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              reply.author.avatar
                            )}
                          </div>
                          <span className="text-xs font-medium text-[#F0F0F5]">{reply.author.name}</span>
                          {reply.author.verified && <BadgeCheck size={10} className="text-[#22C55E]" />}
                          <span className="text-[10px] text-[#6B6B80]">{getRelativeTime(reply.createdAt)}</span>
                        </div>
                        <p className="text-xs text-[#6B6B80] leading-relaxed">{reply.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}
