import { useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Send, Loader2 } from "lucide-react"

interface MediaPreviewModalProps {
  file: File
  onSend: (caption: string) => void
  onCancel: () => void
  sending?: boolean
}

export default function MediaPreviewModal({ file, onSend, onCancel, sending }: MediaPreviewModalProps) {
  const [caption, setCaption] = useState("")
  const url = URL.createObjectURL(file)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const isVideo = file.type.startsWith("video/")

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      onSend(caption)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={onCancel}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#0A0A0F] shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <p className="text-sm font-semibold text-white">Send {isVideo ? "video" : "image"}</p>
            <button onClick={onCancel} className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-all">
              <X size={16} />
            </button>
          </div>

          <div className="p-4">
            {isVideo ? (
              <video
                src={url}
                controls
                playsInline
                preload="metadata"
                className="w-full rounded-xl max-h-[50vh] object-contain bg-black/40"
              />
            ) : (
              <img
                src={url}
                alt="Preview"
                className="w-full rounded-xl max-h-[50vh] object-contain bg-black/40"
              />
            )}
          </div>

          <div className="px-4 pb-4">
            <textarea
              ref={inputRef}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a caption…"
              rows={2}
              className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-[#4A4A5A] outline-none focus:border-[#4F6EF7]/40 transition-all"
            />
          </div>

          <div className="flex items-center justify-end gap-2 px-4 pb-4">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => onSend(caption)}
              disabled={sending}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#6D28D9] text-white text-sm font-medium disabled:opacity-40 hover:shadow-[0_0_16px_rgba(37,99,235,0.3)] transition-all"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Send
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
