import { useState } from "react";
import { motion } from "framer-motion";
import {
  Star,
  ThumbsDown,
  ThumbsUp,
  MessageCircle,
  BadgeCheck,
  Link as LinkIcon,
  Play,
  Bookmark,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { FeedbackPost, ReactionType } from "../../data/feedbackStore";
import MediaModal from "./MediaModal";
import { useUserProfile } from "../../hooks/useUserProfile";

interface FeedbackCardProps {
  post: FeedbackPost;
  index: number;
  onReaction: (reactionType: ReactionType) => void;
  onComment: () => void;
  onClick: () => void;
  onSave?: () => void;
  userReaction?: ReactionType | null;
  saved?: boolean;
}

export default function FeedbackCard({
  post,
  index,
  onReaction,
  onComment,
  onClick,
  onSave,
  userReaction,
  saved,
}: FeedbackCardProps) {
  const { profile } = useUserProfile(post.userId);
  const displayRating = Math.round(post.rating);
  const [mediaIndex, setMediaIndex] = useState<number | null>(null);

  const userName = profile?.full_name || post.userName;
  const userAvatar = profile?.avatar_url || post.userAvatar;
  const initials = profile?.initials || post.userName[0]?.toUpperCase() || "U";

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          delay: index * 0.05,
          duration: 0.5,
          ease: [0.16, 1, 0.3, 1],
        }}
        className={`group relative overflow-hidden rounded-2xl border transition-all duration-500 ${
          post.isHighlighted
            ? "border-[#4F6EF7]/25 bg-gradient-to-br from-[#4F6EF7]/[0.06] via-[#4F6EF7]/[0.02] to-transparent shadow-[0_0_40px_rgba(79,110,247,0.08)]"
            : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04] hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
        }`}
      >
        {post.isHighlighted && (
          <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-b from-[#4F6EF7]/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        )}

        <div className="relative p-5 sm:p-6">
          {/* Header */}
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                to={`/profile/${post.userId}`}
                onClick={(e) => e.stopPropagation()}
                className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#4F6EF7]/10 text-sm font-bold text-[#4F6EF7] ring-1 ring-white/[0.06] transition-all duration-300 hover:ring-2 hover:ring-[#4F6EF7]/45 hover:shadow-[0_0_20px_rgba(79,110,247,0.2)]"
              >
                {userAvatar ? (
                  <img
                    src={userAvatar}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials
                )}
              </Link>
              <div>
                <div className="flex items-center gap-1.5">
                  <Link
                    to={`/profile/${post.userId}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-sm font-semibold text-[#F0F0F5] transition-colors hover:text-[#8EA0FF] hover:underline"
                  >
                    {userName}
                  </Link>
                  {post.isVerifiedClient && (
                    <BadgeCheck size={14} className="text-[#4F6EF7]" />
                  )}
                </div>

                <div className="flex items-center gap-2 text-[10px] text-[#6B6B80]">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#4F6EF7]/8 px-2 py-0.5 text-[10px] font-medium text-[#4F6EF7] border border-[#4F6EF7]/15">
                    {post.serviceCategory}
                  </span>
                  <span>
                    {new Date(post.createdAt).toLocaleDateString("en-US")}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden gap-0.5 sm:flex">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    size={14}
                    className={
                      n <= displayRating
                        ? "text-[#F59E0B] fill-[#F59E0B]"
                        : "text-[#3A3A4A]"
                    }
                  />
                ))}
              </div>
              {onSave && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSave();
                  }}
                  aria-label={saved ? "Remove saved post" : "Save post"}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-300 ${
                    saved
                      ? "border-[#4F6EF7]/30 bg-[#4F6EF7]/15 text-[#8EA0FF] shadow-[0_0_18px_rgba(79,110,247,0.16)]"
                      : "border-white/[0.07] bg-white/[0.025] text-[#6B6B80] hover:border-[#4F6EF7]/25 hover:bg-[#4F6EF7]/10 hover:text-[#F0F0F5] hover:shadow-[0_0_14px_rgba(79,110,247,0.08)]"
                  }`}
                >
                  <Bookmark size={15} className={saved ? "fill-current" : ""} />
                </button>
              )}
            </div>
          </div>

          {/* Badges */}
          <div className="mb-3 flex flex-wrap gap-2">
            {post.isVerifiedProject && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#22C55E]/20 bg-[#22C55E]/10 px-2 py-0.5 text-[10px] font-medium text-[#22C55E]">
                <BadgeCheck size={10} /> Verified Project
              </span>
            )}
            {post.isHighlighted && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#4F6EF7]/20 bg-[#4F6EF7]/10 px-2 py-0.5 text-[10px] font-medium text-[#4F6EF7]">
                <Star size={10} /> Highlighted
              </span>
            )}
            {post.projectUrl && (
              <a
                href={post.projectUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 rounded-full border border-[#0EA5E9]/20 bg-[#0EA5E9]/10 px-2 py-0.5 text-[10px] font-medium text-[#0EA5E9] transition-colors hover:bg-[#0EA5E9]/20"
              >
                <LinkIcon size={10} /> Project Link
              </a>
            )}
          </div>

          {/* Title & Content */}
          <div className="cursor-pointer" onClick={onClick}>
            <h3 className="mb-2 text-base font-bold text-[#F0F0F5] transition-colors group-hover:text-[#4F6EF7]">
              {post.title}
            </h3>
            <p className="mb-4 text-sm leading-relaxed text-[#6B6B80] line-clamp-3">
              {post.content}
            </p>
          </div>

          {/* Media */}
          {post.media.length > 0 && (
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {post.media.slice(0, 4).map((m, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMediaIndex(i);
                  }}
                  className="group/media relative aspect-video overflow-hidden rounded-xl border border-[#1E1E2A] bg-[#050508] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all hover:border-[#4F6EF7]/30"
                >
                  {m.type === "image" ? (
                    <img
                      src={m.url}
                      alt={m.altText || ""}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover/media:scale-105"
                    />
                  ) : (
                    <>
                      <video
                        src={m.url}
                        className="h-full w-full object-cover"
                        preload="metadata"
                        muted
                        playsInline
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity group-hover/media:bg-black/50">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-md transition-transform group-hover/media:scale-110">
                          <Play size={20} />
                        </span>
                      </div>
                    </>
                  )}
                  {i === 3 && post.media.length > 4 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                      <span className="text-lg font-bold text-white">
                        +{post.media.length - 4}
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Admin Reply Preview */}
          {post.adminReply && (
            <div className="mb-4 rounded-xl border border-[#4F6EF7]/10 bg-gradient-to-r from-[#4F6EF7]/5 to-transparent p-3">
              <p className="mb-1 text-xs font-semibold text-[#4F6EF7]">
                CAFÉ Services replied:
              </p>
              <p className="text-xs leading-relaxed text-[#6B6B80] line-clamp-2">
                {post.adminReply.content}
              </p>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center gap-3 border-t border-white/[0.06] pt-3">
            <div className="inline-flex items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.025] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReaction("like");
                }}
                aria-label="Like"
                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-300 ${
                  userReaction === "like"
                    ? "bg-gradient-to-br from-[#4F6EF7]/20 to-[#4F6EF7]/10 text-[#7C8CFF] shadow-[0_0_12px_rgba(79,110,247,0.15)]"
                    : "text-[#6B6B80] hover:bg-white/[0.06] hover:text-[#F0F0F5]"
                }`}
              >
                <ThumbsUp size={14} />
              </button>
              <span className="min-w-[1.5rem] text-center text-xs font-semibold tabular-nums text-[#F0F0F5]">
                {post.helpfulCount}
              </span>
              <div className="h-5 w-px bg-white/[0.06]" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReaction("dislike");
                }}
                aria-label="Dislike"
                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-300 ${
                  userReaction === "dislike"
                    ? "bg-gradient-to-br from-[#8B5CF6]/20 to-[#8B5CF6]/10 text-[#C4B5FD] shadow-[0_0_12px_rgba(139,92,246,0.15)]"
                    : "text-[#6B6B80] hover:bg-white/[0.06] hover:text-[#F0F0F5]"
                }`}
              >
                <ThumbsDown size={14} />
              </button>
              <span className="min-w-[1.5rem] text-center text-xs font-semibold tabular-nums text-[#F0F0F5]">
                {post.downvoteCount || 0}
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onComment();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-3 py-1.5 text-xs font-medium text-[#6B6B80] transition-all hover:border-white/[0.08] hover:bg-white/[0.04] hover:text-[#F0F0F5]"
            >
              <MessageCircle size={14} />
              {post.commentCount > 0 ? post.commentCount : ""}
            </button>
          </div>
        </div>
      </motion.article>

      <MediaModal
        media={post.media}
        initialIndex={mediaIndex ?? 0}
        open={mediaIndex !== null}
        onClose={() => setMediaIndex(null)}
      />
    </>
  );
}
