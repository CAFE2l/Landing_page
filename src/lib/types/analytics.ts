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
