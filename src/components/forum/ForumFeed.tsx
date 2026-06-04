import { motion, AnimatePresence } from "framer-motion"
import { Search, Flame, Sparkles, TrendingUp, MessageSquare, Loader2 } from "lucide-react"
import type { ForumPost, SortMode } from "../../data/forumStore"
import PostCard from "./PostCard"

interface ForumFeedProps {
  posts: ForumPost[]
  loading?: boolean
  onNewPost: () => void
  onPostClick: (slug: string) => void
  onUpvote: (postId: string) => void
  onBookmark: (postId: string) => void
  upvotedPosts: Set<string>
  bookmarkedPosts: Set<string>
  sort: SortMode
  onSortChange: (sort: SortMode) => void
  search: string
  onSearchChange: (q: string) => void
}

const sortTabs: { id: SortMode; label: string; icon: typeof Flame }[] = [
  { id: "hot", label: "Hot", icon: Flame },
  { id: "new", label: "New", icon: Sparkles },
  { id: "top", label: "Top", icon: TrendingUp },
]

export default function ForumFeed({
  posts, loading, onNewPost, onPostClick, onUpvote, onBookmark,
  upvotedPosts, bookmarkedPosts, sort, onSortChange, search, onSearchChange,
}: ForumFeedProps) {
  return (
    <div className="flex-1 min-w-0 flex flex-col">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-[#0A0A0F]/80 backdrop-blur-xl border-b border-[#1E1E2A]">
        <div className="px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B80]" />
              <input
                type="text"
                placeholder="Search posts by title, description, tags, author..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full bg-[#111118] border border-[#1E1E2A] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#F0F0F5] placeholder-[#6B6B80] focus:outline-none focus:border-[#4F6EF7]/50 focus:ring-1 focus:ring-[#4F6EF7]/20 transition-all"
                aria-label="Search forum posts"
              />
              {search && (
                <button
                  onClick={() => onSearchChange("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6B80] hover:text-[#F0F0F5] text-xs"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              onClick={onNewPost}
              className="lg:hidden flex items-center gap-2 bg-[#4F6EF7] hover:bg-[#6B85FF] text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 shadow-[0_0_20px_rgba(79,110,247,0.2)]"
              aria-label="Create new post"
            >
              <MessageSquare size={16} />
              <span>New</span>
            </button>
          </div>

          {/* Sort tabs */}
          <div className="flex items-center gap-1" role="tablist" aria-label="Sort posts">
            {sortTabs.map((tab) => {
              const Icon = tab.icon
              const isActive = sort === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => onSortChange(tab.id)}
                  role="tab"
                  aria-selected={isActive}
                  className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "text-[#4F6EF7]"
                      : "text-[#6B6B80] hover:text-[#F0F0F5] hover:bg-white/[0.04]"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sort-active"
                      className="absolute inset-0 rounded-lg bg-[#4F6EF7]/10 border border-[#4F6EF7]/20"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon size={15} className="relative z-10" />
                  <span className="relative z-10">{tab.label}</span>
                </button>
              )
            })}
            <span className="ml-auto text-xs text-[#6B6B80] tabular-nums">
              {loading ? (
                <Loader2 size={14} className="animate-spin inline" />
              ) : (
                `${posts.length} ${posts.length === 1 ? "post" : "posts"}`
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 sm:px-6 py-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-[#4F6EF7] border-t-transparent animate-spin" />
                <p className="text-sm text-[#6B6B80]">Loading posts...</p>
              </div>
            </div>
          ) : posts.length > 0 ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${sort}-${search}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                {posts.map((post, i) => (
                  <div
                    key={post.id}
                    onClick={() => onPostClick(post.slug)}
                    className="cursor-pointer"
                  >
                    <PostCard
                      post={post}
                      index={i}
                      onUpvote={(e) => { e.stopPropagation?.(); onUpvote(post.id) }}
                      onBookmark={(e) => { e.stopPropagation?.(); onBookmark(post.id) }}
                      onReadMore={() => onPostClick(post.slug)}
                      upvoted={upvotedPosts.has(post.id)}
                      bookmarked={bookmarkedPosts.has(post.id)}
                    />
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-[#111118] border border-[#1E1E2A] flex items-center justify-center mb-4">
                <MessageSquare size={28} className="text-[#6B6B80]" />
              </div>
              <h3 className="text-lg font-semibold text-[#F0F0F5] mb-1">
                {search ? "No results found" : "No posts yet"}
              </h3>
              <p className="text-sm text-[#6B6B80] mb-6 max-w-xs">
                {search
                  ? "Try different keywords or clear the search."
                  : "Be the first to share a project, case study, or result."}
              </p>
              {!search && (
                <button
                  onClick={onNewPost}
                  className="bg-[#4F6EF7] hover:bg-[#6B85FF] text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 shadow-[0_0_20px_rgba(79,110,247,0.3)]"
                >
                  Create first post
                </button>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
