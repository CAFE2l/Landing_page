import { motion, AnimatePresence } from "framer-motion"
import { Check, X, MessageSquare, UserPlus, Star } from "lucide-react"
import { timeAgo } from "../../lib/utils"

interface ActivityItem {
  id: string
  action: string
  actor: string
  target: string
  timestamp: string
}

const actionConfig: Record<string, { icon: typeof Check; color: string }> = {
  approved: { icon: Check, color: "text-green-400" },
  rejected: { icon: X, color: "text-red-400" },
  submitted: { icon: MessageSquare, color: "text-[#4f6ef7]" },
  registered: { icon: UserPlus, color: "text-[#6b85ff]" },
  featured: { icon: Star, color: "text-yellow-400" },
}

interface ActivityFeedProps {
  activities: ActivityItem[]
}

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-5">
      <h3 className="mb-4 text-sm font-semibold text-[#f0f0f5]">Activity</h3>
      <div className="space-y-1">
        <AnimatePresence initial={false}>
          {activities.slice(0, 8).map((item, i) => {
            const config = actionConfig[item.action] || { icon: MessageSquare, color: "text-[#6b6b80]" }
            const Icon = config.icon
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-white/[0.03] transition-colors"
              >
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] ${config.color}`}>
                  <Icon size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[#f0f0f5]">
                    <span className="font-medium">{item.actor}</span>
                    <span className="text-[#6b6b80]"> {item.action} </span>
                    <span className="text-[#f0f0f5]">{item.target}</span>
                  </p>
                  <p className="text-xs text-[#3a3a4a] mt-0.5">{timeAgo(item.timestamp)}</p>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
        {activities.length === 0 && (
          <p className="py-8 text-center text-sm text-[#6b6b80]">No recent activity</p>
        )}
      </div>
    </div>
  )
}
