export interface KPI {
  label: string
  value: number
  trend: number
  trendLabel: string
}

export interface DailySubmission {
  date: string
  count: number
}

export interface ChannelBreakdown {
  channel: string
  count: number
  color: string
}

export interface ApprovalRate {
  date: string
  rate: number
}

export type Period = "7d" | "30d" | "90d" | { from: string; to: string }

export interface AnalyticsData {
  totalSubmissions: number
  approved: number
  pending: number
  rejected: number
  conversionRate: number
  changes: {
    totalSubmissions: number
    approved: number
    pending: number
    conversionRate: number
  }
  submissionsOverTime: { date: string; count: number }[]
  approvalsByService: { service: string; count: number }[]
  ratingDistribution: { rating: number; count: number }[]
}
