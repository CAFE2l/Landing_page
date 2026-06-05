import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { MessageCircle, Loader2 } from "lucide-react"
import PageShell from "./PageShell"
import { useAuth } from "../contexts/AuthContext"
import ChatConversation from "../components/chat/ChatConversation"
import { fetchConversations } from "../lib/chatService"
import type { ChatConversation as ChatConv } from "../data/feedbackStore"

export default function MessagesPage() {
  const { user } = useAuth()
  const uid = user?.id
  const [conversations, setConversations] = useState<ChatConv[]>([])
  const [loading, setLoading] = useState(true)
  const [activeConv, setActiveConv] = useState<ChatConv | null>(null)

  useEffect(() => {
    if (!uid) return
    fetchConversations(uid)
      .then(setConversations)
      .finally(() => setLoading(false))
  }, [uid])

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

  if (activeConv) {
    return (
      <PageShell eyebrow="Messages" title={activeConv.otherUser.name} subtitle="Private conversation">
        <div className="h-[68vh] rounded-3xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl overflow-hidden">
          <ChatConversation
            conversation={activeConv}
            currentUserId={uid}
            onBack={() => setActiveConv(null)}
          />
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell
      eyebrow="Messages"
      title="Private Messages"
      subtitle="Your direct conversations with CAFÉ Services clients."
    >
      <div className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-3 backdrop-blur-xl">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-[#4F6EF7]" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-10 text-center">
            <MessageCircle className="mx-auto mb-4 text-[#4F6EF7]" size={32} />
            <p className="text-sm text-[#8E8EA3]">No private messages yet.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((conv, index) => (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <button
                  onClick={() => setActiveConv(conv)}
                  className="flex w-full items-center gap-4 rounded-2xl border border-white/[0.06] bg-black/20 p-4 transition-all hover:border-[#4F6EF7]/25 hover:bg-white/[0.04] text-left"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#4F6EF7]/10 text-sm font-bold text-[#8EA0FF]">
                    {conv.otherUser.avatarUrl ? (
                      <img src={conv.otherUser.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      conv.otherUser.name[0]?.toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-white">{conv.otherUser.name}</p>
                      <p className="text-xs text-[#6B6B80]">
                        {new Date(conv.lastMessageAt).toLocaleDateString("en-US")}
                      </p>
                    </div>
                    <p className="truncate text-sm text-[#8E8EA3] mt-0.5">
                      {conv.lastMessage || "Start the conversation"}
                    </p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                      {conv.unreadCount}
                    </span>
                  )}
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  )
}
