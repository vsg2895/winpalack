// Fields match the Forum* resources and controllers in the Laravel API.
//
// The community forum is a DIFFERENT feature from `site_forums` / ForumSettings
// in ./forum-settings — that one configures the combined *reviews* feed, which
// used to live at /forum and now lives at /reviews. Only the word is shared.

export type ForumPostStatus = 'pending' | 'approved' | 'rejected' | 'spam'

export type ForumArticleStatus = 'draft' | 'published' | 'archived'

export type ForumMemberStatus = 'active' | 'muted' | 'banned'

/**
 * What the account IS. Everyone registers as 'user'.
 *
 * Separate from ForumMemberStatus, which is what moderation has DONE to it —
 * collapsing the two would mean a banned moderator loses their role on being
 * unbanned.
 */
export type ForumMemberRole = 'user' | 'moderator'

export type ForumReportReason = 'spam' | 'abuse' | 'off_topic' | 'other'

/** The last post in a board, denormalised onto the category row. */
export interface ForumLastPost {
  at: string | null
  article_id: number | null
  article_title: string | null
  article_slug: string | null
  author_name: string | null
  post_id: number | null
}

export interface ForumCategory {
  id: number
  name: string
  slug: string
  description: string | null
  icon: string | null
  articles_count: number
  posts_count: number
  /** Absent on a board nobody has posted in yet. */
  last_post?: ForumLastPost
}

export interface ForumSection {
  id: number
  name: string
  slug: string
  description: string | null
  categories: ForumCategory[]
}

export interface ForumArticle {
  id: number
  title: string
  slug: string
  excerpt: string | null
  /** Present only on the detail route and in the admin editor. */
  body?: string
  cover_image_path: string | null
  pinned: boolean
  locked: boolean
  posts_count: number
  views_count: number
  published_at: string | null
  last_post_at: string | null
  status?: ForumArticleStatus
  created_at?: string
  category?: { id: number; name: string; slug: string }
  author?: { name: string } | null
}

export interface ForumPostAuthor {
  display_name: string
  slug: string
  avatar_path: string | null
  posts_count: number
}

export interface ForumPost {
  id: number
  parent_id: number | null
  depth: number
  /** Plain text — never HTML. See ForumContent on the server for why. */
  body: string
  created_at: string | null
  edited_at: string | null
  author?: ForumPostAuthor
  comments?: ForumPost[]
}

export interface ForumStats {
  posts: number
  articles: number
  members: number
  online: number
}

export interface ForumLatestPost {
  id: number
  excerpt: string
  created_at: string | null
  author: string | null
  article: { title: string; slug: string; category: string | null } | null
}

export interface ForumHotThread {
  id: number
  title: string
  slug: string
  category: string | null
  posts_count: number
  views_count: number
}

/** GET /forum — the index, all three tabs in one payload. */
export interface ForumIndexResponse {
  sections: ForumSection[]
  stats: ForumStats
  latest: ForumLatestPost[]
  hot: ForumHotThread[]
}

/** GET /forum/{category} */
export interface ForumCategoryResponse {
  category: ForumCategory
  articles: ForumArticle[]
}

/** GET /forum/{category}/{article} — posts are KEYSET paginated. */
export interface ForumArticleResponse {
  article: ForumArticle
  posts: ForumPost[]
}

export interface ForumKeysetMeta {
  /** Opaque. Pass back as `?after=` for the next page; null means the end. */
  next_cursor: string | null
  prev_cursor: string | null
  per_page: number
}

// ── members ──────────────────────────────────────────────────────────────────

export interface ForumMember {
  id: number
  display_name: string
  slug: string
  avatar_path: string | null
  posts_count: number
  verified: boolean
  /** Why a reply may be held — the form explains rather than just saying "pending". */
  pre_moderated: boolean
  may_post_links: boolean
  status: ForumMemberStatus
  role: ForumMemberRole
}

export interface ForumSession {
  token: string
  member: ForumMember
}

// ── admin ────────────────────────────────────────────────────────────────────

/** One row in the moderation queue. */
export interface ForumModerationPost {
  id: number
  body: string
  status: ForumPostStatus
  depth: number
  is_comment: boolean
  created_at: string | null
  deleted_at: string | null
  open_reports_count: number
  /** Moderators only — never in a public resource. */
  ip_address: string | null
  author: {
    id: number
    display_name: string
    slug: string
    email: string
    status: ForumMemberStatus
    posts_count: number
    approved_posts_count: number
    registered_at: string | null
  } | null
  article: { id: number; title: string; slug: string; category: string | null } | null
}

export type ForumModerationAction = 'approve' | 'reject' | 'spam' | 'delete' | 'restore'

export interface ForumModerationCounts {
  pending: number
  reported: number
  spam: number
}

export interface ForumAdminSection {
  id: number
  name: string
  slug: string
  description: string | null
  position: number
  active: boolean
  categories: ForumCategory[]
}

export interface UpsertForumSectionPayload {
  name: string
  description?: string | null
  position?: number
  active?: boolean
}

export interface UpsertForumCategoryPayload {
  forum_section_id: number
  name: string
  description?: string | null
  icon?: string | null
  position?: number
  active?: boolean
}

export interface UpsertForumArticlePayload {
  forum_category_id: number
  title: string
  slug?: string | null
  excerpt?: string | null
  body: string
  cover_image_path?: string | null
  status: ForumArticleStatus
  pinned?: boolean
  locked?: boolean
  published_at?: string | null
}

/** One row in the admin's forum Users screen. */
export interface ForumMemberRow {
  id: number
  display_name: string
  slug: string
  email: string
  role: ForumMemberRole
  status: ForumMemberStatus
  verified: boolean
  posts_count: number
  approved_posts_count: number
  banned_until: string | null
  ban_reason: string | null
  last_seen_at: string | null
  created_at: string | null
  site: { id: number; name: string } | null
}
