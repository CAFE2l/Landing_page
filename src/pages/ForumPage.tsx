"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { LogIn, MessageSquare, Plus, X } from "lucide-react"
import type { ForumPost, ForumCategory, SortMode } from "../data/forumStore"
import { defaultCategories } from "../data/forumStore"
import { fetchCategories, fetchForumPosts, votePost, getUserVote, toggleBookmark, getBookmarkStatus } from "../data/forumService"
import ForumSidebar from "../components/forum/ForumSidebar"
import ForumFeed from "../components/forum/ForumFeed"
import ForumRightPanel from "../components/forum/ForumRightPanel"
import CreatePostModal from "../components/forum/CreatePostModal"
import { useNavigate, Link } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { loadCurrentUser, type UserProfile } from "../data/feedbackStore"
import toast from "react-hot-toast"

export default function ForumPage() {
  const { session } = useAuth()
  const localUser = loadCurrentUser()
  const currentUser = session || localUser
  const userProfile = currentUser ? (currentUser as unknown as UserProfile) : null
  const isAuthed = !!currentUser

  const [posts, setPosts] = useState<ForumPost[]>([])
  const [categories, setCategories] = useState<ForumCategory[]>(defaultCategories)
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState("")
  const [sort, setSort] = useState<SortMode>("hot")
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [upvotedPosts, setUpvotedPosts] = useState<Set<string>>(new Set())
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Set<string>>(new Set())
  const searchTimer = useRef<ReturnType<typeof setTimeout>>()

  const navigate = useNavigate()

  // Debounce search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 300)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [search])

  // Load data
  useEffect(() => {
    Promise.all([
      fetchCategories(),
      fetchForumPosts(100),
    ]).then(([cats, fetchedPosts]) => {
      setCategories(cats.length > 0 ? cats : defaultCategories)
      setPosts(fetchedPosts)
      setLoading(false)
    })
  }, [])

  // Load user's vote/bookmark state
  useEffect(() => {
    if (!userProfile?.uid) return
    const uid = userProfile.uid

    posts.forEach((p) => {
      getUserVote(p.id, uid).then((v) => {
        if (v === 1) setUpvotedPosts((prev) => new Set(prev).add(p.id))
      })
      getBookmarkStatus(p.id, uid).then((b) => {
        if (b) setBookmarkedPosts((prev) => new Set(prev).add(p.id))
      })
    })
  }, [posts, userProfile])

  // Filter + sort + search
  const filteredPosts = (() => {
    let result = posts.filter((p) => p.status === "published")

    if (activeCategory) {
      result = result.filter((p) => p.categoryId === activeCategory)
    }

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.body.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)) ||
          p.author.name.toLowerCase().includes(q),
      )
    }

    switch (sort) {
      case "hot":
        result.sort((a, b) => b.upvotes + b.commentCount * 2 - (a.upvotes + a.commentCount * 2))
        break
      case "new":
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
      case "top":
        result.sort((a, b) => b.upvotes - a.upvotes)
        break
    }

    return result
  })()

  const totalComments = posts.reduce((sum, p) => sum + (p.commentCount || 0), 0)
  const topCategories = categories
    .sort((a, b) => b.postCount - a.postCount)
    .slice(0, 5)
    .map((c) => ({ name: c.name, count: c.postCount }))

  const handleUpvote = useCallback(async (postId: string) => {
    if (!userProfile?.uid) return
    const uid = userProfile.uid
    const wasUpvoted = upvotedPosts.has(postId)
    await votePost(postId, uid, wasUpvoted ? -1 : 1)
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, upvotes: p.upvotes + (wasUpvoted ? -1 : 1) } : p))
    setUpvotedPosts((prev) => {
      const next = new Set(prev)
      if (wasUpvoted) next.delete(postId)
      else next.add(postId)
      return next
    })
  }, [userProfile, upvotedPosts])

  const handleBookmarkToggle = useCallback(async (postId: string) => {
    if (!userProfile?.uid) { toast.error("Login to bookmark"); return }
    const newState = await toggleBookmark(postId, userProfile.uid)
    setBookmarkedPosts((prev) => {
      const next = new Set(prev)
      if (newState) next.add(postId)
      else next.delete(postId)
      return next
    })
  }, [userProfile])

  const handleNewPost = () => {
    if (!isAuthed) {
      setShowLoginPrompt(true)
    } else {
      setShowCreateModal(true)
    }
  }

  const handlePostClick = useCallback((slug: string) => {
    navigate(`/forum/${slug}`)
  }, [navigate])

  const handlePostCreated = useCallback((post: ForumPost) => {
    setPosts((prev) => [post, ...prev])
  }, [])

  return (
    <div className="h-screen bg-[#0A0A0F] flex overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <ForumSidebar
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          onNewPost={handleNewPost}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          isAuthed={isAuthed}
          onLoginClick={() => setShowLoginPrompt(true)}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {showMobileSidebar && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 md:hidden"
        >
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowMobileSidebar(false)} />
          <motion.div
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            className="absolute left-0 top-0 bottom-0 w-[240px]"
          >
            <ForumSidebar
              categories={categories}
              activeCategory={activeCategory}
              onCategoryChange={(c) => { setActiveCategory(c); setShowMobileSidebar(false) }}
              onNewPost={() => { handleNewPost(); setShowMobileSidebar(false) }}
              collapsed={false}
              onToggleCollapse={() => {}}
              isAuthed={isAuthed}
              onLoginClick={() => { setShowLoginPrompt(true); setShowMobileSidebar(false) }}
            />
          </motion.div>
        </motion.div>
      )}

      {/* Main feed */}
      <ForumFeed
        posts={filteredPosts}
        loading={loading}
        onNewPost={handleNewPost}
        onPostClick={handlePostClick}
        onUpvote={handleUpvote}
        onBookmark={handleBookmarkToggle}
        upvotedPosts={upvotedPosts}
        bookmarkedPosts={bookmarkedPosts}
        sort={sort}
        onSortChange={setSort}
        search={search}
        onSearchChange={setSearch}
      />

      {/* Right panel */}
      <ForumRightPanel
        totalPosts={posts.length}
        totalComments={totalComments}
        topCategories={topCategories}
      />

      {/* Mobile bottom tab bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0A0A0F]/90 backdrop-blur-xl border-t border-[#1E1E2A] safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-2">
          <button
            onClick={() => setShowMobileSidebar(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[10px] text-[#6B6B80]"
            aria-label="Categories"
          >
            <MessageSquare size={18} />
            <span>Channels</span>
          </button>
          <div className="flex items-center justify-center gap-1 overflow-x-auto max-w-[60%]">
            {categories.slice(0, 4).map((ch) => (
              <button
                key={ch.slug}
                onClick={() => setActiveCategory(activeCategory === ch.slug ? "" : ch.slug)}
                className={`px-2 py-1.5 text-[10px] font-medium rounded-lg transition-colors whitespace-nowrap ${
                  activeCategory === ch.slug ? "text-[#4F6EF7] bg-[#4F6EF7]/10" : "text-[#6B6B80]"
                }`}
              >
                {ch.name}
              </button>
            ))}
          </div>
          <button
            onClick={handleNewPost}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[10px] text-[#4F6EF7]"
            aria-label="New post"
          >
            <Plus size={18} />
            <span>New</span>
          </button>
        </div>
      </div>

      <CreatePostModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onPostCreated={handlePostCreated}
      />

      <AnimatePresence>
        {showLoginPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center"
          >
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowLoginPrompt(false)} />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="relative w-full max-w-sm rounded-3xl border border-[#1E1E2A] bg-[#111118] p-8 shadow-2xl"
            >
              <button
                onClick={() => setShowLoginPrompt(false)}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.04] text-[#6B6B80] transition-all hover:bg-white/[0.08] hover:text-[#F0F0F5]"
              >
                <X size={16} />
              </button>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#4F6EF7]/10 text-[#4F6EF7]">
                  <LogIn size={22} />
                </div>
                <h3 className="text-lg font-bold text-[#F0F0F5]">Login to join</h3>
                <p className="mt-2 text-sm text-[#6B6B80]">
                  Sign in to vote, comment, create posts, and engage with the community.
                </p>
                <div className="mt-6 flex flex-col gap-3">
                  <Link
                    to="/login"
                    onClick={() => setShowLoginPrompt(false)}
                    className="rounded-xl bg-[#4F6EF7] px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-[#6B85FF]"
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setShowLoginPrompt(false)}
                    className="rounded-xl border border-white/[0.1] px-5 py-3 text-sm font-semibold text-[#F0F0F5] transition-all hover:bg-white/[0.04]"
                  >
                    Create account
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
