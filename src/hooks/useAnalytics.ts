import { useState, useEffect } from "react"
import { supabase, supabaseConfigured } from "../lib/supabase/client"
import type { Period, AnalyticsData } from "../lib/types/analytics"

function getPeriodDates(period: Period) {
  const now = new Date()

  const to = now.toISOString()

  if (period === "7d") {
    const from = new Date(now.getTime() - 7 * 86400000).toISOString()
    const prevFrom = new Date(now.getTime() - 14 * 86400000).toISOString()
    return { from, to, prevFrom, prevTo: from }
  }
  if (period === "30d") {
    const from = new Date(now.getTime() - 30 * 86400000).toISOString()
    const prevFrom = new Date(now.getTime() - 60 * 86400000).toISOString()
    return { from, to, prevFrom, prevTo: from }
  }
  if (period === "90d") {
    const from = new Date(now.getTime() - 90 * 86400000).toISOString()
    const prevFrom = new Date(now.getTime() - 180 * 86400000).toISOString()
    return { from, to, prevFrom, prevTo: from }
  }

  return { from: period.from, to: period.to, prevFrom: null, prevTo: null }
}

const pctChange = (curr: number, old: number) =>
  old === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - old) / old) * 100)

export function useAnalytics(period: Period) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase || !supabaseConfigured) {
      setLoading(false)
      return
    }

    const client = supabase
    const { from, to, prevFrom, prevTo } = getPeriodDates(period)

    let cancelled = false

    async function fetchAll() {
      setLoading(true)

      const [
        currentRes,
        prevRes,
        timelineRes,
        byServiceRes,
        ratingsRes,
      ] = await Promise.all([
        client
          .from("feedback_posts")
          .select("status")
          .gte("created_at", from)
          .lte("created_at", to),

        prevFrom && prevTo
          ? client
              .from("feedback_posts")
              .select("status")
              .gte("created_at", prevFrom)
              .lte("created_at", prevTo)
          : Promise.resolve({ data: [] as unknown[] }),

        client.rpc("feedbacks_over_time", { from_date: from, to_date: to }),

        client
          .from("feedback_posts")
          .select("service_category")
          .gte("created_at", from)
          .lte("created_at", to),

        client
          .from("feedback_posts")
          .select("star_rating")
          .gte("created_at", from)
          .lte("created_at", to),
      ])

      if (cancelled) return

      const current = (currentRes.data ?? []) as { status: string }[]
      const prev = (prevRes?.data ?? []) as { status: string }[]

      const total = current.length
      const approved = current.filter((f) => f.status === "approved").length
      const pending = current.filter((f) => f.status === "pending").length
      const rejected = current.filter((f) => f.status === "rejected").length
      const conversionRate = total > 0 ? Math.round((approved / total) * 100) : 0

      const prevTotal = prev.length
      const prevApproved = prev.filter((f) => f.status === "approved").length
      const prevConversion = prevTotal > 0 ? Math.round((prevApproved / prevTotal) * 100) : 0

      const serviceMap: Record<string, number> = {}
      ;(byServiceRes.data as { service_category: string }[] | null)?.forEach((f) => {
        const key = f.service_category || "Outro"
        serviceMap[key] = (serviceMap[key] ?? 0) + 1
      })

      const ratingMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      ;(ratingsRes.data as { star_rating: number }[] | null)?.forEach((f) => {
        const r = f.star_rating
        if (r >= 1 && r <= 5) ratingMap[r]++
      })

      setData({
        totalSubmissions: total,
        approved,
        pending,
        rejected,
        conversionRate,
        changes: {
          totalSubmissions: pctChange(total, prevTotal),
          approved: pctChange(approved, prevApproved),
          pending: pctChange(pending, prev.filter((f) => f.status === "pending").length),
          conversionRate: pctChange(conversionRate, prevConversion),
        },
        submissionsOverTime: (timelineRes.data ?? []) as { date: string; count: number }[],
        approvalsByService: Object.entries(serviceMap).map(([service, count]) => ({ service, count })),
        ratingDistribution: Object.entries(ratingMap).map(([rating, count]) => ({ rating: Number(rating), count })),
      })
      setLoading(false)
    }

    fetchAll()

    return () => { cancelled = true }
  }, [period])

  return { data, loading }
}
