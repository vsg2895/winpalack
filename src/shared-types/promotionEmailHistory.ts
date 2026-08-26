import type { Site } from './site'

// Outcome of one promotion email processing attempt.
export type PromotionEmailStatus = 'success' | 'failed' | 'skipped'

// Fields match PromotionEmailHistoryResource.php — one promotion email attempt.
export interface PromotionEmailHistory {
  id: number
  site_id: number
  site?: Site
  email: string
  sent_date: string // Y-m-d
  status: PromotionEmailStatus
  error: string | null // failure reason; only set when status is 'failed'
  created_at: string
}
