import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from "recharts"
import type { DailySubmission, ChannelBreakdown, ApprovalRate } from "../../lib/types"

const glassTooltipStyle = {
  background: "rgba(5, 5, 8, 0.9)",
  backdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "12px",
  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
  color: "#f0f0f5",
}

interface AreaChartCardProps {
  data: DailySubmission[]
  title: string
}

export function AreaChartCard({ data, title }: AreaChartCardProps) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-5">
      <h3 className="mb-4 text-sm font-semibold text-[#f0f0f5]">{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="accentGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4f6ef7" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#4f6ef7" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="date" tick={{ fill: "#6b6b80", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#6b6b80", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={glassTooltipStyle} />
          <Area type="monotone" dataKey="count" stroke="#4f6ef7" strokeWidth={2} fill="url(#accentGradient)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

interface BarChartCardProps {
  data: ChannelBreakdown[]
  title: string
}

export function BarChartCard({ data, title }: BarChartCardProps) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-5">
      <h3 className="mb-4 text-sm font-semibold text-[#f0f0f5]">{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="channel" tick={{ fill: "#6b6b80", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#6b6b80", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={glassTooltipStyle} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

interface LineChartCardProps {
  data: ApprovalRate[]
  title: string
}

export function LineChartCard({ data, title }: LineChartCardProps) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-5">
      <h3 className="mb-4 text-sm font-semibold text-[#f0f0f5]">{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="date" tick={{ fill: "#6b6b80", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fill: "#6b6b80", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
          <Tooltip contentStyle={glassTooltipStyle} formatter={(v) => [`${Number(v).toFixed(1)}%`, "Rate"]} />
          <Line type="monotone" dataKey="rate" stroke="#22c55e" strokeWidth={2} dot={{ fill: "#22c55e", r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

interface DonutChartCardProps {
  data: ChannelBreakdown[]
  title: string
}

export function DonutChartCard({ data, title }: DonutChartCardProps) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-5">
      <h3 className="mb-4 text-sm font-semibold text-[#f0f0f5]">{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="count" paddingAngle={3}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={glassTooltipStyle} />
          <Legend
            wrapperStyle={{ fontSize: 12, color: "#6b6b80" }}
            formatter={(value) => <span style={{ color: "#6b6b80" }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
