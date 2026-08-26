import type { Site } from './site'
import type { SendgridKey } from './sendgridKey'
import type { MailgunKey } from './mailgunKey'

// How a schedule's promotion campaign is delivered.
export type ScheduleProvider = 'smtp' | 'sendgrid' | 'mailgun'

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
  provider: ScheduleProvider // delivery transport
  sendgrid_key_id: number | null // stored key id, only when provider = 'sendgrid'
  sendgrid_key?: SendgridKey | null // hydrated key (masked), when loaded
  mailgun_key_id: number | null // stored credential id, only when provider = 'mailgun'
  mailgun_key?: MailgunKey | null // hydrated credential (masked), when loaded
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
  provider: ScheduleProvider
  sendgrid_key_id?: number | null
  mailgun_key_id?: number | null
  active?: boolean
}

// One recipient row shown in the preview table.
export interface ScheduleRecipient {
  email: string
  created_at: string | null
}

// GET /admin/schedules/{id}/recipients — resolved by the same query the send
// uses, so `count` is exactly how many subscribers would be mailed right now.
export interface ScheduleRecipientPreview {
  count: number
  sample_size: number
  sample: ScheduleRecipient[]
  generated_at: string
}
