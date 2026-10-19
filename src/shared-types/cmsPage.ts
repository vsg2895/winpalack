// Fields match CmsPagePublicResource.php (the public, published-only payload).
export interface CmsPage {
  slug: string
  title: string
  content: string
  meta_title: string | null
  meta_description: string | null
  /**
   * Whether this page asks to stay out of the search index.
   *
   * Replaces a hardcoded list of the eleven standard slugs on the front end —
   * which suppressed the five TRUST pages (/about, /contact,
   * /responsible-gambling, /affiliate-disclosure, /editorial-policy) alongside
   * the six genuinely templated legal ones. The six legal pages ship with this
   * true; the five trust pages ship false and are editable per site.
   */
  noindex: boolean
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
  /** See CmsPage.noindex — the same flag, editable on this screen. */
  noindex: boolean
  created_at: string
  updated_at: string
}
