import { motion } from "framer-motion"
import { MessageSquare, Check, Clock, Timer, ArrowUpRight } from "lucide-react"
import { useNavigate } from "react-router-dom"
import StatCard from "../../components/admin/StatCard"
import ActivityFeed from "../../components/admin/ActivityFeed"
import { AreaChartCard, DonutChartCard } from "../../components/admin/AnalyticsChart"
import { formatDate } from "../../lib/utils"

const container = {
  visible: { transition: { staggerChildren: 0.07 } },
}

const sampleActivities = [
  { id: "1", action: "approved", actor: "Admin", target: "feedback from Maria S.", timestamp: new Date(Date.now() - 300000).toISOString() },
  { id: "2", action: "submitted", actor: "João P.", target: "new feedback", timestamp: new Date(Date.now() - 900000).toISOString() },
  { id: "3", action: "rejected", actor: "Admin", target: "feedback from Ana L.", timestamp: new Date(Date.now() - 1800000).toISOString() },
  { id: "4", action: "registered", actor: "Carlos M.", target: "new client account", timestamp: new Date(Date.now() - 3600000).toISOString() },
  { id: "5", action: "featured", actor: "Admin", target: "testimonial #42", timestamp: new Date(Date.now() - 7200000).toISOString() },
  { id: "6", action: "submitted", actor: "Julia R.", target: "new feedback", timestamp: new Date(Date.now() - 10800000).toISOString() },
]

const sampleChartData = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  count: Math.floor(Math.random() * 12) + 1,
}))

const sampleChannelData = [
  { channel: "Website", count: 48, color: "#4f6ef7" },
  { channel: "WhatsApp", count: 32, color: "#22c55e" },
  { channel: "Email", count: 21, color: "#f59e0b" },
  { channel: "Discord", count: 12, color: "#6b85ff" },
  { channel: "Telegram", count: 8, color: "#3b82f6" },
]

const recentFeedbacks = [
  { id: "1", name: "Maria S.", title: "Excelente serviço de design", status: "pending", date: new Date() },
  { id: "2", name: "João P.", title: "Muito satisfeito com o resultado", status: "approved", date: new Date(Date.now() - 86400000) },
  { id: "3", name: "Ana L.", title: "Precisamos de melhorias no prazo", status: "pending", date: new Date(Date.now() - 172800000) },
  { id: "4", name: "Carlos M.", title: "Equipe muito profissional", status: "approved", date: new Date(Date.now() - 259200000) },
  { id: "5", name: "Julia R.", title: "Ótima comunicação durante o projeto", status: "rejected", date: new Date(Date.now() - 345600000) },
]

export default function Dashboard() {
  const navigate = useNavigate()

  return (
    <motion.div variants={container} initial="hidden" animate="visible" className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Submissions" value={142} icon={MessageSquare} trend={12} trendLabel="vs last week" index={0} />
        <StatCard label="Approved" value={98} icon={Check} trend={8} trendLabel="vs last week" accentColor="#22c55e" index={1} />
        <StatCard label="Pending Review" value={23} icon={Clock} trend={-5} trendLabel="vs last week" accentColor="#f59e0b" index={2} pulse />
        <StatCard label="Avg. Response Time" value={4} icon={Timer} trend={-15} trendLabel="hours vs last week" accentColor="#6b85ff" index={3} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.6fr_0.4fr]">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3.5">
            <h2 className="text-sm font-semibold text-[#f0f0f5]">Recent Feedback</h2>
            <button onClick={() => navigate("/admin/feedback")} className="flex items-center gap-1 text-xs text-[#4f6ef7] hover:text-[#6b85ff] transition-colors">
              View all <ArrowUpRight size={12} />
            </button>
          </div>
          <div>
            {recentFeedbacks.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-4 border-b border-white/[0.04] px-5 py-3.5 transition-colors last:border-0 hover:bg-white/[0.02]"
              >
                <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-[#4f6ef7] to-[#6b85ff] flex items-center justify-center text-xs font-bold text-white">
                  {item.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#f0f0f5]">{item.name}</p>
                  <p className="text-xs text-[#6b6b80] truncate">{item.title}</p>
                </div>
                <span className={`text-xs font-semibold capitalize px-2 py-0.5 rounded-full ${
                  item.status === "approved" ? "bg-green-500/10 text-green-400" :
                  item.status === "rejected" ? "bg-red-500/10 text-red-400" :
                  "bg-yellow-500/10 text-yellow-400"
                }`}>
                  {item.status}
                </span>
                <span className="text-xs text-[#3a3a4a]">{formatDate(item.date, "MMM dd")}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <ActivityFeed activities={sampleActivities} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AreaChartCard data={sampleChartData} title="Submissions Over Time (30 days)" />
        <DonutChartCard data={sampleChannelData} title="Breakdown by Channel" />
      </div>
    </motion.div>
  )
}
