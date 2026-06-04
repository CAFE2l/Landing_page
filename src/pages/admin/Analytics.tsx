import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import StatCard from "../../components/admin/StatCard"
import { AreaChartCard, BarChartCard, LineChartCard } from "../../components/admin/AnalyticsChart"
import type { ChannelBreakdown, ApprovalRate } from "../../lib/types"
import { MessageSquare, Check, Clock, TrendingUp } from "lucide-react"

const ranges = ["7d", "30d", "90d", "Custom"] as const

const buildChartData = (days: number) =>
  Array.from({ length: days }, (_, i) => ({
    date: new Date(Date.now() - (days - 1 - i) * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    count: Math.floor(Math.random() * 20) + 5,
  }))

const channelData: ChannelBreakdown[] = [
  { channel: "Website", count: 48, color: "#4f6ef7" },
  { channel: "WhatsApp", count: 32, color: "#22c55e" },
  { channel: "Email", count: 21, color: "#f59e0b" },
  { channel: "Discord", count: 12, color: "#6b85ff" },
  { channel: "Telegram", count: 8, color: "#3b82f6" },
]

const buildApprovalData = (days: number): ApprovalRate[] =>
  Array.from({ length: days }, (_, i) => ({
    date: new Date(Date.now() - (days - 1 - i) * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    rate: 60 + Math.random() * 35,
  }))

export default function Analytics() {
  const [range, setRange] = useState<typeof ranges[number]>("30d")
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90
  const chartData = useMemo(() => buildChartData(days), [days])
  const approvalData = useMemo(() => buildApprovalData(days), [days])
  const topPosts = useMemo(() =>
    Array.from({ length: 5 }, (_, i) => ({
      rank: i + 1,
      title: `"Landing page com taxa de conversão de 34%"`,
      author: `Usuário ${i + 1}`,
      upvotes: [94, 78, 65, 52, 41][i],
      views: [1280, 950, 720, 580, 390][i],
    })), []
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      <div className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-1 w-fit">
        {ranges.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-4 py-2 text-sm rounded-lg transition-all ${
              range === r
                ? "bg-white/[0.08] text-[#f0f0f5] border border-white/[0.06]"
                : "text-[#6b6b80] hover:text-[#f0f0f5]"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Submissions" value={142} icon={MessageSquare} trend={12} trendLabel="All time" index={0} />
        <StatCard label="Approved" value={98} icon={Check} trend={8} trendLabel="All time" accentColor="#22c55e" index={1} />
        <StatCard label="Pending" value={23} icon={Clock} trend={-5} trendLabel="All time" accentColor="#f59e0b" index={2} />
        <StatCard label="Conversion Rate" value={69} icon={TrendingUp} trend={3} trendLabel="All time" accentColor="#6b85ff" index={3} />
      </div>

      <AreaChartCard data={chartData} title="Submissions Over Time" />

      <div className="grid gap-6 xl:grid-cols-2">
        <BarChartCard data={channelData} title="Feedback by Channel" />
        <LineChartCard data={approvalData} title="Approval Rate Over Time" />
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-5">
        <h3 className="mb-4 text-sm font-semibold text-[#f0f0f5]">Top Feedback Posts</h3>
        <div className="space-y-2">
          {topPosts.map((post) => (
            <div key={post.rank} className="flex items-center gap-4 rounded-xl px-4 py-3 hover:bg-white/[0.02] transition-colors">
              <span className="w-6 text-center text-sm font-semibold text-[#6b6b80]">#{post.rank}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#f0f0f5] truncate">{post.title}</p>
                <p className="text-xs text-[#6b6b80]">by {post.author}</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-[#6b6b80]">
                <span>{post.upvotes} upvotes</span>
                <span className="text-green-400">{post.views} views</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
