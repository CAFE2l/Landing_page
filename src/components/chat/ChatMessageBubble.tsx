import { motion } from "framer-motion"
import { Check, CheckCheck } from "lucide-react"
import type { ChatMessage } from "../../data/feedbackStore"

interface ChatMessageBubbleProps {
  message: ChatMessage
  isOwn: boolean
  onImageClick?: (url: string) => void
}

export default function ChatMessageBubble({ message, isOwn, onImageClick }: ChatMessageBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-2`}
    >
      <div
        className={`relative max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 ${
          isOwn
            ? "bg-gradient-to-br from-[#2563EB] to-[#6D28D9] text-white shadow-[0_2px_12px_rgba(37,99,235,0.25)] rounded-br-md"
            : "bg-white/[0.06] text-[#F0F0F5] border border-white/[0.06] rounded-bl-md"
        }`}
      >
        {message.messageType === "image" && message.mediaUrl ? (
          <div className="mb-1.5">
            <button
              onClick={() => onImageClick?.(message.mediaUrl!)}
              className="block rounded-lg overflow-hidden border border-white/[0.08] hover:opacity-90 transition-opacity"
            >
              <img
                src={message.mediaUrl}
                alt="Shared image"
                className="max-w-full max-h-60 object-cover rounded-lg"
                loading="lazy"
              />
            </button>
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
        ) : (
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </p>
        )}

        <div className={`flex items-center justify-end gap-1 mt-1 ${isOwn ? "" : ""}`}>
          <span className={`text-[10px] ${isOwn ? "text-blue-200/70" : "text-[#6B6B80]"}`}>
            {new Date(message.createdAt).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {isOwn && (
            message.readAt ? (
              <CheckCheck size={12} className="text-blue-300" />
            ) : (
              <Check size={12} className="text-blue-200/60" />
            )
          )}
        </div>
      </div>
    </motion.div>
  )
}
