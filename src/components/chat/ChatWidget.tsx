import { useState, useEffect, useCallback, useRef } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { MessageCircle, X, Minus, Maximize2, Loader2, Search } from "lucide-react"
import { useAuth } from "../../contexts/AuthContext"
import { fetchConversations, markMessagesAsRead, subscribeToConversationUpdates } from "../../lib/chatService"
import { useChatStore } from "../../lib/store/chatStore"
import ChatConversation from "./ChatConversation"
import type { ChatConversation as ChatConv } from "../../data/feedbackStore"

type ViewState = "closed" | "compact" | "expanded"

export default function ChatWidget() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [view, setView] = useState<ViewState>("closed")
  const [conversations, setConversations] = useState<ChatConv[]>([])
  const [loading, setLoading] = useState(false)
  const [activeConv, setActiveConv] = useState<ChatConv | null>(null)
  const [search, setSearch] = useState("")
  const [totalUnread, setTotalUnread] = useState(0)
  const openWithTarget = useChatStore((s) => s.openWithTarget)

  const uid = user?.id
  const loadTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMessagesPage = location.pathname.startsWith("/dashboard/messages")

  const load = useCallback(async () => {
    if (!uid) return
    setLoading(true)
    const convs = await fetchConversations(uid)
    setConversations(convs)
    setTotalUnread(convs.reduce((s, c) => s + c.unreadCount, 0))
    setLoading(false)
  }, [uid])

  const debouncedLoad = useCallback(() => {
    if (loadTimer.current) clearTimeout(loadTimer.current)
    loadTimer.current = setTimeout(load, 300)
  }, [load])

  useEffect(() => {
    if (view !== "closed") load()
  }, [view, load])

  useEffect(() => {
    return () => {
      if (loadTimer.current) clearTimeout(loadTimer.current)
    }
  }, [])

  useEffect(() => {
    if (!uid) return
    const cleanup = subscribeToConversationUpdates(uid, debouncedLoad)
    return cleanup
  }, [uid, debouncedLoad])

  useEffect(() => {
    if (!uid || !openWithTarget) return

    if (isMessagesPage) {
      useChatStore.getState().clearOpenWithTarget()
      navigate(`/messages?conversationId=${openWithTarget.conversationId}`, { replace: true })
    } else {
      setView("compact")
      const virtualConv: ChatConv = {
        id: openWithTarget.conversationId,
        participantA: uid,
        participantB: openWithTarget.otherUserId,
        lastMessage: null,
        lastMessageAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        otherUser: {
          id: openWithTarget.otherUserId,
          name: openWithTarget.otherUserName,
          avatarUrl: openWithTarget.otherUserAvatar,
          username: null,
        },
        unreadCount: 0,
      }
      setActiveConv(virtualConv)
      useChatStore.getState().clearOpenWithTarget()
    }
  }, [openWithTarget, uid, isMessagesPage, navigate])

  const filtered = conversations.filter((c) =>
    c.otherUser.name.toLowerCase().includes(search.toLowerCase()),
  )

  const handleSelectConversation = async (conv: ChatConv) => {
    if (isMessagesPage) {
      navigate(`/messages?conversationId=${conv.id}`, { replace: true })
      setView("closed")
      setActiveConv(null)
    } else {
      setActiveConv(conv)
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conv.id ? { ...c, unreadCount: 0 } : c,
        ),
      )
      await markMessagesAsRead(conv.id)
    }
  }

  if (!uid) return null

  return (
    <>
      <button
        onClick={() => setView(view === "closed" ? "compact" : "closed")}
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#6D28D9] text-white shadow-[0_4px_24px_rgba(37,99,235,0.35)] hover:shadow-[0_4px_32px_rgba(37,99,235,0.5)] transition-all duration-300 hover:scale-105"
      >
        {view === "closed" ? (
          <>
            <MessageCircle size={24} />
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white shadow-lg">
                {totalUnread > 9 ? "9+" : totalUnread}
              </span>
            )}
          </>
        ) : (
          <X size={20} />
        )}
      </button>

      <AnimatePresence>
        {view === "compact" && !isMessagesPage && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-24 right-5 z-40 w-[380px] h-[560px] max-h-[calc(100vh-140px)] rounded-2xl border border-white/[0.08] bg-[#0A0A0F] shadow-2xl shadow-black/60 overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#0A0A0F]/80 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#4F6EF7]/10 text-[#4F6EF7]">
                  <MessageCircle size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Messages</p>
                  {totalUnread > 0 && (
                    <p className="text-[10px] text-[#4F6EF7]">{totalUnread} unread</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setView("expanded")}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-all"
                >
                  <Maximize2 size={14} />
                </button>
                <button
                  onClick={() => { setView("closed"); setActiveConv(null) }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-all"
                >
                  <Minus size={14} />
                </button>
              </div>
            </div>

            {activeConv ? (
              <div className="flex-1 overflow-hidden">
                <ChatConversation
                  conversation={activeConv}
                  currentUserId={uid}
                  onBack={() => setActiveConv(null)}
                />
              </div>
            ) : (
              <>
                <div className="px-4 py-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A4A5A]" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search conversations..."
                      className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-white placeholder:text-[#4A4A5A] outline-none focus:border-[#4F6EF7]/30 transition-all"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/[0.08]">
                  {loading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 size={24} className="animate-spin text-[#4F6EF7]" />
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                      <MessageCircle size={32} className="text-[#4A4A5A] mb-3" />
                      <p className="text-sm text-[#6B6B80]">No conversations yet</p>
                      <p className="text-xs text-[#4A4A5A] mt-1">Start by visiting someone's profile</p>
                    </div>
                  ) : (
                    <div className="py-1">
                      {filtered.map((conv) => (
                        <button
                          key={conv.id}
                          onClick={() => handleSelectConversation(conv)}
                          className="flex w-full items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors text-left"
                        >
                          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#4F6EF7]/10 text-sm font-bold text-[#4F6EF7]">
                            {conv.otherUser.avatarUrl ? (
                              <img src={conv.otherUser.avatarUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              conv.otherUser.name[0]?.toUpperCase() || "U"
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-white truncate">{conv.otherUser.name}</p>
                              <p className="text-[10px] text-[#4A4A5A] shrink-0 ml-2">
                                {new Date(conv.lastMessageAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </p>
                            </div>
                            <div className="flex items-center justify-between mt-0.5">
                              <p className="text-xs text-[#6B6B80] truncate">{conv.lastMessage || "Start the conversation"}</p>
                              {conv.unreadCount > 0 && (
                                <span className="ml-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#4F6EF7] px-1 text-[9px] font-bold text-white">
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
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {view === "expanded" && !isMessagesPage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => { setView("closed"); setActiveConv(null) }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full max-w-5xl h-[85vh] rounded-2xl border border-white/[0.08] bg-[#0A0A0F] shadow-2xl shadow-black/60 overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] bg-[#0A0A0F]/80 backdrop-blur-md shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#4F6EF7]/10 text-[#4F6EF7]">
                    <MessageCircle size={18} />
                  </div>
                  <p className="text-base font-semibold text-white">Messages</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setView("compact"); setActiveConv(null) }}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-all"
                  >
                    <Minus size={16} />
                  </button>
                  <button
                    onClick={() => { setView("closed"); setActiveConv(null) }}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="flex flex-1 overflow-hidden">
                <div className="w-80 border-r border-white/[0.06] flex flex-col shrink-0 hidden md:flex">
                  <div className="px-4 py-3">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A4A5A]" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search..."
                        className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-white placeholder:text-[#4A4A5A] outline-none focus:border-[#4F6EF7]/30 transition-all"
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto scrollbar-thin">
                    {loading ? (
                      <div className="flex items-center justify-center py-16">
                        <Loader2 size={20} className="animate-spin text-[#4F6EF7]" />
                      </div>
                    ) : filtered.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                        <MessageCircle size={28} className="text-[#4A4A5A] mb-2" />
                        <p className="text-xs text-[#6B6B80]">No conversations</p>
                      </div>
                    ) : (
                      filtered.map((conv) => (
                        <button
                          key={conv.id}
                          onClick={() => handleSelectConversation(conv)}
                          className={`flex w-full items-center gap-3 px-4 py-3 transition-colors text-left ${
                            activeConv?.id === conv.id
                              ? "bg-[#4F6EF7]/8 border-l-2 border-[#4F6EF7]"
                              : "hover:bg-white/[0.03] border-l-2 border-transparent"
                          }`}
                        >
                          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#4F6EF7]/10 text-sm font-bold text-[#4F6EF7]">
                            {conv.otherUser.avatarUrl ? (
                              <img src={conv.otherUser.avatarUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              conv.otherUser.name[0]?.toUpperCase() || "U"
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-white truncate">{conv.otherUser.name}</p>
                              <p className="text-[10px] text-[#4A4A5A] shrink-0 ml-2">
                                {new Date(conv.lastMessageAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </p>
                            </div>
                            <p className="text-xs text-[#6B6B80] truncate mt-0.5">{conv.lastMessage || "Start the conversation"}</p>
                          </div>
                          {conv.unreadCount > 0 && (
                            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#4F6EF7] px-1 text-[9px] font-bold text-white">
                              {conv.unreadCount}
                            </span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex-1 flex flex-col overflow-hidden">
                  {activeConv ? (
                    <ChatConversation conversation={activeConv} currentUserId={uid} />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03] mb-4">
                        <MessageCircle size={28} className="text-[#4A4A5A]" />
                      </div>
                      <p className="text-base font-semibold text-white mb-1">Your Messages</p>
                      <p className="text-sm text-[#6B6B80]">Select a conversation to start chatting</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
