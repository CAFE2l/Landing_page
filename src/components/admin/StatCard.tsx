import { motion, useMotionValue, useTransform, animate } from "framer-motion"
import { useEffect, useState } from "react"
import { TrendingUp, TrendingDown } from "lucide-react"
import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  label: string
  value: number
  icon: LucideIcon
  trend?: number
  trendLabel?: string
  accentColor?: string
  index?: number
  pulse?: boolean
}

export default function StatCard({ label, value, icon: Icon, trend, trendLabel, accentColor = "#4f6ef7", index = 0, pulse }: StatCardProps) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => Math.round(v))
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const controls = animate(count, value, { duration: 1, ease: "easeOut" })
    const unsubscribe = rounded.on("change", (v) => setDisplay(v))
    return () => { controls.stop(); unsubscribe() }
  }, [value, count, rounded])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-5 group hover:bg-white/[0.06] transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
        >
          <Icon size={18} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${trend >= 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
            {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="text-[32px] font-bold text-[#f0f0f5] leading-none tracking-tight">{display}</div>
      <div className="mt-1.5 text-sm text-[#6b6b80]">{label}</div>
      {trendLabel && <div className="mt-2 text-xs text-[#3a3a4a]">{trendLabel}</div>}
      {pulse && (
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.8, 0.4] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute right-5 top-5 h-2 w-2 rounded-full bg-[#f59e0b]"
        />
      )}
    </motion.div>
  )
}
