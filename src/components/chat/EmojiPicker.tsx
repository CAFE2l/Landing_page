import { useState, useRef, useEffect } from "react"

const EMOJI_CATEGORIES = [
  {
    name: "Smileys",
    emojis: ["😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🫢", "🤔", "🤐", "😑", "😶", "😏", "😒", "🙄", "😬", "😮", "😯", "😲", "😳", "🥺", "😢", "😭", "😤", "😡", "🤬", "😈", "👿", "💀", "☠️", "💩", "🤡", "👹", "👺", "👻", "👽", "👾", "🤖"],
  },
  {
    name: "Gestures",
    emojis: ["👍", "👎", "👊", "✊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✌️", "🤞", "🫰", "🤟", "🤘", "🤙", "👈", "👉", "👆", "👇", "☝️", "🫵", "👍🏻", "👍🏼", "👍🏽", "👍🏾", "👍🏿"],
  },
  {
    name: "Hearts",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💕", "💞", "💗", "💖", "💘", "💝", "❤️‍🔥", "❤️‍🩹", "💔", "❣️"],
  },
  {
    name: "Objects",
    emojis: ["🔥", "⭐", "✨", "💫", "🌟", "💥", "💯", "🎉", "🎊", "🎈", "🎁", "💎", "👑", "💍", "🔮", "🎯", "🏆", "🥇", "📱", "💻", "⌨️", "🖥️", "📸", "🎥", "🎵", "🎶", "💬", "🗨️", "📨", "📩", "💌"],
  },
]

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  onClose: () => void
}

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [category, setCategory] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 mb-2 w-[320px] rounded-2xl border border-white/[0.08] bg-[#0A0A0F] shadow-2xl shadow-black/60 overflow-hidden"
    >
      <div className="flex gap-1 p-2 border-b border-white/[0.06] overflow-x-auto">
        {EMOJI_CATEGORIES.map((cat, i) => (
          <button
            key={cat.name}
            onClick={() => setCategory(i)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              i === category
                ? "bg-[#4F6EF7]/15 text-[#4F6EF7]"
                : "text-[#6B6B80] hover:text-white hover:bg-white/[0.05]"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-8 gap-1 p-3 max-h-[200px] overflow-y-auto">
        {EMOJI_CATEGORIES[category].emojis.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSelect(emoji)}
            className="flex items-center justify-center h-9 w-9 rounded-lg text-xl hover:bg-white/[0.08] transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}
