import type { Site } from './site'

// Fields match NewsletterResource.php — a newsletter subscriber for a site.
export interface Newsletter {
  id: number
  site_id: number
  site?: Site
  email: string
  created_at: string
  deleted_at?: string | null
}
