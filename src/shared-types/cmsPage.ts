// Fields match CmsPagePublicResource.php (the public, published-only payload).
export interface CmsPage {
  slug: string
  title: string
  content: string
  meta_title: string | null
  meta_description: string | null
  updated_at: string
}

export type CmsPageStatus = 'draft' | 'published'

// Fields match CmsPageResource.php (the admin-facing payload, includes drafts).
export interface CmsPageAdmin {
  id: number
  site_id: number
  site_name?: string
  slug: string
  title: string
  content: string | null
  meta_title: string | null
  meta_description: string | null
  status: CmsPageStatus
  created_at: string
  updated_at: string
}
