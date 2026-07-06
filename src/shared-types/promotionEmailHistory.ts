import type { Site } from './site'

// Fields match PromotionEmailHistoryResource.php — one delivered promotion email.
export interface PromotionEmailHistory {
  id: number
  site_id: number
  site?: Site
  email: string
  sent_date: string // Y-m-d
  created_at: string
}
