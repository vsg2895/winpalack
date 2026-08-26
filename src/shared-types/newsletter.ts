import type { Site } from './site'

// Fields match NewsletterResource.php — a newsletter subscriber for a site.
export interface Newsletter {
  id: number
  site_id: number
  site?: Site
  email: string
  full_name: string | null
  verified: boolean
  // When the subscriber clicked the verify link; null if they never did
  // (or the row predates the column). Drives the post-verification
  // promotion delay.
  verified_at: string | null
  created_at: string
  deleted_at?: string | null
}
