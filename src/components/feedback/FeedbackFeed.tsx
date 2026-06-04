import { AnimatePresence } from "framer-motion"
import { Loader2, MessageCircle } from "lucide-react"
import FeedbackCard from "./FeedbackCard"
import type { FeedbackPost, ServiceCategory } from "../../data/feedbackStore"

interface FeedbackFeedProps {
  posts: FeedbackPost[]
  loading: boolean
  sort: "recent" | "rating" | "helpful" | "media" | "verified"
  onSortChange: (sort: "recent" | "rating" | "helpful" | "media" | "verified") => void
  onPostClick: (post: FeedbackPost) => void
  onHelpful: (postId: string) => void
  helpfulPosts: Set<string>
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

export default function FeedbackFeed({
  posts, loading, sort, onSortChange, onPostClick, onHelpful,
  helpfulPosts, onCommentClick, category, rating, search,
}: FeedbackFeedProps) {
  const isEmpty = !loading && posts.length === 0

  return (
    <div className="min-w-0 flex-1">
      {/* Sort Tabs */}
      <div className="flex gap-1 mb-5 overflow-x-auto pb-1 scrollbar-none">
        {sortTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onSortChange(tab.key)}
            className={`relative px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
              sort === tab.key
                ? "bg-[#4F6EF7]/10 text-[#4F6EF7] border border-[#4F6EF7]/20"
                : "text-[#6B6B80] hover:text-[#F0F0F5] hover:bg-white/[0.04] border border-transparent"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-[#4F6EF7]" />
        </div>
      ) : isEmpty ? (
        <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] p-10 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#4F6EF7]/20 bg-[#4F6EF7]/5 text-[#4F6EF7]">
            <MessageCircle size={24} />
          </div>
          <h2 className="mb-3 text-lg font-bold text-[#F0F0F5]">No feedback yet</h2>
          <p className="mx-auto max-w-md text-sm text-[#6B6B80] leading-relaxed">
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
                onHelpful={() => onHelpful(post.id)}
                onComment={() => onCommentClick(post)}
                helpful={helpfulPosts.has(post.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
