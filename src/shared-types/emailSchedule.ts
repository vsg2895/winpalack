import type { Site } from './site'

// Which subscribers to target, by newsletters.created_at (relative to run time).
export type ScheduleDateFilter =
  | 'today'
  | 'yesterday'
  | 'last_week'
  | 'last_month'
  | 'last_quarter'
  | 'last_year'
  | 'specific'

// How often the campaign runs.
export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly'

// Fields match EmailScheduleResource.php — a scheduled promotion campaign.
// Audience is EITHER a sign-up date window (`date_filter`) OR the newest N
// subscribers (`limit`, used when `date_filter` is null).
export interface EmailSchedule {
  id: number
  site_id: number
  site?: Site
  name: string | null
  date_filter: ScheduleDateFilter | null
  specific_date: string | null // Y-m-d, only when date_filter = 'specific'
  limit: number | null // newest-N cap, used when date_filter is null
  frequency: ScheduleFrequency
  time: string // 'HH:MM'
  day_of_week: number | null // 0=Sun..6=Sat, only when frequency = 'weekly'
  day_of_month: number | null // 1..31, only when frequency = 'monthly'
  active: boolean
  last_run_at: string | null
  created_at: string
  updated_at: string
}

// Payload for creating/updating a schedule.
export interface UpsertEmailSchedulePayload {
  site_id: number
  name?: string | null
  date_filter: ScheduleDateFilter | null
  specific_date?: string | null
  limit?: number | null
  frequency: ScheduleFrequency
  time: string
  day_of_week?: number | null
  day_of_month?: number | null
  active?: boolean
}
