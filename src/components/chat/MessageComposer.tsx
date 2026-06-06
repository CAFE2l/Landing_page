import { useRef, useState } from "react"
import { AnimatePresence } from "framer-motion"
import { FileIcon, Image, Loader2, Mic, Send, Smile, Sticker } from "lucide-react"
import EmojiPicker from "./EmojiPicker"
import StickerPanel from "./StickerPanel"
import MediaPreviewModal from "./MediaPreviewModal"
import AudioRecorder from "./AudioRecorder"
import {
  getMediaType,
  sendMessage,
  uploadAudio,
  uploadChatMedia,
  validateMediaFile,
} from "../../lib/chatService"
import type { ChatMessage } from "../../data/feedbackStore"
import toast from "react-hot-toast"

interface MessageComposerProps {
  conversationId: string
  currentUserId: string
  otherUserId: string
  otherUserName: string
  onMessageSent: (message: ChatMessage) => void
}

export default function MessageComposer({
  conversationId,
  currentUserId,
  otherUserId,
  otherUserName,
  onMessageSent,
}: MessageComposerProps) {
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [sendingMedia, setSendingMedia] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showStickers, setShowStickers] = useState(false)
  const [showAudioRecorder, setShowAudioRecorder] = useState(false)
  const [pendingMedia, setPendingMedia] = useState<File | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const mediaFileRef = useRef<HTMLInputElement>(null)
  const docFileRef = useRef<HTMLInputElement>(null)

  const addMessage = (message: ChatMessage | null) => {
    if (message) onMessageSent(message)
  }

  const closePanels = () => {
    setShowEmoji(false)
    setShowStickers(false)
    setShowAudioRecorder(false)
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return

    setSending(true)
    const msg = await sendMessage(conversationId, currentUserId, otherUserId, text)
    setSending(false)

    if (msg) {
      addMessage(msg)
      setInput("")
      closePanels()
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      if (pendingMedia) return
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
    const msg = await sendMessage(conversationId, currentUserId, otherUserId, "", "sticker", stickerUrl)
    setSending(false)
    addMessage(msg)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const validation = validateMediaFile(file)
    if (!validation.valid) {
      toast.error(validation.error || "Invalid file")
      if (mediaFileRef.current) mediaFileRef.current.value = ""
      return
    }

    setPendingMedia(file)
    if (mediaFileRef.current) mediaFileRef.current.value = ""
  }

  const handleDocSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const validation = validateMediaFile(file)
    if (!validation.valid) {
      toast.error(validation.error || "Invalid file")
      if (docFileRef.current) docFileRef.current.value = ""
      return
    }

    setPendingMedia(file)
    if (docFileRef.current) docFileRef.current.value = ""
  }

  const getDuration = async (file: File, mediaType: "video" | "audio") => {
    const el = mediaType === "video" ? document.createElement("video") : document.createElement("audio")
    el.preload = "metadata"
    el.src = URL.createObjectURL(file)
    await new Promise((resolve) => {
      el.onloadedmetadata = resolve
      el.onerror = resolve
    })
    const duration = Number.isFinite(el.duration) ? el.duration : undefined
    URL.revokeObjectURL(el.src)
    return duration
  }

  const handleMediaSend = async (caption: string) => {
    if (!pendingMedia || sendingMedia) return

    const mediaType = getMediaType(pendingMedia)
    if (!mediaType) {
      toast.error("Unsupported media type")
      setPendingMedia(null)
      return
    }

    setSendingMedia(true)
    const result = await uploadChatMedia(pendingMedia, currentUserId)
    if (!result) {
      setSendingMedia(false)
      return
    }

    if (mediaType === "video" || mediaType === "audio") {
      const duration = await getDuration(pendingMedia, mediaType)
      const msg = await sendMessage(
        conversationId,
        currentUserId,
        otherUserId,
        "",
        mediaType,
        result.url,
        caption || undefined,
        result.mimeType,
        result.size,
        duration,
        pendingMedia.name,
      )
      setSendingMedia(false)
      setPendingMedia(null)
      addMessage(msg)
    } else {
      const msg = await sendMessage(
        conversationId,
        currentUserId,
        otherUserId,
        "",
        mediaType,
        result.url,
        caption || undefined,
        result.mimeType,
        result.size,
        undefined,
        pendingMedia.name,
      )
      setSendingMedia(false)
      setPendingMedia(null)
      addMessage(msg)
    }
  }

  const handleAudioSend = async (blob: Blob, duration: number) => {
    if (sending) return
    setSending(true)
    setShowAudioRecorder(false)

    const result = await uploadAudio(blob, currentUserId, conversationId)
    if (!result) {
      setSending(false)
      return
    }

    const msg = await sendMessage(
      conversationId,
      currentUserId,
      otherUserId,
      "",
      "audio",
      result.url,
      undefined,
      result.mimeType,
      result.size,
      duration,
    )
    setSending(false)
    addMessage(msg)
  }

  return (
    <div className="border-t border-white/[0.06] bg-[#0A0A0F]/90 px-3 py-3 backdrop-blur-md shrink-0 sm:px-4">
      <AnimatePresence>
        {showAudioRecorder && (
          <div className="mb-2">
            <AudioRecorder onSend={handleAudioSend} onCancel={() => setShowAudioRecorder(false)} />
          </div>
        )}
      </AnimatePresence>

      <div className="flex items-end gap-2">
        <div className="relative flex-1 min-w-0">
          {showEmoji && <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmoji(false)} />}
          {showStickers && <StickerPanel onSelect={handleStickerSelect} onClose={() => setShowStickers(false)} />}
          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${otherUserName}...`}
            rows={1}
            className="w-full min-h-[42px] max-h-[120px] resize-none rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 pr-36 text-sm text-white outline-none transition-all placeholder:text-[#4A4A5A] focus:border-[#4F6EF7]/40"
          />
          <div className="absolute bottom-1.5 right-2 flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => { closePanels(); mediaFileRef.current?.click() }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#4A4A5A] transition-all hover:bg-white/[0.06] hover:text-[#4F6EF7]"
              title="Attach image or video"
            >
              <Image size={16} />
            </button>
            <input
              ref={mediaFileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime,audio/webm,audio/mp4,audio/ogg,audio/wav"
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              type="button"
              onClick={() => { closePanels(); docFileRef.current?.click() }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#4A4A5A] transition-all hover:bg-white/[0.06] hover:text-[#4F6EF7]"
              title="Attach file"
            >
              <FileIcon size={16} />
            </button>
            <input
              ref={docFileRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.gz,.json,.csv,.txt"
              className="hidden"
              onChange={handleDocSelect}
            />
            <button
              type="button"
              onClick={() => { setShowStickers(!showStickers); setShowEmoji(false); setShowAudioRecorder(false) }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#4A4A5A] transition-all hover:bg-white/[0.06] hover:text-[#4F6EF7]"
              title="Sticker"
            >
              <Sticker size={16} />
            </button>
            <button
              type="button"
              onClick={() => { setShowEmoji(!showEmoji); setShowStickers(false); setShowAudioRecorder(false) }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#4A4A5A] transition-all hover:bg-white/[0.06] hover:text-[#4F6EF7]"
              title="Emoji"
            >
              <Smile size={16} />
            </button>
            <button
              type="button"
              onClick={() => { setShowAudioRecorder(!showAudioRecorder); setShowEmoji(false); setShowStickers(false) }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#4A4A5A] transition-all hover:bg-white/[0.06] hover:text-[#4F6EF7]"
              title="Record audio"
            >
              <Mic size={16} />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSend}
          disabled={sending || !input.trim() || !!pendingMedia}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563EB] to-[#6D28D9] text-white transition-all hover:shadow-[0_0_16px_rgba(37,99,235,0.3)] disabled:cursor-not-allowed disabled:opacity-40"
          title="Send"
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>

      {pendingMedia && (
        <MediaPreviewModal
          file={pendingMedia}
          onSend={handleMediaSend}
          onCancel={() => setPendingMedia(null)}
          sending={sendingMedia}
        />
      )}
    </div>
  )
}
