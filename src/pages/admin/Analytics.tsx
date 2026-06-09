import { useState } from "react"
import { motion } from "framer-motion"
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid,
} from "recharts"
import { TrendingUp, MessageSquare, Check, Clock } from "lucide-react"
import StatCard from "../../components/admin/StatCard"
import type { Period } from "../../lib/types/analytics"
import { useAnalytics } from "../../hooks/useAnalytics"

const ranges = ["7d", "30d", "90d", "Custom"] as const

const glassTooltip = {
  background: "rgba(5, 5, 8, 0.9)",
  backdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "12px",
  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
  color: "#f0f0f5",
}

function SkeletonCard() {
  return (
    <div className="h-[146px] rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
      <div className="h-9 w-9 animate-pulse rounded-xl bg-white/[0.06]" />
      <div className="mt-5 h-8 w-24 animate-pulse rounded bg-white/[0.06]" />
      <div className="mt-3 h-4 w-32 animate-pulse rounded bg-white/[0.04]" />
    </div>
  )
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04]">
      <p className="text-sm text-white/30">{message}</p>
    </div>
  )
}

export default function Analytics() {
  const [range, setRange] = useState<typeof ranges[number]>("30d")
  const [customRange, setCustomRange] = useState({ from: "", to: "" })

  const period: Period =
    range === "Custom" && customRange.from && customRange.to
      ? { from: new Date(customRange.from).toISOString(), to: new Date(customRange.to + "T23:59:59").toISOString() }
      : range === "Custom"
        ? "30d"
        : range

  const { data, loading } = useAnalytics(period)

  const periodLabel =
    range === "7d" ? "Últimos 7 dias"
    : range === "30d" ? "Últimos 30 dias"
    : range === "90d" ? "Últimos 90 dias"
    : "Período personalizado"

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      {/* Period Selector */}
      <div className="mobile-scroll-x flex items-center gap-2 pb-1">
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
      </div>

      {/* Custom Date Range */}
      {range === "Custom" && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="date"
            value={customRange.from}
            onChange={(e) => setCustomRange((prev) => ({ ...prev, from: e.target.value }))}
            className="touch-target rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white outline-none"
          />
          <span className="text-white/30 text-sm">até</span>
          <input
            type="date"
            value={customRange.to}
            onChange={(e) => setCustomRange((prev) => ({ ...prev, to: e.target.value }))}
            className="touch-target rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white outline-none"
          />
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatCard label="Total Submissions" value={data?.totalSubmissions ?? 0} icon={MessageSquare} trend={data?.changes.totalSubmissions} trendLabel={periodLabel} index={0} />
            <StatCard label="Approved" value={data?.approved ?? 0} icon={Check} trend={data?.changes.approved} trendLabel={periodLabel} accentColor="#22c55e" index={1} />
            <StatCard label="Pending" value={data?.pending ?? 0} icon={Clock} trend={data?.changes.pending} trendLabel={periodLabel} accentColor="#f59e0b" index={2} />
            <StatCard label="Conversion Rate" value={data?.conversionRate ?? 0} icon={TrendingUp} trend={data?.changes.conversionRate} trendLabel={periodLabel} accentColor="#6b85ff" index={3} />
          </>
        )}
      </div>

      {/* Chart 1 — Submissions Over Time */}
      {loading ? (
        <div className="h-[340px] animate-pulse rounded-2xl border border-white/[0.07] bg-white/[0.03]" />
      ) : data?.submissionsOverTime.length ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-5">
          <h3 className="mb-4 text-sm font-semibold text-[#f0f0f5]">Submissions Over Time</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.submissionsOverTime}>
              <defs>
                <linearGradient id="analyticsBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="date"
                tickFormatter={(d) => {
                  const dt = new Date(d)
                  return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
                }}
                tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={glassTooltip}
                labelFormatter={(d) => new Date(d).toLocaleDateString("pt-BR")}
              />
              <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fill="url(#analyticsBlue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyChart message="Nenhum dado para o período selecionado" />
      )}

      {/* Chart 2+3 — By Service + Rating Distribution */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Feedbacks by Service */}
        {loading ? (
          <div className="h-[340px] animate-pulse rounded-2xl border border-white/[0.07] bg-white/[0.03]" />
        ) : data?.approvalsByService.length ? (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-5">
            <h3 className="mb-4 text-sm font-semibold text-[#f0f0f5]">Feedbacks by Service</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.approvalsByService}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="service" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={glassTooltip} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart message="Nenhum dado para o período selecionado" />
        )}

        {/* Rating Distribution */}
        {loading ? (
          <div className="h-[340px] animate-pulse rounded-2xl border border-white/[0.07] bg-white/[0.03]" />
        ) : data?.ratingDistribution.length ? (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-5">
            <h3 className="mb-4 text-sm font-semibold text-[#f0f0f5]">Rating Distribution</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.ratingDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="rating" type="category" tickFormatter={(r: number) => "⭐".repeat(r)} width={80} tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={glassTooltip} />
                <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart message="Nenhum dado para o período selecionado" />
        )}
      </div>
    </motion.div>
  )
}
