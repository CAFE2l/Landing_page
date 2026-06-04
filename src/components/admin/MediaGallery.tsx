import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, ChevronLeft, ChevronRight, Image as ImageIcon, Film } from "lucide-react"

interface MediaItem {
  id: string
  type: "image" | "video" | "embed"
  url: string
  thumbnailUrl?: string
}

interface MediaGalleryProps {
  items: MediaItem[]
}

export default function MediaGallery({ items }: MediaGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  if (items.length === 0) return null

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {items.map((item, i) => (
          <button
            key={item.id}
            onClick={() => setLightboxIndex(i)}
            className="group relative aspect-square overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.04] hover:border-[#4f6ef7]/50 transition-all"
          >
            {item.thumbnailUrl || item.type === "image" ? (
              <img src={item.thumbnailUrl || item.url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Film size={24} className="text-[#6b6b80]" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
              <ImageIcon size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setLightboxIndex(null)}
          >
            <button
              onClick={() => setLightboxIndex(null)}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.08] text-white hover:bg-white/[0.12]"
            >
              <X size={20} />
            </button>
            {lightboxIndex > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1) }}
                className="absolute left-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.08] text-white hover:bg-white/[0.12]"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            {lightboxIndex < items.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1) }}
                className="absolute right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.08] text-white hover:bg-white/[0.12]"
              >
                <ChevronRight size={20} />
              </button>
            )}
            <motion.div
              key={lightboxIndex}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="max-h-[80vh] max-w-[80vw]"
              onClick={(e) => e.stopPropagation()}
            >
              {items[lightboxIndex].type === "video" ? (
                <video src={items[lightboxIndex].url} controls className="max-h-[80vh] rounded-2xl" />
              ) : (
                <img src={items[lightboxIndex].url} alt="" className="max-h-[80vh] rounded-2xl object-contain" />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
