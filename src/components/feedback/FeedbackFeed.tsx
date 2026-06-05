import { AnimatePresence } from "framer-motion"
import { MessageCircle } from "lucide-react"
import FeedbackCard from "./FeedbackCard"
import type { FeedbackPost, ReactionType, ServiceCategory } from "../../data/feedbackStore"

interface FeedbackFeedProps {
  posts: FeedbackPost[]
  loading: boolean
  sort: "recent" | "rating" | "helpful" | "media" | "verified"
  onSortChange: (sort: "recent" | "rating" | "helpful" | "media" | "verified") => void
  onPostClick: (post: FeedbackPost) => void
  onReaction: (postId: string, reactionType: ReactionType) => void
  userReactions?: Map<string, ReactionType>
  onSave?: (postId: string) => void
  savedPosts?: Set<string>
  onCommentClick: (post: FeedbackPost) => void
  category: ServiceCategory | ""
  rating: number
  search: string
}

const sortTabs = [
  { key: "recent" as const, label: "Recent" },
  { key: "rating" as const, label: "Best Rated" },
  { key: "helpful" as const, label: "Most Helpful" },
  { key: "media" as const, label: "With Media" },
  { key: "verified" as const, label: "Verified" },
]

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-white/[0.06]" />
          <div className="space-y-2">
            <div className="h-3 w-24 rounded bg-white/[0.06]" />
            <div className="h-2 w-32 rounded bg-white/[0.04]" />
          </div>
        </div>
        <div className="hidden gap-1 sm:flex">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="h-3.5 w-3.5 rounded bg-white/[0.04]" />
          ))}
        </div>
      </div>
      <div className="mb-2 h-4 w-3/4 rounded bg-white/[0.06]" />
      <div className="mb-1 h-3 w-full rounded bg-white/[0.04]" />
      <div className="mb-1 h-3 w-5/6 rounded bg-white/[0.04]" />
      <div className="mb-4 h-3 w-2/3 rounded bg-white/[0.04]" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="aspect-video rounded-xl bg-white/[0.04]" />
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3 border-t border-white/[0.06] pt-3">
        <div className="h-8 w-24 rounded-lg bg-white/[0.04]" />
        <div className="h-8 w-20 rounded-lg bg-white/[0.04]" />
      </div>
    </div>
  )
}

export default function FeedbackFeed({
  posts, loading, sort, onSortChange, onPostClick, onReaction,
  userReactions, onSave, savedPosts, onCommentClick, category, rating, search,
}: FeedbackFeedProps) {
  const isEmpty = !loading && posts.length === 0

  return (
    <div className="min-w-0 flex-1">
      {/* Sort Tabs */}
      <div className="mb-5 flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {sortTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onSortChange(tab.key)}
            className={`relative whitespace-nowrap rounded-xl px-4 py-2 text-xs font-medium transition-all ${
              sort === tab.key
                ? "border border-[#4F6EF7]/20 bg-[#4F6EF7]/10 text-[#4F6EF7]"
                : "border border-transparent text-[#6B6B80] hover:bg-white/[0.04] hover:text-[#F0F0F5]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      {loading ? (
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : isEmpty ? (
        <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] p-10 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#4F6EF7]/20 bg-[#4F6EF7]/5 text-[#4F6EF7]">
            <MessageCircle size={24} />
          </div>
          <h2 className="mb-3 text-lg font-bold text-[#F0F0F5]">No feedback yet</h2>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-[#6B6B80]">
            {search
              ? "No feedback matches your search. Try different terms."
              : category || rating > 0
                ? "No feedback in this category yet. Be the first to share your experience."
                : "No feedback posts available. Once clients submit reviews and admin approves them, they'll appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {posts.map((post, i) => (
              <FeedbackCard
                key={post.id}
                post={post}
                index={i}
                onClick={() => onPostClick(post)}
                onReaction={(rt) => onReaction(post.id, rt)}
                onSave={onSave ? () => onSave(post.id) : undefined}
                onComment={() => onCommentClick(post)}
                userReaction={userReactions?.get(post.id) || null}
                saved={savedPosts?.has(post.id) || false}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
