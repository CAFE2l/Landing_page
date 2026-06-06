import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Check, Clock, Timer, ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import StatCard from "../../components/admin/StatCard";
import ActivityFeed from "../../components/admin/ActivityFeed";
import {
  AreaChartCard,
  DonutChartCard,
} from "../../components/admin/AnalyticsChart";
import { formatDate } from "../../lib/utils";
import {
  fetchAdminDashboardStats,
  getSupabaseClient,
  type AdminDashboardStats,
} from "../../data/adminServiceSupabase";

function formatDuration(ms: number): string {
  if (ms <= 0) return ""
  const totalSeconds = Math.floor(ms / 1000)
  const totalMinutes = Math.floor(totalSeconds / 60)
  const totalHours = Math.floor(totalMinutes / 60)
  const totalDays = Math.floor(totalHours / 24)

  if (totalDays >= 1) return `${totalDays}d ${totalHours % 24}h`
  if (totalHours >= 1) return `${totalHours}h ${totalMinutes % 60}m`
  if (totalMinutes >= 1) return `${totalMinutes} min`
  return `${totalSeconds} sec`
}

const container = {
  visible: { transition: { staggerChildren: 0.07 } },
};

const emptyStats: AdminDashboardStats = {
  totalSubmissions: 0,
  approved: 0,
  pending: 0,
  avgResponseTimeMs: 0,
  responseCount: 0,
  trends: { totalSubmissions: 0, approved: 0, pending: 0, avgResponseTimeMs: 0 },
  recentFeedback: [],
  activities: [],
  chartData: [],
  channelData: [],
};

function SkeletonCard() {
  return (
    <div className="h-[146px] rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
      <div className="h-9 w-9 animate-pulse rounded-xl bg-white/[0.06]" />
      <div className="mt-5 h-8 w-24 animate-pulse rounded bg-white/[0.06]" />
      <div className="mt-3 h-4 w-32 animate-pulse rounded bg-white/[0.04]" />
    </div>
  );
}

import { useUserProfile } from "../../hooks/useUserProfile";

function RecentFeedbackItem({ item, index }: { item: any; index: number }) {
  const { profile } = useUserProfile(item.userId);
  const name = profile?.full_name || item.userName;
  const avatarUrl = profile?.avatar_url || item.userAvatar;
  const initials =
    profile?.initials ||
    item.userName
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex items-center gap-4 border-b border-white/[0.04] px-5 py-3.5 transition-colors last:border-0 hover:bg-white/[0.02]"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#4f6ef7] to-[#8b5cf6] text-xs font-bold text-white">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initials
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[#f0f0f5]">{name}</p>
        <p className="truncate text-xs text-[#6b6b80]">{item.title}</p>
      </div>
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
          item.status === "approved" || item.status === "highlighted"
            ? "bg-green-500/10 text-green-400"
            : item.status === "rejected"
              ? "bg-red-500/10 text-red-400"
              : "bg-yellow-500/10 text-yellow-400"
        }`}
      >
        {item.status}
      </span>
      <span className="text-xs text-[#3a3a4a]">
        {formatDate(item.createdAt, "MMM dd")}
      </span>
    </motion.div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<AdminDashboardStats>(emptyStats);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    const stats = await fetchAdminDashboardStats();
    setData(stats);
    setLoading(false);
  };

  useEffect(() => {
    queueMicrotask(() => loadStats());
    const client = getSupabaseClient();
    if (!client) return;

    const channel = client
      .channel("admin-dashboard-feedback")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "feedback_posts" },
        () => {
          loadStats();
        },
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, []);

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
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
            <StatCard
              label="Total Submissions"
              value={data.totalSubmissions}
              icon={MessageSquare}
              trend={data.trends.totalSubmissions}
              trendLabel="vs last week"
              period="All time"
              index={0}
            />
            <StatCard
              label="Approved"
              value={data.approved}
              icon={Check}
              trend={data.trends.approved}
              trendLabel="vs last week"
              period="All time"
              accentColor="#22c55e"
              index={1}
            />
            <StatCard
              label="Pending Review"
              value={data.pending}
              description={data.pending > 0 ? "Needs attention" : "All clear"}
              icon={Clock}
              trend={data.trends.pending}
              trendLabel="vs last week"
              period="All time"
              accentColor="#f59e0b"
              index={2}
              pulse={data.pending > 0}
            />
            <StatCard
              label="Avg. Response Time"
              value={data.responseCount > 0 ? data.avgResponseTimeMs : 0}
              formattedValue={data.responseCount > 0 ? formatDuration(data.avgResponseTimeMs) : undefined}
              description={data.responseCount > 0 ? `Based on ${data.responseCount} ${data.responseCount === 1 ? "response" : "responses"}` : "No data yet"}
              icon={Timer}
              trend={data.responseCount > 0 ? data.trends.avgResponseTimeMs : undefined}
              trendLabel={data.responseCount > 0 ? "vs last week" : undefined}
              period={data.responseCount > 0 ? "All time" : undefined}
              accentColor="#8b5cf6"
              index={3}
              info="Average Response Time = tempo médio entre a criação de um feedback e a primeira resposta de um administrador (aprovação, rejeição ou destaque)."
            />
          </>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.6fr_0.4fr]">
        <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3.5">
            <h2 className="text-sm font-semibold text-[#f0f0f5]">
              Recent Feedback
            </h2>
            <button
              onClick={() => navigate("/admin/feedback")}
              className="flex items-center gap-1 text-xs text-[#4f6ef7] transition-colors hover:text-[#6b85ff]"
            >
              View all <ArrowUpRight size={12} />
            </button>
          </div>
          <div>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="border-b border-white/[0.04] px-5 py-4 last:border-0"
                >
                  <div className="h-4 w-2/3 animate-pulse rounded bg-white/[0.06]" />
                  <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-white/[0.04]" />
                </div>
              ))
            ) : data.recentFeedback.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-[#6b6b80]">
                No feedback submissions yet.
              </div>
            ) : (
              data.recentFeedback.map((item, i) => (
                <RecentFeedbackItem key={item.id} item={item} index={i} />
              ))
            )}
          </div>
        </div>

        <ActivityFeed activities={data.activities} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AreaChartCard
          data={data.chartData}
          title="Submissions Over Time (30 days)"
        />
        <DonutChartCard data={data.channelData} title="Breakdown by Service" />
      </div>
    </motion.div>
  );
}
