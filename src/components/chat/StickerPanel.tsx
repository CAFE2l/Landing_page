import { useState, useEffect, useRef } from "react"
import { Plus, Trash2, Image, Loader2 } from "lucide-react"
import { useAuth } from "../../contexts/AuthContext"
import { fetchUserStickers, uploadSticker, deleteSticker } from "../../lib/chatService"
import type { UserSticker } from "../../data/feedbackStore"
import toast from "react-hot-toast"

interface StickerPanelProps {
  onSelect: (stickerUrl: string) => void
  onClose: () => void
}

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"]
const MAX_SIZE = 2 * 1024 * 1024

export default function StickerPanel({ onSelect, onClose }: StickerPanelProps) {
  const { user } = useAuth()
  const [stickers, setStickers] = useState<UserSticker[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [onClose])

  useEffect(() => {
    if (!user?.id) return
    fetchUserStickers(user.id)
      .then(setStickers)
      .finally(() => setLoading(false))
  }, [user?.id])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Only PNG, JPG, WEBP, and GIF images are allowed")
      return
    }

    if (file.size > MAX_SIZE) {
      toast.error("Image must be under 2MB")
      return
    }

    setUploading(true)
    const sticker = await uploadSticker(file, user.id)
    setUploading(false)

    if (sticker) {
      setStickers((prev) => [sticker, ...prev])
    }

    if (fileRef.current) fileRef.current.value = ""
  }

  const handleDelete = async (sticker: UserSticker) => {
    const ok = await deleteSticker(sticker.id)
    if (ok) {
      setStickers((prev) => prev.filter((s) => s.id !== sticker.id))
    }
  }

  return (
    <div
      ref={panelRef}
      className="absolute bottom-full left-0 mb-2 w-[280px] rounded-2xl border border-white/[0.08] bg-[#0A0A0F] shadow-2xl shadow-black/60 overflow-hidden"
    >
      <div className="flex items-center justify-between p-3 border-b border-white/[0.06]">
        <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">Stickers</span>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4F6EF7]/10 text-[#4F6EF7] text-xs font-medium hover:bg-[#4F6EF7]/20 transition-colors"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Add
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      <div className="grid grid-cols-3 gap-2 p-3 max-h-[200px] overflow-y-auto">
        {loading ? (
          <div className="col-span-3 flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-[#4F6EF7]" />
          </div>
        ) : stickers.length === 0 ? (
          <div className="col-span-3 py-8 text-center text-xs text-[#6B6B80]">
            <Image size={24} className="mx-auto mb-2 opacity-40" />
            <p>No stickers yet</p>
            <p className="mt-1">Tap "Add" to upload one</p>
          </div>
        ) : (
          stickers.map((s) => (
            <div key={s.id} className="group relative aspect-square rounded-xl overflow-hidden border border-white/[0.06] bg-[#050508]">
              <button onClick={() => onSelect(s.imageUrl)} className="w-full h-full p-1">
                <img src={s.imageUrl} alt={s.name || ""} className="w-full h-full object-contain" />
              </button>
              <button
                onClick={() => handleDelete(s)}
                className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:bg-black/80"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
