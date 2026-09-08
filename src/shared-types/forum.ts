// Per-site settings for the player forum page (`site_forums`).
//
// TWO SHAPES, and the split matters. The admin edits raw columns where `null`
// means "I left this blank"; the public site reads `resolved`, where every blank
// has already been replaced by the shipped default and both page sizes are
// clamped into range. An editor who clears the heading must see an empty box and
// visitors must still see a heading — one shape cannot do both.

/** What the public site renders. Every string is non-empty by construction. */
export interface ForumSettings {
  enabled: boolean
  title: string
  /** An empty string when the editor switched the eyebrow off. */
  eyebrow: string
  intro: string
  meta_title: string
  meta_description: string
  /** Keeps the page for visitors while withholding it from search engines. */
  noindex: boolean
  empty_title: string
  empty_body: string
  empty_cta_label: string
  /** A path on this site, always starting with "/". */
  empty_cta_url: string
  show_stats: boolean
  threads_per_page: number
  preview_reviews: number
}

/** The admin/moderation shape — SiteForumResource.php. */
export interface SiteForum {
  id: number
  site_id: number
  enabled: boolean
  title: string | null
  eyebrow: string | null
  /** Its own switch: an empty box means "use the default", not "hide it". */
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
  threads_per_page: number
  preview_reviews: number
  /** What visitors actually get, with defaults filled in. Read-only. */
  resolved: ForumSettings
}

/** PUT /admin/sites/{site}/forum — a partial update; omitted keys are untouched. */
export type UpdateSiteForumPayload = Partial<Omit<SiteForum, 'id' | 'site_id' | 'resolved'>>
