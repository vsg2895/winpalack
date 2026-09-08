// One attempt to tell a site its content changed.
//
// Immutable: an attempt happened or it did not. Recorded so an editor can see
// whether their save actually reached the front end — which, before this
// existed, was unknowable.

export interface SiteRevalidation {
  id: number
  /** Cache tags sent, always including the site's own tag. */
  tags: string[]
  status: 'success' | 'failed'
  /** Null when the request never completed — a timeout or refused connection. */
  http_status: number | null
  error: string | null
  duration_ms: number
  /** 'observer' = a content save; 'manual' = the rebuild button. */
  triggered_by: 'observer' | 'manual'
  created_at: string | null
}
