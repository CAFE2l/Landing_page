import { useEffect, useState, useCallback, useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import { MessageCircle, Loader2, Search } from "lucide-react"
import PageShell from "./PageShell"
import { useAuth } from "../contexts/AuthContext"
import ChatConversation from "../components/chat/ChatConversation"
import { fetchConversations, markMessagesAsRead } from "../lib/chatService"
import type { ChatConversation as ChatConv } from "../data/feedbackStore"

export default function MessagesPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const uid = user?.id
  const [conversations, setConversations] = useState<ChatConv[]>([])
  const [loading, setLoading] = useState(true)
  const [activeConv, setActiveConv] = useState<ChatConv | null>(null)
  const [search, setSearch] = useState("")
  const [mobileView, setMobileView] = useState<"list" | "chat">("list")

  const loadConversations = useCallback(async () => {
    if (!uid) return
    setLoading(true)
    const convs = await fetchConversations(uid)
    setConversations(convs)
    setLoading(false)
  }, [uid])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  useEffect(() => {
    const convId = searchParams.get("conversationId")
    if (!convId || conversations.length === 0 || activeConv) return
    const found = conversations.find((c) => c.id === convId)
    if (found) {
      setActiveConv(found)
      setMobileView("chat")
      markMessagesAsRead(found.id)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, conversations, activeConv, setSearchParams])

  const handleSelectConversation = async (conv: ChatConv) => {
    setActiveConv(conv)
    setMobileView("chat")
    await markMessagesAsRead(conv.id)
  }

  const handleBack = () => {
    setActiveConv(null)
    setMobileView("list")
    loadConversations()
  }

  const filtered = useMemo(
    () => conversations.filter((c) =>
      c.otherUser.name.toLowerCase().includes(search.toLowerCase()),
    ),
    [conversations, search],
  )

  if (!uid) {
    return (
      <PageShell eyebrow="Messages" title="Private Messages" subtitle="Sign in to view your messages.">
        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-10 text-center backdrop-blur-xl">
          <MessageCircle className="mx-auto mb-4 text-[#4F6EF7]" size={32} />
          <p className="text-sm text-[#8E8EA3]">Please sign in to see your messages.</p>
        </div>
      </PageShell>
    )
  }

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-white/[0.06]">
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
    </div>
  )

  const emptyState = (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03] mb-4">
        <MessageCircle size={28} className="text-[#4A4A5A]" />
      </div>
      <p className="text-base font-semibold text-white mb-1">Your Messages</p>
      <p className="text-sm text-[#6B6B80]">Select a conversation to start chatting</p>
    </div>
  )

  const chatPanel = activeConv ? (
    <ChatConversation
      conversation={activeConv}
      currentUserId={uid}
      onBack={handleBack}
    />
  ) : emptyState

  return (
    <PageShell
      eyebrow="Messages"
      title="Private Messages"
      subtitle="Your direct conversations with CAFÉ Services clients."
    >
      {/* Mobile: list or chat */}
      <div className="md:hidden rounded-3xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl overflow-hidden" style={{ height: "68vh" }}>
        {mobileView === "list" ? (
          <div className="flex flex-col h-full">
            <div className="px-4 py-3 border-b border-white/[0.06] shrink-0">
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
                <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-[#4F6EF7]" /></div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                  <MessageCircle size={32} className="text-[#4A4A5A] mb-3" />
                  <p className="text-sm text-[#6B6B80]">No conversations yet</p>
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
                        <p className="text-sm font-medium text-white truncate">{conv.otherUser.name}</p>
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
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {chatPanel}
          </div>
        )}
      </div>

      {/* Desktop: two-column layout */}
      <div className="hidden md:flex rounded-3xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl overflow-hidden" style={{ height: "68vh" }}>
        <div className="w-80 border-r border-white/[0.06] flex flex-col shrink-0">
          {sidebar}
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          {chatPanel}
        </div>
      </div>
    </PageShell>
  )
}
