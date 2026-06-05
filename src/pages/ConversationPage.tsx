import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { ArrowLeft, MessageCircle, Loader2 } from "lucide-react"
import PageShell from "./PageShell"
import { useAuth } from "../contexts/AuthContext"
import ChatConversation from "../components/chat/ChatConversation"
import { fetchConversations } from "../lib/chatService"
import type { ChatConversation as ChatConv } from "../data/feedbackStore"

export default function ConversationPage() {
  const { conversationId } = useParams()
  const { user } = useAuth()
  const uid = user?.id
  const [conversation, setConversation] = useState<ChatConv | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid || !conversationId) return
    fetchConversations(uid).then((convs) => {
      const found = convs.find((c) => c.id === conversationId)
      setConversation(found || null)
      setLoading(false)
    })
  }, [uid, conversationId])

  if (!uid) {
    return (
      <PageShell eyebrow="Messages" title="Conversation" subtitle="Sign in to view messages.">
        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-10 text-center backdrop-blur-xl">
          <p className="text-sm text-[#8E8EA3]">Please sign in.</p>
        </div>
      </PageShell>
    )
  }

  if (loading) {
    return (
      <PageShell eyebrow="Messages" title="Conversation" subtitle="Loading...">
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-[#4F6EF7]" />
        </div>
      </PageShell>
    )
  }

  if (!conversation) {
    return (
      <PageShell eyebrow="Messages" title="Conversation" subtitle="This conversation doesn't exist.">
        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-10 text-center backdrop-blur-xl">
          <MessageCircle className="mx-auto mb-4 text-[#4A4A5A]" size={32} />
          <p className="text-sm text-[#8E8EA3] mb-4">Conversation not found.</p>
          <Link to="/dashboard/messages" className="text-sm text-[#4F6EF7] hover:underline">
            Back to messages
          </Link>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell
      eyebrow="Messages"
      title={conversation.otherUser.name}
      subtitle="Private conversation"
    >
      <div className="flex items-center gap-3 mb-4">
        <Link
          to="/dashboard/messages"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.06] transition-all"
        >
          <ArrowLeft size={16} />
        </Link>
        <p className="text-sm text-[#6B6B80]">Back to all conversations</p>
      </div>
      <div className="h-[68vh] rounded-3xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl overflow-hidden">
        <ChatConversation
          conversation={conversation}
          currentUserId={uid}
        />
      </div>
    </PageShell>
  )
}
