import { motion } from "framer-motion"
import { Star, ThumbsUp, MessageCircle, BadgeCheck, Link as LinkIcon, Play } from "lucide-react"
import type { FeedbackPost } from "../../data/feedbackStore"

interface FeedbackCardProps {
  post: FeedbackPost
  index: number
  onHelpful: () => void
  onComment: () => void
  onClick: () => void
  helpful: boolean
}

export default function FeedbackCard({ post, index, onHelpful, onComment, onClick, helpful }: FeedbackCardProps) {
  const displayRating = Math.round(post.rating)

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`group rounded-2xl border transition-all duration-300 ${
        post.isHighlighted
          ? "border-[#4F6EF7]/20 bg-gradient-to-br from-[#4F6EF7]/[0.04] to-transparent shadow-[0_0_30px_rgba(79,110,247,0.05)]"
          : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]"
      }`}
    >
      <div className="p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#4F6EF7]/10 text-sm font-bold text-[#4F6EF7] overflow-hidden">
              {post.userAvatar ? (
                <img src={post.userAvatar} alt="" className="w-full h-full object-cover" />
              ) : (
                post.userName[0]?.toUpperCase() || "U"
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-[#F0F0F5]">{post.userName}</span>
                {post.isVerifiedClient && (
                  <BadgeCheck size={14} className="text-[#4F6EF7]" />
                )}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-[#6B6B80]">
                <span className="px-2 py-0.5 rounded-full bg-[#4F6EF7]/8 border border-[#4F6EF7]/15 text-[#4F6EF7] font-medium">
                  {post.serviceCategory}
                </span>
                <span>{new Date(post.createdAt).toLocaleDateString("en-US")}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                size={14}
                className={n <= displayRating ? "text-[#F59E0B] fill-[#F59E0B]" : "text-[#3A3A4A]"}
              />
            ))}
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-3">
          {post.isVerifiedProject && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] text-[10px] font-medium">
              <BadgeCheck size={10} /> Verified Project
            </span>
          )}
          {post.isHighlighted && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#4F6EF7]/10 border border-[#4F6EF7]/20 text-[#4F6EF7] text-[10px] font-medium">
              <Star size={10} /> Highlighted
            </span>
          )}
          {post.projectUrl && (
            <a
              href={post.projectUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#0EA5E9]/10 border border-[#0EA5E9]/20 text-[#0EA5E9] text-[10px] font-medium hover:bg-[#0EA5E9]/20 transition-colors"
            >
              <LinkIcon size={10} /> Project Link
            </a>
          )}
        </div>

        {/* Title & Content */}
        <div className="cursor-pointer" onClick={onClick}>
          <h3 className="text-base font-bold text-[#F0F0F5] mb-2 group-hover:text-[#4F6EF7] transition-colors">
            {post.title}
          </h3>
          <p className="text-sm text-[#6B6B80] leading-relaxed line-clamp-3 mb-4">
            {post.content}
          </p>
        </div>

        {/* Media */}
        {post.media.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {post.media.slice(0, 4).map((m, i) => (
              <div key={i} className="relative aspect-video rounded-xl overflow-hidden border border-[#1E1E2A] bg-[#050508]">
                {m.type === "image" ? (
                  <img src={m.url} alt={m.altText || ""} className="w-full h-full object-cover" />
                ) : (
                  <>
                    <video src={m.url} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play size={20} className="text-white" />
                    </div>
                  </>
                )}
                {i === 3 && post.media.length > 4 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <span className="text-white font-bold text-lg">+{post.media.length - 4}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Admin Reply Preview */}
        {post.adminReply && (
          <div className="mb-4 p-3 rounded-xl bg-[#4F6EF7]/5 border border-[#4F6EF7]/10">
            <p className="text-xs font-semibold text-[#4F6EF7] mb-1">
              CAFÉ Services replied:
            </p>
            <p className="text-xs text-[#6B6B80] leading-relaxed line-clamp-2">
              {post.adminReply.content}
            </p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center gap-3 pt-3 border-t border-white/[0.06]">
          <button
            onClick={(e) => { e.stopPropagation(); onHelpful() }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              helpful
                ? "bg-[#4F6EF7]/10 text-[#4F6EF7] border border-[#4F6EF7]/20"
                : "text-[#6B6B80] hover:text-[#F0F0F5] hover:bg-white/[0.04] border border-transparent"
            }`}
          >
            <ThumbsUp size={14} />
            Helpful ({post.helpfulCount})
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onComment() }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#6B6B80] hover:text-[#F0F0F5] hover:bg-white/[0.04] border border-transparent transition-all"
          >
            <MessageCircle size={14} />
            {post.commentCount > 0 ? `${post.commentCount} Comments` : "Comment"}
          </button>
        </div>
      </div>
    </motion.article>
  )
}
