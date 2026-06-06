import { useEffect, useRef, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Send, Loader2, FileText, Film, ImageIcon, Music } from "lucide-react"

interface MediaPreviewModalProps {
  file: File
  onSend: (caption: string) => Promise<void>
  onCancel: () => void
  sending?: boolean
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <ImageIcon size={24} />
  if (mimeType.startsWith("video/")) return <Film size={24} />
  if (mimeType.startsWith("audio/")) return <Music size={24} />
  return <FileText size={24} />
}

const PREVIEW_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "video/mp4", "video/webm", "video/quicktime"]

function hasPreview(file: File): boolean {
  return PREVIEW_TYPES.includes(file.type)
}

export default function MediaPreviewModal({ file, onSend, onCancel, sending }: MediaPreviewModalProps) {
  const [caption, setCaption] = useState("")
  const [showConfirm, setShowConfirm] = useState(false)
  const url = useRef<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const isVideo = file.type.startsWith("video/")
  const canPreview = hasPreview(file)

  useEffect(() => {
    if (canPreview) {
      url.current = URL.createObjectURL(file)
    }
    return () => {
      if (url.current) URL.revokeObjectURL(url.current)
    }
  }, [file, canPreview])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        if (caption.trim()) {
          setShowConfirm(true)
        } else {
          onCancel()
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [caption, onCancel])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleOutsideClick = useCallback(() => {
    if (caption.trim()) {
      setShowConfirm(true)
    } else {
      onCancel()
    }
  }, [caption, onCancel])

  const handleSend = async () => {
    await onSend(caption)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (!sending) handleSend()
    }
  }

  const fileName = file.name
  const fileSize = formatSize(file.size)

  return (
    <AnimatePresence>
      {showConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowConfirm(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#0A0A0F] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-white font-medium mb-2">Discard media?</p>
            <p className="text-xs text-[#6B6B80] mb-5">You typed a caption. Do you want to discard it?</p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/[0.06] transition-all"
              >
                Keep editing
              </button>
              <button
                onClick={() => { setShowConfirm(false); onCancel() }}
                className="px-4 py-2 rounded-xl bg-red-500/20 text-red-300 text-sm font-medium hover:bg-red-500/30 transition-all"
              >
                Discard
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4"
        onClick={handleOutsideClick}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col w-[94vw] sm:max-w-[520px] max-h-[85vh] rounded-2xl border border-white/[0.08] bg-[#0A0A0F] shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
            <p className="text-sm font-semibold text-white">
              {canPreview
                ? isVideo ? "Send video" : "Send image"
                : "Send file"}
            </p>
            <button
              onClick={() => { if (caption.trim()) setShowConfirm(true); else onCancel() }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              <X size={16} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 min-h-0">
            {canPreview ? (
              <div className="flex items-center justify-center p-4 bg-black/30">
                {isVideo ? (
                  <video
                    src={url.current || undefined}
                    controls
                    playsInline
                    preload="metadata"
                    className="max-h-[50vh] w-full object-contain rounded-xl"
                  />
                ) : (
                  <img
                    src={url.current || undefined}
                    alt="Preview"
                    className="max-h-[50vh] w-full object-contain rounded-xl"
                  />
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center p-8">
                <div className="flex flex-col items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-8 py-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#4F6EF7]/10 text-[#4F6EF7]">
                    {getFileIcon(file.type)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white truncate max-w-[200px]">{fileName}</p>
                    <p className="text-xs text-[#6B6B80] mt-0.5">{file.type || "Unknown type"} — {fileSize}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="px-4 pb-3">
              <textarea
                ref={inputRef}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add a caption..."
                rows={2}
                className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-[#4A4A5A] outline-none focus:border-[#4F6EF7]/40 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-white/[0.06] shrink-0">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
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
