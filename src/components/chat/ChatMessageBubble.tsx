import { useState } from "react"
import { motion } from "framer-motion"
import { Check, CheckCheck, Loader2, Play, X, FileText, Film, ImageIcon, Music, Download, CornerUpLeft, Pencil, Trash2 } from "lucide-react"
import AudioPlayer from "./AudioPlayer"
import BotNotificationCard, { parseBotNotification } from "./BotNotificationCard"
import type { ChatMessage } from "../../data/feedbackStore"

interface ChatMessageBubbleProps {
  message: ChatMessage
  isOwn: boolean
  onImageClick?: (url: string) => void
  currentlyPlayingAudio?: string | null
  onPlayAudio?: (msgId: string) => void
  onReply?: (messageId: string) => void
  onEdit?: (message: ChatMessage) => void
  onDelete?: (messageId: string) => void
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return <FileText size={20} />
  if (mimeType.startsWith("image/")) return <ImageIcon size={20} />
  if (mimeType.startsWith("video/")) return <Film size={20} />
  if (mimeType.startsWith("audio/")) return <Music size={20} />
  return <FileText size={20} />
}

export default function ChatMessageBubble({ message, isOwn, onImageClick, currentlyPlayingAudio, onPlayAudio, onReply, onEdit, onDelete }: ChatMessageBubbleProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [showActions, setShowActions] = useState(false)
  const botPayload = !isOwn ? parseBotNotification(message.content || "") : null

  if (botPayload) {
    return <BotNotificationCard payload={botPayload} timestamp={message.createdAt} />
  }

  const time = (
    <span className={`text-[10px] ${isOwn ? "text-blue-200/70" : "text-[#6B6B80]"}`}>
      {new Date(message.createdAt).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })}
    </span>
  )

  let statusIcon = null
  if (isOwn) {
    if (!message.deliveredAt) {
      statusIcon = <Loader2 size={10} className="animate-spin text-blue-200/60" />
    } else if (!message.readAt) {
      statusIcon = <Check size={12} className="text-blue-200/60" />
    } else {
      statusIcon = <CheckCheck size={12} className="text-blue-300" />
    }
  }

  const fileName = message.fileName || message.mediaUrl?.split("/").pop()?.split("?")[0] || "File"

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={`group flex ${isOwn ? "justify-end" : "justify-start"} mb-2`}
        onClick={() => setShowActions((prev) => !prev)}
      >
        <div
          className={`relative max-w-[90%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 ${
            isOwn
              ? "bg-gradient-to-br from-[#2563EB] to-[#6D28D9] text-white shadow-[0_2px_12px_rgba(37,99,235,0.25)] rounded-br-md"
              : "bg-white/[0.06] text-[#F0F0F5] border border-white/[0.06] rounded-bl-md"
          }`}
        >
          {message.messageType === "video" && message.mediaUrl ? (
            <div className="mb-1.5">
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxUrl(message.mediaUrl!) }}
                className="relative block rounded-lg overflow-hidden border border-white/[0.08] hover:opacity-90 transition-opacity"
              >
                <video
                  src={message.mediaUrl}
                  preload="metadata"
                  playsInline
                  className="w-full max-h-80 object-cover rounded-lg"
                >
                  <track kind="captions" />
                </video>
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
                    <Play size={20} className="text-white ml-0.5" />
                  </div>
                </div>
              </button>
              {message.caption && (
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words mt-1.5">
                  {message.caption}
                </p>
              )}
            </div>
          ) : message.messageType === "audio" && message.mediaUrl ? (
            <div className={isOwn ? "" : ""}>
              <AudioPlayer
                src={message.mediaUrl}
                duration={message.mediaDuration}
                isOwn={isOwn}
                isPlaying={currentlyPlayingAudio === message.id}
                onPlay={() => onPlayAudio?.(message.id)}
              />
            </div>
          ) : message.messageType === "image" && message.mediaUrl ? (
            <div className="mb-1.5">
              <button
                onClick={(e) => { e.stopPropagation(); onImageClick?.(message.mediaUrl!) }}
                className="block rounded-lg overflow-hidden border border-white/[0.08] hover:opacity-90 transition-opacity"
              >
                <img
                  src={message.mediaUrl}
                  alt="Shared image"
                  className="w-full max-h-80 object-cover rounded-lg"
                  loading="lazy"
                />
              </button>
              {message.caption && (
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words mt-1.5">
                  {message.caption}
                </p>
              )}
            </div>
          ) : message.messageType === "sticker" && message.mediaUrl ? (
            <div className="flex justify-center">
              <img
                src={message.mediaUrl}
                alt="Sticker"
                className="w-28 h-28 object-contain"
                loading="lazy"
              />
            </div>
          ) : message.messageType === "file" && message.mediaUrl ? (
            <div className="mb-1.5">
              <a
                href={message.mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={`flex items-center gap-3 rounded-xl p-3 transition-all ${
                  isOwn
                    ? "bg-white/[0.08] hover:bg-white/[0.12]"
                    : "bg-white/[0.04] hover:bg-white/[0.08]"
                }`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  isOwn ? "bg-white/[0.1]" : "bg-[#4F6EF7]/10"
                } text-[#4F6EF7]`}>
                  {getFileIcon(message.mediaMimeType)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{fileName}</p>
                  <p className="text-xs opacity-60 mt-0.5">
                    {message.mediaMimeType?.split("/").pop()?.toUpperCase() || "FILE"}
                    {message.mediaSize ? ` — ${formatFileSize(message.mediaSize)}` : ""}
                  </p>
                </div>
                <Download size={16} className="shrink-0 opacity-60" />
              </a>
              {message.caption && (
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words mt-1.5">
                  {message.caption}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}

          <div className="flex items-center justify-end gap-1 mt-1">
            {time}
            {statusIcon}
          </div>

          {(onReply || (isOwn && onEdit) || (isOwn && onDelete)) && (
            <div
              className={`flex items-center gap-1 mt-1.5 transition-all duration-150 ${
                showActions
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 sm:opacity-0 sm:group-hover:opacity-100 translate-y-0.5 sm:translate-y-0"
              }`}
            >
              {onReply && (
                <button
                  onClick={(e) => { e.stopPropagation(); onReply(message.id) }}
                  className="touch-target flex items-center justify-center gap-1 rounded-lg bg-white/[0.04] px-2 text-[11px] text-[#6B6B80] hover:text-white hover:bg-white/[0.08] transition-all"
                  title="Reply"
                >
                  <CornerUpLeft size={12} />
                  <span className="hidden sm:inline">Reply</span>
                </button>
              )}
              {isOwn && onEdit && (
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(message) }}
                  className="touch-target flex items-center justify-center gap-1 rounded-lg bg-white/[0.04] px-2 text-[11px] text-[#6B6B80] hover:text-white hover:bg-white/[0.08] transition-all"
                  title="Edit"
                >
                  <Pencil size={12} />
                  <span className="hidden sm:inline">Edit</span>
                </button>
              )}
              {isOwn && onDelete && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(message.id) }}
                  className="touch-target flex items-center justify-center gap-1 rounded-lg bg-white/[0.04] px-2 text-[11px] text-red-400 hover:text-red-300 hover:bg-white/[0.08] transition-all"
                  title="Delete"
                >
                  <Trash2 size={12} />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {lightboxUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setLightboxUrl(null)}>
          <button onClick={() => setLightboxUrl(null)} className="touch-target absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors">
            <X size={20} />
          </button>
          {message.messageType === "video" ? (
            <video
              src={lightboxUrl}
              controls
              playsInline
              autoPlay
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <track kind="captions" />
            </video>
          ) : (
            <img
              src={lightboxUrl}
              alt="Preview"
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </>
  )
}
