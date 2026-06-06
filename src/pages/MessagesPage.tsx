import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { useSearchParams, useParams, Link, useNavigate } from "react-router-dom"
import {
  MessageCircle, Loader2, Search, Hash,
  Send, X, Camera, ChevronLeft, Heart, MessageSquare,
  ExternalLink, Plus, AlertCircle, RefreshCw,
  FileText, Download, Film, ImageIcon, Music,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import FloatingOrbs from "../components/landing/FloatingOrbs"
import Navbar from "../components/landing/Navbar"
import { useAuth } from "../contexts/AuthContext"
import { loadCurrentUser } from "../data/feedbackStore"
import { supabase } from "../lib/supabase/client"
import { fetchConversations, fetchMessages, markMessagesAsRead, subscribeToMessages, uploadChatMedia, subscribeToConversationUpdates, createOrGetConversation } from "../lib/chatService"
import {
  fetchSocialPosts, createSocialPost, toggleSocialLike, addPostComment,
  fetchPostComments, toggleFollow, isFollowing,
} from "../lib/socialService"
import {
  canQuerySocialFollows,
  markSocialFollowsError,
} from "../lib/socialFollowsHealth"
import MessageComposer from "../components/chat/MessageComposer"
import FollowButton from "../components/ui/FollowButton"
import { getUserDisplayName } from "../lib/utils"
import UserAvatar from "../components/ui/UserAvatar"
import type { ChatConversation as ChatConv, ChatMessage, SocialPost } from "../data/feedbackStore"
import toast from "react-hot-toast"

type Tab = "conversations" | "status"

export default function MessagesPage() {
  const { user: supabaseUser } = useAuth()
  const localUser = loadCurrentUser()
  const currentUser = supabaseUser || localUser
  const userProfile = currentUser as unknown as { id?: string; uid?: string; name?: string; email?: string; photoUrl?: string } | null
  const uid = supabaseUser?.id || userProfile?.uid || userProfile?.id

  const [searchParams, setSearchParams] = useSearchParams()
  const { conversationId: urlConversationId } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>("conversations")
  const [conversations, setConversations] = useState<ChatConv[]>([])
  const [convLoading, setConvLoading] = useState(true)
  const [convError, setConvError] = useState<string | null>(null)
  const [activeConv, setActiveConv] = useState<ChatConv | null>(null)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "unread">("all")
  const [mobileView, setMobileView] = useState<"list" | "chat">("list")

  // Conversation messages
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [msgLoading, setMsgLoading] = useState(false)
  const [msgError, setMsgError] = useState<string | null>(null)

  // Social posts
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [postsLoading, setPostsLoading] = useState(false)
  const [postError, setPostError] = useState<string | null>(null)
  const [postInput, setPostInput] = useState("")
  const [posting, setPosting] = useState(false)
  const [postMediaUrl, setPostMediaUrl] = useState<string | null>(null)
  const [postMediaType, setPostMediaType] = useState<"image" | "video" | "audio" | null>(null)
  const [commentInput, setCommentInput] = useState<Record<string, string>>({})
  const [commenting, setCommenting] = useState<Record<string, boolean>>({})
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())

  // Profile drawer
  const [drawerUserId, setDrawerUserId] = useState<string | null>(null)
  const [drawerProfile, setDrawerProfile] = useState<{
    id: string; name: string; avatarUrl: string | null; username: string | null; bio: string | null;
    followers: number; following: number; postsCount: number; following_: boolean;
  } | null>(null)
  const [drawerLoading, setDrawerLoading] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // ========== Load conversations ==========
  const loadConversations = useCallback(async () => {
    if (!uid) return
    setConvLoading(true)
    setConvError(null)
    try {
      const convs = await fetchConversations(uid)
      setConversations(convs)
    } catch {
      setConvError("Failed to load conversations")
    }
    setConvLoading(false)
  }, [uid])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  useEffect(() => {
    if (!uid) return
    const cleanup = subscribeToConversationUpdates(uid, loadConversations)
    return cleanup
  }, [uid, loadConversations])

  // ========== URL param auto-select ==========
  useEffect(() => {
    const convId = searchParams.get("conversationId") || urlConversationId
    if (!convId || conversations.length === 0 || activeConv) return
    const found = conversations.find((c) => c.id === convId)
    if (found) {
      setActiveConv(found)
      setMobileView("chat")
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, urlConversationId, conversations])

  // ========== Load messages for active conversation ==========
  const loadMessages = useCallback(async () => {
    if (!activeConv) return
    setMsgLoading(true)
    setMsgError(null)
    try {
      const msgs = await fetchMessages(activeConv.id)
      setMessages(msgs)
      await markMessagesAsRead(activeConv.id, uid)
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConv.id ? { ...c, unreadCount: 0 } : c,
        ),
      )
    } catch {
      setMsgError("Failed to load messages")
    }
    setMsgLoading(false)
  }, [activeConv, uid])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  // Realtime subscription for active conversation
  useEffect(() => {
    if (!activeConv) return
    const cleanup = subscribeToMessages(
      activeConv.id,
      (msg) => {
        setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg])
        if (msg.senderId !== uid) {
          markMessagesAsRead(activeConv.id, uid)
        }
      },
    )
    return cleanup
  }, [activeConv, uid])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  // ========== Handle select conversation ==========
  const handleSelectConversation = (conv: ChatConv) => {
    setActiveConv(conv)
    setMobileView("chat")
  }

  const handleBack = () => {
    setActiveConv(null)
    setMobileView("list")
    loadConversations()
  }

  // ========== Load social posts ==========
  const loadPosts = useCallback(async (mode: "all" | "following") => {
    if (!uid) return
    setPostsLoading(true)
    setPostError(null)
    try {
      const data = await fetchSocialPosts(mode, uid)
      setPosts(data)
    } catch {
      setPostError("Failed to load posts")
    }
    setPostsLoading(false)
  }, [uid])

  useEffect(() => {
    if (tab === "status") loadPosts("all")
  }, [tab, loadPosts])

  // ========== Create post ==========
  const handleCreatePost = async () => {
    if (!postInput.trim() || !uid || posting) return
    setPosting(true)
    const post = await createSocialPost(uid, postInput.trim(), postMediaUrl || undefined, postMediaType || undefined)
    setPosting(false)
    if (post) {
      setPosts((prev) => [post, ...prev])
      setPostInput("")
      setPostMediaUrl(null)
      setPostMediaType(null)
    } else {
      toast.error("Failed to create post")
    }
  }

  // ========== Like post ==========
  const handleLike = async (postId: string) => {
    if (!uid) { toast.error("Login to like"); return }
    const liked = await toggleSocialLike(postId, uid)
    if (liked) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, liked: !p.liked, likesCount: p.liked ? p.likesCount - 1 : p.likesCount + 1 }
            : p,
        ),
      )
    }
  }

  // ========== Comment ==========
  const toggleComments = async (postId: string) => {
    if (expandedComments.has(postId)) {
      setExpandedComments((prev) => { const n = new Set(prev); n.delete(postId); return n })
      return
    }
    const comments = await fetchPostComments(postId)
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, comments } : p))
    setExpandedComments((prev) => { const n = new Set(prev); n.add(postId); return n })
  }

  const handleComment = async (postId: string) => {
    const text = commentInput[postId]?.trim()
    if (!text || !uid) return
    setCommenting((prev) => ({ ...prev, [postId]: true }))
    const comment = await addPostComment(postId, uid, text)
    if (comment) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, comments: [...p.comments, comment], commentsCount: p.commentsCount + 1 }
            : p,
        ),
      )
      setCommentInput((prev) => ({ ...prev, [postId]: "" }))
    }
    setCommenting((prev) => ({ ...prev, [postId]: false }))
  }

  // ========== Profile drawer ==========
  const openProfile = async (userId: string) => {
    if (!userId) return
    setDrawerUserId(userId)
    setDrawerLoading(true)
    try {
      const { data: profile } = await supabase!.from("profiles").select("*").eq("id", userId).maybeSingle()
      const row = (profile || {}) as Record<string, unknown>
      const [followersRes, followingRes, { count: postsCount }, following_] = await Promise.all([
        canQuerySocialFollows()
          ? supabase!.from("social_follows").select("*", { count: "exact", head: true }).eq("following_id", userId)
          : Promise.resolve({ count: 0, error: null }),
        canQuerySocialFollows()
          ? supabase!.from("social_follows").select("*", { count: "exact", head: true }).eq("follower_id", userId)
          : Promise.resolve({ count: 0, error: null }),
        supabase!.from("social_posts").select("*", { count: "exact", head: true }).eq("user_id", userId),
        uid ? isFollowing(uid, userId) : Promise.resolve(false),
      ])
      markSocialFollowsError("count drawer followers", followersRes.error)
      markSocialFollowsError("count drawer following", followingRes.error)
      setDrawerProfile({
        id: userId,
        name: (row.full_name as string) || (row.username as string) || (row.email as string)?.split("@")[0] || "Unknown user",
        avatarUrl: (row.avatar_url as string) || null,
        username: (row.username as string) || null,
        bio: (row.bio as string) || null,
        followers: followersRes.error ? 0 : followersRes.count || 0,
        following: followingRes.error ? 0 : followingRes.count || 0,
        postsCount: postsCount || 0,
        following_,
      })
    } catch {
      toast.error("Failed to load profile")
    }
    setDrawerLoading(false)
  }

  // ========== Filtered conversations ==========
  const filtered = useMemo(() => {
    let list = conversations
    if (search) {
      list = list.filter((c) => c.otherUser.name.toLowerCase().includes(search.toLowerCase()))
    }
    if (filter === "unread") {
      list = list.filter((c) => c.unreadCount > 0)
    }
    return list
  }, [conversations, search, filter])

  // ========== Render ==========
  if (!uid) {
    return (
      <div className="min-h-screen bg-[#050508]">
        <Navbar />
        <div className="flex items-center justify-center pt-40">
          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-10 text-center backdrop-blur-xl">
            <MessageCircle className="mx-auto mb-4 text-[#4F6EF7]" size={32} />
            <p className="text-sm text-[#8E8EA3]">Please sign in to see your messages.</p>
            <Link to="/login" className="mt-4 inline-block rounded-xl bg-[#4F6EF7] px-5 py-2.5 text-sm font-semibold text-white">Sign In</Link>
          </div>
        </div>
      </div>
    )
  }

  // ========== SIDEBAR ==========
  const sidebar = (
    <div className="flex h-full flex-col">
      {/* Tabs */}
      <div className="flex border-b border-white/[0.06] shrink-0">
        {([
          { key: "conversations" as Tab, label: "Conversations", icon: MessageCircle },
          { key: "status" as Tab, label: "Status", icon: Hash },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setActiveConv(null) }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-all ${
              tab === key
                ? "text-[#4F6EF7] border-b-2 border-[#4F6EF7] bg-[#4F6EF7]/5"
                : "text-[#6B6B80] hover:text-[#F0F0F5] hover:bg-white/[0.02]"
            }`}
          >
            <Icon size={14} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {tab === "conversations" && (
        <>
          {/* Search + filters */}
          <div className="border-b border-white/[0.06] px-3 py-2 shrink-0 space-y-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A4A5A]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search conversations..."
                className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-white placeholder:text-[#4A4A5A] outline-none focus:border-[#4F6EF7]/30 transition-all"
              />
            </div>
            <div className="flex gap-1">
              {(["all", "unread"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
                    filter === f
                      ? "bg-[#4F6EF7]/15 text-[#4F6EF7]"
                      : "text-[#6B6B80] hover:bg-white/[0.04]"
                  }`}
                >
                  {f === "all" ? "All" : "Unread"}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/[0.08]">
            {convLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin text-[#4F6EF7]" />
              </div>
            ) : convError ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <AlertCircle size={28} className="text-red-400 mb-3" />
                <p className="text-sm text-[#6B6B80] mb-3">{convError}</p>
                <button
                  onClick={loadConversations}
                  className="flex items-center gap-2 rounded-xl bg-[#4F6EF7] px-4 py-2 text-xs font-medium text-white hover:bg-[#4F6EF7]/90 transition-all"
                >
                  <RefreshCw size={13} />
                    Retry
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <MessageCircle size={32} className="text-[#4A4A5A] mb-3" />
                <p className="text-sm text-[#6B6B80]">No conversations</p>
                <p className="text-xs text-[#4A4A5A] mt-1">Visit someone's profile to start one</p>
              </div>
            ) : (
              <div className="py-1">
                {filtered.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`flex w-full items-center gap-3 px-4 py-3.5 transition-all text-left ${
                      activeConv?.id === conv.id
                        ? "bg-[#4F6EF7]/10 border-l-2 border-[#4F6EF7] shadow-[inset_0_0_20px_rgba(79,110,247,0.04)]"
                        : "hover:bg-white/[0.03] border-l-2 border-transparent"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <UserAvatar user={conv.otherUser} size="md" className="ring-1 ring-white/[0.06]" />
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#0A0A0F] bg-[#22C55E]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-white truncate">{getUserDisplayName(conv.otherUser)}</p>
                        <p className="text-[10px] text-[#4A4A5A] shrink-0 ml-2">
                          {new Date(conv.lastMessageAt).toLocaleDateString("en-US", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-[#6B6B80] truncate">{conv.lastMessage || "Start a conversation"}</p>
                        {conv.unreadCount > 0 && (
                          <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#4F6EF7] px-1.5 text-[9px] font-bold text-white">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === "status" && (
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/[0.08]">
          {/* Create post input */}
          <div className="border-b border-white/[0.06] p-3">
            <div className="flex gap-3">
              <UserAvatar user={userProfile} size="md" />
              <div className="flex-1">
                <textarea
                  value={postInput}
                  onChange={(e) => setPostInput(e.target.value)}
                  placeholder="What's on your mind?"
                  rows={2}
                  className="w-full resize-none bg-transparent text-sm text-white placeholder:text-[#4A4A5A] outline-none"
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleCreatePost() } }}
                />
                {postMediaUrl && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-white/[0.04] p-2">
                    <span className="text-xs text-[#6B6B80] truncate flex-1">{postMediaUrl.split("/").pop()}</span>
                    <button onClick={() => { setPostMediaUrl(null); setPostMediaType(null) }} className="text-[#4A4A5A] hover:text-white">
                      <X size={14} />
                    </button>
                  </div>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <label className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[#4A4A5A] hover:text-[#4F6EF7] hover:bg-white/[0.06] transition-all">
                    <Camera size={15} />
                    <input type="file" accept="image/*,video/*" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const result = await uploadChatMedia(file, uid!)
                      if (result) {
                        setPostMediaUrl(result.url)
                        setPostMediaType(result.mimeType.startsWith("video") ? "video" : "image")
                      }
                      e.target.value = ""
                    }} />
                  </label>
                  <button
                    onClick={handleCreatePost}
                    disabled={!postInput.trim() || posting}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#4F6EF7] px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40 hover:bg-[#6B85FF] transition-all"
                  >
                    {posting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Publish
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Posts feed */}
          {postsLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-[#4F6EF7]" />
            </div>
          ) : postError ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <p className="text-sm text-red-400">{postError}</p>
              <button onClick={() => loadPosts("all")} className="mt-3 text-xs text-[#4F6EF7] hover:underline">Retry</button>
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <Hash size={32} className="text-[#4A4A5A] mb-3" />
              <p className="text-sm text-[#6B6B80]">No posts yet</p>
              <p className="text-xs text-[#4A4A5A] mt-1">Be the first to publish</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {posts.map((post) => (
                <div key={post.id} className="p-3 hover:bg-white/[0.01] transition-colors">
                  <div className="flex gap-3">
                    <button onClick={() => openProfile(post.userId)} className="shrink-0">
                      <UserAvatar user={post.user} size="md" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openProfile(post.userId)} className="text-sm font-semibold text-white hover:text-[#4F6EF7] transition-colors">
                          {getUserDisplayName(post.user)}
                        </button>
                        {post.user?.username && (
                          <span className="text-[11px] text-[#4A4A5A]">@{post.user.username}</span>
                        )}
                        <span className="text-[10px] text-[#4A4A5A] ml-auto">
                          {new Date(post.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-[#A0A0B5] whitespace-pre-line">{post.content}</p>
                      {post.mediaUrl && (
                        <div className="mt-2 rounded-xl overflow-hidden border border-white/[0.06] max-h-64">
                          {post.mediaType === "video" ? (
                            <video src={post.mediaUrl} controls className="w-full max-h-64 object-cover" />
                          ) : (
                            <img src={post.mediaUrl} alt="" className="w-full max-h-64 object-cover" />
                          )}
                        </div>
                      )}
                      <div className="mt-2 flex items-center gap-4">
                        <button
                          onClick={() => handleLike(post.id)}
                          className={`flex items-center gap-1.5 text-xs transition-all ${
                            post.liked ? "text-[#4F6EF7]" : "text-[#4A4A5A] hover:text-[#F0F0F5]"
                          }`}
                        >
                          <Heart size={14} className={post.liked ? "fill-[#4F6EF7]" : ""} />
                          {post.likesCount > 0 && post.likesCount}
                        </button>
                        <button
                          onClick={() => toggleComments(post.id)}
                          className="flex items-center gap-1.5 text-xs text-[#4A4A5A] hover:text-[#F0F0F5] transition-all"
                        >
                          <MessageSquare size={14} />
                          {post.commentsCount > 0 && post.commentsCount}
                        </button>
                        <button
                          onClick={() => openProfile(post.userId)}
                          className="flex items-center gap-1.5 text-xs text-[#4A4A5A] hover:text-[#F0F0F5] transition-all"
                        >
                          <ExternalLink size={14} />
                        </button>
                        {uid && post.userId !== uid && (
                          <button
                            onClick={async () => {
                              const result = await toggleFollow(uid, post.userId)
                              if (result) {
                                setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p } : p))
                              }
                            }}
                            className="ml-auto text-[10px] text-[#4F6EF7] hover:underline"
                          >
                            Follow
                          </button>
                        )}
                      </div>

                      {/* Comments */}
                      <AnimatePresence>
                        {expandedComments.has(post.id) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mt-3 space-y-2 overflow-hidden"
                          >
                            {post.comments.map((comment) => (
                              <div key={comment.id} className="flex gap-2 pl-2">
                                <UserAvatar user={comment.user} size="sm" />
                                <div className="flex-1">
                                  <span className="text-[11px] font-semibold text-white">{getUserDisplayName(comment.user)}</span>
                                  <span className="text-[11px] text-[#A0A0B5] ml-1">{comment.content}</span>
                                </div>
                              </div>
                            ))}
                            <div className="flex gap-2 pl-2">
                              <input
                                value={commentInput[post.id] || ""}
                                onChange={(e) => setCommentInput((prev) => ({ ...prev, [post.id]: e.target.value }))}
                                onKeyDown={(e) => { if (e.key === "Enter") handleComment(post.id) }}
                                placeholder="Write a comment..."
                                className="flex-1 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs text-white placeholder:text-[#4A4A5A] outline-none focus:border-[#4F6EF7]/30 transition-all"
                              />
                              <button
                                onClick={() => handleComment(post.id)}
                                disabled={!commentInput[post.id]?.trim() || commenting[post.id]}
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#4F6EF7]/10 text-[#4F6EF7] disabled:opacity-30"
                              >
                                {commenting[post.id] ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )

  // ========== EMPTY STATE (no conversation selected) ==========
  const emptyState = (
    <div className="flex h-full flex-col items-center justify-center text-center px-4">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-white/[0.06] bg-white/[0.03] mb-5">
        <MessageCircle size={32} className="text-[#4A4A5A]" />
      </div>
      <p className="text-lg font-semibold text-white mb-1">Your Messages</p>
      <p className="text-sm text-[#6B6B80] max-w-xs">
        Select a conversation to start chatting or go to Status to see community updates
      </p>
    </div>
  )

  // ========== CHAT PANEL ==========
  const chatPanel = activeConv ? (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/[0.06] bg-[#0A0A0F]/80 backdrop-blur-md px-4 py-3 shrink-0">
        <button onClick={handleBack} className="flex h-9 w-9 items-center justify-center rounded-xl text-white/50 hover:text-white hover:bg-white/[0.06] transition-all md:hidden">
          <ChevronLeft size={18} />
        </button>
        <div
          onClick={() => navigate(`/profile/${activeConv.otherUser.username || activeConv.otherUser.id}`)}
          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer hover:opacity-80 transition"
          title="View profile"
        >
          <div className="relative shrink-0">
            <UserAvatar user={activeConv.otherUser} size="md" className="ring-1 ring-white/[0.06]" />
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#0A0A0F] bg-[#22C55E]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-white truncate">{getUserDisplayName(activeConv.otherUser)}</p>
              <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
              <span className="text-[10px] text-[#22C55E]">Online</span>
            </div>
            {activeConv.otherUser.username && (
              <p className="text-[11px] text-[#4A4A5A]">@{activeConv.otherUser.username}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => openProfile(activeConv.otherUser.id)}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-white/40 hover:text-white hover:bg-white/[0.06] transition-all"
        >
          <ExternalLink size={16} />
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin scrollbar-thumb-white/[0.08] scrollbar-track-transparent">
        {msgLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={24} className="animate-spin text-[#4F6EF7]" />
          </div>
        ) : msgError ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-sm text-red-400">{msgError}</p>
            <button onClick={loadMessages} className="mt-3 text-xs text-[#4F6EF7] hover:underline">                  Retry</button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03] mb-4">
              <MessageCircle size={24} className="text-[#4F6EF7]" />
            </div>
                <p className="text-sm text-[#6B6B80]">No messages yet</p>
                <p className="text-xs text-[#4A4A5A] mt-1">Send your first message below</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.senderId === uid
            return (
              <div key={msg.id} className={`flex mb-3 ${isOwn ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    isOwn
                      ? "bg-gradient-to-br from-[#2563EB] to-[#6D28D9] text-white rounded-br-md"
                      : "bg-white/[0.06] text-[#F0F0F5] rounded-bl-md"
                  }`}
                >
                  {msg.messageType === "image" || msg.messageType === "video" ? (
                    <div>
                      {msg.mediaUrl && (
                        msg.messageType === "video"
                          ? <video src={msg.mediaUrl} controls className="max-w-full rounded-lg max-h-60" />
                          : <img src={msg.mediaUrl} alt="" className="max-w-full rounded-lg max-h-60 object-cover" />
                      )}
                      {msg.caption && <p className="mt-1 text-xs opacity-80">{msg.caption}</p>}
                    </div>
                  ) : msg.messageType === "audio" ? (
                    <audio src={msg.mediaUrl!} controls className="max-w-full h-10" />
                  ) : msg.messageType === "sticker" ? (
                    <img src={msg.mediaUrl!} alt="Sticker" className="w-24 h-24 object-contain" />
                  ) : msg.messageType === "file" && msg.mediaUrl ? (
                    <div>
                      <a
                        href={msg.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-3 rounded-xl p-3 transition-all ${
                          isOwn
                            ? "bg-white/[0.08] hover:bg-white/[0.12]"
                            : "bg-white/[0.04] hover:bg-white/[0.08]"
                        }`}
                      >
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                          isOwn ? "bg-white/[0.1]" : "bg-[#4F6EF7]/10"
                        } text-[#4F6EF7]`}>
                          {msg.mediaMimeType?.startsWith("image/") ? <ImageIcon size={20} /> :
                           msg.mediaMimeType?.startsWith("video/") ? <Film size={20} /> :
                           msg.mediaMimeType?.startsWith("audio/") ? <Music size={20} /> :
                           <FileText size={20} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{msg.fileName || msg.mediaUrl.split("/").pop()?.split("?")[0] || "File"}</p>
                          <p className="text-xs opacity-60 mt-0.5">
                            {msg.mediaMimeType?.split("/").pop()?.toUpperCase() || "FILE"}
                            {msg.mediaSize ? ` — ${msg.mediaSize < 1024 ? `${msg.mediaSize} B` : msg.mediaSize < 1024 * 1024 ? `${(msg.mediaSize / 1024).toFixed(1)} KB` : `${(msg.mediaSize / (1024 * 1024)).toFixed(1)} MB`}` : ""}
                          </p>
                        </div>
                        <Download size={16} className="shrink-0 opacity-60" />
                      </a>
                      {msg.caption && (
                        <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {msg.caption}
                        </p>
                      )}
                    </div>
                  ) : msg.content ? (
                    msg.content
                  ) : null}
                  <div className={`text-[10px] mt-1 ${isOwn ? "text-white/50 text-right" : "text-[#4A4A5A]"}`}>
                    {new Date(msg.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    {isOwn && (
                      <span className="ml-1">{msg.readAt ? "✓✓" : "✓"}</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <MessageComposer
        conversationId={activeConv.id}
        currentUserId={uid!}
        otherUserId={activeConv.participantA === uid ? activeConv.participantB : activeConv.participantA}
        otherUserName={activeConv.otherUser.name}
        onMessageSent={(msg) => setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg])}
      />
    </div>
  ) : null

  // ========== MAIN RENDER ==========
  return (
    <div className="min-h-screen bg-[#050508]">
      <FloatingOrbs />
      <Navbar />
      <div
        className="flex overflow-hidden border-t border-white/[0.06]"
        style={{ height: "100vh", paddingTop: "64px" }}
      >
        {/* Mobile: show list or chat */}
        <div className="flex w-full md:hidden">
          <AnimatePresence mode="popLayout">
            {mobileView === "list" ? (
              <motion.div
                key="list"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="w-full border-r border-white/[0.06] bg-[#0A0A0F]"
              >
                {sidebar}
              </motion.div>
            ) : (
              <motion.div
                key="chat"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                className="w-full bg-[#0A0A0F]"
              >
                {chatPanel || emptyState}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Desktop: two columns */}
        <div className="hidden md:flex w-full">
          <div className="w-[380px] border-r border-white/[0.06] bg-[#0A0A0F] flex flex-col shrink-0">
            {sidebar}
          </div>
          <div className="flex-1 bg-[#0A0A0F] flex flex-col overflow-hidden">
            {chatPanel || emptyState}
          </div>
        </div>
      </div>

      {/* Profile Drawer */}
      <AnimatePresence>
        {drawerUserId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setDrawerUserId(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md rounded-3xl border border-white/[0.08] bg-[#0A0A0F] p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {drawerLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={24} className="animate-spin text-[#4F6EF7]" />
                </div>
              ) : drawerProfile ? (
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#4F6EF7]/20 to-[#8B5CF6]/10 text-2xl font-bold text-[#4F6EF7] ring-2 ring-white/[0.08]">
                    {drawerProfile.avatarUrl ? (
                      <img src={drawerProfile.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      drawerProfile.name[0]?.toUpperCase()
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-white">{drawerProfile.name}</h2>
                  {drawerProfile.username && (
                    <p className="text-sm text-[#4A4A5A]">@{drawerProfile.username}</p>
                  )}
                  {drawerProfile.bio && (
                    <p className="mt-2 text-sm text-[#6B6B80]">{drawerProfile.bio}</p>
                  )}
                  <div className="mt-4 flex justify-center gap-6">
                    <div className="text-center">
                      <p className="text-lg font-bold text-white">{drawerProfile.postsCount}</p>
                      <p className="text-[10px] text-[#4A4A5A]">Posts</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-white">{drawerProfile.followers}</p>
                      <p className="text-[10px] text-[#4A4A5A]">Followers</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-white">{drawerProfile.following}</p>
                      <p className="text-[10px] text-[#4A4A5A]">Following</p>
                    </div>
                  </div>
                  <div className="mt-5 flex gap-3">
                    {uid && drawerProfile.id !== uid && (
                      <>
                        <FollowButton
                          currentUserId={uid}
                          targetUserId={drawerProfile.id}
                          targetUserName={drawerProfile.name}
                          initialFollowing={drawerProfile.following_}
                          onStateChange={(nowFollowing) => {
                            setDrawerProfile((prev) => prev ? { ...prev, following_: nowFollowing, followers: nowFollowing ? prev.followers + 1 : Math.max(0, prev.followers - 1) } : prev)
                          }}
                          className="flex-1"
                        />
                        <button
                          onClick={async () => {
                            const convId = await createOrGetConversation(uid, drawerProfile.id)
                            if (convId) {
                              setDrawerUserId(null)
                              const convs = await fetchConversations(uid)
                              const found = convs.find((c) => c.id === convId)
                              if (found) {
                                setActiveConv(found)
                                setMobileView("chat")
                                setTab("conversations")
                              }
                            }
                          }}
                          className="flex-1 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#6D28D9] py-2.5 text-sm font-semibold text-white"
                        >
                          Message
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-[#6B6B80]">Profile not found</div>
              )}
              <button
                onClick={() => setDrawerUserId(null)}
                className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-white/50 hover:text-white"
              >
                <X size={16} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
