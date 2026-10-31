import type { Byline } from './author'

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
  /** Null when no visible author or reviewer is named. */
  byline: Byline | null
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
  author_id: number | null
  reviewed_by_id: number | null
  last_reviewed_at: string | null
  /**
   * A pending revision. The live columns above stay public until it is
   * published with POST /admin/pages/{id}/publish-draft.
   */
  draft_title: string | null
  draft_content: string | null
  draft_meta_title: string | null
  draft_meta_description: string | null
  /** Non-null exactly when a draft is pending. */
  draft_updated_at: string | null
  created_at: string
  updated_at: string
}
