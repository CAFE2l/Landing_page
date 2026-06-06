import { motion, useMotionValue, useTransform, animate } from "framer-motion"
import { useEffect, useState } from "react"
import { TrendingUp, TrendingDown, Info } from "lucide-react"
import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  label: string
  value: number
  formattedValue?: string
  icon: LucideIcon
  trend?: number
  trendLabel?: string
  period?: string
  description?: string
  info?: string
  accentColor?: string
  index?: number
  pulse?: boolean
}

export default function StatCard({
  label,
  value,
  formattedValue,
  icon: Icon,
  trend,
  trendLabel,
  period,
  description,
  info,
  accentColor = "#4f6ef7",
  index = 0,
  pulse,
}: StatCardProps) {
  const [showInfo, setShowInfo] = useState(false)
  const [tooltipTimeout, setTooltipTimeout] = useState<ReturnType<typeof setTimeout> | null>(null)

  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => Math.round(v))
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const controls = animate(count, value, { duration: 1, ease: "easeOut" })
    const unsubscribe = rounded.on("change", (v) => setDisplay(v))
    return () => { controls.stop(); unsubscribe() }
  }, [value, count, rounded])

  const handleInfoEnter = () => {
    if (tooltipTimeout) clearTimeout(tooltipTimeout)
    setTooltipTimeout(null)
    setShowInfo(true)
  }

  const handleInfoLeave = () => {
    const t = setTimeout(() => setShowInfo(false), 150)
    setTooltipTimeout(t)
  }

  useEffect(() => {
    return () => { if (tooltipTimeout) clearTimeout(tooltipTimeout) }
  }, [tooltipTimeout])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2 }}
      className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 backdrop-blur-sm transition-all duration-300 hover:border-white/[0.14] hover:bg-white/[0.045] hover:shadow-[0_18px_50px_rgba(79,110,247,0.12)]"
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.04]"
          style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
        >
          <Icon size={18} />
        </div>
        <div className="flex items-center gap-1.5">
          {info && (
            <div
              className="relative"
              onMouseEnter={handleInfoEnter}
              onMouseLeave={handleInfoLeave}
            >
              <button
                type="button"
                className="flex h-6 w-6 items-center justify-center rounded-full text-[#6b6b80] transition-colors hover:bg-white/[0.06] hover:text-[#f0f0f5]"
                aria-label="Information"
              >
                <Info size={14} />
              </button>
              {showInfo && (
                <div
                  className="absolute right-0 top-full z-50 mt-1.5 w-64 rounded-xl border border-white/[0.1] bg-[#1a1a26] p-3 shadow-2xl"
                  onMouseEnter={handleInfoEnter}
                  onMouseLeave={handleInfoLeave}
                >
                  <p className="text-xs leading-relaxed text-[#b9b9c8]">{info}</p>
                </div>
              )}
            </div>
          )}
          {trend !== undefined && (
            <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${trend >= 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
              {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
      </div>

      {formattedValue ? (
        <div className="text-[32px] font-bold text-[#f0f0f5] leading-none tracking-tight">{formattedValue}</div>
      ) : (
        <div className="text-[32px] font-bold text-[#f0f0f5] leading-none tracking-tight">{display}</div>
      )}

      {description && <div className="mt-1 text-sm text-[#6b6b80]">{description}</div>}
      {!description && <div className="mt-1.5 text-sm text-[#6b6b80]">{label}</div>}

      {period && <div className="mt-2 text-xs text-[#3a3a4a]">{period}</div>}
      {trendLabel && !period && <div className="mt-2 text-xs text-[#3a3a4a]">{trendLabel}</div>}

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
