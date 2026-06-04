import { motion } from "framer-motion"
import { Plus, Layout, FileText, Cloud, TrendingUp, Star, ChevronLeft, ChevronRight } from "lucide-react"
import type { ForumCategory } from "../../data/forumStore"

const iconMap: Record<string, typeof Layout> = {
  Layout, FileText, Cloud, TrendingUp, Star,
}

interface ForumSidebarProps {
  categories: ForumCategory[]
  activeCategory: string
  onCategoryChange: (slug: string) => void
  onNewPost: () => void
  collapsed: boolean
  onToggleCollapse: () => void
  isAuthed: boolean
  onLoginClick: () => void
}

export default function ForumSidebar({
  categories, activeCategory, onCategoryChange, onNewPost,
  collapsed, onToggleCollapse, isAuthed, onLoginClick,
}: ForumSidebarProps) {
  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="relative flex h-full flex-col border-r border-white/[0.06] bg-[#0A0A0F] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 h-14 px-4 border-b border-white/[0.06] shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4F6EF7]/10 text-[#4F6EF7]">
          <MessageSquareIcon />
        </div>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm font-bold text-[#F0F0F5]"
          >
            Forum
          </motion.span>
        )}
      </div>

      {/* New Post button */}
      <div className="px-3 pt-4 pb-3">
        {isAuthed ? (
          <button
            onClick={onNewPost}
            className={`flex items-center justify-center gap-2 rounded-xl bg-[#4F6EF7] hover:bg-[#6B85FF] text-white font-semibold transition-all duration-200 shadow-[0_0_20px_rgba(79,110,247,0.15)] hover:shadow-[0_0_30px_rgba(79,110,247,0.3)] ${
              collapsed ? "w-full p-2.5" : "w-full px-4 py-2.5 text-sm"
            }`}
          >
            <Plus size={16} />
            {!collapsed && <span>New Post</span>}
          </button>
        ) : (
          <button
            onClick={onLoginClick}
            className={`flex items-center justify-center gap-2 rounded-xl border border-[#4F6EF7]/30 bg-[#4F6EF7]/5 hover:bg-[#4F6EF7]/10 text-[#4F6EF7] font-semibold transition-all duration-200 ${
              collapsed ? "w-full p-2.5" : "w-full px-4 py-2.5 text-sm"
            }`}
          >
            <Plus size={16} />
            {!collapsed && <span>Login to Post</span>}
          </button>
        )}
      </div>

      {/* Categories */}
      <nav className="flex-1 space-y-1 px-3 py-2 overflow-y-auto">
        {categories.map((cat) => {
          const Icon = iconMap[cat.icon] || Layout
          const isActive = activeCategory === cat.slug
          return (
            <button
              key={cat.slug}
              onClick={() => onCategoryChange(isActive ? "" : cat.slug)}
              className={`relative w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 ${
                isActive
                  ? "bg-[#4F6EF7]/10 text-[#F0F0F5]"
                  : "text-[#6B6B80] hover:bg-white/[0.03] hover:text-[#F0F0F5]"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="cat-active"
                  className="absolute inset-0 rounded-lg border border-[#4F6EF7]/20 bg-[#4F6EF7]/5"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon size={16} className="relative z-10 shrink-0" />
              {!collapsed && (
                <>
                  <span className="relative z-10 flex-1 text-left truncate">{cat.name}</span>
                  <span className="relative z-10 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white/[0.06] px-1.5 text-[10px] font-bold text-[#6B6B80]">
                    {cat.postCount}
                  </span>
                </>
              )}
            </button>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-white/[0.06] px-3 py-3">
        <button
          onClick={onToggleCollapse}
          className="flex w-full items-center justify-center rounded-lg p-2 text-[#6B6B80] hover:bg-white/[0.04] hover:text-[#F0F0F5] transition-all"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </motion.aside>
  )
}

function MessageSquareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}
