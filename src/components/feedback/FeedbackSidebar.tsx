import { Star, Search } from "lucide-react"
import { SERVICE_CATEGORIES, type ServiceCategory } from "../../data/feedbackStore"

interface FeedbackSidebarProps {
  category: ServiceCategory | ""
  onCategoryChange: (cat: ServiceCategory | "") => void
  rating: number
  onRatingChange: (rating: number) => void
  onSearch: (query: string) => void
  search: string
  categoryCounts: Record<string, number>
}

export default function FeedbackSidebar({
  category, onCategoryChange, rating, onRatingChange, onSearch, search, categoryCounts,
}: FeedbackSidebarProps) {
  return (
    <aside className="hidden lg:block w-64 shrink-0">
      <div className="sticky top-28 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B80]" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search feedbacks..."
            className="w-full bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#F0F0F5] placeholder-[#6B6B80] focus:outline-none focus:border-[#4F6EF7]/50 transition-all"
          />
        </div>

        {/* Categories */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[#6B6B80]">Service</p>
          <div className="space-y-1">
            <button
              onClick={() => onCategoryChange("")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-all ${
                category === "" ? "bg-[#4F6EF7]/10 text-[#4F6EF7]" : "text-[#6B6B80] hover:bg-white/[0.04] hover:text-[#F0F0F5]"
              }`}
            >
              <span>All Services</span>
            </button>
            {SERVICE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => onCategoryChange(category === cat ? "" : cat)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-all ${
                  category === cat
                    ? "bg-[#4F6EF7]/10 text-[#4F6EF7]"
                    : "text-[#6B6B80] hover:bg-white/[0.04] hover:text-[#F0F0F5]"
                }`}
              >
                <span>{cat}</span>
                <span className="text-[10px] text-[#4A4A5A]">{categoryCounts[cat] || 0}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Rating Filter */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[#6B6B80]">Minimum Rating</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => onRatingChange(rating === n ? 0 : n)}
                className={`p-1.5 rounded-lg transition-all ${
                  rating >= n ? "text-[#F59E0B]" : "text-[#3A3A4A] hover:text-[#6B6B80]"
                }`}
              >
                <Star size={16} className={rating >= n ? "fill-[#F59E0B]" : ""} />
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[#6B6B80]">About</p>
          <p className="text-xs text-[#6B6B80] leading-relaxed">
            Share your real experience with CAFÉ Services. All feedback is reviewed by our team before being published.
          </p>
        </div>
      </div>
    </aside>
  )
}
