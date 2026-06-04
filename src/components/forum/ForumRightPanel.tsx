import { BadgeCheck, MessageSquare, TrendingUp, Users } from "lucide-react"

interface ForumRightPanelProps {
  totalPosts: number
  totalComments: number
  topCategories: { name: string; count: number }[]
}

export default function ForumRightPanel({ totalPosts, totalComments, topCategories }: ForumRightPanelProps) {
  return (
    <aside className="hidden xl:block w-72 shrink-0 border-l border-white/[0.06] bg-[#0A0A0F] p-5 overflow-y-auto">
      {/* Community stats */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B6B80] mb-3">Community</h3>
        <div className="rounded-2xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/[0.06] p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4F6EF7]/10 text-[#4F6EF7]">
              <MessageSquare size={16} />
            </div>
            <div>
              <p className="text-lg font-bold text-[#F0F0F5] tabular-nums">{totalPosts}</p>
              <p className="text-[10px] text-[#6B6B80]">Total Posts</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#22C55E]/10 text-[#22C55E]">
              <TrendingUp size={16} />
            </div>
            <div>
              <p className="text-lg font-bold text-[#F0F0F5] tabular-nums">{totalComments}</p>
              <p className="text-[10px] text-[#6B6B80]">Comments</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F59E0B]/10 text-[#F59E0B]">
              <Users size={16} />
            </div>
            <div>
              <p className="text-lg font-bold text-[#F0F0F5] tabular-nums">Real</p>
              <p className="text-[10px] text-[#6B6B80]">Verified Results</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top categories */}
      {topCategories.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B6B80] mb-3">Categories</h3>
          <div className="space-y-1">
            {topCategories.map((cat) => (
              <div key={cat.name} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-white/[0.03] transition-colors">
                <span className="text-sm text-[#F0F0F5]">{cat.name}</span>
                <span className="text-xs text-[#6B6B80] tabular-nums">{cat.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trust */}
      <div className="rounded-2xl bg-gradient-to-br from-[#4F6EF7]/5 to-transparent border border-[#4F6EF7]/10 p-4">
        <div className="flex items-center gap-2 mb-2">
          <BadgeCheck size={16} className="text-[#22C55E]" />
          <span className="text-sm font-semibold text-[#F0F0F5]">Verified Results</span>
        </div>
        <p className="text-xs text-[#6B6B80] leading-relaxed">
          Every post with the Verified Result badge has been reviewed and confirmed by the CAFÉ team.
        </p>
      </div>
    </aside>
  )
}
