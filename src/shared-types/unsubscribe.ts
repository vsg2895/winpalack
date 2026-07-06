import type { Site } from './site'

// The email streams a subscriber can opt out of independently.
export type UnsubscribeType = 'subscription' | 'promotion'

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
