import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import type { FeedbackMedia } from "../../data/feedbackStore"

interface MediaModalProps {
  media: FeedbackMedia[]
  initialIndex: number
  open: boolean
  onClose: () => void
}

export default function MediaModal({ media, initialIndex, open, onClose }: MediaModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  if (!open) return null

  const item = media[currentIndex]
  if (!item) return null

  const prev = () => setCurrentIndex((prev) => (prev - 1 + media.length) % media.length)
  const next = () => setCurrentIndex((prev) => (prev + 1) % media.length)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur-lg"
        onClick={onClose}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-xl bg-black/40 p-2 text-white transition-colors hover:bg-black/60"
        >
          <X size={20} />
        </button>

        {media.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prev() }}
              className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-xl bg-black/40 p-2 text-white transition-colors hover:bg-black/60"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); next() }}
              className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-xl bg-black/40 p-2 text-white transition-colors hover:bg-black/60"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-h-[85vh] max-w-4xl overflow-hidden rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {item.type === "image" ? (
            <img src={item.url} alt={item.altText || ""} className="max-h-[85vh] max-w-full object-contain" />
          ) : (
            <video src={item.url} controls className="max-h-[85vh] max-w-full" />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
