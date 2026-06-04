import { Search, Bell, ChevronDown } from "lucide-react"
import { motion } from "framer-motion"
import { cn, getInitials } from "../../lib/utils"
import { useAdminStore } from "../../lib/store/adminStore"
import type { UserProfile } from "../../data/feedbackStore"

interface TopbarProps {
  title: string
  user?: UserProfile | null
}

export default function Topbar({ title, user }: TopbarProps) {
  const collapsed = useAdminStore((s) => s.ui.sidebarCollapsed)
  const setFilter = useAdminStore((s) => s.setFilter)
  const search = useAdminStore((s) => s.filters.search)

  return (
    <header
      className={cn(
        "fixed right-0 top-0 z-20 flex h-16 items-center gap-4 border-b border-white/[0.08] bg-[#050508]/80 backdrop-blur-xl px-6 transition-all duration-300",
        collapsed ? "left-16" : "left-60",
      )}
    >
      <motion.h1
        key={title}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-lg font-semibold text-[#f0f0f5]"
      >
        {title}
      </motion.h1>

      <div className="flex-1" />

      <div className="relative hidden sm:block">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6b80]" />
        <input
          value={search}
          onChange={(e) => setFilter("search", e.target.value)}
          placeholder="Search..."
          className="h-9 w-64 rounded-lg border border-white/[0.08] bg-white/[0.04] pl-9 pr-3 text-sm text-[#f0f0f5] placeholder:text-[#6b6b80] outline-none focus:border-[#4f6ef7]/50 focus:bg-white/[0.06] transition-all"
        />
      </div>

      <button className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-[#6b6b80] hover:text-[#f0f0f5] transition-colors">
        <Bell size={16} />
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#4f6ef7] text-[9px] font-bold text-white">
          3
        </span>
      </button>

      <button className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-sm text-[#f0f0f5] hover:bg-white/[0.08] transition-colors">
        <div className="h-6 w-6 rounded-full bg-gradient-to-br from-[#4f6ef7] to-[#6b85ff] flex items-center justify-center text-[10px] font-bold text-white">
          {user ? getInitials(user.name) : "A"}
        </div>
        <span className="hidden md:inline">{user?.name || "Admin"}</span>
        <ChevronDown size={14} className="text-[#6b6b80]" />
      </button>
    </header>
  )
}
