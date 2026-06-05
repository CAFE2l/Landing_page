import { useState, useRef, useEffect, useCallback } from "react"
import { Send, Smile, Sticker, Image, X, Loader2 } from "lucide-react"
import ChatMessageBubble from "./ChatMessageBubble"
import EmojiPicker from "./EmojiPicker"
import StickerPanel from "./StickerPanel"
import { fetchMessages, sendMessage, markMessagesAsRead, subscribeToMessages, uploadChatImage } from "../../lib/chatService"
import type { ChatMessage, ChatConversation } from "../../data/feedbackStore"
import toast from "react-hot-toast"

interface ChatConversationProps {
  conversation: ChatConversation
  currentUserId: string
  onBack?: () => void
}

export default function ChatConversation({ conversation, currentUserId, onBack }: ChatConversationProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showStickers, setShowStickers] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const messagesRef = useRef<HTMLDivElement>(null)

  const otherUserId = conversation.participantA === currentUserId
    ? conversation.participantB
    : conversation.participantA

  const loadMessages = useCallback(async () => {
    setLoading(true)
    const msgs = await fetchMessages(conversation.id)
    setMessages(msgs)
    setLoading(false)
    await markMessagesAsRead(conversation.id, currentUserId)
  }, [conversation.id, currentUserId])

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
      },
      (msgId) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, readAt: new Date().toISOString() } : m)),
        )
      },
    )
    return cleanup
  }, [conversation.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  const handleSend = async () => {
    const text = input.trim()
    if (!text && !uploadingImage) return
    if (sending) return

    setSending(true)
    const msg = await sendMessage(conversation.id, currentUserId, otherUserId, text)
    setSending(false)

    if (msg) {
      setMessages((prev) => [...prev, msg])
      setInput("")
      setShowEmoji(false)
      setShowStickers(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleEmojiSelect = (emoji: string) => {
    setInput((prev) => prev + emoji)
    inputRef.current?.focus()
  }

  const handleStickerSelect = async (stickerUrl: string) => {
    setShowStickers(false)
    setSending(true)
    const msg = await sendMessage(conversation.id, currentUserId, otherUserId, "", "sticker", stickerUrl)
    setSending(false)
    if (msg) {
      setMessages((prev) => [...prev, msg])
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif"]
    if (!ALLOWED.includes(file.type)) {
      toast.error("Only PNG, JPG, WEBP, and GIF images are allowed")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB")
      return
    }

    setUploadingImage(true)
    const url = await uploadChatImage(file, currentUserId)
    setUploadingImage(false)

    if (url) {
      setSending(true)
      const msg = await sendMessage(conversation.id, currentUserId, otherUserId, "", "image", url)
      setSending(false)
      if (msg) {
        setMessages((prev) => [...prev, msg])
      }
    }

    if (fileRef.current) fileRef.current.value = ""
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
              onImageClick={(url) => setLightboxUrl(url)}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-white/[0.06] bg-[#0A0A0F]/80 backdrop-blur-md px-4 py-3 shrink-0">
        <div className="flex items-end gap-2">
          <div className="relative flex-1">
            {showEmoji && (
              <EmojiPicker
                onSelect={handleEmojiSelect}
                onClose={() => setShowEmoji(false)}
              />
            )}
            {showStickers && (
              <StickerPanel
                onSelect={handleStickerSelect}
                onClose={() => setShowStickers(false)}
              />
            )}
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${conversation.otherUser.name}...`}
              rows={1}
              className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 pr-20 text-sm text-white placeholder:text-[#4A4A5A] outline-none focus:border-[#4F6EF7]/40 transition-all min-h-[40px] max-h-[120px]"
            />
            <div className="absolute right-2 bottom-1.5 flex items-center gap-0.5">
              <button
                onClick={() => { setShowEmoji(false); setShowStickers(false); fileRef.current?.click() }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#4A4A5A] hover:text-[#4F6EF7] hover:bg-white/[0.06] transition-all"
              >
                {uploadingImage ? <Loader2 size={16} className="animate-spin" /> : <Image size={16} />}
              </button>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={handleImageUpload} />
              <button
                onClick={() => { setShowEmoji(!showEmoji); setShowStickers(false) }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#4A4A5A] hover:text-[#4F6EF7] hover:bg-white/[0.06] transition-all"
              >
                <Smile size={16} />
              </button>
              <button
                onClick={() => { setShowStickers(!showStickers); setShowEmoji(false) }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#4A4A5A] hover:text-[#4F6EF7] hover:bg-white/[0.06] transition-all"
              >
                <Sticker size={16} />
              </button>
            </div>
          </div>
          <button
            onClick={handleSend}
            disabled={sending || (!input.trim() && !uploadingImage)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563EB] to-[#6D28D9] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_16px_rgba(37,99,235,0.3)] transition-all"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>

      {lightboxUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setLightboxUrl(null)}>
          <button onClick={() => setLightboxUrl(null)} className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors">
            <X size={20} />
          </button>
          <img src={lightboxUrl} alt="Preview" className="max-h-[85vh] max-w-[90vw] object-contain rounded-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}
