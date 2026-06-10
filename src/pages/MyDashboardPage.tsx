"use client"

import { useEffect, useState } from "react"
import { Link, Navigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Code2,
  LayoutDashboard,
  Loader2,
  MessageSquareText,
  MonitorSmartphone,
  Plus,
  ThumbsUp,
} from "lucide-react"
import AuthBackground from "../components/auth/AuthBackground"
import Navbar from "../components/landing/Navbar"
import { useAuth } from "../contexts/AuthContext"
import { fetchUserFeedbackPosts } from "../data/feedbackServiceSupabase"
import type { FeedbackPost } from "../data/feedbackStore"

const serviceIcons: Record<string, typeof MonitorSmartphone> = {
  landing: MonitorSmartphone,
  website: Code2,
  saas: LayoutDashboard,
}

const statusConfig = {
  pending: { icon: Clock, color: "#f59e0b", label: "Pending" },
  approved: { icon: CheckCircle2, color: "#22c55e", label: "Approved" },
  rejected: { icon: ThumbsUp, color: "#ef4444", label: "Rejected" },
} as const

function ProjectCard({ feedback }: { feedback: FeedbackPost }) {
  const Icon = serviceIcons[feedback.serviceCategory?.toLowerCase() === "saas" ? "saas" : "landing"] || MonitorSmartphone
  const status = statusConfig[feedback.status || "pending"] || statusConfig.pending

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all duration-300 hover:border-blue-500/20 hover:bg-white/[0.04]"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#3b82f6]/20 bg-[#2563eb]/10 text-[#60a5fa]">
          <Icon size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-white truncate">
            {feedback.projectTitle || "Untitled Project"}
          </h3>
          <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
            <span className={feedback.status === "approved" ? "text-[#22c55e]" : feedback.status === "rejected" ? "text-[#ef4444]" : "text-[#f59e0b]"}>
              {status.label}
            </span>
            <span>·</span>
            <span>{new Date(feedback.createdAt).toLocaleDateString()}</span>
          </div>
          {feedback.content && (
            <p className="mt-2 text-sm text-zinc-400 line-clamp-2">{feedback.content}</p>
          )}
          {feedback.media?.length ? (
            <span className="mt-2 inline-flex items-center gap-1 text-xs text-[#3b82f6]">
              <MessageSquareText size={12} />
              Has media attached
            </span>
          ) : null}
        </div>
      </div>
    </motion.div>
  )
}

function FeedbackCard({ feedback }: { feedback: FeedbackPost }) {
  const status = statusConfig[feedback.status || "pending"] || statusConfig.pending
  const StatusIcon = status.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all duration-300 hover:border-blue-500/20 hover:bg-white/[0.04]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-white truncate">
              {feedback.projectTitle || feedback.serviceCategory || "General Feedback"}
            </h3>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
              feedback.status === "approved" ? "bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20" :
              feedback.status === "rejected" ? "bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20" :
              "bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20"
            }`}>
              <StatusIcon size={10} />
              {status.label}
            </span>
          </div>
          <p className="mt-2 text-sm text-zinc-400 line-clamp-3">{feedback.title || feedback.content}</p>
          <div className="mt-3 flex items-center gap-4 text-xs text-zinc-600">
            <span>{new Date(feedback.createdAt).toLocaleDateString()}</span>
            {feedback.rating > 0 && (
              <span className="flex items-center gap-1">
                {"★".repeat(feedback.rating)}
                {"☆".repeat(5 - feedback.rating)}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function MyDashboardPage() {
  const { user: authUser } = useAuth()
  const [feedbacks, setFeedbacks] = useState<FeedbackPost[]>([])
  const [loading, setLoading] = useState(true)

  const userId = authUser?.id

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }
    fetchUserFeedbackPosts(userId)
      .then((posts) => {
        setFeedbacks(posts)
        setLoading(false)
      })
      .catch(() => {
        setFeedbacks([])
        setLoading(false)
      })
  }, [userId])

  if (!authUser) return <Navigate to="/login" replace />

  const projects = feedbacks.filter((f) => f.projectTitle)
  const uniqueProjects = projects.filter(
    (p, i, arr) => arr.findIndex((x) => x.projectTitle === p.projectTitle) === i
  )

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020408] px-6 pb-8 pt-28 text-white">
      <AuthBackground />
      <Navbar />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 mx-auto max-w-5xl"
      >
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">My Account</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Your projects, services, and feedbacks in one place.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
          {/* Left: Projects/Services */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <MonitorSmartphone size={16} className="text-[#3b82f6]" />
                My Projects & Services
              </h2>
              <span className="text-xs text-zinc-600">{uniqueProjects.length} project{uniqueProjects.length !== 1 ? "s" : ""}</span>
            </div>

            <div className="space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-12 text-zinc-600">
                  <Loader2 size={20} className="animate-spin" />
                </div>
              ) : uniqueProjects.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/[0.08] p-8 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.03]">
                    <Code2 size={22} className="text-zinc-600" />
                  </div>
                  <p className="text-sm text-zinc-500">No projects yet</p>
                  <p className="mt-1 text-xs text-zinc-600">Your ordered services will appear here.</p>
                </div>
              ) : (
                uniqueProjects.map((feedback) => (
                  <ProjectCard key={`${feedback.project}-${feedback.id}`} feedback={feedback} />
                ))
              )}
            </div>
          </div>

          {/* Right: Feedbacks */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <MessageSquareText size={16} className="text-[#3b82f6]" />
                My Feedbacks
              </h2>
              <Link
                to="/feedback"
                className="touch-target inline-flex items-center gap-1.5 rounded-lg border border-[#3b82f6]/20 bg-[#2563eb]/10 px-3 py-2 text-xs font-medium text-[#60a5fa] transition-all duration-200 hover:bg-[#2563eb]/20"
              >
                <Plus size={13} />
                New Feedback
              </Link>
            </div>

            <div className="space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-12 text-zinc-600">
                  <Loader2 size={20} className="animate-spin" />
                </div>
              ) : feedbacks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/[0.08] p-8 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.03]">
                    <MessageSquareText size={22} className="text-zinc-600" />
                  </div>
                  <p className="text-sm text-zinc-500">No feedbacks yet</p>
                  <Link
                    to="/feedback"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#3b82f6] hover:text-[#60a5fa] transition-colors"
                  >
                    Submit your first feedback
                    <ArrowRight size={12} />
                  </Link>
                </div>
              ) : (
                feedbacks.map((feedback) => (
                  <FeedbackCard key={feedback.id} feedback={feedback} />
                ))
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </main>
  )
}
