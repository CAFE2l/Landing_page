import { Search, Download } from "lucide-react"
import { motion } from "framer-motion"
import { useAdminStore } from "../../lib/store/adminStore"
import type { FeedbackStatus, FeedbackChannel } from "../../lib/types"
import { cn } from "../../lib/utils"

const statusFilters: Array<{ label: string; value: FeedbackStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
]

const channelOptions: Array<{ label: string; value: FeedbackChannel | "all" }> = [
  { label: "All Channels", value: "all" },
  { label: "Website", value: "website" },
  { label: "Email", value: "email" },
  { label: "WhatsApp", value: "whatsapp" },
  { label: "Telegram", value: "telegram" },
  { label: "Discord", value: "discord" },
  { label: "Direct", value: "direct" },
]

export default function FilterBar() {
  const filters = useAdminStore((s) => s.filters)
  const setFilter = useAdminStore((s) => s.setFilter)

  return (
    <div className="mb-6 rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6b80]" />
          <input
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            placeholder="Search feedback..."
            className="w-full h-9 rounded-lg border border-white/[0.08] bg-white/[0.04] pl-9 pr-3 text-sm text-[#f0f0f5] placeholder:text-[#6b6b80] outline-none focus:border-[#4f6ef7]/50 transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] p-1">
          {statusFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter("status", f.value)}
              className={cn(
                "relative px-3 py-1.5 text-sm rounded-md transition-all",
                filters.status === f.value
                  ? "text-[#f0f0f5]"
                  : "text-[#6b6b80] hover:text-[#f0f0f5]",
              )}
            >
              {filters.status === f.value && (
                <motion.div
                  layoutId="status-chip"
                  className="absolute inset-0 rounded-md bg-white/[0.08] border border-white/[0.06]"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <span className="relative z-10">{f.label}</span>
            </button>
          ))}
        </div>

        <select
          value={filters.channel}
          onChange={(e) => setFilter("channel", e.target.value as FeedbackChannel | "all")}
          className="h-9 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-[#f0f0f5] outline-none focus:border-[#4f6ef7]/50 transition-all"
        >
          {channelOptions.map((o) => (
            <option key={o.value} value={o.value} className="bg-[#050508]">{o.label}</option>
          ))}
        </select>

        <select
          value={filters.sort}
          onChange={(e) => setFilter("sort", e.target.value as "newest" | "oldest" | "upvoted")}
          className="h-9 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-[#f0f0f5] outline-none focus:border-[#4f6ef7]/50 transition-all"
        >
          <option value="newest" className="bg-[#050508]">Newest</option>
          <option value="oldest" className="bg-[#050508]">Oldest</option>
          <option value="upvoted" className="bg-[#050508]">Most Upvoted</option>
        </select>

        <button className="flex h-9 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-[#6b6b80] hover:text-[#f0f0f5] transition-colors">
          <Download size={14} />
          Export CSV
        </button>
      </div>
    </div>
  )
}
