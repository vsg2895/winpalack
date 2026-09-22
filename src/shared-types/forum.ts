// Fields match SiteForumResource.php — the per-site settings for the combined
// review feed.
//
// NAMING, because it is genuinely confusing: this file is about `site_forums`,
// the page that used to live at /forum and now lives at /reviews. It is a feed
// of casino reviews grouped by operator, not a discussion board.
//
// The COMMUNITY forum — sections, boards, discussions, member posts — is a
// different feature in ./community-forum. They share only the word.

/**
 * The raw row as the admin edits it.
 *
 * Nulls are preserved: the editor must see an empty box where they cleared one,
 * not the default silently filled in. `resolved` rides alongside so the screen
 * can show what visitors will actually get.
 */
export interface SiteForum {
  id: number
  site_id: number
  enabled: boolean
  title: string | null
  eyebrow: string | null
  show_eyebrow: boolean
  intro: string | null
  meta_title: string | null
  meta_description: string | null
  noindex: boolean
  empty_title: string | null
  empty_body: string | null
  empty_cta_label: string | null
  empty_cta_url: string | null
  show_stats: boolean
  editorial_enabled: boolean
  editorial_title: string | null
  editorial_body: string | null
  threads_per_page: number
  preview_reviews: number
  /** Every field with its default applied — what the public page renders. */
  resolved: ForumSettings
}

/**
 * The resolved settings, as the public site receives them.
 *
 * No nulls: every text field has already fallen back to its shipped default
 * server-side, so the front end never has to decide what to show for a blank.
 */
export interface ForumSettings {
  enabled: boolean
  title: string
  /** Empty string when the editor switched the eyebrow off. */
  eyebrow: string
  intro: string
  meta_title: string
  meta_description: string
  noindex: boolean
  empty_title: string
  empty_body: string
  empty_cta_label: string
  empty_cta_url: string
  show_stats: boolean
  editorial_enabled: boolean
  editorial_title: string
  editorial_body: string
  threads_per_page: number
  preview_reviews: number
}

/** PUT /admin/sites/{site}/forum — partial; omitted keys are untouched. */
export interface UpdateSiteForumPayload {
  enabled?: boolean
  title?: string | null
  eyebrow?: string | null
  show_eyebrow?: boolean
  intro?: string | null
  meta_title?: string | null
  meta_description?: string | null
  noindex?: boolean
  empty_title?: string | null
  empty_body?: string | null
  empty_cta_label?: string | null
  empty_cta_url?: string | null
  show_stats?: boolean
  editorial_enabled?: boolean
  editorial_title?: string | null
  editorial_body?: string | null
  threads_per_page?: number
  preview_reviews?: number
}
