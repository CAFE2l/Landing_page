import { motion } from "framer-motion"
import { ArrowBigUp, MessageCircle, Bookmark, BadgeCheck, Star, Image, Pin } from "lucide-react"
import type { ForumPost } from "../../data/forumStore"

interface PostCardProps {
  post: ForumPost
  index: number
  onUpvote?: (id: string) => void
  onBookmark?: (id: string) => void
  onReadMore?: (slug: string) => void
  upvoted?: boolean
  bookmarked?: boolean
}

export default function PostCard({ post, index, onUpvote, onBookmark, onReadMore, upvoted, bookmarked }: PostCardProps) {
  const hasMedia = post.media && post.media.length > 0
  const hasMetrics = post.metrics && post.metrics.length > 0

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: "easeOut" }}
      className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-white/[0.01] backdrop-blur-xl transition-all duration-300 hover:border-[#4F6EF7]/30 hover:shadow-[0_0_40px_rgba(79,110,247,0.08)]"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#4F6EF7]/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div className="relative p-5 sm:p-6">
        {/* Top row: channel + status badges */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#4F6EF7]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#4F6EF7]">
            {post.categoryId}
          </span>
          {post.pinned && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-[#F59E0B]/10 px-2 py-1 text-[10px] font-semibold text-[#F59E0B]">
              <Pin size={10} /> Pinned
            </span>
          )}
          {post.featured && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-[#8B5CF6]/10 px-2 py-1 text-[10px] font-semibold text-[#8B5CF6]">
              <Star size={10} /> Featured
            </span>
          )}
          {post.verifiedResult && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-[#22C55E]/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#22C55E]">
              <BadgeCheck size={10} /> Verified Result
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-lg sm:text-xl font-bold text-[#F0F0F5] leading-snug mb-2 line-clamp-2 group-hover:text-white transition-colors">
          {post.title}
        </h3>

        {/* Excerpt */}
        <p className="text-sm text-[#6B6B80] leading-relaxed line-clamp-3 mb-4">
          {post.body}
        </p>

        {/* Metrics preview */}
        {hasMetrics && (
          <div className="flex flex-wrap gap-2 mb-4">
            {post.metrics!.slice(0, 3).map((m, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 rounded-lg bg-[#22C55E]/5 border border-[#22C55E]/10 px-2.5 py-1"
              >
                <span className="text-xs font-bold text-[#22C55E]">{m.value}</span>
                <span className="text-[10px] text-[#6B6B80]">{m.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Media grid */}
        {hasMedia && (
          <div className={`grid gap-2 mb-4 ${post.media!.length === 1 ? "grid-cols-1" : post.media!.length === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
            {post.media!.slice(0, 3).map((m, i) => (
              <div
                key={i}
                className="relative aspect-[16/10] overflow-hidden rounded-xl bg-[#0A0A0F] border border-white/[0.04]"
              >
                {m.type === "image" ? (
                  <img
                    src={m.url}
                    alt=""
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#6B6B80] text-xs">
                    <Image size={20} />
                  </div>
                )}
                {post.media!.length > 3 && i === 2 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-sm font-bold text-white">+{post.media!.length - 3}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Meta row */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Author */}
          <div className="flex items-center gap-2.5">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
              post.author.role === "admin" ? "bg-[#4F6EF7]/20 text-[#4F6EF7]" : "bg-white/[0.06] text-[#6B6B80]"
            }`}>
              {post.author.photoUrl ? (
                <img src={post.author.photoUrl} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                post.author.avatar
              )}
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-[#F0F0F5]">{post.author.name}</span>
                {post.author.verified && <BadgeCheck size={12} className="text-[#22C55E]" />}
              </div>
              <p className="text-[10px] text-[#6B6B80]">{getRelativeTime(post.createdAt)}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpvote?.(post.id)}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                upvoted ? "bg-[#4F6EF7]/15 text-[#4F6EF7]" : "text-[#6B6B80] hover:bg-white/[0.04] hover:text-[#F0F0F5]"
              }`}
            >
              <ArrowBigUp size={15} />
              <span className="tabular-nums">{post.upvotes}</span>
            </button>

            <button
              onClick={() => onReadMore?.(post.slug)}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#6B6B80] hover:bg-white/[0.04] hover:text-[#F0F0F5] transition-all"
            >
              <MessageCircle size={15} />
              <span className="tabular-nums">{post.commentCount}</span>
            </button>

            <button
              onClick={() => onBookmark?.(post.id)}
              className={`rounded-lg p-1.5 transition-all ${
                bookmarked ? "text-[#4F6EF7]" : "text-[#6B6B80] hover:text-[#F0F0F5] hover:bg-white/[0.04]"
              }`}
            >
              <Bookmark size={15} className={bookmarked ? "fill-[#4F6EF7]" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom gradient border */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-[#4F6EF7]/0 via-[#4F6EF7]/20 to-[#4F6EF7]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </motion.article>
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
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}
