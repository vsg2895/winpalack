import type { Site } from './site'

// Which template an unsubscribe was attributed to. Send-gating is global (any
// opt-out stops all mail); this only records which email prompted the opt-out.
export type UnsubscribeType =
  | 'subscription'
  | 'promotion'
  | 'verify'
  | 'promotion_after_verification'

// Fields match UnsubscribeResource.php — a per-stream opt-out record.
export interface Unsubscribe {
  id: number
  site_id: number
  site?: Site
  email: string
  type: UnsubscribeType
  unsubscribed_at: string
  created_at: string
}
