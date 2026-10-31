// A real person who writes or checks one site's content.
// Fields match AuthorResource.php (admin and the public author page).

export interface AuthorProfileLink {
  label: string
  /** Absolute https URL — becomes Person.sameAs in the JSON-LD. */
  url: string
}

export interface Author {
  id: number
  site_id: number
  name: string
  slug: string
  photo_path: string | null
  role: string | null
  /** One or two sentences, shown beside bylines. */
  short_bio: string | null
  /** HTML, shown on the author page. */
  long_bio: string | null
  expertise: string[]
  profile_links: AuthorProfileLink[]
  /** Off by default: nothing about a person is public until switched on. */
  visible: boolean
  created_at: string | null
  updated_at: string | null
}

export interface UpsertAuthorPayload {
  name: string
  /** Generated from the name when blank. Frozen once the author is visible. */
  slug?: string | null
  photo_path?: string | null
  role?: string | null
  short_bio?: string | null
  long_bio?: string | null
  expertise?: string[]
  profile_links?: AuthorProfileLink[]
  visible?: boolean
}

/** The part of an author a byline shows (Author::toByline()). */
export interface BylinePerson {
  name: string
  slug: string
  role: string | null
  photo_path: string | null
}

/**
 * "Written by / Reviewed by · Updated <date>" (App\Support\Byline).
 * Null on the parent when nobody is named — a date alone is not a byline.
 */
export interface Byline {
  author: BylinePerson | null
  reviewer: BylinePerson | null
  last_reviewed_at: string | null
}

/** One item on an author page: a casino review or an article they signed. */
export interface AuthorCasinoCredit {
  name: string
  slug: string
  image_path: string | null
  rating: number
  credit: 'author' | 'reviewer'
}

export interface AuthorArticleCredit {
  title: string
  slug: string
  type: 'guide' | 'news'
  excerpt: string | null
  published_at: string | null
  credit: 'author' | 'reviewer'
}

/** GET /authors/{slug} */
export interface AuthorPage {
  author: Author
  casinos: AuthorCasinoCredit[]
  articles: AuthorArticleCredit[]
}
