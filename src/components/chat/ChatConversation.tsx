import { useState, useRef, useEffect, useCallback } from "react"
import { Loader2 } from "lucide-react"
import ChatMessageBubble from "./ChatMessageBubble"
import MessageComposer from "./MessageComposer"
import { fetchMessages, markMessagesAsRead, subscribeToMessages } from "../../lib/chatService"
import type { ChatMessage, ChatConversation } from "../../data/feedbackStore"

interface ChatConversationProps {
  conversation: ChatConversation
  currentUserId: string
  onBack?: () => void
}

export default function ChatConversation({ conversation, currentUserId, onBack }: ChatConversationProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [currentlyPlayingAudio, setCurrentlyPlayingAudio] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const messagesRef = useRef<HTMLDivElement>(null)

  const otherUserId = conversation.participantA === currentUserId
    ? conversation.participantB
    : conversation.participantA

  const loadMessages = useCallback(async () => {
    setLoading(true)
    const msgs = await fetchMessages(conversation.id)
    setMessages(msgs)
    setLoading(false)
    await markMessagesAsRead(conversation.id)
  }, [conversation.id])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  useEffect(() => {
    const cleanup = subscribeToMessages(
      conversation.id,
      (msg) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev
          return [...prev, msg]
        })
        if (msg.senderId !== currentUserId) {
          markMessagesAsRead(conversation.id)
        }
      },
      (msgId) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, readAt: new Date().toISOString() } : m)),
        )
      },
    )
    return cleanup
  }, [conversation.id, currentUserId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  const handlePlayAudio = (msgId: string) => {
    setCurrentlyPlayingAudio((prev) => prev === msgId ? null : msgId)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] bg-[#0A0A0F]/80 backdrop-blur-md shrink-0">
        {onBack && (
          <button onClick={onBack} className="flex h-8 w-8 items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-all md:hidden">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
        )}
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#4F6EF7]/10 text-sm font-bold text-[#4F6EF7]">
          {conversation.otherUser.avatarUrl ? (
            <img src={conversation.otherUser.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            conversation.otherUser.name[0]?.toUpperCase() || "U"
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white truncate">
            {conversation.otherUser.name}
          </p>
          <p className="text-[11px] text-[#6B6B80] truncate">
            {conversation.otherUser.username
              ? `@${conversation.otherUser.username}`
              : "User"}
          </p>
        </div>
      </div>

      <div
        ref={messagesRef}
        className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin scrollbar-thumb-white/[0.08] scrollbar-track-transparent"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={24} className="animate-spin text-[#4F6EF7]" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03] mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#4F6EF7]"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <p className="text-sm text-[#6B6B80]">Start a conversation</p>
            <p className="text-xs text-[#4A4A5A] mt-1">Send your first message below</p>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.senderId === currentUserId}
              onImageClick={() => {}}
              currentlyPlayingAudio={currentlyPlayingAudio}
              onPlayAudio={handlePlayAudio}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <MessageComposer
        conversationId={conversation.id}
        currentUserId={currentUserId}
        otherUserId={otherUserId}
        otherUserName={conversation.otherUser.name}
        onMessageSent={(msg) => setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg])}
      />
    </div>
  )
}
